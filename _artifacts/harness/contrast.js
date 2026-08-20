/* contrast.js — press `c` to flag text that fails WCAG AA against what is behind it.

   This widget exists because it is the one judgement your eye cannot make. Dim secondary
   text on a good display at night looks deliberate; the same text is unreadable on a
   laptop in a bright room. The ratio is arithmetic, so the harness can just do it.

   Thresholds: 4.5:1 for body text, 3:1 for large text (>=24px, or >=18.66px bold), per
   WCAG 2.1 SC 1.4.3. Elements whose text sits on an image or a gradient are skipped
   rather than guessed at — a wrong number is worse than no number.

   Dormant by default: no chrome renders until the key is pressed. */

(function () {
  var root = document.documentElement;
  var on = false;

  var layer = document.createElement('div');
  layer.className = 'at-cx-layer';
  document.body.appendChild(layer);

  function parseColor(s) {
    var m = /^rgba?\(([^)]+)\)$/.exec(s || '');
    if (!m) return null;
    var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    if (p.length < 3 || p.some(isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }

  function over(fg, bg) {
    var a = fg.a + bg.a * (1 - fg.a);
    if (!a) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
      g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
      b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
      a: a
    };
  }

  function lum(c) {
    var v = [c.r, c.g, c.b].map(function (x) {
      x /= 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }

  function ratio(a, b) {
    var l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  /* Walk up compositing backgrounds until opaque. Returns null when something in the
     stack paints an image or gradient — those are not a flat colour to measure against. */
  function backdrop(el) {
    var acc = { r: 0, g: 0, b: 0, a: 0 };
    var node = el;
    while (node && node.nodeType === 1) {
      var cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      var c = parseColor(cs.backgroundColor);
      if (c && c.a) {
        acc = over(acc, c);
        if (acc.a >= 0.999) return acc;
      }
      node = node.parentElement;
    }
    var page = parseColor(getComputedStyle(document.body).backgroundColor);
    var base = page && page.a >= 0.999 ? page : { r: 255, g: 255, b: 255, a: 1 };
    return over(acc, base);
  }

  function hasOwnText(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    }
    return false;
  }

  /* `c` checks the artifact. The harness's own chrome is excluded — it is not the design
     under review — but excluded means unchecked, and the rail shipped text at 2.0-3.9:1
     with nothing to say so. window.atContrast.check(true) audits the chrome; it has no
     key because its result is for whoever maintains the harness, not for whoever is
     judging a prototype. */
  var CHROME = '.at-panel, .at-notes-layer, .at-vp, .at-rail, .at-rail-reopen, ' +
    '.at-composer, .at-theme, .at-oc, .at-vp-size';

  function check(chromeOnly) {
    layer.innerHTML = '';
    var all = document.querySelectorAll('body *');
    var tested = 0, failed = 0, skipped = 0, items = [];

    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.closest('.at-cx-layer')) continue;
      var inChrome = !!el.closest(CHROME);
      if (chromeOnly ? !inChrome : inChrome) continue;
      if (!hasOwnText(el)) continue;

      var cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;

      var fg = parseColor(cs.color);
      var bg = backdrop(el);
      if (!fg) continue;
      if (!bg) { skipped++; continue; }
      if (fg.a < 1) fg = over(fg, bg);

      var px = parseFloat(cs.fontSize);
      var bold = (parseInt(cs.fontWeight, 10) || 400) >= 700;
      var large = px >= 24 || (bold && px >= 18.66);
      var need = large ? 3 : 4.5;
      var got = ratio(fg, bg);
      tested++;
      items.push({
        src: el.getAttribute('data-src') || '',
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        ratio: Math.round(got * 100) / 100,
        need: need,
        pass: got >= need
      });
      if (got >= need) continue;
      failed++;

      var ring = document.createElement('div');
      ring.className = 'at-cx-ring';
      ring.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' +
        r.width + 'px;height:' + r.height + 'px';
      var badge = document.createElement('span');
      badge.className = 'at-cx-badge';
      if (got >= need - 1) badge.setAttribute('data-level', 'warn');
      badge.textContent = got.toFixed(1) + ':1 need ' + need;
      badge.style.cssText = 'left:' + Math.max(2, r.left) + 'px;top:' +
        Math.max(2, r.top - 16) + 'px';
      layer.appendChild(ring);
      layer.appendChild(badge);
    }

    return { tested: tested, failed: failed, skipped: skipped, items: items };
  }

  function setMode(next, chromeOnly) {
    on = next;
    if (!on) {
      root.removeAttribute('data-at-contrast');
      layer.innerHTML = '';
      return;
    }
    root.setAttribute('data-at-contrast', '');
    check(chromeOnly);
  }

  document.addEventListener('keydown', function (e) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'c' || e.key === 'C') { e.preventDefault(); setMode(!on, false); }
    else if (e.key === 'Escape' && on) setMode(false);
  });

  /* Programmatic surface — same reason as annotate's: the check must be runnable
     without a keypress, by a test or by an agent auditing its own artifact. */
  window.atContrast = {
    mode: function (next) { setMode(next === undefined ? !on : !!next); return on; },
    check: function (chromeOnly) {
      var was = on;
      if (!was) root.setAttribute('data-at-contrast', '');
      var r = check(!!chromeOnly);
      if (!was) { root.removeAttribute('data-at-contrast'); layer.innerHTML = ''; }
      return r;
    }
  };

  var pending = false;
  function refresh() {
    if (!on || pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; check(); });
  }
  window.addEventListener('scroll', refresh, true);
  window.addEventListener('resize', refresh);
  window.addEventListener('at:variant', refresh);
})();
