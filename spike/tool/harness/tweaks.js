/* tweaks.js — the floating Tweaks panel: variant, the fragment's own controls, device.

   Supersedes rail.js. Two things changed, and only the second is cosmetic:

   1. A FRAGMENT NO LONGER DECLARES CONTROLS IN MARKUP. `<nav data-axis>` could only ever
      be a row of buttons, so every tweak had to be pretended into one: a gap of 0-40px
      became five chips at arbitrary stops, and a colour became a list of four. The control
      is now chosen by the TYPE OF THE VALUE being tweaked — a boolean is a switch, a
      bounded number is a slider, a hex string is a colour well, a list is a picker — and
      the fragment declares the value, not the widget:

          atTweaks.add('gap', 12, { max: 40, unit: 'px', onChange: function (v) { … } });
          atTweaks.add('screen', ['home', 'chat'], { onChange: function (v) { … } });
          atTweaks.add('dark', false, { onChange: function (v) { … } });

      `atTweaks.toggle/slider/stepper/color/pick/select/text/action` name a widget
      outright when the inference gets it wrong.

   2. The panel floats and can be dragged, and closing it leaves a "Tweaks" pill in the
      corner. The rail held 272px of the window for as long as it was open — width the
      design under judgement never got, and the reason a 1440-wide desktop frame had to be
      scaled to 67% before it fit.

   THE PANEL ANSWERS NO KEYS, and neither does any other harness widget on a prototype. A
   prototype is a working interface with keys of its own; the design gets the whole
   keyboard, the harness gets the mouse. __atHotkeys in dock.js is the one place that says
   which kinds still take keys.

   EVERY CONTROL RE-FIRES AFTER EVERY MOUNT. A variant swap replaces the stage, so the
   fresh markup has never seen an onChange; the panel calls every registered control's
   handler again right after mounting, which is why no fragment writes re-apply code.

   A fragment's declarations must be in a TOP-LEVEL <script>, never inside a
   <template data-variant>: a script cloned out of a template does not execute. The
   queueing stub the tool writes into <head> is what lets that script run before this one. */

(function () {
  var root = document.documentElement;
  var panel = document.querySelector('.at-twk');
  var stage = document.getElementById('at-stage');
  var all = [].slice.call(document.querySelectorAll('template[data-variant]'));
  if (!panel || !stage || !all.length) return;

  var body = panel.querySelector('.at-twk-body');
  var tabStrip = panel.querySelector('.at-twk-tabs');
  var pill = document.querySelector('.at-twk-pill');
  var variantBtns = [].slice.call(panel.querySelectorAll('.at-twk-variant'));
  var variantSelect = panel.querySelector('.at-twk-variant-select');
  var replay = panel.querySelector('.at-twk-replay');
  var note = panel.querySelector('.at-twk-note');

  var current = 0;          // which variant is mounted
  var state = {};           // tweak key -> live value, survives every variant swap
  var controls = [];        // [{ key, apply }] in declaration order

  var q = new URLSearchParams(location.search);

  /* data-at-tweak-init wins over the query string: it is how a viewport.js device frame is
     told what the host was showing, and a srcdoc document has no query string of its own. */
  var seeded = {};
  var initAttr = root.getAttribute('data-at-tweak-init');
  if (initAttr) {
    try { seeded = JSON.parse(initAttr) || {}; } catch (e) { seeded = {}; }
  }

  function seedFor(key) {
    if (Object.prototype.hasOwnProperty.call(seeded, key)) return seeded[key];
    if (!initAttr && q.has(key)) return q.get(key);
    return undefined;
  }

  /* ---------------- url ---------------- */

  function writeUrl() {
    // A srcdoc page (a device frame) has no query string to persist into, so this is
    // best-effort; the data-at-* attributes are the real signal.
    try {
      var url = new URL(location);
      url.searchParams.set('v', current + 1);
      Object.keys(state).forEach(function (k) { url.searchParams.set(k, String(state[k])); });
      history.replaceState(null, '', url);
    } catch (e) {}
  }

  function publish() {
    root.setAttribute('data-at-tweak-state', JSON.stringify(state));
  }

  /* ---------------- tabs ----------------

     Three questions about the same folio, and each of them used to own a surface of its
     own: what am I looking at, does it pass, and what is wrong with it. The order is fixed
     here rather than following registration, so the strip does not reshuffle depending on
     which widget booted first. A tab appears only once something has filled its pane. */

  var PANES = [
    { key: 'tweaks',   label: 'Tweaks' },
    { key: 'checks',   label: 'Checks' },
    { key: 'comments', label: 'Comments' }
  ];
  var panes = {};
  var tabs = {};
  var active = 'tweaks';

  PANES.forEach(function (p) {
    var el = panel.querySelector('.at-twk-pane[data-pane="' + p.key + '"]');
    if (!el) {
      el = document.createElement('div');
      el.className = 'at-twk-pane';
      el.setAttribute('data-pane', p.key);
      el.hidden = true;
      body.appendChild(el);
    }
    panes[p.key] = el;

    var b = document.createElement('button');
    b.className = 'at-twk-opt at-twk-tab';
    b.type = 'button';
    b.textContent = p.label;
    b.hidden = true;
    b.addEventListener('click', function () { selectTab(p.key); });
    tabStrip.appendChild(b);
    tabs[p.key] = b;
  });

  function selectTab(key) {
    if (!panes[key]) return;
    active = key;
    PANES.forEach(function (p) {
      panes[p.key].hidden = p.key !== key;
      tabs[p.key].toggleAttribute('data-active', p.key === key);
      tabs[p.key].setAttribute('aria-pressed', p.key === key ? 'true' : 'false');
    });
  }

  /* A tab for an empty pane is a control that opens nothing. The strip itself goes when
     only one tab would show — a single-segment segmented control says nothing. */
  function showTab(key) {
    if (tabs[key]) tabs[key].hidden = false;
    var shown = PANES.filter(function (p) { return !tabs[p.key].hidden; });
    tabStrip.hidden = shown.length < 2;
  }

  showTab('tweaks');
  selectTab('tweaks');

  /* ---------------- the panel's own shape ---------------- */

  function slot(el) {
    // Groups stack above the scope note, which stays pinned to the bottom of the pane.
    if (note) panes.tweaks.insertBefore(el, note);
    else panes.tweaks.appendChild(el);
  }

  function group(label) {
    var g = document.createElement('div');
    g.className = 'at-twk-group';
    if (label) {
      var l = document.createElement('div');
      l.className = 'at-twk-label';
      l.textContent = label;
      g.appendChild(l);
    }
    slot(g);
    return g;
  }

  /* The group a bare control lands in. One unlabelled group for everything the fragment
     declares before its first section(), so controls do not each become their own box. */
  var openGroup = null;
  function target() {
    if (!openGroup) openGroup = group('');
    return openGroup;
  }

  function labelled(text, inline) {
    var row = document.createElement('div');
    row.className = 'at-twk-ctl' + (inline ? ' at-twk-ctl--inline' : '');
    var name = document.createElement('div');
    name.className = 'at-twk-name';
    var n = document.createElement('span');
    n.textContent = text;
    var v = document.createElement('span');
    v.className = 'at-twk-value';
    name.appendChild(n);
    name.appendChild(v);
    row.appendChild(name);
    target().appendChild(row);
    return { row: row, value: v };
  }

  /* ---------------- registration ---------------- */

  /* One place that owns a control's value: it seeds from the URL, calls the handler once
     at declaration and again after every mount, and keeps the URL and the published state
     attribute in step. `coerce` turns the string a URL gives back into the value's own
     type — without it a slider seeded from ?gap=12 hands the fragment "12". */
  function register(key, initial, opts, coerce, paint) {
    var seed = seedFor(key);
    var value = seed === undefined ? initial : coerce(seed, initial);
    state[key] = value;

    var onChange = typeof opts.onChange === 'function' ? opts.onChange : null;

    function apply() {
      if (onChange) onChange(state[key], key);
      window.dispatchEvent(new CustomEvent('at:tweak', {
        detail: { key: key, value: state[key] }
      }));
    }

    var handle = {
      get: function () { return state[key]; },
      set: function (v) {
        state[key] = v;
        if (paint) paint(v);
        publish();
        writeUrl();
        apply();
      }
    };

    controls.push({ key: key, apply: apply });
    if (paint) paint(value);
    publish();
    return handle;
  }

  function num(v, fallback) {
    var n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  /* ---------------- the widgets ---------------- */

  /* Three segments is the most that stays readable across 250px — a fourth leaves each of
     them four characters, which is a control you have to guess at. So above three the same
     choice is a dropdown, and nothing in between. */
  var SEG_MAX = 3;

  function pick(key, opts_, opts) {
    opts = opts || {};
    var list = options(opts_);
    if (list.length > SEG_MAX) return select(key, list, opts);
    var g = group(opts.label || key);
    var seg = document.createElement('div');
    seg.className = 'at-twk-seg';
    g.appendChild(seg);

    var btns = list.map(function (o) {
      var b = document.createElement('button');
      b.className = 'at-twk-opt';
      b.type = 'button';
      b.textContent = o.label;
      // A segment has no room for a second line, so the hint becomes its tooltip.
      if (o.hint) b.title = o.hint;
      seg.appendChild(b);
      return b;
    });

    function paint(v) {
      btns.forEach(function (b, i) { b.toggleAttribute('data-active', list[i].value === v); });
    }

    var h = register(key, list[0].value, opts, function (s, fallback) {
      return list.some(function (o) { return o.value === s; }) ? s : fallback;
    }, paint);

    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { h.set(list[i].value); });
    });
    return h;
  }

  /* Both choosers take the same option shape — a bare string, or {value, label, hint} —
     so switching one for the other is a change of widget and never of data. */
  function options(list) {
    return list.map(function (o) {
      return (typeof o === 'string' || typeof o === 'number')
        ? { value: String(o), label: String(o), hint: '' }
        : { value: String(o.value), label: o.label || String(o.value), hint: o.hint || '' };
    });
  }

  function select(key, opts_, opts) {
    opts = opts || {};
    var list = options(opts_);
    var ui = labelled(opts.label || key, true);
    var el = document.createElement('select');
    el.className = 'at-twk-field';
    list.forEach(function (o) {
      var op = document.createElement('option');
      op.value = o.value;
      op.textContent = o.label;
      el.appendChild(op);
    });
    ui.row.appendChild(el);

    var h = register(key, list[0].value, opts, function (s, fallback) {
      return list.some(function (o) { return o.value === s; }) ? s : fallback;
    }, function (v) { el.value = v; });

    el.addEventListener('change', function () { h.set(el.value); });
    return h;
  }

  function slider(key, value, opts) {
    opts = opts || {};
    var min = opts.min === undefined ? 0 : opts.min;
    var max = opts.max === undefined ? 100 : opts.max;
    var step = opts.step === undefined ? ((max - min) <= 4 ? 0.1 : 1) : opts.step;
    var unit = opts.unit || '';
    var ui = labelled(opts.label || key, false);
    var el = document.createElement('input');
    el.className = 'at-twk-slider';
    el.type = 'range';
    el.min = min;
    el.max = max;
    el.step = step;
    ui.row.appendChild(el);

    function paint(v) {
      el.value = v;
      ui.value.textContent = v + unit;
    }

    var h = register(key, value, opts, function (s, fallback) {
      return Math.min(max, Math.max(min, num(s, fallback)));
    }, paint);

    el.addEventListener('input', function () { h.set(num(el.value, value)); });
    return h;
  }

  function stepper(key, value, opts) {
    opts = opts || {};
    var ui = labelled(opts.label || key, true);
    var el = document.createElement('input');
    el.className = 'at-twk-field';
    el.type = 'number';
    if (opts.min !== undefined) el.min = opts.min;
    if (opts.max !== undefined) el.max = opts.max;
    el.step = opts.step === undefined ? 1 : opts.step;
    ui.row.appendChild(el);

    var h = register(key, value, opts, function (s, fallback) {
      return num(s, fallback);
    }, function (v) { el.value = v; });

    el.addEventListener('input', function () { h.set(num(el.value, value)); });
    return h;
  }

  function toggle(key, value, opts) {
    opts = opts || {};
    var ui = labelled(opts.label || key, true);
    var el = document.createElement('button');
    el.className = 'at-twk-toggle';
    el.type = 'button';
    el.setAttribute('role', 'switch');
    el.appendChild(document.createElement('i'));
    ui.row.appendChild(el);

    function paint(v) {
      el.toggleAttribute('data-on', !!v);
      el.setAttribute('aria-checked', v ? 'true' : 'false');
    }

    var h = register(key, !!value, opts, function (s) {
      return s === 'true' || s === '1' || s === true;
    }, paint);

    el.addEventListener('click', function () { h.set(!state[key]); });
    return h;
  }

  function color(key, value, opts) {
    opts = opts || {};
    var ui = labelled(opts.label || key, true);
    var el = document.createElement('input');
    el.className = 'at-twk-color';
    el.type = 'color';
    ui.row.appendChild(el);

    var h = register(key, value, opts, function (s, fallback) {
      return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : fallback;
    }, function (v) { el.value = v; });

    el.addEventListener('input', function () { h.set(el.value); });
    return h;
  }

  function text(key, value, opts) {
    opts = opts || {};
    var ui = labelled(opts.label || key, false);
    var el = document.createElement('input');
    el.className = 'at-twk-field';
    el.type = 'text';
    ui.row.appendChild(el);

    var h = register(key, value, opts, function (s) { return s; },
      function (v) { el.value = v; });

    el.addEventListener('input', function () { h.set(el.value); });
    return h;
  }

  /* Not a value — a thing to do. It holds no state and never re-fires on mount. */
  function action(label, onClick) {
    var g = target();
    var last = g.lastElementChild;
    var row = (last && last.classList.contains('at-twk-row')) ? last : null;
    if (!row) {
      row = document.createElement('div');
      row.className = 'at-twk-row';
      g.appendChild(row);
    }
    var b = document.createElement('button');
    b.className = 'at-twk-action';
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', function () { onClick(); });
    row.appendChild(b);
    return b;
  }

  /* ---------------- inference: the value picks the widget ---------------- */

  function add(key, value, opts) {
    opts = opts || {};
    if (opts.control) return byName(opts.control, key, value, opts);
    // pick() itself sends anything over three segments to the dropdown, so the count rule
    // lives in one place rather than being decided twice.
    if (Array.isArray(value)) return pick(key, value, opts);
    if (typeof value === 'boolean') return toggle(key, value, opts);
    if (typeof value === 'number') {
      // A range is what makes a slider readable. Without one there is no scale to drag
      // along, so an unbounded number is a field you type into.
      return (opts.max !== undefined) ? slider(key, value, opts) : stepper(key, value, opts);
    }
    if (typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value)) {
      return color(key, value, opts);
    }
    return text(key, value, opts);
  }

  function byName(name, key, value, opts) {
    if (name === 'pick') return pick(key, value, opts);
    if (name === 'select') return select(key, value, opts);
    if (name === 'slider') return slider(key, value, opts);
    if (name === 'stepper') return stepper(key, value, opts);
    if (name === 'toggle') return toggle(key, value, opts);
    if (name === 'color') return color(key, value, opts);
    if (name === 'text') return text(key, value, opts);
    throw new Error('atTweaks: unknown control ' + name);
  }

  /* ---------------- mounting ---------------- */

  function mount() {
    var t = all[current];
    if (!t) return;
    stage.innerHTML = '';
    // Clear first, render next frame, so entrance animations re-run.
    requestAnimationFrame(function () {
      stage.appendChild(t.content.cloneNode(true));
      // Re-fire every control so the freshly mounted markup gets its state applied without
      // every fragment writing its own re-apply-on-mount code.
      controls.forEach(function (c) { c.apply(); });
      // The stage now has content. Anything that measures the folio — the contrast verdict,
      // the checks — would otherwise be guessing at a delay, and measuring an empty
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
      var on = j === current;
      el.toggleAttribute('data-active', on);
      if (on) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
    if (variantSelect) variantSelect.value = String(current);

    writeUrl();

    var t = all[current];
    root.setAttribute('data-at-variant', t.getAttribute('data-variant') || '');
    root.setAttribute('data-at-variant-index', String(current + 1));
    publish();
    window.dispatchEvent(new CustomEvent('at:variant', { detail: { index: current } }));
    mount();
  }

  variantBtns.forEach(function (el, i) {
    el.addEventListener('click', function () { setActive(i); });
  });

  // Above three directions the chooser is a dropdown, for the same reason a tweak's is.
  if (variantSelect) {
    variantSelect.addEventListener('change', function () {
      setActive(parseInt(variantSelect.value, 10) || 0);
    });
  }

  if (replay) replay.addEventListener('click', mount);

  /* ---------------- collapse ---------------- */

  function setCollapsed(on) {
    root.toggleAttribute('data-at-tweaks-collapsed', on);
    try {
      var url = new URL(location);
      if (on) url.searchParams.set('tweaks', '0');
      else url.searchParams.delete('tweaks');
      history.replaceState(null, '', url);
    } catch (e) {}
    window.dispatchEvent(new Event('at:relayout'));
  }

  var closeBtn = panel.querySelector('.at-twk-x');
  if (closeBtn) closeBtn.addEventListener('click', function () { setCollapsed(true); });
  if (pill) pill.addEventListener('click', function () { setCollapsed(false); });

  /* When a file was built. Several confusing sessions came down to looking at a folio from
     before a fix and reasoning about behaviour that no longer existed; the answer was in a
     meta tag nothing displayed. */
  (function () {
    var m = document.querySelector('meta[name="folio-built"]');
    if (!m || !m.content || !note) return;
    var el = document.createElement('div');
    el.className = 'at-twk-built';
    el.textContent = 'built ' + m.content;
    note.appendChild(el);
  })();

  /* ---------------- driven from outside ----------------

     A device frame is a clone of this document, so it runs this same script. Rather than
     being rebuilt every time the host's state changes — which throws away the frame's
     scroll position, its typed input and any state the prototype itself holds — it is told
     what changed and applies it in place. */

  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.at !== 'sync') return;
    if (m.variantIndex) {
      var i = Math.min(parseInt(m.variantIndex, 10), all.length) - 1;
      if (i !== current) setActive(i);
    }
    if (m.tweaks) {
      controls.forEach(function (c) {
        if (!(c.key in m.tweaks) || state[c.key] === m.tweaks[c.key]) return;
        if (handles[c.key]) handles[c.key].set(m.tweaks[c.key]);
      });
    }
  });

  /* ---------------- the public surfaces ---------------- */

  var handles = {};

  function remember(key, h) { handles[key] = h; return h; }

  var api = {
    section: function (label) { openGroup = group(label); return api; },
    note: function (html) {
      if (!note) {
        note = document.createElement('div');
        note.className = 'at-twk-note';
        body.appendChild(note);
      }
      note.insertAdjacentHTML('afterbegin', html);
      return api;
    },
    add: function (key, value, opts) { return remember(key, add(key, value, opts)); },
    pick: function (key, options, opts) { return remember(key, pick(key, options, opts)); },
    select: function (key, options, opts) { return remember(key, select(key, options, opts)); },
    slider: function (key, value, opts) { return remember(key, slider(key, value, opts)); },
    stepper: function (key, value, opts) { return remember(key, stepper(key, value, opts)); },
    toggle: function (key, value, opts) { return remember(key, toggle(key, value, opts)); },
    color: function (key, value, opts) { return remember(key, color(key, value, opts)); },
    text: function (key, value, opts) { return remember(key, text(key, value, opts)); },
    action: action,
    get: function (key) { return state[key]; },
    set: function (key, value) {
      if (handles[key]) handles[key].set(value);
      return api;
    }
  };

  // Drain whatever the fragment queued against the head stub, in declaration order, then
  // become the real object. A queued call recorded the handle it returned; fill it in so a
  // fragment that kept one can still read and write through it.
  var queued = (window.atTweaks && window.atTweaks.__queue) || [];
  queued.forEach(function (call) {
    var out = api[call.method] ? api[call.method].apply(api, call.args) : null;
    if (call.handle && out) {
      call.handle.get = out.get;
      call.handle.set = out.set;
    }
  });
  window.atTweaks = api;

  /* The slot other harness widgets add to. viewport.js puts its device readout here and
     checks.js its verdicts, rather than each floating a bar of its own, so every "what am I
     looking at" control lives in one card. */
  window.__atTweaks = {
    /* A named tab's container. Asking for one reveals its tab — a tab over an empty pane is
       a control that opens nothing, so a folio built without checks or without the comment
       widget shows no tab for it. */
    pane: function (key) {
      if (!panes[key]) return null;
      showTab(key);
      return panes[key];
    },
    /* Reveal a pane AND put it on screen, opening the panel if it is a pill. Entering
       comment mode calls this: the comments are in here now, so a review that started with
       a keypress or the docked button has to bring its own surface up. */
    show: function (key) {
      if (!panes[key]) return;
      showTab(key);
      selectTab(key);
      setCollapsed(false);
    },
    group: group,
    row: function (g) {
      var r = document.createElement('div');
      r.className = 'at-twk-row';
      g.appendChild(r);
      return r;
    },
    item: function (parent, label, onClick) {
      var b = document.createElement('button');
      b.className = 'at-twk-opt';
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', function () { onClick(b); });
      parent.appendChild(b);
      return b;
    }
  };

  /* ---------------- boot ---------------- */

  if (!root.hasAttribute('data-at-embedded')) {
    if (q.get('tweaks') === '0') root.setAttribute('data-at-tweaks-collapsed', '');
    // tweaks.js is inlined before the widget scripts, so dock.js's helpers do not exist
    // yet. A timeout runs after every inline script has executed.
    setTimeout(function () {
      // Both surfaces move with the same helper the floating buttons use, and are
      // remembered in the same store.
      if (window.__atDrag) {
        window.__atDrag(panel, panel.querySelector('.at-twk-head'), 'tweaks', 'tr');
      }
      if (pill && window.__atDock) {
        // Slot 1: the comment toggle owns slot 0 on this edge, and two controls in one
        // corner is how the pill ended up printed through the comment glyph.
        window.__atDock(pill, 'tweaks-pill', 'right', 1);
        // __atDock stamps .at-dock, which is a 30px circle. The pill has to say the word
        // "Tweaks", so it keeps the dragging and the remembered edge and drops the shape.
        pill.classList.remove('at-dock');
      }
    }, 0);
  }

  var v0 = parseInt(root.getAttribute('data-at-variant-init'), 10) ||
    parseInt(q.get('v'), 10) || 1;
  setActive(Math.min(Math.max(v0, 1), all.length) - 1);
})();
