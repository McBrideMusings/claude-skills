/* tweaks.js — the floating Tweaks panel: the variant chooser and the fragment's own controls.

   A FRAGMENT DECLARES THE VALUE, NOT THE WIDGET. The control is chosen by the type of the
   value being tweaked — a boolean is a switch, a bounded number is a slider, a hex string
   is a colour well, a list is a picker:

       atTweaks.add('gap', 12, { max: 40, unit: 'px', onChange: function (v) { … } });
       atTweaks.add('screen', ['home', 'chat'], { onChange: function (v) { … } });
       atTweaks.add('dark', false, { onChange: function (v) { … } });

   `atTweaks.toggle/slider/stepper/color/pick/select/text/action` name a widget outright
   when the inference gets it wrong.

   THE PANEL ANSWERS NO KEYS. A prototype is a working interface with keys of its own; the
   design gets the whole keyboard, the harness gets the mouse.

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
  var pill = document.querySelector('.at-twk-pill');
  var variantBtns = [].slice.call(panel.querySelectorAll('.at-twk-variant'));
  var variantSelect = panel.querySelector('.at-twk-variant-select');
  var replay = panel.querySelector('.at-twk-replay');
  var current = 0;          // which variant is mounted
  var state = {};           // tweak key -> live value, survives every variant swap
  var defaults = {};        // tweak key -> the value the fragment declared
  var controls = [];        // [{ key, apply }] in declaration order

  var q = new URLSearchParams(location.search);

  function seedFor(key) {
    return q.has(key) ? q.get(key) : undefined;
  }

  /* ---------------- url ---------------- */

  function writeUrl() {
    try {
      var url = new URL(location);
      url.searchParams.set('v', current + 1);
      /* Only carry what the reader actually changed. Writing a value that still
         equals its default pins it: reopening that URL after the fragment's
         default moves would silently serve the old number, and a reader who
         never touched a control would be looking at a stale build's settings. */
      Object.keys(state).forEach(function (k) {
        if (String(state[k]) === String(defaults[k])) url.searchParams.delete(k);
        else url.searchParams.set(k, String(state[k]));
      });
      history.replaceState(null, '', url);
    } catch (e) {}
  }

  /* ---------------- the panel's own shape ---------------- */

  function group(label) {
    var g = document.createElement('div');
    g.className = 'at-twk-group';
    if (label) {
      var l = document.createElement('div');
      l.className = 'at-twk-label';
      l.textContent = label;
      g.appendChild(l);
    }
    body.appendChild(g);
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
     at declaration and again after every mount, and keeps the URL in step. `coerce` turns
     the string a URL gives back into the value's own type — without it a slider seeded from
     ?gap=12 hands the fragment "12". */
  function register(key, initial, opts, coerce, paint) {
    var seed = seedFor(key);
    var value = seed === undefined ? initial : coerce(seed, initial);
    state[key] = value;
    defaults[key] = initial;

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
        writeUrl();
        apply();
      }
    };

    controls.push({ key: key, apply: apply });
    if (paint) paint(value);
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
  }

  var closeBtn = panel.querySelector('.at-twk-x');
  if (closeBtn) closeBtn.addEventListener('click', function () { setCollapsed(true); });
  if (pill) pill.addEventListener('click', function () { setCollapsed(false); });

  /* ---------------- the public surfaces ---------------- */

  var handles = {};

  function remember(key, h) { handles[key] = h; return h; }

  var api = {
    section: function (label) { openGroup = group(label); return api; },
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

  /* ---------------- boot ---------------- */

  if (q.get('tweaks') === '0') root.setAttribute('data-at-tweaks-collapsed', '');

  var v0 = parseInt(q.get('v'), 10) || 1;
  setActive(Math.min(Math.max(v0, 1), all.length) - 1);
})();
