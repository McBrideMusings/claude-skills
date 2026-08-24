/* deck.js — slide navigation.
   Left/Right/Space/PageUp/PageDown move; 1-9 jump; Home/End go to the ends.
   Position persists across reload via ?s=N. Printing shows every slide (see deck.css). */

(function () {
  var slides = [].slice.call(document.querySelectorAll('[data-slide]'));
  if (!slides.length) return;

  var counter = document.querySelector('.deck-counter');
  var progress = document.querySelector('.deck-progress');
  var current = 0;

  function show(i) {
    if (i < 0 || i >= slides.length) return;
    current = i;
    slides.forEach(function (s, j) { s.toggleAttribute('data-current', j === i); });
    if (counter) counter.textContent = (i + 1) + ' / ' + slides.length;
    if (progress) progress.style.width = ((i + 1) / slides.length * 100) + '%';
    var url = new URL(location);
    url.searchParams.set('s', i + 1);
    history.replaceState(null, '', url);
    window.scrollTo(0, 0);
  }

  document.addEventListener('keydown', function (e) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var num = parseInt(e.key, 10);
    if (num >= 1 && num <= 9 && num <= slides.length) { show(num - 1); return; }
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': case ' ': show(current + 1); e.preventDefault(); break;
      case 'ArrowLeft': case 'PageUp': show(current - 1); e.preventDefault(); break;
      case 'Home': show(0); e.preventDefault(); break;
      case 'End': show(slides.length - 1); e.preventDefault(); break;
    }
  });

  show((parseInt(new URLSearchParams(location.search).get('s'), 10) || 1) - 1);
})();
