# Contract — kinds, fragments, class vocabulary

What you write is a **body fragment**: real content, nothing else. No `<!DOCTYPE>`, no `<html>`, no
`<head>`, no reset, no theme block, no type scale, no picker. The tool supplies all of that.

## Invoke

```bash
"$HOME/.claude/skills/spike/tool/spike" build \
  --kind prototype \
  --title "Wheelhouse nav" \
  --fragment /private/tmp/claude/<repo-slug>/spikes/wheelhouse-nav.body.html \
  --out /private/tmp/claude/<repo-slug>/spikes/wheelhouse-nav.html
```

**Decide which device this prototype is for.** `--device` is required on `prototype`, takes
exactly one value, and has no default. It is the first thing to settle, because it decides
the slug as well as the frame: a design that ships on a phone and on a desktop is two
prototypes, not one file with a switcher.

`spike kinds` lists the kinds and their flags. `spike` carries `serve <path>` as a
contingency that shells to `python3 -m http.server`; you almost never need it — `file://` runs
inline modules and blob workers fine, and a hermetic folio never calls `fetch`.

**Every path absolute.** Resolve the repo root in its own Bash call (`git rev-parse --show-toplevel`,
falling back to absolute `pwd`) and build `/private/tmp/claude/<repo-slug>/…` from it. A path that doesn't start with
`/` is the bug.

## The two kinds

| Kind | For | Palette |
|---|---|---|
| `prototype` | Several genuinely different working versions of one UI | **None** — your fragment carries the host project's tokens |
| `wireframe` | Greybox layout: structure and hierarchy only | **Withheld on purpose** — do not add colour |

Pick by what the thing you're building *is*. Explaining a mechanism, system or decision is a
different tool (`explainer`) and a different kind entirely — it has no picker, no state axes, no
device frames, and none of what follows applies to it.

## Fragment rules

- Plain HTML. It may include its own `<style>` and `<script>`; the tool hoists them into the single
  output file, so the result stays hermetic.
- **Never a network request.** No `<link>`, no `@import url()`, no CDN, no webfont, no remote image.
  A raster goes in as a `data:` URI.
- Non-void elements closed, attributes double-quoted.
- Real content from the first draft. No lorem ipsum, no `foo`/`bar`, no dead buttons.
- Broad content (tables, code, wide diagrams) goes in `<div class="scroll-x">` so horizontal scrolling
  never leaks to the page body.
- Hand-author diagrams as inline `<svg>`. No diagram library. **`var()` does not resolve in SVG
  presentation attributes** — style SVG through CSS rules or `style="…"`, never `fill="var(--x)"`.
- Reach for Canvas over long hand-written SVG path data when graphics turn generative.

## `_base.css` — available in every kind

Tokens on `:root`, reassigned for `prefers-color-scheme: dark`, then again under
`:root[data-theme="dark"]` / `:root[data-theme="light"]` so an explicit toggle wins both ways. Consume
tokens; never hardcode a hex in markup.

```
--f-3xl --f-2xl --f-xl --f-lg --f-md --f-sm  type scale (root is 17px, so 1rem = 17px)
--s-1 … --s-7                                spacing scale (--s-7 is the section step)
--radius --maxw --maxw-wide
--font-sans --font-mono
--bg --surface --ink --ink-soft --line --c-muted --c-accent
```

`--f-3xl` is the display step: one per folio, on the title, never on a section heading.

Utilities: `.scroll-x` (overflow container), `.stack` (vertical flex + gap), `.row` (horizontal flex +
gap), `.nums` (tabular numerals — the same class name on a `<td>` also right-aligns it), `.vh`
(visually hidden). Focus rings, `prefers-reduced-motion`, text selection, the caret, scrollbars and
link underline offset are already themed — don't re-declare them.

`prototype` and `wireframe` take the full viewport — neither uses the measure grid, so nothing here
about breaking prose out to a wide track applies to them.

**Never a coloured `border-left` thicker than 1px** on a callout, card, list item or alert. It is the
most recognisable machine-made accent there is. Every kind's stylesheet has been cleared of them;
don't reintroduce one in a fragment.

## `prototype` — variants, state axes and devices, behind one rail

Build with `--picker switch` (one at a time, full size — the default) or `--picker list` (each stacked
full size, one per screenful). **Never a grid of thumbnails**: small side-by-side comparison distorts
spacing and scale, and judging UI at postage-stamp size is the failure the picker exists to prevent.

In switch mode every control lives in **one left rail**: variant, each state axis, and the
device frame. They are all the same question — *what am I looking at* — and they are ordered coarse to
fine. The tool generates the rail and the URL persistence. **Write no rail
code.**

```html
<style>
  /* the host project's tokens, copied — not imported */
  :root { --brand: #2f6df6; --radius-card: 10px; }
</style>

<nav data-axis="screen" data-label="Screen">
  <button data-value="home">Home<em>the session list</em></button>
  <button data-value="chat">Agent chat<em>ACP transcript</em></button>
</nav>

<aside data-rail-note><b>Scope.</b> Resume-only. No terminal view.</aside>

<template data-variant="Quiet" data-caption="Minimal motion, borders over shadows">
  <div class="proto-frame">…the variant, in realistic surrounding context…</div>
</template>

<template data-variant="Editorial" data-caption="Large type, generous whitespace">
  <div class="proto-frame">…</div>
</template>

<script>
  // See "State axes" — every axis is event-driven, and this is the whole boilerplate.
  addEventListener('at:axis', function (e) {
    if (e.detail.axis !== 'screen') return;
    document.querySelectorAll('[data-screen]').forEach(function (el) {
      el.hidden = el.dataset.screen !== e.detail.value;
    });
  });
</script>
```

- `data-variant` is the rail label — a direction ("Quiet", "Dense"), never "Variant A".
- `data-caption` is optional; `list` mode prints it under the heading. It is **not** `data-axis` —
  see below, those are two different things.
- Add `data-motion` to the fragment's first `<template>` if any variant has an entrance animation worth
  re-triggering — the tool then renders the replay button.
- The rail is chrome. It is never restyled with the project's tokens, and `prototype.css` supplies no
  palette of its own — every colour in the output comes from your fragment.
- Each variant renders in realistic surrounding context: a toast needs a page behind it, a card needs
  siblings, a button needs a form.
- The variant swap is instant. Flipping is a 100+/session action; it gets no animation.
- **Every control in the prototype is live.** Not the happy path only: each tab switches, each toggle
  toggles, each row opens something, each dangerous button shows what it would do. A dead control is
  worse than an absent one — it reads as a bug and stops the conversation the prototype exists to
  have. If a control genuinely goes nowhere, it does not go in.

### State axes — which screen, which state, which error

An **axis** is a control the rail renders and your fragment interprets. It is orthogonal to
variant on purpose: flipping variant must not reset which screen is showing, because comparing one
screen across two directions is the entire job.

```html
<nav data-axis="conn" data-label="Connection">
  <button data-value="up">Connected</button>
  <button data-value="down">Server unreachable<em>what the list does with no data</em></button>
</nav>
```

- Declared at the **top level** of the fragment — never inside a `<template data-variant>`, which is
  not in the document until it is mounted.
- The first `<button>` is the default. `<em>` inside a button is a second, dimmer line.
- Clicking one dispatches on `window`:
  `new CustomEvent('at:axis', {detail: {axis, value, index, label}})`.
- **The rail re-emits every live axis right after each mount.** So a listener never has to re-apply
  state after a variant switch — it just handles the event again. Don't write re-apply code.
- Your listener must be a **top-level `<script>`** in the fragment. A `<script>` cloned out of a
  `<template>` does not execute — this is the one trap in the whole contract.
- Axis state persists in the URL as `?screen=chat`, alongside `?v=`.

### The device — one per prototype, required, chosen at build time

`--device phone|tablet|desktop|panel|web|tv`. Exactly one, and the tool refuses a build without it.
A phone-only chat surface gets `phone`. A pane-tree editor gets `desktop`. A design that ships on iOS
*and* as a Mac menu bar extra is two prototypes, `--device phone` and `--device panel`, each named for
what it is.

There is no switcher and no unframed `fit`. A row of frames invited the reader to judge a phone layout
against a desktop layout as if they were two directions for one design, which is the comparison the
harness exists to prevent — and the unframed view was a size nobody drew for. The rail's device group
is the frame's name plus the size readout, rotate, and 1:1.

Chrome sits on whichever side of the viewport it really sits on, and the harness draws all of it:

| Frame | Chrome | Where |
| --- | --- | --- |
| `phone`, `tablet` | status bar, notch, home indicator | **inside** the viewport — content scrolls under it |
| `desktop` | none by default; `--window` adds it | see below |
| `panel` | menu bar strip with the status item lit | **outside** — the panel hangs from it |
| `web` | tab strip + URL bar | **outside** |
| `tv` | none drawn; tvOS overscan published as `--at-safe-*` | inset only |

`panel` is 380×520 — a menu bar extra, not a small window. It has no title bar, no traffic lights and
no resize, so `--window` is refused against it; the width is the whole design constraint, which is
exactly what a 1440-wide `desktop` frame would hide.

### `--window` — what kind of window the desktop frame is

A build-time decision, like `--device`, and for the same reason: whether the design owns its own
title area is a property of the thing being prototyped, not something to flip while looking at it.
**The default is a bare window** — a desktop app with a full-size content view draws its own top
area, and a generic macOS title bar stapled over it is chrome nobody designed.

| `--window` | What you get | Where the chrome sits |
| --- | --- | --- |
| *(omitted)* | bare viewport, bezel only | — |
| `bar` | title bar, no lights | **outside** the viewport |
| `bar,lights` | the standard macOS window | **outside** the viewport |
| `lights` | full-size content view: lights float over the app's own top area | **inside** the viewport |

`--window lights` is the only one that reaches into the viewport, so it is the only one your layout
has to know about. It reserves nothing — drawing under the lights is the entire point of that window
style — and publishes `--at-lights-w` (78px) and `--at-lights-h` (28px) so a layout that wants to
keep its own controls clear of them can. `--window` is refused unless `--device` is `desktop`.

Never draw your own status bar or window chrome in the fragment. Reserve the space instead: the frame
publishes `--at-safe-top` and `--at-safe-bottom`, and pads `body` by them automatically. Set
`data-at-safe="none"` on your root element if your layout wants to paint under the status bar itself.

A frame larger than the window is scaled down to fit, and the rail says by how much — `1440 × 900 ·
67%`. Nobody can judge type or spacing at 67%, so `1:1` turns scaling off and lets the page scroll to
the rest of the frame instead. Flipping a variant or an axis does **not** rebuild the frame: it is
told what changed and applies it in place, so scroll position, typed input and whatever state the
prototype holds all survive. Only changing device or orientation rebuilds it.

Each frame is a real `<iframe>`, so `@media (max-width: 640px)` fires inside it for real — which a
width-constrained `<div>` can never do, and is why device frames are the harness's job.

### One file, rebuilt in place

A prototype has **one output file**, and a build replaces it:

```bash
"$HOME/.claude/skills/spike/tool/spike" build --kind prototype --picker switch \
  --title "Branches Pane" \
  --fragment /private/tmp/claude/<repo-slug>/spikes/branches-pane/branches-pane.body.html \
  --out /private/tmp/claude/<repo-slug>/spikes/branches-pane/branches-pane.html
```

There are no rounds and nothing is carried forward. Refining is editing the fragment and building
again over the top; earlier attempts live in git if the file is committed, and nowhere if it is not,
which is what "throwaway" means. Keeping every attempt inside the artifact doubled its size and left
stale designs one click away from the current one.

The controls never share a letter:

| | URL | Control |
| --- | --- | --- |
| **Variant** — which direction is on screen | `?v=3` | rail: named buttons |
| **Axis** — which state of the thing | `?screen=chat` | rail: one group per axis |
| **Device** — which frame it renders in | `?d=phone-landscape` | rail, below the axes |

**A prototype answers no harness keys at all.** Every control above is a button, collapse is the
`‹` toggle at the rail's edge (`?rail=0` remembers it), and comment mode and the contrast check are
the two docked buttons on the right. This is not an oversight to fix: a prototype is a working
interface with keys of its own, so a prototype of anything keyboard-driven could not be driven at all
if the harness claimed the keyboard too. `wireframe` is a document and still answers `a` and `c`.

### Checks — eight verdicts the rail keeps up to date

The bottom of the rail carries a standing pass/fail row per check, recomputed whenever the folio
changes and read from the device frame's document when one is up. Click a row for what it found.
Nothing here is a judgement call — every one is arithmetic on the DOM:

| Check | What fails it |
|---|---|
| Contrast | text under 4.5:1, or 3:1 at large sizes (WCAG 2.1 SC 1.4.3) |
| Overflow | anything pushing the stage sideways |
| Tap targets | interactive elements under 24×24 (WCAG 2.2 SC 2.5.8); links inline in a sentence are exempt, as that rule allows |
| Text size | text under 12px — a **house floor**, not a standard: WCAG sets no minimum size |
| Dead links | `href="#"`, `href=""`, or no `href`. A button whose handler does nothing is not detectable from here |
| Image alt | an `<img>` with no `alt` attribute at all |
| Duplicate ids | one id used twice, which breaks `<label for>` and every aria reference |
| Hermetic | a remote `src` or `@import`. The builder already refuses these, so this is a backstop for anything injected at runtime |

Harness chrome is excluded from all of them — the rail is not the design under review.
`window.atContrast.check(true)` audits the chrome itself when that is what you need.

Ordered coarse to fine down the rail, so the thing you change once a session sits above the thing you
change a hundred times. The variant group is omitted entirely when there is only one variant.

Opening the file bare shows the first variant. An out-of-range `v` falls back rather than blanking,
and the URL is rewritten to what is actually on screen.

## `wireframe` — greybox

Structure and hierarchy only. Greys, dashed placeholder frames, labelled regions. No brand colour, no
imagery, no type personality — anything that invites a reaction to the *style* is defeating the point,
which is a yes/no on the *arrangement*.

Classes: `.wf-region` (labelled box), `.wf-label` (caps region name), `.wf-ph` (dashed placeholder),
`.wf-text` (grey text bars, `data-lines="3"`), `.wf-control` (generic input/button block),
`.wf-note` (annotation outside the frame).

## Before handing it over

1. Run the build; a non-zero exit means nothing was written.
2. **Screenshot it and look at it.** Every variant for a picker, both themes if
   it themes. A path is delivery, not verification — a font falling back, an overlap, or a blank
   variant is invisible in source.
3. **Run the critique pass** — [`CRITIQUE.md`](CRITIQUE.md). One batched round: the folio's own
   contrast check in both themes, then the screenshot read against a fixed list. Fix what it finds in
   one batch and stop; it is a pass, not a loop.
4. `open <absolute-path>`, printed on its own line with no trailing punctuation.
5. Say how to drive it. On a **prototype**: every control is a button — the rail on the left for
   variant, axes and device, and the two docked buttons on the right for comment mode and
   the contrast check. No keys, so the prototype's own keyboard is entirely its own. On `wireframe`:
   `a` to comment on anything, `c` to check contrast.

## Getting comments back

Every folio carries the annotate widget. Pressing `a` turns the page into a review surface: click
any element, type what is wrong with it, and the comment is pinned to that element with a number.
Comments survive reload, and survive a rebuild — a pin reattaches by the fragment line it was made
against, falls back to matching the element's text (flagged `MOVED`), and is kept and flagged `STALE`
rather than dropped when the element is gone.

One way out of the browser: **Copy comments** puts the whole set on the clipboard as markdown.

**The clipboard is a channel back to you, with no server and no file.** The markdown opens with
`<!-- folio-feedback: <slug> -->`, so you can wait on the clipboard instead of asking whether
they're done. After `open`, start a bounded watcher in the background; the harness re-invokes you
when it exits:

```bash
for i in $(seq 1 900); do
  pbpaste 2>/dev/null | head -1 | grep -q 'folio-feedback: <slug>' && break
  sleep 2
done
pbpaste
```

Say you are doing this, because polling `pbpaste` reads whatever else they copy in the meantime.
When that is not wanted, just ask them to paste it — the button is right there and the folio
needs nothing from you.

Each comment names a line of the **fragment**, not of the built folio. Edit the fragment and
rebuild to the same `--out`; do not hand-edit the HTML.

## Refining

Edit the fragment and re-run the build to the same `--out`. One file per folio — never a new file
per refinement.
