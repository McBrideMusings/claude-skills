/* rail.js — the prototype control rail: variants, state axes, devices.

   Supersedes picker.js. The selection behaviour is the same contract, ported from
   emilkowalski/skills prototype/PICKER.md (MIT, © 2026 Emil Kowalski) and extended with
   arbitrary fragment-declared state axes.

   Two kinds of control, and they are NOT the same question:

   - VARIANT (`?v=`) — which direction is on screen. Changed constantly.
   - AXIS (`?<key>=`) — which state of the thing being shown: which screen, which
     connection state, which error. Orthogonal to variant: flipping variant must not
     reset which screen you were looking at, because the whole point is comparing the
     same screen across two directions.

   There are no rounds. A build replaces the file; earlier attempts live in git, not
   stacked inside the artifact.

   THE RAIL ANSWERS NO KEYS, and neither does any other harness widget on a prototype.
   Every control here is a button. The rail used to own [ ] 1-N ← → x , . d D r \ ? and
   Escape, which is most of a keyboard, and a prototype of a keyboard-driven interface
   — a TUI, an editor, anything carrying its own shortcuts — could not be driven at all:
   pressing `d` for the design's own detail view stepped the device frame instead.
   Guarding on "is focus in a field" never fixed it, because a canvas or a
   document-level handler is not a field. The design under judgement gets the whole
   keyboard; the harness gets the mouse. __atHotkeys in dock.js is the one place that
   says which kinds still take keys.

   AXES ARE EVENT-DRIVEN. The rail owns no opinion about what an axis means: clicking an
   option dispatches

       window.dispatchEvent(new CustomEvent('at:axis', {
         detail: { axis: 'screen', value: 'chat', index: 1, label: 'Agent chat' }
       }))

   and the fragment's own top-level <script> decides what that does. The rail re-emits
   EVERY axis immediately after each mount, so a fragment listener never has to
   re-apply state itself after a variant switch — it just handles the event again.

   A fragment's listener must be a TOP-LEVEL <script> in the fragment, never inside a
   <template data-variant>: a script cloned out of a template does not execute. */

(function () {
  var root = document.documentElement;
  var rail = document.querySelector('.at-rail');
  var stage = document.getElementById('at-stage');
  var all = [].slice.call(document.querySelectorAll('template[data-variant]'));
  if (!rail || !stage || !all.length) return;

  var variantBtns = [].slice.call(rail.querySelectorAll('.at-rail-variant'));
  var axisGroups = [].slice.call(rail.querySelectorAll('.at-rail-axis'));
  var replay = rail.querySelector('.at-rail-replay');

  var current = 0;                          // which variant is mounted
  var axisState = {};                       // axis key -> chosen value, survives everything

  /* ---------------- axes ---------------- */

  function axisOptions(g) {
    return [].slice.call(g.querySelectorAll('.at-rail-opt'));
  }

  function emitAxis(g) {
    var key = g.getAttribute('data-axis');
    var opts = axisOptions(g);
    var i = 0;
    for (var j = 0; j < opts.length; j++) {
      if (opts[j].getAttribute('data-value') === axisState[key]) { i = j; break; }
    }
    var el = opts[i];
    if (!el) return;
    window.dispatchEvent(new CustomEvent('at:axis', {
      detail: {
        axis: key,
        value: el.getAttribute('data-value'),
        index: i,
        label: (el.textContent || '').trim()
      }
    }));
  }

  function paintAxis(g) {
    var key = g.getAttribute('data-axis');
    axisOptions(g).forEach(function (el) {
      el.toggleAttribute('data-active', el.getAttribute('data-value') === axisState[key]);
    });
  }

  function setAxis(g, value) {
    var key = g.getAttribute('data-axis');
    axisState[key] = value;
    paintAxis(g);
    writeUrl();
    // data-at-axis-state is what a device frame is told to catch up to, and what any
    // outside reader polls. It was written only on variant/round changes, so an axis
    // flip left it describing the state before the flip.
    root.setAttribute('data-at-axis-state', JSON.stringify(axisState));
    emitAxis(g);
  }

  function activeAxes() { return axisGroups; }

  axisGroups.forEach(function (g) {
    var key = g.getAttribute('data-axis');
    var opts = axisOptions(g);
    if (!opts.length) return;
    if (!(key in axisState)) axisState[key] = opts[0].getAttribute('data-value');
    opts.forEach(function (el) {
      el.addEventListener('click', function () { setAxis(g, el.getAttribute('data-value')); });
    });
  });

  /* ---------------- url ---------------- */

  function writeUrl() {
    // A srcdoc page (a viewport frame) has no query string to persist into, so this is
    // best-effort; the data-at-* attributes are the real signal.
    try {
      var url = new URL(location);
      url.searchParams.set('v', current + 1);
      Object.keys(axisState).forEach(function (k) {
        url.searchParams.set(k, axisState[k]);
      });
      history.replaceState(null, '', url);
    } catch (e) {}
  }

  /* ---------------- mounting ---------------- */

  function mount() {
    var t = all[current];
    if (!t) return;
    stage.innerHTML = '';
    // Clear first, render next frame, so entrance animations re-run.
    requestAnimationFrame(function () {
      stage.appendChild(t.content.cloneNode(true));
      // Re-emit every live axis so the freshly mounted markup gets its state applied
      // without every fragment writing its own re-apply-on-mount code.
      activeAxes().forEach(emitAxis);
      // The stage now has content. Anything that measures the folio — the contrast
      // verdict — would otherwise be guessing at a delay, and measuring an empty
      // document whenever it guessed short.
      window.dispatchEvent(new CustomEvent('at:mounted'));
      if (root.hasAttribute('data-at-embedded')) {
        try { parent.postMessage({ at: 'mounted' }, '*'); } catch (e) {}
      }
    });
  }

  function setActive(i) {
    if (i < 0 || i >= all.length) return;
    current = i;

    variantBtns.forEach(function (el, j) {
      var active = j === current;
      el.toggleAttribute('data-active', active);
      if (active) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
    axisGroups.forEach(paintAxis);
    axisFocus = 0;
    paintAxisFocus();

    writeUrl();

    var t = all[current];
    root.setAttribute('data-at-variant', t.getAttribute('data-variant') || '');
    root.setAttribute('data-at-variant-index', String(current + 1));
    root.setAttribute('data-at-axis-state', JSON.stringify(axisState));
    window.dispatchEvent(new CustomEvent('at:variant', { detail: { index: current } }));
    mount();
  }

  variantBtns.forEach(function (el, i) {
    el.addEventListener('click', function () { setActive(i); });
  });

  if (replay) replay.addEventListener('click', mount);

  /* ---------------- focused axis ----------------

     One key cannot address "which axis" and "which option" at once, and digits already
     belong to variants. So `x` moves a focus marker down the axis groups and `,` / `.`
     step whichever group holds it. Three keys cover any number of axes and collide with
     nothing. */

  var axisFocus = 0;

  function paintAxisFocus() {
    var live = activeAxes();
    live.forEach(function (g, i) {
      g.toggleAttribute('data-focus', live.length > 1 && i === axisFocus);
    });
  }

  function focusNextAxis() {
    var live = activeAxes();
    if (!live.length) return;
    axisFocus = (axisFocus + 1) % live.length;
    paintAxisFocus();
  }

  function stepAxis(delta) {
    var live = activeAxes();
    if (!live.length) return;
    var g = live[Math.min(axisFocus, live.length - 1)];
    var opts = axisOptions(g);
    if (!opts.length) return;
    var key = g.getAttribute('data-axis');
    var i = 0;
    for (var j = 0; j < opts.length; j++) {
      if (opts[j].getAttribute('data-value') === axisState[key]) { i = j; break; }
    }
    setAxis(g, opts[(i + delta + opts.length) % opts.length].getAttribute('data-value'));
    paintAxisFocus();
  }

  /* ---------------- collapse ----------------

     The rail costs 272px of the window for as long as it is open, which is width the
     design under judgement does not get — and the reason a desktop frame has to be
     scaled down hardest. Collapsing is one key, and it persists like every other bit of
     rail state. */

  function setCollapsed(on) {
    root.toggleAttribute('data-at-rail-collapsed', on);
    paintToggle();
    try {
      var url = new URL(location);
      if (on) url.searchParams.set('rail', '0');
      else url.searchParams.delete('rail');
      history.replaceState(null, '', url);
    } catch (e) {}
    window.dispatchEvent(new Event('at:relayout'));
  }

  /* A toggle, not an opener. It is on screen whether the rail is open or shut, and it
     says which — amber when the rail is showing, dark when it is not, exactly like the
     comment button and its panel. Same object, same states, same CSS. */
  var reopen = document.createElement('button');
  // `at-dock` at CREATION — see the same note in annotate.js.
  reopen.className = 'at-rail-reopen at-dock';
  reopen.type = 'button';
  reopen.addEventListener('click', function () {
    setCollapsed(!root.hasAttribute('data-at-rail-collapsed'));
  });
  /* Not inside a device frame. The frame's document is a clone of this one and runs this
     script again, and dock.js bails when embedded — so the button was created, never
     docked, and rendered in normal flow as an unexplained control in a corner of the
     design under review. The host's copy is the only one. */
  if (!root.hasAttribute('data-at-embedded')) document.body.appendChild(reopen);

  function paintToggle() {
    var open = !root.hasAttribute('data-at-rail-collapsed');
    reopen.toggleAttribute('data-active', open);
    reopen.setAttribute('aria-pressed', open ? 'true' : 'false');
    reopen.setAttribute('aria-label', open ? 'Hide the controls' : 'Show the controls');
    reopen.setAttribute('title', open ? 'Hide the controls' : 'Show the controls');
    reopen.textContent = open ? '‹' : '›';
  }
  // rail.js is inlined before the widget scripts, so the dock helper does not exist yet.
  // A timeout runs after every inline script has executed.
  setTimeout(function () {
    if (window.__atDock) window.__atDock(reopen, 'rail-reopen', 'left', 0);
  }, 0);

  /* When a file was built. Several confusing sessions came down to looking at an
     folio from before a fix and reasoning about behaviour that no longer existed;
     the answer was in a meta tag nothing displayed. */
  (function () {
    var m = document.querySelector('meta[name="folio-built"]');
    if (!m || !m.content) return;
    var el = document.createElement('div');
    el.className = 'at-rail-built';
    el.textContent = 'built ' + m.content;
    var note = rail.querySelector('.at-rail-note');
    if (note) { note.appendChild(el); return; }
    // With no scope note there is nothing pinning the bottom of the rail, so the stamp
    // takes that job itself rather than floating under the last control group.
    el.classList.add('at-rail-built--alone');
    rail.appendChild(el);
  })();

  /* ---------------- driven from outside ----------------

     A device frame is a clone of this document, so it runs this same script. Rather than
     being rebuilt every time the host's state changes — which throws away the frame's
     scroll position, its typed input and any state the prototype itself holds — it is
     told what changed and applies it in place. */

  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.at !== 'sync') return;
    if (m.variantIndex) {
      var i = Math.min(parseInt(m.variantIndex, 10), all.length) - 1;
      if (i !== current) setActive(i);
    }
    if (m.axes) {
      axisGroups.forEach(function (g) {
        var key = g.getAttribute('data-axis');
        if (!(key in m.axes) || axisState[key] === m.axes[key]) return;
        setAxis(g, m.axes[key]);
      });
    }
  });

  /* ---------------- a slot other harness widgets add controls to ----------------

     viewport.js puts its device group here rather than floating its own bar, so every
     "what am I looking at" control lives in one column. Groups are inserted above the
     scope note when there is one. */

  window.__atRail = {
    group: function (label) {
      var g = document.createElement('div');
      g.className = 'at-rail-group';
      var l = document.createElement('div');
      l.className = 'at-rail-label';
      l.textContent = label;
      g.appendChild(l);
      var note = rail.querySelector('.at-rail-note');
      if (note) rail.insertBefore(g, note);
      else rail.appendChild(g);
      return g;
    },
    row: function (group) {
      var r = document.createElement('div');
      r.className = 'at-rail-row';
      group.appendChild(r);
      return r;
    },
    item: function (parent, text, onClick) {
      var b = document.createElement('button');
      b.className = 'at-rail-item';
      b.type = 'button';
      b.textContent = text;
      b.addEventListener('click', function () { onClick(b); });
      parent.appendChild(b);
      return b;
    }
  };

  /* ---------------- boot ----------------

     data-at-*-init wins over the query string: it is how a viewport.js device frame is
     told what the host was showing, and a srcdoc document has no query string. */

  var q = new URLSearchParams(location.search);

  var initAxes = root.getAttribute('data-at-axis-init');
  if (initAxes) {
    try {
      var parsed = JSON.parse(initAxes);
      Object.keys(parsed).forEach(function (k) { axisState[k] = parsed[k]; });
    } catch (e) {}
  } else {
    axisGroups.forEach(function (g) {
      var key = g.getAttribute('data-axis');
      var want = q.get(key);
      if (!want) return;
      var ok = axisOptions(g).some(function (el) {
        return el.getAttribute('data-value') === want;
      });
      if (ok) axisState[key] = want;
    });
  }

  if (q.get('rail') === '0') root.setAttribute('data-at-rail-collapsed', '');
  paintToggle();

  var v0 = parseInt(root.getAttribute('data-at-variant-init'), 10) ||
    parseInt(q.get('v'), 10) || 1;
  setActive(Math.min(Math.max(v0, 1), all.length) - 1);
})();
