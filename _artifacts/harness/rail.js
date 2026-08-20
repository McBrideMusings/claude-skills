/* rail.js — the prototype control rail: rounds, variants, state axes, devices.

   Supersedes picker.js. The selection/keyboard behaviour is the same contract, ported
   from emilkowalski/skills prototype/PICKER.md (MIT, © 2026 Emil Kowalski) and extended
   with the round axis and with arbitrary fragment-declared state axes.

   Three kinds of control, and they are NOT the same question:

   - ROUND (`?r=`) — which version of the design. Changed once a session.
   - VARIANT (`?v=`) — which direction within this round. Changed constantly.
   - AXIS (`?<key>=`) — which state of the thing being shown: which screen, which
     connection state, which error. Orthogonal to both of the above: flipping variant
     must not reset which screen you were looking at, because the whole point is
     comparing the same screen across two directions.

   Keyboard, coarse to fine, matching the order of the rail itself:

     [ ]        step round
     1-N ← →    switch variant
     x          focus the next axis group     , .   step the focused axis
     d D        step device (viewport.js)
     r          replay the entrance animation
     \          collapse the rail
     ?          show this list in the rail
     Escape     blur

   Ignored while focus is in a field or a modifier is held — a prototype's own inputs are
   real and typing in them must work. Axes and devices get keys because they are the
   controls that move most: a variant is chosen a few times, a state is flipped all
   session.

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
  var roundBtns = [].slice.call(rail.querySelectorAll('.at-rail-round'));
  var axisGroups = [].slice.call(rail.querySelectorAll('.at-rail-axis'));
  var replay = rail.querySelector('.at-rail-replay');

  function roundOf(el) { return el.getAttribute('data-round') || '1'; }

  var rounds = [];
  all.forEach(function (t) {
    var r = roundOf(t);
    if (rounds.indexOf(r) < 0) rounds.push(r);
  });

  var round = rounds[rounds.length - 1];   // newest round is what opening the file shows
  var current = 0;                          // variant index WITHIN the round
  var axisState = {};                       // axis key -> chosen value, survives everything

  function inRound(r) {
    return all.filter(function (t) { return roundOf(t) === r; });
  }
  function btnsIn(r) {
    return variantBtns.filter(function (el) { return roundOf(el) === r; });
  }

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

  /* Axes can differ between rounds; only the current round's are shown, and only those
     are emitted. An axis absent from this round keeps its value for when you step back. */
  function activeAxes() {
    return axisGroups.filter(function (g) {
      var r = g.getAttribute('data-round');
      return !r || r === round;
    });
  }

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
      url.searchParams.set('r', round);
      url.searchParams.set('v', current + 1);
      Object.keys(axisState).forEach(function (k) {
        url.searchParams.set(k, axisState[k]);
      });
      history.replaceState(null, '', url);
    } catch (e) {}
  }

  /* ---------------- mounting ---------------- */

  function mount() {
    var t = inRound(round)[current];
    if (!t) return;
    stage.innerHTML = '';
    // Clear first, render next frame, so entrance animations re-run.
    requestAnimationFrame(function () {
      stage.appendChild(t.content.cloneNode(true));
      // Re-emit every live axis so the freshly mounted markup gets its state applied
      // without every fragment writing its own re-apply-on-mount code.
      activeAxes().forEach(emitAxis);
    });
  }

  function setActive(r, i) {
    if (rounds.indexOf(r) < 0) return;
    var n = inRound(r).length;
    if (i < 0 || i >= n) return;
    round = r;
    current = i;

    variantBtns.forEach(function (el) {
      var on = roundOf(el) === round;
      el.toggleAttribute('hidden', !on);
      var active = on && btnsIn(round).indexOf(el) === current;
      el.toggleAttribute('data-active', active);
      if (active) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
    roundBtns.forEach(function (el) {
      var active = roundOf(el) === round;
      el.toggleAttribute('data-active', active);
      el.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    axisGroups.forEach(function (g) {
      var gr = g.getAttribute('data-round');
      g.toggleAttribute('hidden', !!gr && gr !== round);
      paintAxis(g);
    });
    axisFocus = 0;
    paintAxisFocus();
    // A round's top-level markup lives in the document permanently, so it has to be
    // hidden when its round is not the one on screen — otherwise round 1's shared
    // screens stack under round 2's.
    [].slice.call(document.querySelectorAll('.at-shell')).forEach(function (s) {
      s.toggleAttribute('hidden', s.getAttribute('data-round') !== round);
    });

    writeUrl();

    var t = inRound(round)[current];
    root.setAttribute('data-at-round', round);
    root.setAttribute('data-at-variant', t.getAttribute('data-variant') || '');
    root.setAttribute('data-at-variant-index', String(current + 1));
    root.setAttribute('data-at-axis-state', JSON.stringify(axisState));
    window.dispatchEvent(new CustomEvent('at:variant', {
      detail: { index: current, round: round }
    }));
    mount();
  }

  variantBtns.forEach(function (el) {
    el.addEventListener('click', function () {
      var r = roundOf(el);
      setActive(r, btnsIn(r).indexOf(el));
    });
  });

  roundBtns.forEach(function (el) {
    // Landing on a round keeps the variant slot when that round has one, so stepping
    // rounds compares the same direction across versions instead of resetting to 1.
    el.addEventListener('click', function () {
      var r = roundOf(el);
      setActive(r, Math.min(current, inRound(r).length - 1));
    });
  });

  if (replay) replay.addEventListener('click', mount);

  function stepRound(delta) {
    var i = rounds.indexOf(round);
    var r = rounds[(i + delta + rounds.length) % rounds.length];
    setActive(r, Math.min(current, inRound(r).length - 1));
  }

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
    try {
      var url = new URL(location);
      if (on) url.searchParams.set('rail', '0');
      else url.searchParams.delete('rail');
      history.replaceState(null, '', url);
    } catch (e) {}
    window.dispatchEvent(new Event('at:relayout'));
  }

  var reopen = document.createElement('button');
  reopen.className = 'at-rail-reopen';
  reopen.type = 'button';
  reopen.setAttribute('aria-label', 'Show the controls');
  reopen.setAttribute('title', 'Show the controls  (\\)');
  reopen.textContent = '›';
  reopen.addEventListener('click', function () { setCollapsed(false); });
  document.body.appendChild(reopen);

  var collapseBtn = rail.querySelector('.at-rail-collapse');
  if (collapseBtn) collapseBtn.addEventListener('click', function () { setCollapsed(true); });

  function toggleLegend() {
    rail.toggleAttribute('data-legend');
  }
  var legendBtn = rail.querySelector('.at-rail-keys');
  if (legendBtn) legendBtn.addEventListener('click', toggleLegend);

  document.addEventListener('keydown', function (e) {
    // An embedded copy is driven by its host: acting locally as well would apply the
    // same keypress twice and leave the frame describing a state the rail does not show.
    if (root.hasAttribute('data-at-embedded')) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.key === 'Escape') { if (document.activeElement) document.activeElement.blur(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var n = inRound(round).length;
    var num = parseInt(e.key, 10);
    if (num >= 1 && num <= n) setActive(round, num - 1);
    else if (e.key === 'ArrowRight') setActive(round, (current + 1) % n);
    else if (e.key === 'ArrowLeft') setActive(round, (current - 1 + n) % n);
    else if (e.key === ']') stepRound(1);
    else if (e.key === '[') stepRound(-1);
    else if (e.key === 'x' || e.key === 'X') focusNextAxis();
    else if (e.key === ',' || e.key === '<') stepAxis(-1);
    else if (e.key === '.' || e.key === '>') stepAxis(1);
    else if (e.key === '\\') setCollapsed(!root.hasAttribute('data-at-rail-collapsed'));
    else if (e.key === '?') toggleLegend();
    else if (e.key === 'r' || e.key === 'R') mount();
  });

  /* ---------------- driven from outside ----------------

     A device frame is a clone of this document, so it runs this same script. Rather than
     being rebuilt every time the host's state changes — which throws away the frame's
     scroll position, its typed input and any state the prototype itself holds — it is
     told what changed and applies it in place. */

  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.at !== 'sync') return;
    if (m.round && m.variantIndex) {
      var i = Math.min(parseInt(m.variantIndex, 10), inRound(m.round).length) - 1;
      if (m.round !== round || i !== current) setActive(m.round, i);
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
    group: function (label, hint) {
      var g = document.createElement('div');
      g.className = 'at-rail-group';
      var l = document.createElement('div');
      l.className = 'at-rail-label';
      l.textContent = label;
      if (hint) {
        var h = document.createElement('span');
        h.className = 'at-rail-hint';
        h.textContent = hint;
        l.appendChild(h);
      }
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

  var r0 = root.getAttribute('data-at-round-init') || q.get('r') || round;
  if (rounds.indexOf(r0) < 0) r0 = round;
  var v0 = parseInt(root.getAttribute('data-at-variant-init'), 10) ||
    parseInt(q.get('v'), 10) || 1;
  setActive(r0, Math.min(v0, inRound(r0).length) - 1);
})();
