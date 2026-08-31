# Contract — the explain fragment

What you write is a **body fragment**: real content, nothing else. No `<!DOCTYPE>`, no
`<html>`, no `<head>`, no reset, no theme block, no type scale. `tool/explain` supplies
all of that, plus the symbol cast (below) — none of it costs you context in either
direction.

## Invoke

```bash
"$HOME/.claude/skills/explain/tool/explain" build \
  --title "Where does a papercut note actually land?" \
  --fragment /private/tmp/claude/<repo-slug>/explainers/<slug>.body.html \
  --out /private/tmp/claude/<repo-slug>/explainers/<slug>.html
```

**Every path absolute.** Resolve the repo root in its own Bash call
(`git rev-parse --show-toplevel`, falling back to absolute `pwd`) and build
`/private/tmp/claude/<repo-slug>/…` from it. A path that doesn't start with `/` is the
bug — the tool refuses a relative one rather than guessing.

Nothing outside `skills/explain/tool/` is read — no shared store, and none is to be
introduced. No `--kind`, no picker, no device frames — an explainer has one look and no
variants.

## Fragment rules

- Plain HTML. No `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` — the tool rejects any of
  these on a real tag boundary.
- **Never a network request.** No `<link>`, no `@import url()`, no CDN script, no
  webfont, no remote `src=`/`url()`. A raster goes in as a `data:` URI if you truly need
  one — the symbol cast below covers almost everything an explainer needs to draw.
- Non-void elements closed, attributes double-quoted.
- Real content from the first draft. No lorem ipsum, no `foo`/`bar`, no dead controls.
- A wide table, a wide diagram, or a long code block goes in `<div class="scroll-x">` so
  horizontal scroll never leaks to the page body.
- Hand-author every diagram as inline `<svg>`, built from the symbol cast plus plain
  boxes/arrows. No diagram library.
- `var()` **does not resolve** in SVG presentation attributes — style SVG through CSS
  rules (`.arrow`, `.mapnode`, …) or plain hex, never `fill="var(--x)"`.

## Two colours, not five

Ink `#111111` for everything normal. Brick red `#C42A1C` — one token, `--red` — for the
one thing the current panel is about: the arrow being traced, the value that changed,
the line in the diagram that answers the panel's title. Never spend red on decoration,
and never use it in two unrelated places on the same panel — that dilutes the one thing
it's supposed to point at.

A failure or a gotcha is marked by a **dashed border and a label**, never by a second
hue. See `.gotcha` and `.arrow.no` below.

No dark mode, no theme toggle. The bright textbook look is the point.

## Type

- **Georgia, serif, weight 400** — the page `<h1>` and every panel `<h2>`. Nothing else
  uses it.
- **Helvetica/Arial** — body text, captions, eyebrows, SVG labels. System fonts only, no
  webfonts.
- **System monospace** (`ui-monospace, "SF Mono", Menlo, monospace`) — code, `.cite`
  pills, SVG `.mono` text.

## Class vocabulary

Layout / chrome:

- `.hero` — full-width band, `1.5px solid` bottom rule. Contains `.in` (max-width
  wrapper), `<h1>`, and `.lede` — the one-line calibration assumption, with the topic
  word wrapped in `<b>` (renders red).
- `main` — the body column, max-width 780px.
- `.core` — the one-sentence "short version" paragraph, right under the hero, before the
  first panel.

The Walk (panels):

- `.panel` — one bordered white card. **One action per panel.** If a panel does two
  things, split it into two panels — richness comes from panel count, never from density
  inside one.
- `.eyebrow` — tiny uppercase red step label ("Step 1"), first child of a panel.
- `.panel h2` — the panel title, Georgia. **The titles ARE the explanation** — read only
  the `<h2>`s top to bottom and the whole story must hold together. Plain
  subject-verb-object sentences, one action each.
- `.cite` — the `file:line` grounding pill. B-mode only. Sits right under the `<h2>`,
  before the diagram. **Every concrete code claim carries one.** If you didn't open the
  file, you can't draw it.
- `.scene` — wraps the panel's inline `<svg class="scene" viewBox="…">`. Background is
  the diagram well (`--well`).
- `.cap` — the caption under the diagram. **Adds, never restates the title** — this is
  where the "why it matters" aside lives. `<b>` inside renders ink, not red — red is
  reserved for the eyebrow and the one hot element in the diagram.
- `details.deeper` — the per-panel `▸ THE CODE` reveal. Native `<details>`, no JS.
  `<summary>The code</summary>` followed by `<pre class="code">` with the real
  `file:line` snippet. Highlight the one line the panel is about with
  `<span class="hl">`; a code comment gets `<span class="com">`.

Sections you drop into a Walk (not shapes of their own):

- `.gotcha` — a failure/edge-case callout. Dashed border, `.eyebrow` in ink (not red),
  one `<p>`. Use for "the part that surprises people" — usually one per explainer, near
  the end.
- `.compare-table` — Comparison and Decision are **not** separate archetypes; they are
  this table dropped into a Walk. `<caption>` names what's being compared. Three-ish
  column headings (`<thead><tr><th>…`), one row per axis or per option. Bold the winner
  per row with `<b>` (renders red) — sparingly, one bold cell per row at most.
- `.card` — a small bordered aside: per-module summary in a Map, or any compact fact
  that isn't a full panel.
- `.legend` — `.dot` (ink) / `.dot--hot` (red) swatches, when a diagram uses both.

The Map (the other archetype — boxes and connections in space, not a sequence):

- A single `.panel` (or a bare `<figure class="diagram">`) holding one larger `<svg>`
  with the whole system in it, plus `.card` per module underneath for the one-line
  responsibility + `.cite`.
- `.mapnode` / `.mapnode--hot` — box for a module (`<rect class="mapnode">` or
  `<g class="mapnode">` around a shape).
- `.mapedge` / `.mapedge--hot` / `.mapedge--dashed` — the connections.
- `.maplabel` / `.maplabel--lbl` — node name / muted sublabel, matching the `svg .lbl`
  convention used everywhere else.

Closing:

- `.close` — the one closing truth. Georgia, larger than body, top rule above it. One
  sentence, sits after the last panel/section.

## SVG conventions

Every diagram is `<svg class="scene" viewBox="0 0 W H" role="img" aria-label="…">` (or
a bare `<svg>` inside `.diagram`/`.card` for the Map). The tool-supplied `<defs>` block
(injected once, hidden, at the top of `<body>`) already contains:

- Two arrow markers: `url(#a)` (black) and `url(#ah)` (red). Apply via the CSS classes
  `.arrow` / `.arrow.hot` / `.arrow.no` (dashed, for "the write that doesn't happen") —
  don't set `marker-end` by hand.
- `svg text` is Helvetica 11px ink by default; `.lbl` is the muted uppercase sublabel;
  `.mono` is code-styled text (a literal path, a flag, a value).

## Charts — quantitative data is rendered, never hand-drawn

The moment a panel shows *numbers as marks* — a trend, a distribution, a comparison of
measured values — the diagram is a chart, and a chart comes from `tool/charts`, not from
hand-laid SVG. Hand-authoring stays for mechanisms (boxes, arrows, symbols); data gets
the renderer, so the discipline below holds by construction:

- **Axes span exactly the data range**, ends labelled with the min and max — no outward
  padding to round numbers, no ticks that aren't earned. (Tufte's range frame, *VDQI*.)
- **Direct labels on the marks** — a line is named at its endpoint, a group under its
  stroke. Never a legend.
- **No gridlines, no border box, no background fill.** Every mark either carries data or
  goes. The two-colour rule applies unchanged: ink for every series, red via `--hot` for
  at most the one series/group the panel is about.
- **Honest proportions.** The drawn change is proportional to the data change; a
  quantity is encoded by position or length, never by area or volume. If you hand-build
  a bar chart for a genre the tool lacks, bars start at zero.
- **Wider than tall** — the tool's 640×400 default; keep that orientation when sizing.

Pick the genre by data shape, and challenge the default: line and scatter are what an
unprompted model always reaches for, so when you pick one, say (in your own working,
not the page) what multiples/quartile/table would lose — or take the second-line form.

| Data shape | Genre | Invocation |
|---|---|---|
| one series over time | line | `tool/charts line --data '[{"x":2000,"y":12.1},…]'` |
| several series, one x | small multiples | `tool/charts multiples --data '[{"facet":"EU","x":1,"y":900},…]'` |
| distributions across groups | quartile plot | `tool/charts quartile --data '{"Control":[2.3,…],…}'` |
| two measured variables | scatter | `tool/charts scatter --data '[{"x":1.2,"y":3.4},…]' [--marginal-dash]` |
| **≤ 20 numbers total** | **a table, not a chart** | `.compare-table` — at this size a table beats any graphic |

The tool emits a complete `<svg class="scene">` element to stdout (or `--out`); paste
it into the panel's `.scene` position verbatim. `--title` is usually omitted — the
panel `<h2>` already says it. It refuses NaN/Infinity and escapes every label.

## Symbol library

`<use href="#<id>" x=".." y=".." width=".." height="..">` — never hand-draw a glyph the
cast already has. Every symbol is `viewBox`-scaled, so width/height set the box; keep
each instance's aspect ratio close to its native viewBox to avoid distortion.

| id | Draws |
|---|---|
| `person` | A person (head + shoulders) |
| `terminal` | A terminal window with a `>` prompt |
| `laptop` | An open laptop |
| `browser` | A browser window: tab dots + address bar |
| `folder` | A folder |
| `repo` | A git repo (branch dots + merge line) |
| `server` | A server rack, three units |
| `database` | A database cylinder |
| `file` | A single file, dog-eared corner |
| `notebook` | A log / notebook, ruled lines |
| `robot` | A robot with a face (agent, bot, automated process) |
| `clock` | A clock face |
| `stop` | A refusal / failure mark (red ring + X) |
| `trash` | A disposable / scratch item (dashed outline) |

All fills are white, all strokes are ink (`stop` is the one symbol that's red by
design — it *is* a failure mark). To make an instance the panel's one hot element,
wrap it in `<g class="mapnode--hot">` or apply `stroke:var(--red)` via a wrapping
class — don't recolor the `<symbol>` itself, which is shared by every explainer that
builds after yours.

## Prose rules (carried from `SKILL.md`, restated here because they gate what you write)

- The reader knows nothing about *this topic* and everything else about adult life.
  Never define an ordinary word (money, a file, a manager).
- State the calibration assumption once, in `.lede`, then keep going. Never interview.
- One action per panel. A panel a reader has to re-read to find "step 3 of 2" is a bug.
- Analogies are rationed: only when no plain word exists, one sentence, adult analogies.
- Banned: preamble, "simply put", "like you're five", stacked analogies, meta commentary
  about the skill or the tool itself.

## Before handing it over

1. Run the build; a non-zero exit means nothing was written.
2. Screenshot it and look at it — see `SKILL.md` §5 for the exact headless-Chrome
   command. Check specifically for **overlapping SVG text**: a label sitting under
   another label or crossing an arrow is the single most common failure in a hand-laid
   diagram, because nothing in the browser will warn you about it.
3. Run the critique pass — [`CRITIQUE.md`](CRITIQUE.md).
4. `open <absolute-path>`, printed on its own line, no trailing punctuation.

## Refining

Edit the fragment and re-run the build to the same `--out`. One file per explainer,
never a new file per refinement.
