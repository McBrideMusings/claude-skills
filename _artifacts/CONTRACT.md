# Contract — kinds, fragments, class vocabulary

What you write is a **body fragment**: real content, nothing else. No `<!DOCTYPE>`, no `<html>`, no
`<head>`, no reset, no theme block, no type scale, no picker. The tool supplies all of that.

## Invoke

```bash
"$HOME/.claude/tools/artifact" build \
  --kind explainer \
  --title "How statusline auth works" \
  --fragment /abs/repo/tmp/claude/artifacts/statusline-auth.body.html \
  --out /abs/repo/tmp/claude/explainers/statusline-auth.html
```

**Decide whether the artifact needs the device switcher.** Add `--with viewport` when the layout is
meant to respond to width and seeing it at phone or tablet size is part of the judgement. Leave it off
— the default — when the thing only ever exists at one size: a macOS menubar panel, a desktop-only
window, a single component in isolation, a report meant to be read on a laptop. Sizes the artifact will
never be used at are chrome that invites a pointless verdict.

`artifact kinds` lists the kinds and their flags. `artifact serve <path>` is a contingency that shells
to `python3 -m http.server`; you almost never need it — `file://` runs inline modules and blob workers
fine, and a hermetic artifact never calls `fetch`.

**Every path absolute.** Resolve the repo root in its own Bash call (`git rev-parse --show-toplevel`,
falling back to absolute `pwd`) and build `<root>/tmp/claude/…` from it. A path that doesn't start with
`/` is the bug.

## The five kinds

| Kind | For | Palette | Read also |
|---|---|---|---|
| `explainer` | Explaining a mechanism, system, comparison, concept, or decision | **House look** — fixed semantic colour, do not override | — |
| `prototype` | Several genuinely different working versions of one UI | **None** — your fragment carries the host project's tokens | — |
| `wireframe` | Greybox layout: structure and hierarchy only | **Withheld on purpose** — do not add colour | — |
| `deck` | Slides | Yours to choose | `DIRECTION.md` |
| `page` | Anything else: a plan, a report, a one-off deliverable | Yours to choose | `DIRECTION.md` |

Pick by what the artifact *is*, not by which skill you came from.

## Fragment rules — all kinds

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

`--f-3xl` is the display step: one per artifact, on the title, never on a section heading.

Utilities: `.scroll-x` (overflow container), `.stack` (vertical flex + gap), `.row` (horizontal flex +
gap), `.nums` (tabular numerals — the same class name on a `<td>` also right-aligns it), `.vh`
(visually hidden). Focus rings, `prefers-reduced-motion`, text selection, the caret, scrollbars and
link underline offset are already themed — don't re-declare them.

**The measure grid.** In `explainer` and `page`, `main` is a two-width grid: prose sits at `--maxw`
(68ch) and `figure`, `table`, `.scroll-x`, `.code` and `.compare` automatically break out to
`--maxw-wide` (96ch). Add `class="wide"` to send anything else out to the wide track. A diagram or a
ten-row table squeezed into a reading measure is the single most common way an artifact looks cramped,
and it is already handled — don't re-center things by hand. `deck`, `prototype` and `wireframe` take
the full viewport instead.

**Never a coloured `border-left` thicker than 1px** on a callout, card, list item or alert. It is the
most recognisable machine-made accent there is, and the tinted ground plus a coloured label already
say what it would say. Every kind's stylesheet has been cleared of them; don't reintroduce one in a
fragment.

## `explainer` — house look

Semantic colour is **information**, not decoration. Hue means the same thing in every explainer:

| Role | Token | Means |
|---|---|---|
| Data / state | `--c-data` (blue) | values, state, stored things, payloads |
| Control flow | `--c-flow` (violet) | calls, branches, the path execution takes |
| Happy path | `--c-happy` (green) | success, the normal case |
| Danger / edge | `--c-danger` (red) | errors, failure modes |
| Caution / gotcha | `--c-warn` (amber) | surprising behaviour, footguns |

Never repurpose a role for decoration. When a diagram uses more than two roles, add a `.legend`.
Never rely on colour alone — pair hue with a label, shape, or border style.

Classes:

- `.hero` — wraps `.badge` (archetype), `<h1>`, `.what` (one line), `.why` (1–2 sentences on what you'll
  be able to do after)
- `.callout` + `.callout--data` / `--flow` / `--happy` / `--danger` / `--warn`, each with a
  `<span class="label">`
- `.diagram` — `<figure>` around inline SVG, `<figcaption>` required. The sheet ships the node and edge
  vocabulary, so a diagram is marked up, not restyled: `<g class="node node--flow">` around a `rect` /
  `circle` / `ellipse`, `.node-t` for a node's label and `.node-s` for its second line, `.edge` (plus
  `.edge--dashed`) for connectors and `.edge-t` for an edge label. Role modifiers are the same five as
  everywhere else: `--data --flow --happy --danger --warn`.
- `.legend` with `.dot` swatches — `.dot--data` / `--flow` / `--happy` / `--danger` / `--warn` carry the
  colour; a bare `.dot` is muted grey
- `.steps` — `<ol>`, numbered rail, the Process backbone
- `.compare` (add `.three` for three columns) with `.col` children
- `.code` — `<pre>` inside; hand-coloured spans `.tok-key` `.tok-val` `.tok-str` `.tok-com` `.ann`. No
  syntax-highlighting library.
- `.cite` — the `file:line` pill. **Every concrete code claim carries one.** If you didn't open the
  file, you can't draw it.
- `details.reveal` — layered "go deeper". Native `<details>`, no JS.

## `prototype` — variants, state axes and devices, behind one rail

Build with `--picker switch` (one at a time, full size — the default) or `--picker list` (each stacked
full size, one per screenful). **Never a grid of thumbnails**: small side-by-side comparison distorts
spacing and scale, and judging UI at postage-stamp size is the failure the picker exists to prevent.

In switch mode every control lives in **one left rail**: round, variant, each state axis, and the
device frame. They are all the same question — *what am I looking at* — and they are ordered coarse to
fine. The tool generates the rail, the keyboard wiring, and the URL persistence. **Write no rail
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
- **Never write `data-round` yourself.** `--round N` stamps it. See "Rounds" below.
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
  have. If a control genuinely goes nowhere in this round, it does not go in this round.

### State axes — which screen, which state, which error

An **axis** is a control the rail renders and your fragment interprets. It is orthogonal to round and
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
- Every round's top-level markup is carried forward, so **scope selectors to what your round owns**
  and guard on existence; round 1's script and round 3's script both run.
- Axes are round-scoped: `--round 3` can declare screens round 1 never had, and the rail shows only
  the current round's.
- Axis state persists in the URL as `?screen=chat`, alongside `?r=` and `?v=`.

### Devices — named per prototype, never defaulted into

`--devices fit,phone,tablet,desktop,web`. Choosing these is a judgement about **this** design, and it
is yours to make: offering a frame the design was never meant for invites a verdict on a layout nobody
drew. A phone-only chat surface gets `fit,phone`. A pane-tree editor gets `fit,desktop`. `fit` is
always included and is the default view.

Chrome sits on whichever side of the viewport it really sits on, and the harness draws all of it:

| Frame | Chrome | Where |
| --- | --- | --- |
| `phone`, `tablet` | status bar, notch, home indicator | **inside** the viewport — content scrolls under it |
| `desktop` | none by default; `--window` adds it | see below |
| `web` | tab strip + URL bar | **outside** |

### `--window` — what kind of window the desktop frame is

A build-time decision, like `--devices`, and for the same reason: whether the design owns its own
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
keep its own controls clear of them can. `--window` is refused unless `desktop` is in `--devices`.

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

### Rounds — one canonical file per topic

A prototype topic has **one output file for its whole life**: `prototypes/<slug>/<slug>.html`. Each
round is a rebuild of that same path with `--round N`:

```bash
artifact build --kind prototype --picker switch --round 2 \
  --title "Branches Pane" \
  --fragment <root>/tmp/claude/artifacts/branches-pane-v2.body.html \
  --out <root>/tmp/claude/prototypes/branches-pane/branches-pane.html
```

The tool reads the file it is about to overwrite, keeps every round that is **not** N, stamps this
fragment's templates `data-round="N"`, and writes them all back. Rebuilding round N replaces round N
and nothing else. Each round's non-template markup — its `<style>` of project tokens — is fenced as
`<!--at:round N-->…<!--/at:round N-->` and carried forward too, newest last, so a later round's
redefinition of a class wins by ordinary cascade while v1 keeps the rules it was built against.

The controls never share a letter:

| | URL | Control | Keys |
| --- | --- | --- | --- |
| **Round** — a whole rebuild of the design | `?r=2` | rail, top: `v1 v2 v3` chips | `[` `]` |
| **Variant** — a direction within one round | `?v=3` | rail: named buttons | `1`–`N`, `←`/`→` |
| **Axis** — which state of the thing | `?screen=chat` | rail: one group per axis | `x` focuses the next axis, `,` / `.` step it |
| **Device** — which frame it renders in | `?d=phone-landscape` | rail, below the axes | `d` / `D` |

The rail also answers `\` (collapse — it costs 272px the design does not get, and `?rail=0`
remembers it), `?` (show the key list), `r` (replay), and `Escape` (blur). Pressing a key while a
device frame has focus works: the frame forwards the keys the host owns and keeps `a` and `c` for
itself.

Ordered coarse to fine down the rail, so the thing you change once a session sits above the thing you
change a hundred times. The round group is omitted entirely while a topic has one round.

Opening the file bare shows the newest round's first variant. Stepping rounds keeps the variant slot,
so `]` compares the same position across versions. An out-of-range `r` or `v` falls back rather than
blanking, and the URL is rewritten to what is actually on screen.

`--round` applies to `--picker switch` only; `list` mode stacks one round and has nowhere to put a
ticker.

## `wireframe` — greybox

Structure and hierarchy only. Greys, dashed placeholder frames, labelled regions. No brand colour, no
imagery, no type personality — anything that invites a reaction to the *style* is defeating the point,
which is a yes/no on the *arrangement*.

Classes: `.wf-region` (labelled box), `.wf-label` (caps region name), `.wf-ph` (dashed placeholder),
`.wf-text` (grey text bars, `data-lines="3"`), `.wf-control` (generic input/button block),
`.wf-note` (annotation outside the frame).

## `deck` — slides

Each slide is a `<section data-slide>`; the first `<h2>` is its title. The tool adds `←`/`→`/space
navigation, `1–9` jump, a slide counter, and print-to-PDF page breaks.

```html
<section data-slide>
  <h2>Where the time goes</h2>
  <p>…</p>
</section>
```

`.deck-lead` for an opening statement, `.deck-note` for a footnote line, `.deck-split` for a two-column
slide.

## `page` — fallback

Structural plumbing only; palette and typefaces are yours. Read `DIRECTION.md` and write the short
colour/type/layout plan before any markup. Classes: `.page-hero`, `.page-section`, `.page-lead`,
`.page-note`, plus everything in `_base.css`.

## Before handing it over

1. Run the build; a non-zero exit means nothing was written.
2. **Screenshot it and look at it.** Every variant for a picker, every slide for a deck, both themes if
   it themes. A path is delivery, not verification — a font falling back, an overlap, or a blank
   variant is invisible in source.
3. **Run the critique pass** — [`CRITIQUE.md`](CRITIQUE.md). One batched round: the artifact's own
   contrast check in both themes, then the screenshot read against a fixed list. Fix what it finds in
   one batch and stop; it is a pass, not a loop.
4. `open <absolute-path>`, printed on its own line with no trailing punctuation.
5. Say which keys the artifact answers to: `a` to comment on anything, `c` to check contrast, and the
   device switcher along the top when it is a prototype or a wireframe.

## Getting comments back

Every artifact carries the annotate widget. Pressing `a` turns the page into a review surface: click
any element, type what is wrong with it, and the comment is pinned to that element with a number.
Comments survive reload, and survive a rebuild — a pin reattaches by the fragment line it was made
against, falls back to matching the element's text (flagged `MOVED`), and is kept and flagged `STALE`
rather than dropped when the element is gone.

One way out of the browser: **Copy comments** puts the whole set on the clipboard as markdown.

There used to be a second button that wrote `~/Downloads/artifact-feedback--<slug>.md` for an agent
to watch. It is gone. A download is a worse handoff than a copy in every respect that matters: it
needs a directory nobody asked about, Chrome renames the second one to ` (1)` so the watcher matches
a stale file, and it leaves litter behind on a machine that never asked for a file.

**The clipboard is still a channel back to you, with no server and no file.** The markdown opens with
`<!-- artifact-feedback: <slug> -->`, so you can wait on the clipboard instead of asking whether
they're done. After `open`, start a bounded watcher in the background; the harness re-invokes you
when it exits:

```bash
for i in $(seq 1 900); do
  pbpaste 2>/dev/null | head -1 | grep -q 'artifact-feedback: <slug>' && break
  sleep 2
done
pbpaste
```

Say you are doing this, because polling `pbpaste` reads whatever else they copy in the meantime.
When that is not wanted, just ask them to paste it — the button is right there and the artifact
needs nothing from you.

Each comment names a line of the **fragment**, not of the built artifact. Edit the fragment and
rebuild to the same `--out`; do not hand-edit the HTML.

## Refining

Edit the fragment and re-run the build to the same `--out`. One file per artifact — never a new file
per refinement.
