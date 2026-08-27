/* dock.js — the floating harness buttons: one style, draggable, snapping to an edge.

   Also the one place that answers "may the harness take this keypress". A prototype is a
   working interface with keys of its own, and every key the harness claims is a key the
   design cannot use, so on kind=prototype the answer is always no and every harness
   control is a button. Other kinds are documents — nothing in a page or an explainer
   competes for `a` or `c`, so those keep answering.

   The comment toggle, the contrast button and the theme toggle are all the same object:
   a small round control parked over the folio. They used to be positioned by three
   separate CSS rules that each knew about the others — a `:has()` offset here, a
   `calc(--at-panel-w …)` there — which is the shape a layout takes right before one of
   them lands on top of another.

   They are now one thing. Same size, same partial opacity, same hover. Drag one and it
   follows the pointer; let go and it slides to whichever vertical edge it is nearest,
   because the reason to move it is that it is covering the one element you are trying to
   look at, and the fix for that is "put it on the other side" rather than "put it 40px
   left". Where each one sits is remembered per folio.

   A docked button never has to be told about the comments panel: it stores a SIDE, not
   an x, so the panel opening simply changes where the right-hand edge is. */

(function () {
  /* True when the harness may act on a bare keypress. annotate.js and contrast.js are
     the only callers: tweaks.js and viewport.js are prototype-only and bind no keys at
     all. Called with no argument to ask only "does this kind take keys". */
  window.__atHotkeys = function (e) {
    if (document.documentElement.getAttribute('data-at-kind') === 'prototype') return false;
    if (!e) return true;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return false;
    return !(e.metaKey || e.ctrlKey || e.altKey);
  };

  var root = document.documentElement;
  if (root.hasAttribute('data-at-embedded')) return;

  var GAP = 12;
  var SLOT = 38;            // vertical pitch when several share an edge
  var LANE = 42;            // the strip along an edge the docked buttons own
  var DRAG_SLOP = 4;        // movement below this is a click, not a drag
  var KEY = 'at:dock:' + (root.getAttribute('data-at-key') || location.pathname);

  var docks = [];
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(merged())); } catch (e) {}
  }

  /* The free edges, from the same two tokens the stage and the device host read, rather
     than from the rail's and the panel's own rects — one description of the layout
     instead of three.

     Through a probe rather than getPropertyValue, because a custom property whose value
     is itself a var() comes back from getComputedStyle UNRESOLVED: --at-inset-l reads as
     the literal string "var(--at-twk-w, 272px)", parseFloat gives NaN, and every edge
     silently collapses to the window's. Laying out a zero-height element with those
     insets makes the browser resolve them, and its rect is the answer. */
  var probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  /* Marked so viewport.css's "hide the folio's content behind a device frame" rule cannot
     hide the very element this file measures the layout with. It did, and every docked
     button silently snapped to the window edge and covered the rail. */
  probe.setAttribute('data-at-probe', '');
  probe.style.cssText = 'position:fixed;top:0;height:0;pointer-events:none;visibility:hidden;' +
    'left:var(--at-inset-l,0px);right:var(--at-inset-r,0px)';
  document.body.appendChild(probe);

  function free() {
    var r = probe.getBoundingClientRect();
    return { left: r.left, right: r.right, width: r.width };
  }

  /* Published because the device stage needs the same answer and cannot measure itself
     for it: .at-vp-host animates its own insets over 260ms, so anything reading its box
     mid-transition reads the layout it is leaving. The probe carries the same
     two tokens with no transition, so it is already at the destination. */
  window.__atFree = free;

  function leftEdge() {
    var l = free().left;
    return l + (l ? GAP : GAP);
  }

  function rightEdge(w) {
    var r = free().right;
    return r - GAP - w;
  }

  function place(d, animate) {
    var r = d.el.getBoundingClientRect();
    var w = r.width || 30;
    var h = r.height || 30;
    d.el.style.transition = animate
      ? 'left 240ms cubic-bezier(.22,1,.36,1), top 240ms cubic-bezier(.22,1,.36,1), opacity 150ms ease-out'
      : 'none';
    d.el.style.left = (d.side === 'left' ? leftEdge() : rightEdge(w)) + 'px';
    d.el.style.top = Math.max(GAP, Math.min(d.top, window.innerHeight - h - GAP)) + 'px';
    d.el.style.right = 'auto';
  }

  function placeAll(animate) {
    docks.forEach(function (d) { place(d, animate); });
  }

  function drag(d) {
    d.el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var r = d.el.getBoundingClientRect();
      var offX = e.clientX - r.left;
      var offY = e.clientY - r.top;
      var moved = false;
      d.el.setPointerCapture(e.pointerId);

      function move(ev) {
        if (!moved && Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) < DRAG_SLOP) {
          return;
        }
        moved = true;
        d.el.setAttribute('data-dragging', '');
        d.el.style.transition = 'none';
        d.el.style.left = (ev.clientX - offX) + 'px';
        d.el.style.top = (ev.clientY - offY) + 'px';
        d.el.style.right = 'auto';
      }

      function up() {
        d.el.removeEventListener('pointermove', move);
        d.el.removeEventListener('pointerup', up);
        d.el.removeEventListener('pointercancel', up);
        d.el.removeAttribute('data-dragging');
        if (!moved) return;                       // a plain click: let it through
        // Snap to whichever edge the button's own centre is nearer.
        var rect = d.el.getBoundingClientRect();
        d.side = (rect.left + rect.width / 2) < window.innerWidth / 2 ? 'left' : 'right';
        d.top = rect.top;
        place(d, true);
        save();
        // Swallow the click that a pointerup would otherwise fire on the button.
        d.el.addEventListener('click', function stop(c) {
          c.stopPropagation(); c.preventDefault();
          d.el.removeEventListener('click', stop, true);
        }, true);
      }

      d.el.addEventListener('pointermove', move);
      d.el.addEventListener('pointerup', up);
      d.el.addEventListener('pointercancel', up);
    });
  }

  /* Registration. `side` and `slot` are only defaults: a stored position wins, and the
     slot keeps two buttons on the same edge from landing on each other. */
  window.__atDock = function (el, id, side, slot) {
    var d = {
      el: el,
      id: id,
      side: (saved[id] && saved[id].side) || side || 'right',
      top: (saved[id] && typeof saved[id].top === 'number')
        ? saved[id].top : GAP + (slot || 0) * SLOT
    };
    el.classList.add('at-dock');
    docks.push(d);
    drag(d);
    requestAnimationFrame(function () { place(d, false); });
    return d;
  };

  /* ---------------- free drag, for the two cards ----------------

     The Tweaks panel and the comments panel are not docked buttons: they are cards, and a
     card goes where it is put rather than snapping to an edge. Same store, same clamping,
     same "remembered per folio" — only the snap is missing, and the handle is a header
     rather than the whole element. */

  window.__atDrag = function (el, handle, id, corner) {
    if (!el || !handle) return;
    var pos = saved[id] && typeof saved[id].x === 'number' ? saved[id] : null;

    function clamp(x, y) {
      var r = el.getBoundingClientRect();
      var f = free();
      return {
        x: Math.max(f.left + GAP, Math.min(x, f.right - r.width - GAP)),
        y: Math.max(GAP, Math.min(y, window.innerHeight - r.height - GAP))
      };
    }

    function put(x, y) {
      var c = clamp(x, y);
      pos = { x: c.x, y: c.y };
      el.style.left = c.x + 'px';
      el.style.top = c.y + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    }

    /* Opposite corners by default, because two cards that open in the same one open on
       top of each other — which is what the comments panel did to the Tweaks panel. The
       right-hand corners also keep clear of LANE, the strip the docked buttons park in. */
    function rest() {
      var r = el.getBoundingClientRect();
      var f = free();
      var left = corner && corner.indexOf('l') >= 0;
      put(pos ? pos.x : (left ? f.left + GAP : f.right - r.width - GAP - LANE),
          pos ? pos.y : (corner === 'tr' ? GAP : window.innerHeight - r.height - GAP));
    }

    handle.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      // The close button lives in the handle; dragging must not start on it.
      if (e.target.closest('button')) return;
      var r = el.getBoundingClientRect();
      var offX = e.clientX - r.left;
      var offY = e.clientY - r.top;
      handle.setPointerCapture(e.pointerId);
      el.setAttribute('data-dragging', '');

      function move(ev) { put(ev.clientX - offX, ev.clientY - offY); }

      function up() {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        el.removeAttribute('data-dragging');
        saved[id] = { x: pos.x, y: pos.y };
        try { localStorage.setItem(KEY, JSON.stringify(merged())); } catch (e) {}
      }

      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });

    cards.push({ el: el, rest: rest });
    requestAnimationFrame(rest);
  };

  var cards = [];

  /* Both kinds share one store, so writing either must not drop the other. */
  function merged() {
    var out = {};
    Object.keys(saved).forEach(function (k) { out[k] = saved[k]; });
    docks.forEach(function (d) { out[d.id] = { side: d.side, top: d.top }; });
    return out;
  }

  function relayout(animate) {
    placeAll(animate);
    cards.forEach(function (c) { c.rest(); });
  }

  window.addEventListener('resize', function () { relayout(false); });
  // The panels move the edges, so a docked button follows them.
  window.addEventListener('at:relayout', function () { relayout(true); });
  new MutationObserver(function () { relayout(true); })
    .observe(root, { attributes: true, attributeFilter: ['data-at-annotate', 'data-at-tweaks-collapsed'] });
})();
