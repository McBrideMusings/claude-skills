/* checks.js — the standing verdicts in the rail.

   Everything here is arithmetic on the DOM: no judgement, no guessing, no advice. A
   check earns its row only if it can be wrong in a way you can verify by looking, which
   is why colour-only signalling, focus quality and motion appropriateness are absent —
   each needs a human, and a check that guesses is worse than no check at all.

   They run against whatever document currently holds the handout: the page itself, or
   the device frame when one is up. Each returns { state, note, detail }, where detail is
   the list the row reveals when you click it.

   The thresholds and where they come from:

   - Contrast 4.5:1 / 3:1 large — WCAG 2.1 SC 1.4.3, delegated to contrast.js.
   - Tap target 24x24 — WCAG 2.2 SC 2.5.8 (AA). Apple's HIG asks 44x44; 24 is the
     standards floor, so that is what is enforced and 44 is what the note mentions.
   - Text size 12px — NOT a WCAG rule. WCAG sets no minimum size, only that text must
     survive being resized. 12px is a house floor for a prototype being judged on a
     laptop, and the row says so rather than implying a standard exists.
   - Everything else is a defect with no threshold to argue about: the page scrolls
     sideways or it does not; an id is duplicated or it is not. */

(function () {
  var root = document.documentElement;
  if (root.hasAttribute('data-at-embedded')) return;   // the host owns the verdicts
  if (!window.__atRail) return;                        // no rail, nowhere to put them

  var INTERACTIVE = 'a[href], button, input, select, textarea, [role="button"], ' +
    '[role="link"], [role="tab"], [role="switch"], [role="checkbox"], [tabindex]';

  /* The harness is not the handout. Every check has to exclude it or it reports on the
     rail's own step buttons and the comment panel's chrome — which is how the first run
     of the tap-target check confidently failed a prototype for the size of MY buttons. */
  var CHROME = '.at-rail, .at-rail-reopen, .at-panel, .at-composer, .at-notes-layer, ' +
    '.at-cx-layer, .at-vp, .at-vp-host, .at-theme, .at-annotate-toggle';

  function mine(el) { return !el.closest(CHROME); }

  function pick(doc, selector) {
    return [].slice.call(doc.querySelectorAll(selector)).filter(mine);
  }

  var MIN_TAP = 24;      // WCAG 2.2 SC 2.5.8, AA
  var COMFY_TAP = 44;    // Apple HIG, quoted in the note but not enforced
  var MIN_TEXT = 12;     // house floor; WCAG has no minimum size

  function visible(el, win) {
    var cs = win.getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) {
      return false;
    }
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  /* WCAG 2.2 SC 2.5.8 exempts a target "in a sentence or otherwise constrained by the
     line-height of non-target text". Without this the check fails every prototype that
     has a link in a paragraph, which is every prototype — and a check that always cries
     wolf gets ignored along with the ones that mean it. */
  function inlineInText(el, win) {
    // Links only. A <button> is a discrete control whatever text surrounds it, and
    // exempting buttons here made a 16x16 icon button in a paragraph — the exact case
    // this check exists for — report as fine.
    if (!/^a$/i.test(el.tagName)) return false;
    if (!/^inline/.test(win.getComputedStyle(el).display)) return false;
    var p = el.parentElement;
    if (!p) return false;
    var own = (p.textContent || '').replace(/\s+/g, ' ').trim();
    var mine_ = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return own.length > mine_.length;   // there is other text around it
  }

  function label(el) {
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (t) return t.slice(0, 40);
    return '<' + el.tagName.toLowerCase() +
      (el.className && typeof el.className === 'string'
        ? '.' + el.className.split(/\s+/)[0] : '') + '>';
  }

  /* --- the checks ---------------------------------------------------------- */

  var CHECKS = [
    {
      key: 'contrast',
      name: 'Contrast',
      why: 'Body text 4.5:1, large text 3:1 (WCAG 2.1 SC 1.4.3)',
      run: function (_doc, win) {
        if (!win.atContrast) return null;
        var r = win.atContrast.check(false);
        return {
          state: r.failed ? 'fail' : 'pass',
          note: r.failed ? r.failed + ' of ' + r.tested + ' fail AA'
                         : 'all ' + r.tested + ' pass AA',
          reveal: function () { win.atContrast.mode(true); }
        };
      }
    },
    {
      key: 'overflow',
      name: 'Overflow',
      why: 'Nothing pushes the page sideways',
      run: function (doc, win) {
        // The stage is the scrolling box outside a device frame — it is the element with
        // overflow:auto, so the document never scrolls and reading documentElement said
        // "no sideways scroll" while 1800px of content hung off the side of the stage.
        var box = doc.getElementById('at-stage') || doc.scrollingElement || doc.documentElement;
        var over = box.scrollWidth - box.clientWidth;
        if (over <= 1) return { state: 'pass', note: 'no sideways scroll' };
        /* The limit is the box's right EDGE in viewport coordinates, not its width.
           Comparing a rect's .right against clientWidth counted the stage's own left
           offset as overflow, so every paragraph on an indented stage looked too wide. */
        var boxLeft = box.getBoundingClientRect ? box.getBoundingClientRect().left : 0;
        var limit = boxLeft + box.clientWidth + 1;
        var over_ = pick(doc, 'body *').filter(function (el) {
          if (!visible(el, win)) return false;
          return el.getBoundingClientRect().right > limit;
        });
        /* Report the element that is actually too wide, not its ancestors. A flex item
           refuses to shrink below max-content, so one 1800px child makes every wrapper
           above it 1800px too and the list fills with the page's own paragraphs. */
        var culprits = over_.filter(function (el) {
          return !over_.some(function (other) { return other !== el && el.contains(other); });
        }).map(label);
        return {
          state: 'fail',
          note: over + 'px of sideways scroll',
          detail: culprits.slice(0, 8)
        };
      }
    },
    {
      key: 'tap',
      name: 'Tap targets',
      why: 'Interactive elements at least ' + MIN_TAP + '×' + MIN_TAP +
           ' (WCAG 2.2 SC 2.5.8). ' + COMFY_TAP + '×' + COMFY_TAP + ' is Apple\'s comfort size.',
      run: function (doc, win) {
        var els = pick(doc, INTERACTIVE)
          .filter(function (el) { return visible(el, win); });
        var small = els.filter(function (el) {
          if (inlineInText(el, win)) return false;
          var r = el.getBoundingClientRect();
          return r.width < MIN_TAP || r.height < MIN_TAP;
        });
        if (!els.length) return { state: 'skip', note: 'no controls on screen' };
        if (!small.length) {
          var tight = els.filter(function (el) {
            if (inlineInText(el, win)) return false;
            var r = el.getBoundingClientRect();
            return r.width < COMFY_TAP || r.height < COMFY_TAP;
          });
          return {
            state: 'pass',
            note: tight.length ? els.length + ' pass, ' + tight.length + ' under 44px'
                               : 'all ' + els.length + ' at least 44px'
          };
        }
        return {
          state: 'fail',
          note: small.length + ' of ' + els.length + ' under ' + MIN_TAP + 'px',
          detail: small.slice(0, 8).map(function (el) {
            var r = el.getBoundingClientRect();
            return label(el) + ' — ' + Math.round(r.width) + '×' + Math.round(r.height);
          })
        };
      }
    },
    {
      key: 'textsize',
      name: 'Text size',
      why: 'House floor of ' + MIN_TEXT + 'px. WCAG sets no minimum size, only that ' +
           'text must survive being resized — this is a legibility call, not a standard.',
      run: function (doc, win) {
        var small = [];
        var all = doc.querySelectorAll('body *');
        for (var i = 0; i < all.length; i++) {
          var el = all[i];
          if (!mine(el)) continue;
          var own = false;
          for (var j = 0; j < el.childNodes.length; j++) {
            if (el.childNodes[j].nodeType === 3 && el.childNodes[j].textContent.trim()) {
              own = true; break;
            }
          }
          if (!own || !visible(el, win)) continue;
          var px = parseFloat(win.getComputedStyle(el).fontSize);
          if (px < MIN_TEXT) small.push(label(el) + ' — ' + px.toFixed(1) + 'px');
        }
        return small.length
          ? { state: 'fail', note: small.length + ' under ' + MIN_TEXT + 'px',
              detail: small.slice(0, 8) }
          : { state: 'pass', note: 'nothing under ' + MIN_TEXT + 'px' };
      }
    },
    {
      key: 'deadlinks',
      name: 'Dead links',
      why: 'Links that go nowhere. Only the detectable kind: href="#", href="", or no ' +
           'href at all. A button whose handler does nothing cannot be seen from here.',
      run: function (doc) {
        var dead = pick(doc, 'a').filter(function (a) {
          var h = a.getAttribute('href');
          return h === null || h === '' || h === '#';
        });
        return dead.length
          ? { state: 'fail', note: dead.length + ' link' + (dead.length > 1 ? 's' : '') +
              ' go nowhere', detail: dead.slice(0, 8).map(label) }
          : { state: 'pass', note: 'no placeholder links' };
      }
    },
    {
      key: 'alt',
      name: 'Image alt',
      why: 'Every <img> carries alt text, or alt="" if it is decorative',
      run: function (doc) {
        var imgs = pick(doc, 'img');
        if (!imgs.length) return { state: 'skip', note: 'no images' };
        var missing = imgs.filter(function (i) { return i.getAttribute('alt') === null; });
        return missing.length
          ? { state: 'fail', note: missing.length + ' of ' + imgs.length + ' missing alt',
              detail: missing.slice(0, 8).map(function (i) {
                return (i.getAttribute('src') || '(no src)').slice(0, 40);
              }) }
          : { state: 'pass', note: 'all ' + imgs.length + ' have alt' };
      }
    },
    {
      key: 'ids',
      name: 'Duplicate ids',
      why: 'A repeated id breaks <label for>, aria-labelledby and every other reference',
      run: function (doc) {
        var seen = {}, dupes = {};
        var all = pick(doc, '[id]');
        for (var i = 0; i < all.length; i++) {
          var id = all[i].id;
          if (!id) continue;
          if (seen[id]) dupes[id] = (dupes[id] || 1) + 1;
          seen[id] = true;
        }
        var keys = Object.keys(dupes);
        return keys.length
          ? { state: 'fail', note: keys.length + ' id' + (keys.length > 1 ? 's' : '') +
              ' used more than once',
              detail: keys.slice(0, 8).map(function (k) { return '#' + k + ' ×' + dupes[k]; }) }
          : { state: 'pass', note: 'every id unique' };
      }
    },
    {
      key: 'hermetic',
      name: 'Hermetic',
      why: 'No network request of any kind. An handout has to render identically ' +
           'offline and in five years.',
      run: function (doc) {
        var bad = [];
        pick(doc, 'link[href], script[src], img[src], ' +
          'source[src], video[src], audio[src], iframe[src]').forEach(function (el) {
          var url = el.getAttribute('href') || el.getAttribute('src') || '';
          if (/^(https?:)?\/\//i.test(url)) bad.push(el.tagName.toLowerCase() + ' → ' + url.slice(0, 46));
        });
        pick(doc, 'style').forEach(function (s) {
          var m = (s.textContent || '').match(/@import\s+url\(([^)]*)\)/i);
          if (m && /^["']?(https?:)?\/\//i.test(m[1])) bad.push('@import → ' + m[1].slice(0, 46));
        });
        return bad.length
          ? { state: 'fail', note: bad.length + ' remote reference' +
              (bad.length > 1 ? 's' : ''), detail: bad.slice(0, 8) }
          : { state: 'pass', note: 'no network requests' };
      }
    }
  ];

  /* --- where the handout currently lives ---------------------------------- */

  function target() {
    if (root.hasAttribute('data-at-vp')) {
      var f = document.querySelector('.at-vp-frame');
      try {
        if (f && f.contentWindow && f.contentDocument) {
          return { doc: f.contentDocument, win: f.contentWindow };
        }
      } catch (e) {}
    }
    return { doc: document, win: window };
  }

  /* --- the rail group ------------------------------------------------------ */

  var rows = {};
  var group = null;

  // Deferred so the device group, added by viewport.js, lands above this one: the rail
  // runs coarse to fine down the column, and a verdict is not a control.
  setTimeout(function () {
    group = window.__atRail.group('Checks');
    CHECKS.forEach(function (c) {
      var row = document.createElement('button');
      row.className = 'at-check';
      row.type = 'button';
      row.title = c.why;
      row.innerHTML =
        '<span class="at-check-mark"></span>' +
        '<span class="at-check-body"><span class="at-check-name">' + c.name + '</span>' +
        '<span class="at-check-note">checking…</span></span>';
      group.appendChild(row);
      rows[c.key] = row;
    });
    var detail = document.createElement('div');
    detail.className = 'at-check-detail';
    detail.hidden = true;
    group.appendChild(detail);
    rows.__detail = detail;
    runAll();
  }, 0);

  var openKey = null;

  function showDetail(c, result) {
    var box = rows.__detail;
    if (openKey === c.key) { openKey = null; box.hidden = true; paint(); return; }
    openKey = c.key;
    if (c.key === 'contrast' && result.reveal) { result.reveal(); }
    box.hidden = false;
    box.innerHTML = '<div class="at-check-detail-head">' + c.name + '</div>' +
      (result.detail && result.detail.length
        ? result.detail.map(function () {
            return '<div class="at-check-detail-row"></div>';
          }).join('')
        : '<div class="at-check-detail-row"></div>');
    var slots = box.querySelectorAll('.at-check-detail-row');
    var lines = (result.detail && result.detail.length) ? result.detail : [c.why];
    for (var i = 0; i < slots.length; i++) slots[i].textContent = lines[i];
    paint();
  }

  var last = {};

  function paint() {
    CHECKS.forEach(function (c) {
      var row = rows[c.key];
      var r = last[c.key];
      if (!row || !r) return;
      row.setAttribute('data-state', r.state);
      row.toggleAttribute('data-open', openKey === c.key);
      row.querySelector('.at-check-mark').textContent =
        r.state === 'fail' ? '!' : (r.state === 'skip' ? '–' : '✓');
      row.querySelector('.at-check-note').textContent = r.note;
    });
  }

  function runAll() {
    var t = target();
    CHECKS.forEach(function (c) {
      var r;
      try { r = c.run(t.doc, t.win); } catch (e) { r = null; }
      last[c.key] = r || { state: 'skip', note: 'not available' };
      var row = rows[c.key];
      if (row && !row.__wired) {
        row.__wired = true;
        row.addEventListener('click', function () { showDetail(c, last[c.key]); });
      }
    });
    if (openKey && rows.__detail && !rows.__detail.hidden) {
      var cur = CHECKS.filter(function (c) { return c.key === openKey; })[0];
      if (cur) { openKey = null; showDetail(cur, last[cur.key]); }
    }
    paint();
  }

  /* Run when there is something to measure — never on a timer. at:variant and at:device
     both fire before the stage has been filled, so timing them measured an empty
     document and reported everything green. */
  window.addEventListener('at:mounted', runAll);
  window.addEventListener('message', function (e) {
    if (e.data && e.data.at === 'mounted') runAll();
  });
  window.addEventListener('at:axis', function () { requestAnimationFrame(runAll); });
  window.addEventListener('resize', function () {
    clearTimeout(runAll.t);
    runAll.t = setTimeout(runAll, 200);
  });

  window.atChecks = {
    run: function () { runAll(); return last; },
    results: function () { return last; }
  };
})();
