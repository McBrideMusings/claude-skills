/* viewport.js — see the artifact at real device sizes, in real device chrome.

   Why an iframe and not a width-constrained div: CSS media queries answer to the
   *viewport*, not to the box an element sits in. A 390px-wide <div> shows a squeezed
   desktop layout and reports itself as a phone — which is exactly the wrong answer for
   the one thing a device switcher exists to check. An iframe has its own viewport, so
   `@media (max-width: 640px)` fires inside it for real.

   The frame's document is a clone of this page, serialized into srcdoc. That keeps the
   artifact hermetic (no second file, no fetch, no server) and means every harness widget
   — annotate included — is already present inside the frame. The clone is marked
   data-at-embedded so it renders no nested chrome, and carries data-at-key so comments
   made inside the frame land in the same storage bucket as comments made outside it.

   CHROME SITS ON WHICHEVER SIDE OF THE VIEWPORT IT REALLY SITS ON. This is the whole
   reason chrome is the harness's job and not the fragment's:

   - A phone/tablet status bar and home indicator are INSIDE the viewport. Content
     scrolls under them and they overlap the app's own top bar. They are injected into
     the clone, and the space they occupy is published as --at-safe-top /
     --at-safe-bottom so a layout can reserve it.
   - A desktop window's title bar and a browser's tab+URL bar are OUTSIDE the viewport.
     A web page cannot see them and must never lay itself out around them. They are drawn
     in the host document, around the iframe.

   Which devices appear is declared per-artifact by `artifact build --devices`, read here
   off data-at-devices. There is no sensible default: whether a prototype has anything to
   say at phone width is a property of that prototype. */

(function () {
  var root = document.documentElement;

  /* Inside a frame: no nested frames, but the keyboard has to be given back.
     Clicking a device frame moves focus into the iframe, and from then on every keypress
     belongs to that document — so the rail's keys, and `a` and `c`, all silently stop
     working the moment you interact with the thing you are reviewing. The frame is
     same-origin, so it forwards what it is not going to use itself up to the host, which
     re-dispatches it as if the host had focus. A key typed into one of the prototype's
     own fields is left alone. */
  if (root.hasAttribute('data-at-embedded')) {
    document.addEventListener('keydown', function (e) {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Only the keys the HOST owns. `a` and `c` stay in the frame: annotating and the
      // contrast check are about the framed document, and comments made inside it land
      // in the same bucket anyway.
      if (!/^([0-9]|[xXrRdD]|\[|\]|,|\.|<|>|\\|\?)$/.test(e.key) &&
          e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      try { parent.postMessage({ at: 'key', key: e.key }, '*'); } catch (err) {}
    });
    return;
  }

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.at !== 'key') return;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: e.data.key, bubbles: true }));
  });

  var CATALOG = {
    fit:     { label: 'Fit',     w: 0,    h: 0,    chrome: null,      rotates: false },
    phone:   { label: 'Phone',   w: 390,  h: 844,  chrome: 'ios',     rotates: true, notch: true, radius: 46 },
    tablet:  { label: 'Tablet',  w: 834,  h: 1194, chrome: 'ios',     rotates: true, notch: false, radius: 20 },
    desktop: { label: 'Desktop', w: 1440, h: 900,  chrome: 'macos',   rotates: false, radius: 10 },
    web:     { label: 'Web',     w: 1440, h: 900,  chrome: 'browser', rotates: false, radius: 10 }
  };

  /* Which parts of the macOS window the desktop frame draws. Build-time, from --window,
     because whether the design owns its own title area is a property of the thing being
     prototyped rather than something to flip while looking at it. Default is neither:
     a full-size-content-view app draws its own top area, and a generic title bar stapled
     over it is chrome nobody designed. */
  var win = (root.getAttribute('data-at-window') || '')
    .split(',').map(function (s) { return s.trim(); });
  var WIN_BAR = win.indexOf('bar') >= 0;
  var WIN_LIGHTS = win.indexOf('lights') >= 0;

  // Declared here because both the title bar (outside the viewport) and the
  // full-size-content-view overlay (inside it) build markup from it.
  var LIGHTS =
    '<span class="at-oc-dot" style="background:#ff5f57"></span>' +
    '<span class="at-oc-dot" style="background:#febc2e"></span>' +
    '<span class="at-oc-dot" style="background:#28c840"></span>';

  var names = (root.getAttribute('data-at-devices') || 'fit,phone,tablet,desktop')
    .split(',').map(function (s) { return s.trim(); }).filter(function (s) { return CATALOG[s]; });
  if (names.indexOf('fit') < 0) names.unshift('fit');
  if (names.length < 2) return;

  var current = 0;
  var landscape = false;
  var actual = false;          // 1:1 — show the frame at its real size and scroll to it
  var host = null;
  var frame = null;
  var shell = null;
  var deviceBtns = [];
  var rotateBtn = null;
  var actualBtn = null;
  var sizeLabel = null;

  /* Every bit of frame state belongs in the URL, so a phone-landscape view of variant 2
     is a link. Rotate used to call apply() directly and skipped this, which meant the
     one control whose result you would most want to send someone was the one that did
     not survive being sent. */
  function writeDeviceUrl() {
    try {
      var url = new URL(location);
      url.searchParams.set('d', names[current] + (landscape ? '-landscape' : ''));
      if (actual) url.searchParams.set('zoom', '1');
      else url.searchParams.delete('zoom');
      history.replaceState(null, '', url);
    } catch (e) {}
  }

  function toggleRotate() {
    if (!CATALOG[names[current]].rotates) return;
    landscape = !landscape;
    paintControls();
    writeDeviceUrl();
    apply();
  }

  function toggleActual() {
    actual = !actual;
    paintControls();
    writeDeviceUrl();
    fit();
  }

  /* ---------------- controls: into the rail when there is one ---------------- */

  var rail = window.__atRail;
  if (rail) {
    var g = rail.group('Device');
    var row = rail.row(g);
    names.forEach(function (n, i) {
      deviceBtns.push(rail.item(row, CATALOG[n].label, function () { select(i); }));
    });
    /* Rotate and 1:1 are not devices — they change how the chosen frame is shown, not
       which frame it is. Given the same chip treatment they read as two more frames in
       the list. They sit on the readout line instead, with the numbers they change. */
    var readout = document.createElement('div');
    readout.className = 'at-vp-readout';
    sizeLabel = document.createElement('span');
    sizeLabel.className = 'at-vp-size';
    readout.appendChild(sizeLabel);

    rotateBtn = document.createElement('button');
    rotateBtn.className = 'at-vp-mod';
    rotateBtn.type = 'button';
    rotateBtn.title = 'Rotate';
    rotateBtn.setAttribute('aria-label', 'Rotate');
    rotateBtn.innerHTML = '&#8635;';
    rotateBtn.addEventListener('click', toggleRotate);

    actualBtn = document.createElement('button');
    actualBtn.className = 'at-vp-mod';
    actualBtn.type = 'button';
    actualBtn.title = 'Show at actual size';
    actualBtn.textContent = '1:1';
    actualBtn.addEventListener('click', toggleActual);

    readout.appendChild(rotateBtn);
    readout.appendChild(actualBtn);
    g.appendChild(readout);
  } else {
    var bar = document.createElement('nav');
    bar.className = 'at-vp';
    bar.setAttribute('aria-label', 'Viewport size');
    names.forEach(function (n, i) {
      var b = document.createElement('button');
      b.className = 'at-vp-item';
      b.type = 'button';
      b.textContent = CATALOG[n].label;
      b.addEventListener('click', function () { select(i); });
      bar.appendChild(b);
      deviceBtns.push(b);
    });
    var divider = document.createElement('span');
    divider.className = 'at-vp-divider';
    divider.setAttribute('aria-hidden', 'true');
    rotateBtn = document.createElement('button');
    rotateBtn.className = 'at-vp-item at-vp-rotate';
    rotateBtn.type = 'button';
    rotateBtn.setAttribute('aria-label', 'Rotate');
    rotateBtn.innerHTML = '&#8635;';
    rotateBtn.addEventListener('click', toggleRotate);
    actualBtn = document.createElement('button');
    actualBtn.className = 'at-vp-item';
    actualBtn.type = 'button';
    actualBtn.textContent = '1:1';
    actualBtn.addEventListener('click', toggleActual);
    bar.appendChild(actualBtn);
    sizeLabel = document.createElement('span');
    sizeLabel.className = 'at-vp-size';
    bar.appendChild(divider);
    bar.appendChild(rotateBtn);
    bar.appendChild(sizeLabel);
    document.body.appendChild(bar);
  }

  function paintControls() {
    deviceBtns.forEach(function (b, j) { b.toggleAttribute('data-active', j === current); });
    var d = CATALOG[names[current]];
    if (rotateBtn) {
      rotateBtn.toggleAttribute('disabled', !d.rotates);
      rotateBtn.toggleAttribute('data-active', d.rotates && landscape);
    }
    if (actualBtn) {
      actualBtn.toggleAttribute('disabled', !d.w);
      actualBtn.toggleAttribute('data-active', !!d.w && actual);
    }
  }

  function select(i) {
    current = i;
    if (!CATALOG[names[i]].rotates) landscape = false;
    paintControls();
    writeDeviceUrl();
    apply();
  }

  function stepDevice(delta) {
    select((current + delta + names.length) % names.length);
  }

  /* ---------------- inside-the-viewport chrome ---------------- */

  var IOS_BAR =
    '<div class="at-dc at-dc-ios" aria-hidden="true">' +
    '<span class="at-dc-time">9:41</span>' +
    '<span class="at-dc-icons">' +
    '<svg width="17" height="11" viewBox="0 0 17 11"><path fill="currentColor" d="M1 7h2v4H1zM5 5h2v6H5zM9 3h2v8H9zM13 0h2v11h-2z"/></svg>' +
    '<svg width="16" height="11" viewBox="0 0 16 11"><path fill="currentColor" d="M8 2.2c2 0 3.8.8 5.1 2l1.3-1.4A9.3 9.3 0 0 0 8 .2 9.3 9.3 0 0 0 1.6 2.8L2.9 4.2A7.3 7.3 0 0 1 8 2.2zm0 3.4c1.1 0 2.1.4 2.9 1.2l1.3-1.4A6.1 6.1 0 0 0 8 3.6c-1.6 0-3.1.6-4.2 1.8l1.3 1.4A4.1 4.1 0 0 1 8 5.6zM8 8l1.8 2H6.2z"/></svg>' +
    '<svg width="25" height="11" viewBox="0 0 25 11"><rect x="0.5" y="0.5" width="20" height="10" rx="3" stroke="currentColor" fill="none" opacity=".5"/>' +
    '<rect x="2" y="2" width="17" height="7" rx="1.5" fill="currentColor"/>' +
    '<path d="M22.5 4v3a2 2 0 0 0 0-3z" fill="currentColor" opacity=".5"/></svg>' +
    '</span></div>';

  var HOME_BAR = '<div class="at-dc at-dc-home" aria-hidden="true"><span></span></div>';

  /* Traffic lights with no title bar are the full-size-content-view shape: the window has
     no chrome of its own and the lights float over the app's own top area. They are
     therefore INSIDE the viewport, like an iOS status bar and unlike a title bar. The
     frame publishes their footprint and reserves nothing — drawing under them is the
     whole point of that window style; a layout that wants to keep clear of them uses
     --at-lights-w / --at-lights-h itself. */
  var LIGHTS_OVERLAY =
    '<div class="at-dc at-dc-lights" aria-hidden="true">' + LIGHTS + '</div>';

  function insideChrome(d, land) {
    if (d.chrome === 'macos') {
      if (!WIN_LIGHTS || WIN_BAR) return { markup: '', top: 0, bottom: 0 };
      return { markup: LIGHTS_OVERLAY, top: 0, bottom: 0, lights: true };
    }
    if (d.chrome !== 'ios') return { markup: '', top: 0, bottom: 0 };
    // Landscape phones shrink the bar; tablets keep a slim one either way.
    var top = d.notch ? (land ? 24 : 54) : 24;
    var bottom = 22;
    return { markup: IOS_BAR + HOME_BAR, top: top, bottom: bottom };
  }

  /* A copy of this document, with the live harness DOM stripped so the frame starts
     clean and the rail inside it mounts its own variant. */
  function srcdoc(d, land) {
    var clone = root.cloneNode(true);
    // The rail STAYS in the clone. rail.js needs it to exist to mount a variant at all —
    // removing it makes the frame render an empty stage. rail.css hides it under
    // html[data-at-embedded], which is the right mechanism: present, not visible.
    [].slice.call(clone.querySelectorAll(
      '.at-vp, .at-vp-host, .at-notes-layer, .at-panel, .at-toast, .at-rail-reopen'
    )).forEach(function (n) { n.remove(); });
    var stage = clone.querySelector('#at-stage');
    if (stage) stage.innerHTML = '';
    clone.setAttribute('data-at-embedded', '');
    clone.setAttribute('data-at-key', root.getAttribute('data-at-key') || location.pathname);
    var v = root.getAttribute('data-at-variant-index');
    if (v) clone.setAttribute('data-at-variant-init', v);
    var r = root.getAttribute('data-at-round');
    if (r) clone.setAttribute('data-at-round-init', r);
    var ax = root.getAttribute('data-at-axis-state');
    if (ax) clone.setAttribute('data-at-axis-init', ax);
    clone.removeAttribute('data-at-vp');
    clone.removeAttribute('data-at-annotate');

    var ch = insideChrome(d, land);
    if (ch.markup && ch.lights) {
      // Lights only: publish the footprint, reserve nothing, pad nothing.
      var lstyle = clone.ownerDocument.createElement('style');
      lstyle.textContent =
        ':root{--at-lights-w:78px;--at-lights-h:28px}' +
        '.at-dc-lights{position:fixed;top:0;left:0;z-index:2147483000;pointer-events:none;' +
        'display:flex;align-items:center;gap:8px;height:var(--at-lights-h);padding:0 14px}' +
        '.at-dc-lights .at-oc-dot{width:12px;height:12px;border-radius:50%;flex:0 0 12px}';
      clone.querySelector('head').appendChild(lstyle);
      var lholder = clone.ownerDocument.createElement('div');
      lholder.innerHTML = ch.markup;
      var lbody = clone.querySelector('body');
      while (lholder.firstChild) lbody.appendChild(lholder.firstChild);
    } else if (ch.markup) {
      var reserve = clone.getAttribute('data-at-safe') !== 'none';
      var style = clone.ownerDocument.createElement('style');
      style.textContent =
        ':root{--at-safe-top:' + ch.top + 'px;--at-safe-bottom:' + ch.bottom + 'px}' +
        (reserve ? 'body{padding-top:var(--at-safe-top);padding-bottom:var(--at-safe-bottom)}' : '') +
        '.at-dc{position:fixed;left:0;right:0;z-index:2147483000;pointer-events:none;' +
        'font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;' +
        'color:currentColor}' +
        '.at-dc-ios{top:0;height:var(--at-safe-top);display:flex;align-items:center;' +
        'justify-content:space-between;padding:0 26px;font-size:14px;font-weight:600;' +
        'letter-spacing:.2px}' +
        '.at-dc-ios .at-dc-icons{display:flex;align-items:center;gap:5px}' +
        '.at-dc-home{bottom:0;height:var(--at-safe-bottom);display:flex;align-items:center;' +
        'justify-content:center}' +
        '.at-dc-home span{width:140px;height:5px;border-radius:3px;background:currentColor;' +
        'opacity:.35}';
      clone.querySelector('head').appendChild(style);
      var holder = clone.ownerDocument.createElement('div');
      holder.innerHTML = ch.markup;
      var body = clone.querySelector('body');
      while (holder.firstChild) body.appendChild(holder.firstChild);
    }
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  /* ---------------- outside-the-viewport chrome ---------------- */

  var MACOS_BAR =
    '<div class="at-oc at-oc-macos" aria-hidden="true">' +
    (WIN_LIGHTS ? LIGHTS : '<span class="at-oc-nolights"></span>') +
    '<span class="at-oc-title"></span></div>';

  var BROWSER_BAR =
    '<div class="at-oc at-oc-browser" aria-hidden="true">' +
    '<div class="at-oc-tabs">' +
    '<span class="at-oc-dot" style="background:#ff5f57"></span>' +
    '<span class="at-oc-dot" style="background:#febc2e"></span>' +
    '<span class="at-oc-dot" style="background:#28c840"></span>' +
    '<span class="at-oc-tab"></span></div>' +
    '<div class="at-oc-url"><span class="at-oc-lock">●</span><span class="at-oc-addr"></span></div>' +
    '</div>';

  function outsideChrome(d) {
    // A bare desktop frame is a window with no chrome at all — the default.
    if (d.chrome === 'macos') return WIN_BAR ? MACOS_BAR : '';
    if (d.chrome === 'browser') return BROWSER_BAR;
    return '';
  }

  /* ---------------- apply ---------------- */

  function apply() {
    var d = CATALOG[names[current]];
    if (!d.w) {
      root.removeAttribute('data-at-vp');
      if (host) { host.remove(); host = null; frame = null; shell = null; }
      sizeLabel.textContent = '';
      paintControls();
      window.dispatchEvent(new CustomEvent('at:device', { detail: { device: 'fit' } }));
      return;
    }
    var land = d.rotates && landscape;
    var w = land ? d.h : d.w;
    var h = land ? d.w : d.h;

    if (!host) {
      host = document.createElement('div');
      host.className = 'at-vp-host';
      document.body.appendChild(host);
    }
    // The shell is rebuilt per device: its chrome and corner radius differ.
    host.innerHTML = '';
    shell = document.createElement('div');
    shell.className = 'at-vp-shell';
    shell.setAttribute('data-chrome', d.chrome || 'none');
    shell.style.borderRadius = (d.radius || 0) + 'px';
    shell.innerHTML = outsideChrome(d);

    if (d.notch && !land) {
      var notch = document.createElement('div');
      notch.className = 'at-vp-notch';
      notch.setAttribute('aria-hidden', 'true');
      shell.appendChild(notch);
    }

    frame = document.createElement('iframe');
    frame.className = 'at-vp-frame';
    frame.setAttribute('title', 'Artifact at device size');
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    shell.appendChild(frame);
    host.appendChild(shell);

    root.setAttribute('data-at-vp', '');
    // A change landing between here and the frame's first paint would arrive before
    // there is anything to receive it, so the fresh frame is synced once on load.
    frame.addEventListener('load', function () {
      syncFrame();
      // Whatever watches the artifact — the contrast verdict, for one — is now looking
      // at a different document and has to be told.
      window.dispatchEvent(new CustomEvent('at:device', { detail: { device: names[current] } }));
    });
    frame.srcdoc = srcdoc(d, land);
    fit();
  }

  /* Scale down (never up) when the framed device is bigger than the window — and say so.
     A 1440 desktop in a 1280 window renders at 67%, which is not a size anyone can judge
     type or spacing at. The label used to print the CSS size either way, so the number on
     screen described a frame you were not actually looking at. 1:1 turns scaling off and
     lets the host scroll to the rest. */
  function fit() {
    if (!shell || !host) return;
    shell.style.transform = '';
    shell.style.marginBottom = '';
    shell.style.marginRight = '';
    host.toggleAttribute('data-actual', actual);

    var d = CATALOG[names[current]];
    var land = d.rotates && landscape;
    var vw = land ? d.h : d.w;
    var vh = land ? d.w : d.h;
    var w = shell.offsetWidth;
    var h = shell.offsetHeight;
    var k = actual ? 1 : Math.min(1, (host.clientWidth - 40) / w, (host.clientHeight - 40) / h);

    if (k < 1) {
      shell.style.transform = 'scale(' + k.toFixed(4) + ')';
      shell.style.marginBottom = -(h * (1 - k)) + 'px';
      shell.style.marginRight = -(w * (1 - k)) + 'px';
    }
    sizeLabel.textContent = vw + ' × ' + vh +
      (k < 1 ? '  ·  ' + Math.round(k * 100) + '%' : '  ·  1:1');
  }

  window.addEventListener('resize', fit);
  window.addEventListener('at:relayout', fit);

  /* The host's state changed. Tell the frame; do NOT rebuild it.
     Rebuilding from srcdoc re-parses the whole document, which throws away the frame's
     scroll position, anything typed into it, and any state the prototype itself holds —
     on an action that happens a hundred times a session. The frame is same-origin, runs
     this same rail.js, and knows how to apply a round, a variant and an axis in place. */
  function syncFrame() {
    if (!frame || !frame.contentWindow) return;
    var axes = {};
    try { axes = JSON.parse(root.getAttribute('data-at-axis-state') || '{}'); } catch (e) {}
    frame.contentWindow.postMessage({
      at: 'sync',
      round: root.getAttribute('data-at-round'),
      variantIndex: root.getAttribute('data-at-variant-index'),
      axes: axes
    }, '*');
  }
  window.addEventListener('at:variant', syncFrame);
  window.addEventListener('at:axis', syncFrame);

  /* `d` steps the frame, `D` steps back. Same guard as the rail's own keys: a prototype's
     inputs are real, so typing in one never moves the device. */
  document.addEventListener('keydown', function (e) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'd') stepDevice(1);
    else if (e.key === 'D') stepDevice(-1);
  });

  var params = new URLSearchParams(location.search);
  actual = params.get('zoom') === '1';
  var want = params.get('d') || '';
  var wantLandscape = /-landscape$/.test(want);
  var wantName = want.replace(/-landscape$/, '');
  var wantIndex = names.indexOf(wantName);
  if (wantIndex > 0) {
    landscape = wantLandscape && CATALOG[wantName].rotates;
    select(wantIndex);
  } else {
    paintControls();
  }
})();
