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
--f-2xl --f-xl --f-lg --f-md --f-sm          type scale
--s-1 … --s-6                                spacing scale
--radius --maxw
--font-sans --font-mono
--bg --surface --ink --ink-soft --line --c-muted --c-accent
```

Utilities: `.scroll-x` (overflow container), `.stack` (vertical flex + gap), `.row` (horizontal flex +
gap), `.nums` (tabular numerals), `.vh` (visually hidden). Focus rings and `prefers-reduced-motion` are
already handled — don't re-declare them.

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
- `.diagram` — `<figure>` around inline SVG, `<figcaption>` required
- `.legend` with `.dot` swatches
- `.steps` — `<ol>`, numbered rail, the Process backbone
- `.compare` (add `.three` for three columns) with `.col` children
- `.code` — `<pre>` inside; hand-coloured spans `.tok-key` `.tok-val` `.tok-str` `.tok-com` `.ann`. No
  syntax-highlighting library.
- `.cite` — the `file:line` pill. **Every concrete code claim carries one.** If you didn't open the
  file, you can't draw it.
- `details.reveal` — layered "go deeper". Native `<details>`, no JS.

## `prototype` — variants behind a picker

Build with `--picker switch` (one at a time, full size — the default) or `--picker list` (each stacked
full size, one per screenful). **Never a grid of thumbnails**: small side-by-side comparison distorts
spacing and scale, and judging UI at postage-stamp size is the failure the picker exists to prevent.

Each variant is a `<template>`. The tool generates the nav, the keyboard wiring, the URL persistence,
and the replay button. **Write no picker code.**

```html
<style>
  /* the host project's tokens, copied — not imported */
  :root { --brand: #2f6df6; --radius-card: 10px; }
</style>

<template data-variant="Quiet" data-axis="Minimal motion, borders over shadows">
  <div class="proto-frame">…the variant, in realistic surrounding context…</div>
</template>

<template data-variant="Editorial" data-axis="Large type, generous whitespace">
  <div class="proto-frame">…</div>
</template>
```

- `data-variant` is the picker label — a direction ("Quiet", "Dense"), never "Variant A".
- `data-axis` is optional; `list` mode prints it under the heading.
- **Never write `data-round` yourself.** `--round N` stamps it. See "Rounds" below.
- Add `data-motion` to the fragment's first `<template>` if any variant has an entrance animation worth
  re-triggering — the tool then renders the replay button.
- Add `data-picker-position="top"` on a template when a variant occupies the bottom-centre of the
  screen (a toast stack, a bottom sheet, a dock) so the picker never covers the work.
- The picker is chrome. It is never restyled with the project's tokens, and `prototype.css` supplies no
  palette of its own — every colour in the output comes from your fragment.
- Each variant renders in realistic surrounding context: a toast needs a page behind it, a card needs
  siblings, a button needs a form.
- The variant swap is instant. Flipping is a 100+/session action; it gets no animation. (The picker's
  own highlight slides — that's specified in `harness/picker.css` and is not yours to change.)

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

The two axes never share a letter:

| | URL | Control | Keys |
| --- | --- | --- | --- |
| **Round** — a whole rebuild of the design | `?r=2` | dimmed `v2` chip, bottom-right corner; click to expand the list | `[` `]`, `Esc` to close |
| **Variant** — a direction within one round | `?v=3` | the centre pill: named buttons, sliding highlight | `1`–`N`, `←`/`→` |

The round control is **not** in the pill and is not supposed to be noticed. Changing round is a
once-a-session act; changing variant is a hundred-times-a-session one, so the round chip sits alone in
the corner at 40% opacity, collapsed to the current round's label, and only expands on click. It is
omitted entirely while a topic has one round.

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
3. `open <absolute-path>`, printed on its own line with no trailing punctuation.
4. Say which keys the artifact answers to: `a` to comment on anything, `c` to check contrast, and the
   device switcher along the top when it is a prototype or a wireframe.

## Getting comments back

Every artifact carries the annotate widget. Pressing `a` turns the page into a review surface: click
any element, type what is wrong with it, and the comment is pinned to that element with a number.
Comments survive reload, and survive a rebuild — a pin reattaches by the fragment line it was made
against, falls back to matching the element's text (flagged `MOVED`), and is kept and flagged `STALE`
rather than dropped when the element is gone.

Two ways out of the browser, both producing the same markdown:

- **Copy** — clipboard, to paste into the conversation.
- **Send to Claude** — writes `~/Downloads/artifact-feedback--<artifact-basename>.md`.

**Wait for that file instead of asking whether they're done.** After `open`, start a bounded watcher
in the background; the harness re-invokes you when it exits:

```bash
F="$HOME/Downloads/artifact-feedback--<artifact-basename>.md"
for i in $(seq 1 900); do [ -f "$F" ] && break; sleep 2; done; [ -f "$F" ] && cat "$F"
```

Then delete the file once you have read it — Chrome appends ` (1)` to the name of a download that
collides with one already on disk, and the watcher would keep matching the stale one.

Each comment names a line of the **fragment**, not of the built artifact. Edit the fragment and
rebuild to the same `--out`; do not hand-edit the HTML.

## Refining

Edit the fragment and re-run the build to the same `--out`. One file per artifact — never a new file
per refinement.
