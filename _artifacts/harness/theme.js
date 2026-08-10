/* theme.js — light/dark toggle.

   Writes data-theme on :root, which only means something for kinds whose colours come
   from the base tokens. Registered for every kind except prototype (see the WIDGETS
   table in ~/.claude/tools/artifact). */

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
})();
