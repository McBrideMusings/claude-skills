/* theme.js — light/dark toggle.

   Writes data-theme on :root, which only means something for kinds whose colours come
   from the base tokens. Registered for every kind except prototype (see the WIDGETS
   table in ~/.claude/tools/folio). */

(function () {
  var btn = document.querySelector('.at-theme');
  if (!btn) return;
  var root = document.documentElement;
  function current() {
    return root.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  btn.addEventListener('click', function () {
    root.setAttribute('data-theme', current() === 'dark' ? 'light' : 'dark');
  });

  // The theme toggle is the third instance of the same floating button, so it docks and
  // drags like the other two rather than being pinned by its own CSS rule.
  var themeBtn = document.querySelector('.at-theme');
  if (themeBtn && window.__atDock) window.__atDock(themeBtn, 'theme', 'right', 1);
})();
