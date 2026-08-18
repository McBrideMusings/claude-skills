/* viewport.js — see the artifact at phone, tablet and desktop sizes.

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

   Fit is the default and is not a frame at all: the page renders normally, at whatever
   size the window happens to be. */

(function () {
  var root = document.documentElement;
  if (root.hasAttribute('data-at-embedded')) return;   // no frames inside a frame

  var DEVICES = [
    { label: 'Fit', w: 0, h: 0 },
    { label: 'Phone', w: 390, h: 844 },
    { label: 'Tablet', w: 834, h: 1112 },
    { label: 'Desktop', w: 1440, h: 900 }
  ];

  var current = 0;
  var landscape = false;
  var host = null;
  var frame = null;

  var bar = document.createElement('nav');
  bar.className = 'at-vp';
  bar.setAttribute('aria-label', 'Viewport size');
  DEVICES.forEach(function (d, i) {
    var b = document.createElement('button');
    b.className = 'at-vp-item';
    b.type = 'button';
    b.textContent = d.label;
    if (i === 0) b.setAttribute('data-active', '');
    b.addEventListener('click', function () { select(i); });
    bar.appendChild(b);
  });
  var divider = document.createElement('span');
  divider.className = 'at-vp-divider';
  divider.setAttribute('aria-hidden', 'true');
  var rotate = document.createElement('button');
  rotate.className = 'at-vp-item at-vp-rotate';
  rotate.type = 'button';
  rotate.setAttribute('aria-label', 'Rotate');
  rotate.innerHTML = '&#8635;';
  rotate.addEventListener('click', function () {
    if (!current) return;
    landscape = !landscape;
    apply();
  });
  var size = document.createElement('span');
  size.className = 'at-vp-size';
  bar.appendChild(divider);
  bar.appendChild(rotate);
  bar.appendChild(size);
  document.body.appendChild(bar);

  if (document.querySelector('.proto-picker[data-position="top"]')) {
    root.setAttribute('data-at-picker-top', '');
  }

  function items() {
    return [].slice.call(bar.querySelectorAll('.at-vp-item:not(.at-vp-rotate)'));
  }

  function select(i) {
    current = i;
    if (!i) landscape = false;
    items().forEach(function (b, j) { b.toggleAttribute('data-active', j === i); });
    apply();
  }

  /* A copy of this document, with the live harness DOM stripped so the frame starts
     clean and the picker inside it mounts its own variant. */
  function srcdoc() {
    var clone = root.cloneNode(true);
    [].slice.call(clone.querySelectorAll(
      '.at-vp, .at-vp-host, .at-notes-layer, .at-panel, .at-toast'
    )).forEach(function (n) { n.remove(); });
    var stage = clone.querySelector('#at-stage');
    if (stage) stage.innerHTML = '';
    clone.setAttribute('data-at-embedded', '');
    clone.setAttribute('data-at-key', root.getAttribute('data-at-key') || location.pathname);
    var v = root.getAttribute('data-at-variant-index');
    if (v) clone.setAttribute('data-at-variant-init', v);
    var r = root.getAttribute('data-at-round');
    if (r) clone.setAttribute('data-at-round-init', r);
    clone.removeAttribute('data-at-vp');
    clone.removeAttribute('data-at-annotate');
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  function apply() {
    var d = DEVICES[current];
    if (!d.w) {
      root.removeAttribute('data-at-vp');
      if (host) { host.remove(); host = null; frame = null; }
      size.textContent = '';
      return;
    }
    var w = landscape ? d.h : d.w;
    var h = landscape ? d.w : d.h;
    size.textContent = w + '×' + h;

    if (!host) {
      host = document.createElement('div');
      host.className = 'at-vp-host';
      frame = document.createElement('iframe');
      frame.className = 'at-vp-frame';
      frame.setAttribute('title', 'Artifact at device size');
      host.appendChild(frame);
      document.body.appendChild(host);
    }
    root.setAttribute('data-at-vp', '');

    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    frame.srcdoc = srcdoc();
    fit(w, h);
  }

  /* Scale down (never up) when the device is bigger than the window. */
  function fit(w, h) {
    if (!frame || !host) return;
    var availW = host.clientWidth - 32;
    var availH = host.clientHeight - 32;
    var k = Math.min(1, availW / w, availH / h);
    frame.style.transform = k < 1 ? 'scale(' + k.toFixed(4) + ')' : '';
    frame.style.marginBottom = k < 1 ? (-(h * (1 - k)) + 'px') : '';
  }

  window.addEventListener('resize', function () {
    var d = DEVICES[current];
    if (d && d.w) fit(landscape ? d.h : d.w, landscape ? d.w : d.h);
  });

  /* Flipping variants in the host reframes the copy, so the frame never shows a stale one. */
  window.addEventListener('at:variant', function () {
    if (current && frame) frame.srcdoc = srcdoc();
  });
})();
