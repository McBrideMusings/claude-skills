/* picker.js — variant + round picker wiring.

   A prototype topic is ONE canonical file that accumulates rounds, so the picker has
   two axes and the URL names both: ?r=<round>&v=<variant>. `r` is the round (a whole
   rebuild of the design, `v2`, `v3`); `v` is the variant within it ("Quiet", "Dense").
   They never share a letter — a file called v1.html read back as ?v=3 is exactly the
   confusion this split exists to end.

   Behaviour contract, ported from emilkowalski/skills prototype/PICKER.md
   (MIT, © 2026 Emil Kowalski) and extended with the round axis:

   - Number keys 1-N and Left/Right switch variants within the current round;
     `[` / `]` step rounds; R replays; Escape closes the round ticker. Key events are
     ignored when focus is in an input, textarea, select, or contenteditable, or a
     modifier is held.
   - Clicking an item switches to it; exactly one variant button carries data-active and
     aria-current="true" at all times, and the highlight slides to it.
   - The round ticker is a separate corner element, not part of the pill: dimmed, and
     collapsed to the current round until clicked. Changing round is a once-a-session
     act; changing variant is a hundred-times-a-session one, and the chrome says so.
   - Selection persists across reload via ?r=N&v=N, falling back to the newest round
     and its first variant. The highlight takes its initial position without animating
     (data-ready is added after first paint).
   - Switching re-mounts the variant so entrance animations re-run; replay re-mounts
     without switching.

   The source of variants here is <template data-variant="Name" data-round="N"> in the
   assembled document, so the model writes plain markup and none of this. */

(function () {
  var all = [].slice.call(document.querySelectorAll('template[data-variant]'));
  if (!all.length) return;

  var stage = document.getElementById('at-stage');
  var picker = document.querySelector('.proto-picker');
  if (!stage || !picker) return;

  var highlight = picker.querySelector('.proto-picker-highlight');
  var items = [].slice.call(picker.querySelectorAll('.proto-picker-item:not(.proto-picker-replay)'));
  var replay = picker.querySelector('.proto-picker-replay');

  // The round ticker lives in its own corner element, collapsed to the current round.
  var ticker = document.querySelector('.proto-rounds');
  var tickerList = ticker && ticker.querySelector('.proto-rounds-list');
  var tickerToggle = ticker && ticker.querySelector('.proto-rounds-toggle');
  var roundBtns = ticker ? [].slice.call(ticker.querySelectorAll('.proto-round')) : [];

  function roundOf(el) { return el.getAttribute('data-round') || '1'; }

  var rounds = [];
  all.forEach(function (t) {
    var r = roundOf(t);
    if (rounds.indexOf(r) < 0) rounds.push(r);
  });

  var round = rounds[rounds.length - 1];  // newest round is the default view
  var current = 0;                        // variant index WITHIN the round

  function inRound(r) {
    return all.filter(function (t) { return roundOf(t) === r; });
  }
  function itemsIn(r) {
    return items.filter(function (el) { return roundOf(el) === r; });
  }

  function moveHighlight() {
    var el = itemsIn(round)[current];
    if (!el) return;
    highlight.style.width = el.offsetWidth + 'px';
    highlight.style.transform = 'translateX(' + el.offsetLeft + 'px)';
  }

  function mount() {
    var t = inRound(round)[current];
    if (!t) return;
    stage.innerHTML = '';
    // Clear first, render next frame, so entrance animations re-run.
    requestAnimationFrame(function () {
      stage.appendChild(t.content.cloneNode(true));
    });
  }

  function setActive(r, i) {
    if (rounds.indexOf(r) < 0) return;
    var n = inRound(r).length;
    if (i < 0 || i >= n) return;
    round = r;
    current = i;

    // Only the active round's variant buttons are in the pill; the rest are hidden,
    // so offsetLeft/offsetWidth measure the row the highlight actually travels.
    items.forEach(function (el) {
      var on = roundOf(el) === round;
      el.toggleAttribute('hidden', !on);
      var active = on && itemsIn(round).indexOf(el) === current;
      el.toggleAttribute('data-active', active);
      if (active) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
    roundBtns.forEach(function (el) {
      var active = roundOf(el) === round;
      el.toggleAttribute('data-active', active);
      el.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (tickerToggle) tickerToggle.textContent = 'v' + round;
    moveHighlight();

    // srcdoc pages have no query string to persist into (viewport.js frames the page
    // that way), so the URL write is best-effort and the attributes are the real signal.
    try {
      var url = new URL(location);
      url.searchParams.set('r', round);
      url.searchParams.set('v', current + 1);
      history.replaceState(null, '', url);
    } catch (e) {}

    var t = inRound(round)[current];
    var root = document.documentElement;
    root.setAttribute('data-at-round', round);
    root.setAttribute('data-at-variant', t.getAttribute('data-variant') || '');
    root.setAttribute('data-at-variant-index', String(current + 1));
    window.dispatchEvent(new CustomEvent('at:variant', {
      detail: { index: current, round: round }
    }));
    mount();
  }

  items.forEach(function (el) {
    el.addEventListener('click', function () {
      var r = roundOf(el);
      setActive(r, itemsIn(r).indexOf(el));
    });
  });
  function openTicker(open) {
    if (!ticker) return;
    ticker.toggleAttribute('data-open', open);
    tickerList.toggleAttribute('hidden', !open);
    tickerToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  roundBtns.forEach(function (el) {
    // Landing on a round keeps the variant slot when that round has one, so stepping
    // rounds compares the same direction across versions instead of resetting to 1.
    el.addEventListener('click', function () {
      var r = roundOf(el);
      setActive(r, Math.min(current, inRound(r).length - 1));
      openTicker(false);
      tickerToggle.focus();
    });
  });
  if (tickerToggle) {
    tickerToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      openTicker(!ticker.hasAttribute('data-open'));
    });
    document.addEventListener('click', function (e) {
      if (!ticker.contains(e.target)) openTicker(false);
    });
  }
  if (replay) replay.addEventListener('click', mount);
  window.addEventListener('resize', moveHighlight);

  function stepRound(delta) {
    var i = rounds.indexOf(round);
    var r = rounds[(i + delta + rounds.length) % rounds.length];
    setActive(r, Math.min(current, inRound(r).length - 1));
  }

  document.addEventListener('keydown', function (e) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var n = inRound(round).length;
    var num = parseInt(e.key, 10);
    if (num >= 1 && num <= n) setActive(round, num - 1);
    else if (e.key === 'ArrowRight') setActive(round, (current + 1) % n);
    else if (e.key === 'ArrowLeft') setActive(round, (current - 1 + n) % n);
    else if (e.key === ']') stepRound(1);
    else if (e.key === '[') stepRound(-1);
    else if (e.key === 'Escape') openTicker(false);
    else if (e.key === 'r' || e.key === 'R') mount();
  });

  // data-at-*-init wins: it is how a viewport.js device frame is told what the host was
  // showing, and a srcdoc document has no query string of its own.
  var root = document.documentElement;
  var q = new URLSearchParams(location.search);
  var r0 = root.getAttribute('data-at-round-init') || q.get('r') || round;
  if (rounds.indexOf(r0) < 0) r0 = round;
  var v0 = parseInt(root.getAttribute('data-at-variant-init'), 10) ||
    parseInt(q.get('v'), 10) || 1;
  setActive(r0, Math.min(v0, inRound(r0).length) - 1);

  // Enable the slide only after first paint, so load doesn't animate.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { picker.setAttribute('data-ready', ''); });
  });
})();
