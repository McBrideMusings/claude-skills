/* annotate.js — mark up the folio and hand the marks back to Claude.

   Dormant until the user presses `a`. Nothing renders, nothing is bound to a visible
   control, and an folio sent to somebody else looks exactly as it did before this
   file existed. That is why annotate is registered for every kind rather than gated
   per-kind: invisible chrome costs the reader nothing.

   How a comment finds its way back to source:

     - `folio build` stamps every annotatable element with data-src="<fragment>:<line>",
       so a pin carries the line of the body fragment that produced the element, not a
       CSS path nobody can act on.
     - A pin also stores the element's visible text. On rebuild, an exact data-src match
       reattaches silently, a text match at a different line reattaches and is flagged
       MOVED, and neither leaves the pin alive but flagged STALE. Pins are never dropped
       because the file was rebuilt.

   Storage is localStorage (verified to work on file:// in Chrome), keyed by the
   folio's own path so two folios never share pins. A page embedded by viewport.js
   inherits the host's key through data-at-key on :root, so pins made inside a device
   frame are the same pins.

   Output is one markdown blob on the clipboard, and that is the only channel. It used
   to also write a file into ~/Downloads for an agent to watch; a download is a worse
   handoff than a copy in every respect that matters here — it needs a directory nobody
   asked about, it collides with itself on the second send, and it leaves litter.

   The clipboard is still a real channel back to a waiting agent, with no server and no
   file: the markdown opens with an HTML comment naming the folio, so an agent can
   poll `pbpaste`, recognise that marker, and pick the comments up the moment you press
   the button. See CONTRACT.md. */

(function () {
  var root = document.documentElement;
  var KEY = 'at:notes:' + (root.getAttribute('data-at-key') || location.pathname);

  function meta(name) {
    var m = document.querySelector('meta[name="' + name + '"]');
    return m ? m.getAttribute('content') || '' : '';
  }

  var BUILD = meta('folio-build');
  var OUT = meta('folio-out');
  var FRAGMENT = meta('folio-fragment');
  var SLUG = (OUT.split('/').pop() || 'folio').replace(/\.html?$/i, '') || 'folio';
  /* The marker a watching agent greps the clipboard for. */
  var MARK = '<!-- folio-feedback: ' + SLUG + ' -->';

  var notes = load();
  var seq = notes.reduce(function (n, p) { return Math.max(n, p.n || 0); }, 0);
  var open = false;
  var aimed = null;
  var composing = null;
  var selected = null;
  var placements = [];

  // --- storage --------------------------------------------------------------

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch (e) {}
    /* Belt and braces for the storage listener at the foot of this file, and symmetric on
       purpose. A folio is normally opened as file://, where Chrome gives each document an
       opaque origin and the cross-document storage event is not something to bet the
       user's only copy of their comments on. So a write inside a device frame nudges the
       host, and a write on the host nudges the frame — otherwise deleting a comment from
       the panel leaves its pin sitting on the design with nothing to clear it. */
    if (document.documentElement.hasAttribute('data-at-embedded')) {
      try { parent.postMessage({ at: 'notes' }, '*'); } catch (e) {}
      return;
    }
    [].slice.call(document.querySelectorAll('.at-vp-frame')).forEach(function (f) {
      try { f.contentWindow.postMessage({ at: 'notes' }, '*'); } catch (e) {}
    });
  }

  // --- the elements a pin can point at --------------------------------------

  /* Harness chrome. Annotate mode swallows page clicks so a prototype's own buttons
     don't fire while you are commenting — but the picker, the device switcher and the
     theme toggle are the harness, and flipping variants or sizes mid-review has to keep
     working. */
  var CHROME = '.at-panel, .at-composer, .at-notes-layer, ' +
    '.at-rail, .at-rail-reopen, .at-vp, .at-vp-host, .at-theme, .at-cx-layer, ' +
    '.at-annotate-toggle';

  function snippetOf(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90);
  }

  function candidates() {
    return [].slice.call(document.querySelectorAll('[data-src]')).filter(function (el) {
      return !el.closest(CHROME);
    });
  }

  function variant() {
    return root.getAttribute('data-at-variant') || '';
  }

  /* Reattach one pin to this build: exact line, then text, then give up but keep it. */
  function locate(pin, pool) {
    var i, el;
    for (i = 0; i < pool.length; i++) {
      el = pool[i];
      if (el.getAttribute('data-src') === pin.src && snippetOf(el) === pin.snippet) {
        return { el: el, state: 'ok' };
      }
    }
    for (i = 0; i < pool.length; i++) {
      el = pool[i];
      if (el.getAttribute('data-src') === pin.src) return { el: el, state: 'ok' };
    }
    if (pin.snippet) {
      for (i = 0; i < pool.length; i++) {
        el = pool[i];
        if (snippetOf(el) === pin.snippet) return { el: el, state: 'moved' };
      }
    }
    return { el: null, state: 'stale' };
  }

  // --- chrome ---------------------------------------------------------------


  var ICON = {
    copy: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
      '<rect x="5.5" y="5.5" width="8" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
      '<path d="M10.5 3.5H3.9c-.8 0-1.4.6-1.4 1.4v6.6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
    clear: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
      '<path d="M3 4.5h10M6.5 4.5V3.2c0-.4.3-.7.7-.7h1.6c.4 0 .7.3.7.7v1.3M4.4 4.5l.6 8.2c0 .5.4.8.9.8h4.2c.5 0 .9-.3.9-.8l.6-8.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    done: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
      '<path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  };

  var layer = document.createElement('div');
  layer.className = 'at-notes-layer';

  var panel = document.createElement('aside');
  panel.className = 'at-panel';
  panel.innerHTML =
    '<header class="at-panel-head">' +
    '<span class="at-panel-title">Comments</span>' +
    '<button class="at-btn at-btn--icon at-clear" type="button" ' +
    'title="Delete every comment" aria-label="Delete every comment">' + ICON.clear + '</button>' +
    '<button class="at-btn at-btn--icon at-close" type="button" ' +
    'title="Leave comment mode  (a)" aria-label="Leave comment mode">' + ICON.done + '</button>' +
    '</header>' +
    '<div class="at-panel-list"></div>' +
    '<footer class="at-panel-foot">' +
    '<div class="at-panel-actions">' +
    '<button class="at-btn at-btn--primary at-copy" type="button">' +
    ICON.copy + '<span>Copy comments</span></button>' +
    '</div></footer>';

  document.body.appendChild(layer);
  /* The pin layer belongs to whichever document holds the design; the PANEL never does.
     It is host chrome, like the comment toggle and the rail handle, and a device frame
     runs this same file — so once the host started telling the frame to enter annotate
     mode, the frame drew its own COMMENTS sidebar inside the bezel, over the design.
     It is still built, because the copy/clear/close handlers and paintActions() all read
     it; it is simply never put on screen in an embedded document. A pin made in here
     still reaches the real panel — see the storage listener at the foot of this file. */
  if (!root.hasAttribute('data-at-embedded')) document.body.appendChild(panel);

  var list = panel.querySelector('.at-panel-list');

  // --- rendering ------------------------------------------------------------

  function mine() {
    var v = variant();
    return notes.filter(function (p) { return (p.variant || '') === v; });
  }

  function render() {
    if (!open) return;
    var pool = candidates();
    var rows = mine();

    var dirty = false;
    placements = rows.map(function (pin) {
      var hit = locate(pin, pool);
      if (hit.state === 'moved' && hit.el) {
        pin.src = hit.el.getAttribute('data-src');
        pin.moved = true;
        dirty = true;
      }
      var stale = !hit.el;
      if (!!pin.stale !== stale) { pin.stale = stale; dirty = true; }
      return { pin: pin, el: hit.el, state: stale ? 'stale' : (pin.moved ? 'moved' : 'ok') };
    });
    if (dirty) save();

    layer.innerHTML = '';
    placements.forEach(function (p) {
      if (!p.el) return;
      var r = p.el.getBoundingClientRect();
      // A device frame hides the host's own copy of the page (viewport.js), so its
      // elements measure 0×0. Drawing there would strand every badge in the corner —
      // the pins stay in the panel, and the framed copy draws its own.
      if (!r.width && !r.height) return;
      var ring = document.createElement('div');
      ring.className = 'at-ring';
      ring.setAttribute('data-state', p.state);
      ring.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' +
        r.width + 'px;height:' + r.height + 'px';
      var badge = document.createElement('button');
      badge.className = 'at-badge';
      badge.type = 'button';
      badge.textContent = p.pin.n;
      badge.setAttribute('data-state', p.state);
      if (selected === p.pin.id) badge.setAttribute('data-selected', '');
      badge.style.cssText = 'left:' + Math.max(2, r.left - 9) + 'px;top:' +
        Math.max(2, r.top - 9) + 'px';
      badge.addEventListener('click', function (e) {
        e.stopPropagation();
        selected = selected === p.pin.id ? null : p.pin.id;
        render();
      });
      layer.appendChild(ring);
      layer.appendChild(badge);
      p.ring = ring;
      p.badge = badge;
    });

    renderList(placements);
    paintActions();
  }

  /* A control that would do nothing says so by being disabled, which is why neither of
     these needs a message explaining that there is nothing to send. */
  function paintActions() {
    var any = notes.length > 0;
    panel.querySelector('.at-copy').disabled = !any;
    panel.querySelector('.at-clear').disabled = !any;
  }

  function renderList(rows) {
    if (!rows.length) {
      list.innerHTML = '<p class="at-empty">Click anything on the page to comment on it. ' +
        '<kbd>a</kbd> leaves annotate mode, <kbd>c</kbd> checks contrast.</p>';
      return;
    }
    list.innerHTML = '';
    rows.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'at-note';
      row.setAttribute('data-state', p.state);
      var flag = p.state === 'stale'
        ? '<span class="at-note-flag">stale</span>'
        : (p.state === 'moved' ? '<span class="at-note-flag">moved</span>' : '');
      row.innerHTML =
        '<span class="at-note-n">' + p.pin.n + '</span>' +
        '<div class="at-note-body">' +
        '<p class="at-note-text"></p>' +
        '<span class="at-note-src"></span>' + flag +
        '</div>' +
        '<button class="at-note-del" type="button" aria-label="Delete comment">&times;</button>';
      row.querySelector('.at-note-text').textContent = p.pin.comment;
      row.querySelector('.at-note-src').textContent = p.pin.src;
      row.addEventListener('click', function () {
        selected = p.pin.id;
        if (p.el) p.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        render();
      });
      row.querySelector('.at-note-del').addEventListener('click', function (e) {
        e.stopPropagation();
        notes = notes.filter(function (x) { return x.id !== p.pin.id; });
        renumber();
        save();
        render();
      });
      list.appendChild(row);
    });
  }

  function renumber() {
    var v = variant();
    var n = 0;
    notes.forEach(function (p) { if ((p.variant || '') === v) p.n = ++n; });
    seq = notes.reduce(function (m, p) { return Math.max(m, p.n || 0); }, 0);
  }

  // --- composing ------------------------------------------------------------

  function closeComposer() {
    if (composing && composing.node.parentNode) composing.node.remove();
    composing = null;
  }

  function compose(el) {
    closeComposer();
    var r = el.getBoundingClientRect();
    var box = document.createElement('div');
    box.className = 'at-composer';
    box.innerHTML =
      '<p class="at-composer-target"></p>' +
      '<textarea rows="3" placeholder="What is wrong with this, in your words"></textarea>' +
      '<div class="at-composer-row">' +
      '<span class="at-composer-hint">Enter saves &middot; Esc cancels</span>' +
      '<button class="at-btn at-composer-save" type="button">Save</button>' +
      '</div>';
    var label = el.tagName.toLowerCase() + ' · ' + (el.getAttribute('data-src') || '?');
    var snip = snippetOf(el);
    box.querySelector('.at-composer-target').textContent =
      snip ? label + ' — "' + snip.slice(0, 48) + '"' : label;

    var top = Math.min(window.innerHeight - 170, Math.max(8, r.bottom + 8));
    var left = Math.min(window.innerWidth - 320, Math.max(8, r.left));
    box.style.cssText = 'left:' + left + 'px;top:' + top + 'px';
    layer.appendChild(box);

    var ta = box.querySelector('textarea');
    ta.focus();
    composing = { node: box, el: el };

    function commit() {
      var text = ta.value.trim();
      if (!text) { closeComposer(); return; }
      notes.push({
        id: 'p' + (++seq) + '-' + notes.length,
        n: 0,
        variant: variant(),
        src: el.getAttribute('data-src') || '',
        tag: el.tagName.toLowerCase(),
        snippet: snip,
        comment: text,
        build: BUILD
      });
      renumber();
      save();
      closeComposer();
      render();
    }

    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeComposer(); }
    });
    box.querySelector('.at-composer-save').addEventListener('click', commit);
  }

  // --- markdown -------------------------------------------------------------

  function markdown() {
    var byVariant = {};
    notes.forEach(function (p) {
      var v = p.variant || '';
      (byVariant[v] = byVariant[v] || []).push(p);
    });
    var out = [MARK, '', '# Folio feedback', ''];
    if (OUT) out.push('Folio: ' + OUT);
    if (FRAGMENT) out.push('Fragment: ' + FRAGMENT + '  <- edit this, not the folio');
    if (BUILD) out.push('Build: ' + BUILD);
    out.push('');
    Object.keys(byVariant).forEach(function (v) {
      out.push('## ' + (v || 'Page'));
      out.push('');
      byVariant[v].forEach(function (p) {
        var head = p.n + '. `' + p.src + '` <' + p.tag + '>';
        if (p.snippet) head += ' "' + p.snippet.slice(0, 60) + '"';
        if (p.stale) head += '  [STALE - element not in the current build]';
        else if (p.moved) head += '  [MOVED - matched by text, line differs]';
        out.push(head);
        p.comment.split('\n').forEach(function (line) { out.push('   ' + line); });
        out.push('');
      });
    });
    return out.join('\n');
  }

  /* The confirmation is the button itself: its label becomes what just happened. An
     icon-only button has no label to swap, so for those the state is the whole signal. */
  function flash(btn, word) {
    var label = btn.querySelector('span');
    var was = label ? label.textContent : null;
    if (label) label.textContent = word;
    btn.setAttribute('data-done', '');
    setTimeout(function () {
      if (label) label.textContent = was;
      btn.removeAttribute('data-done');
    }, 1600);
  }

  panel.querySelector('.at-copy').addEventListener('click', function () {
    var btn = this;
    var text = markdown();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash(btn, 'Copied'); },
        function () { fallbackCopy(text, btn); });
    } else {
      fallbackCopy(text, btn);
    }
  });

  function fallbackCopy(text, btn) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); flash(btn, 'Copied'); } catch (e) {}
    ta.remove();
  }

  panel.querySelector('.at-clear').addEventListener('click', function () {
    if (!notes.length) return;
    if (!window.confirm('Delete all ' + notes.length + ' comments on this folio?')) return;
    notes = [];
    save();
    render();
  });

  panel.querySelector('.at-close').addEventListener('click', function () { setMode(false); });

  // --- mode -----------------------------------------------------------------

  /* A visible way in. `a` is fine once you know it, but a key is not an affordance:
     nothing on the page said the comment layer existed, so it was found by accident and
     — since the same key leaves — left by accident too. The button says what it is,
     shows whether it is on, and carries the shortcut in its tooltip. It sits beside the
     theme toggle rather than in the rail because every kind has annotate and only
     prototypes have a rail. */
  var toggleBtn = document.createElement('button');
  /* `at-dock` at CREATION, not when __atDock runs on a timeout. viewport.js serializes the
     device frame's srcdoc out of this same DOM, and it strips floating controls by that
     one class; a button that had not been docked yet survived the strip, then rendered
     undocked in a corner of the design inside the frame. */
  toggleBtn.className = 'at-annotate-toggle at-dock';
  toggleBtn.type = 'button';
  toggleBtn.title = 'Comment on anything  (a)';
  toggleBtn.setAttribute('aria-label', 'Comment mode');
  toggleBtn.setAttribute('aria-pressed', 'false');
  toggleBtn.innerHTML =
    '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">' +
    '<path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" ' +
    'd="M2 3.6h12v7.2H7.2L4.2 13.4v-2.6H2z"/></svg>';
  toggleBtn.addEventListener('click', function () { setMode(!open); });
  // Host only — see rail.js's reopen button. An undocked copy inside the frame renders in
  // normal flow, on top of the design.
  if (!root.hasAttribute('data-at-embedded')) {
    document.body.appendChild(toggleBtn);
    if (window.__atDock) window.__atDock(toggleBtn, 'annotate', 'right', 0);
  }

  function setMode(on) {
    open = on;
    closeComposer();
    paintActions();
    toggleBtn.toggleAttribute('data-active', on);
    toggleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) {
      root.setAttribute('data-at-annotate', '');
      render();
    } else {
      root.removeAttribute('data-at-annotate');
      if (aimed) { aimed.classList.remove('at-aim'); aimed = null; }
      layer.innerHTML = '';
    }
    pushFrames();
    /* The comments panel takes 300px off the right edge through --at-inset-r, so the
       device stage has less room than it had a moment ago and its frame has to be
       rescaled. Only the rail dispatched this, so opening comments left a TV frame at its
       old scale, running underneath the panel until the window was resized. */
    window.dispatchEvent(new Event('at:relayout'));
  }

  /* ---------------- the design lives inside the device frame ----------------

     Annotate mode is a property of a document, and on a prototype the design is not in
     THIS document — it is in the iframe viewport.js builds. Setting data-at-annotate on
     the host alone put the crosshair on the black stage around the frame and nothing
     else: every element worth commenting on kept its own cursor, and clicks on the design
     went to the design. The frame is same-origin and runs this same file, so it is told
     the mode and turns itself on. Pins land in the same bucket either way — the clone
     inherits data-at-key. */

  function pushFrames() {
    if (root.hasAttribute('data-at-embedded')) return;
    [].slice.call(document.querySelectorAll('.at-vp-frame')).forEach(function (f) {
      try { f.contentWindow.postMessage({ at: 'annotate', on: open }, '*'); } catch (e) {}
    });
  }

  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.at !== 'annotate') return;
    if (!root.hasAttribute('data-at-embedded')) return;
    if (!!m.on !== open) setMode(!!m.on);
  });

  // A fresh frame has just finished loading and knows nothing about the mode it is
  // opening into.
  window.addEventListener('at:device', pushFrames);

  document.addEventListener('keydown', function (e) {
    if (!window.__atHotkeys || !window.__atHotkeys(e)) return;
    if (e.key === 'a' || e.key === 'A') { e.preventDefault(); setMode(!open); }
    else if (e.key === 'Escape' && open) {
      if (composing) closeComposer();
      else setMode(false);
    }
  });

  document.addEventListener('mousemove', function (e) {
    if (!open) return;
    var el = e.target.closest && e.target.closest('[data-src]');
    if (e.target.closest && e.target.closest(CHROME)) el = null;
    if (el === aimed) return;
    if (aimed) aimed.classList.remove('at-aim');
    aimed = el;
    if (aimed) aimed.classList.add('at-aim');
  }, true);

  /* Capture phase: in annotate mode the page's own buttons must not fire. */
  document.addEventListener('click', function (e) {
    if (!open) return;
    if (e.target.closest(CHROME)) return;
    var el = e.target.closest('[data-src]');
    e.preventDefault();
    e.stopPropagation();
    if (el) compose(el);
  }, true);

  // --- keeping the overlay on top of a moving page --------------------------

  /* Programmatic surface. The panel is the human control; this is how a test — or an
     agent checking its own folio — drives the same thing without a mouse. */
  window.atAnnotate = {
    mode: function (on) { setMode(on === undefined ? !open : !!on); return open; },
    add: function (selector, comment) {
      var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!el || !el.getAttribute('data-src')) return null;
      var pin = {
        id: 'p' + (++seq) + '-' + notes.length,
        n: 0,
        variant: variant(),
        src: el.getAttribute('data-src'),
        tag: el.tagName.toLowerCase(),
        snippet: snippetOf(el),
        comment: String(comment),
        build: BUILD
      };
      notes.push(pin);
      renumber();
      save();
      render();
      return pin;
    },
    notes: function () { return notes.slice(); },
    markdown: markdown,
    clear: function () { notes = []; save(); render(); }
  };

  var pending = false;
  function reflow() {
    if (!open || pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; render(); });
  }

  window.addEventListener('scroll', reflow, true);
  window.addEventListener('resize', reflow);
  window.addEventListener('at:variant', function () { selected = null; reflow(); });

  /* A comment made inside a viewport device frame is written by that document, not this
     one. The storage event fires in every *other* document sharing the origin, which is
     exactly how the host panel learns about it. */
  window.addEventListener('storage', function (e) {
    if (e.key && e.key !== KEY) return;
    notes = load();
    renumber();
    reflow();
  });

  // The same news, sent directly by the document that wrote it — see save(). Both
  // directions, so this listener does not care which side it is on.
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.at !== 'notes') return;
    notes = load();
    renumber();
    reflow();
  });

  /* render() writes into .at-notes-layer, so an unfiltered observer would re-enter
     itself every frame. Only the page's own DOM counts as a change worth reflowing for. */
  new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var t = records[i].target;
      var el = t.nodeType === 1 ? t : t.parentElement;
      if (el && el.closest('.at-notes-layer, .at-panel')) continue;
      reflow();
      return;
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
