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
  var stepBtns = [].slice.call(rail.querySelectorAll('.at-rail-step'));
  var roundNow = rail.querySelector('.at-rail-round-now');
  var roundCount = rail.querySelector('.at-rail-step-count');
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
      // The stage now has content. Anything that measures the artifact — the contrast
      // verdict — would otherwise be guessing at a delay, and measuring an empty
      // document whenever it guessed short.
      window.dispatchEvent(new CustomEvent('at:mounted'));
      if (root.hasAttribute('data-at-embedded')) {
        try { parent.postMessage({ at: 'mounted' }, '*'); } catch (e) {}
      }
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
    if (roundNow) roundNow.textContent = 'v' + round;
    if (roundCount) {
      roundCount.textContent = (rounds.indexOf(round) + 1) + ' of ' + rounds.length;
    }
    stepBtns.forEach(function (el) {
      var delta = parseInt(el.getAttribute('data-step'), 10) || 1;
      var i = rounds.indexOf(round) + delta;
      el.disabled = i < 0 || i >= rounds.length;
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

  // Stepping a round keeps the variant slot when the destination round has one, so
  // stepping compares the same direction across versions instead of resetting to 1.
  stepBtns.forEach(function (el) {
    el.addEventListener('click', function () {
      stepRound(parseInt(el.getAttribute('data-step'), 10) || 1);
    });
  });

  if (replay) replay.addEventListener('click', mount);

  /* Clamped, not wrapped. Rounds are a history: v4 is not "next to" v1, and stepping off
     the end of one into the other is a jump, not a step. The buttons disable at the ends
     so the wall is visible before you hit it. */
  function stepRound(delta) {
    var i = rounds.indexOf(round) + delta;
    if (i < 0 || i >= rounds.length) return;
    var r = rounds[i];
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
  reopen.className = 'at-rail-reopen';
  reopen.type = 'button';
  reopen.addEventListener('click', function () {
    setCollapsed(!root.hasAttribute('data-at-rail-collapsed'));
  });
  document.body.appendChild(reopen);

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
     artifact from before a fix and reasoning about behaviour that no longer existed;
     the answer was in a meta tag nothing displayed. */
  (function () {
    var m = document.querySelector('meta[name="artifact-built"]');
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

  var r0 = root.getAttribute('data-at-round-init') || q.get('r') || round;
  if (rounds.indexOf(r0) < 0) r0 = round;
  var v0 = parseInt(root.getAttribute('data-at-variant-init'), 10) ||
    parseInt(q.get('v'), 10) || 1;
  setActive(r0, Math.min(v0, inRound(r0).length) - 1);
})();
