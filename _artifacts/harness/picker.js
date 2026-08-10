/* picker.js — variant picker wiring.

   Behaviour contract, ported verbatim from emilkowalski/skills prototype/PICKER.md
   (MIT, © 2026 Emil Kowalski):

   - Number keys 1-N and Left/Right switch variants; R replays. Key events are ignored
     when focus is in an input, textarea, select, or contenteditable, or a modifier is held.
   - Clicking an item switches to it; exactly one item carries data-active and
     aria-current="true" at all times, and the highlight slides to it.
   - Selection persists across reload via ?v=N, falling back to variant 1. The highlight
     takes its initial position without animating (data-ready is added after first paint).
   - Switching re-mounts the variant so entrance animations re-run; replay re-mounts
     without switching.

   The source of variants here is <template data-variant="Name"> in the body fragment,
   so the model writes plain markup and none of this. */

(function () {
  var templates = [].slice.call(document.querySelectorAll('template[data-variant]'));
  if (!templates.length) return;

  var stage = document.getElementById('at-stage');
  var picker = document.querySelector('.proto-picker');
  if (!stage || !picker) return;

  var highlight = picker.querySelector('.proto-picker-highlight');
  var items = [].slice.call(picker.querySelectorAll('.proto-picker-item:not(.proto-picker-replay)'));
  var replay = picker.querySelector('.proto-picker-replay');
  var current = 0;

  function moveHighlight() {
    var el = items[current];
    if (!el) return;
    highlight.style.width = el.offsetWidth + 'px';
    highlight.style.transform = 'translateX(' + el.offsetLeft + 'px)';
  }

  function mount(i) {
    stage.innerHTML = '';
    // Clear first, render next frame, so entrance animations re-run.
    requestAnimationFrame(function () {
      stage.appendChild(templates[i].content.cloneNode(true));
    });
  }

  function setActive(i) {
    if (i < 0 || i >= templates.length) return;
    current = i;
    items.forEach(function (el, j) {
      el.toggleAttribute('data-active', j === i);
      if (j === i) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
    moveHighlight();
    // srcdoc pages have no query string to persist into (viewport.js frames the page
    // that way), so the URL write is best-effort and the attributes are the real signal.
    try {
      var url = new URL(location);
      url.searchParams.set('v', i + 1);
      history.replaceState(null, '', url);
    } catch (e) {}
    var root = document.documentElement;
    root.setAttribute('data-at-variant', templates[i].getAttribute('data-variant') || '');
    root.setAttribute('data-at-variant-index', String(i + 1));
    window.dispatchEvent(new CustomEvent('at:variant', { detail: { index: i } }));
    mount(i);
  }

  items.forEach(function (el, i) {
    el.addEventListener('click', function () { setActive(i); });
  });
  if (replay) replay.addEventListener('click', function () { mount(current); });
  window.addEventListener('resize', moveHighlight);

  document.addEventListener('keydown', function (e) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var num = parseInt(e.key, 10);
    if (num >= 1 && num <= templates.length) setActive(num - 1);
    else if (e.key === 'ArrowRight') setActive((current + 1) % templates.length);
    else if (e.key === 'ArrowLeft') setActive((current - 1 + templates.length) % templates.length);
    else if (e.key === 'r' || e.key === 'R') mount(current);
  });

  // data-at-variant-init wins: it is how a viewport.js device frame is told which variant
  // the host was showing, and a srcdoc document has no query string of its own.
  var initial = parseInt(document.documentElement.getAttribute('data-at-variant-init'), 10) ||
    parseInt(new URLSearchParams(location.search).get('v'), 10) || 1;
  setActive(initial - 1);
  // Enable the slide only after first paint, so load doesn't animate.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { picker.setAttribute('data-ready', ''); });
  });
})();
