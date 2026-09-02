/* settings.js — the panel's values in and out.

   A spike gets tuned by dragging sliders, and that tuning is the finding. Without a way
   out of the page it evaporates when the tab closes: the reader writes numbers on paper,
   or the agent asks them to read the panel aloud. Three actions and one file fix that.

   A browser cannot write to a file on disk, so the round trip is asymmetric on purpose:

     tweaks.json   read at load, if the page is being served. Edit it, refresh, every
                   control starts at your values. This is how a tuned prototype gets
                   handed to someone else, and how it gets checked into a repo.
     Copy          every current value as JSON on the clipboard.
     Paste         reads the clipboard back.
     Reset         back to the defaults the fragment declared.

   Loads after tweaks.js, so the fragment's registrations have already drained and
   atTweaks.keys() is the real list. Renders nothing when a spike registered no tweaks. */

(function () {
  'use strict';

  var api = window.atTweaks;
  if (!api || api.__queue || typeof api.keys !== 'function') return;
  if (!api.keys().length) return;

  var TWEAKS_URL = './tweaks.json';

  function json() { return JSON.stringify(api.values(), api.keys(), 2); }

  /* Feedback goes on the button's own label. An alert has to be dismissed, and Copy is
     pressed often enough that a dialog every time is worse than no feedback at all. */
  function flash(button, msg) {
    if (!button) return;
    if (!button.dataset.baseLabel) button.dataset.baseLabel = button.textContent;
    button.textContent = msg;
    clearTimeout(button._atFlash);
    button._atFlash = setTimeout(function () {
      button.textContent = button.dataset.baseLabel;
    }, 1800);
  }

  function ingest(text, button) {
    var parsed;
    try { parsed = JSON.parse(text); } catch (e) {
      flash(button, 'Not JSON');
      return false;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      flash(button, 'Not settings');
      return false;
    }
    var r = api.apply(parsed);
    if (!r.applied.length) { flash(button, 'No known keys'); return false; }
    flash(button, 'Applied ' + r.applied.length +
                  (r.ignored.length ? ' (' + r.ignored.length + ' unknown)' : ''));
    return true;
  }

  /* Clipboard access can be refused — writeText needs a user gesture and a secure
     context, readText needs a permission grant and Safari does not implement it at all.
     Every path here falls back to a textarea rather than a button that does nothing. */
  function manualCopy(text, button) {
    var ta = document.createElement('textarea');
    ta.className = 'at-twk-io';
    ta.value = text;
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    if (ok) { ta.remove(); flash(button, 'Copied ✓'); return; }
    flash(button, 'Press ⌘C');
    ta.addEventListener('blur', function () { ta.remove(); });
  }

  function manualPaste(button) {
    var wrap = document.createElement('div');
    wrap.className = 'at-twk-io-wrap';
    wrap.innerHTML =
      '<div class="at-twk-io-title">Paste the settings JSON, then Apply.</div>' +
      '<textarea class="at-twk-io"></textarea>' +
      '<div class="at-twk-io-row">' +
      '<button type="button" class="at-twk-action" data-io="cancel">Cancel</button>' +
      '<button type="button" class="at-twk-action" data-io="apply">Apply</button></div>';
    document.body.appendChild(wrap);
    var ta = wrap.querySelector('textarea');
    ta.focus();
    wrap.addEventListener('click', function (e) {
      var what = e.target.getAttribute && e.target.getAttribute('data-io');
      if (what === 'cancel') wrap.remove();
      if (what === 'apply' && ingest(ta.value, button)) wrap.remove();
    });
  }

  api.section('Settings');

  var copyBtn = api.action('Copy settings', function () {
    var text = json();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { flash(copyBtn, 'Copied ✓'); },
        function () { manualCopy(text, copyBtn); }
      );
    } else {
      manualCopy(text, copyBtn);
    }
  });

  var pasteBtn = api.action('Paste settings', function () {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(
        function (t) { ingest(t, pasteBtn); },
        function () { manualPaste(pasteBtn); }
      );
    } else {
      manualPaste(pasteBtn);
    }
  });

  var resetBtn = api.action('Reset settings', function () {
    api.apply(api.defaults());
    flash(resetBtn, 'Back to defaults');
  });

  /* Read the file last, so a failure leaves the buttons working. A file:// page cannot
     read a sibling file at all — the browser blocks both fetch and XHR — so this quietly
     does nothing there and the fragment's own defaults stand. */
  if (typeof fetch === 'function') {
    fetch(TWEAKS_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (obj) {
        var r = api.apply(obj);
        if (r.applied.length) {
          document.documentElement.setAttribute('data-at-tweaks-file', r.applied.length);
        }
      })
      .catch(function () { /* no file, or opened from disk: defaults stand */ });
  }
})();
