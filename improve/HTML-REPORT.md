# HTML Report Format

Serves both report shapes: a single-aspect architecture review, and the **survey report** (one `<section>` per aspect, one card per finding, cross-aspect Top recommendation). The card fields and diagram patterns below are written for architecture cards; other aspects' cards keep Title / badge / Files / Problem / Solution and swap the before/after SVG for whatever carries the finding (a table, a config snippet, a layer-audit table) — same components, same tone.

The report is one **hermetic** HTML file, built by `improve`'s own tool — `skills/improve/tool/report`. It is self-contained: it reads nothing outside `skills/improve/tool/`, shares no code or substrate with `explain` or `spike`, and never references `../explain/`. Light only — no theme toggle, no dark mode. No annotation or contrast widgets — those are `spike`'s, and a report is not soliciting design feedback; it's a dossier someone reads to decide.

## Build it

Write a **body fragment** — content only, no doctype, no `<head>`, no CSS. The tool supplies the hermetic structure and the stylesheet:

```bash
"$HOME/.claude/skills/improve/tool/report" build \
  --title "Architecture review — {repo name}" \
  --fragment /private/tmp/claude/<repo-slug>/reports/<slug>.body.html \
  --out /private/tmp/claude/<repo-slug>/reports/<slug>.html
```

(Survey report: title it "Improvement survey — {repo name}".) The tool rejects any network request, any `<link>`, `@import url()`, CDN reference, webfont, or remote image — the hermetic rule is enforced, not remembered. Every path absolute; a relative `--out` or `--fragment` is refused. Resolve the repo root with `git rev-parse --show-toplevel` in its own Bash call.

**Screenshot it and look at it.** Check specifically for overlapping SVG text in the before/after diagrams. Then hand it over with a bare `open <absolute-path>` on its own line.

## Fragment skeleton

```html
<header class="hero"><!-- repo name, date, legend --></header>
<section id="coverage"><!-- survey report only — what ran, what didn't --></section>
<section id="candidates"><!-- one card per candidate --></section>
<section id="top-recommendation"><!-- the one to tackle first --></section>
```

## Coverage section — survey reports only, and mandatory

One compact table, directly under the header, before any card. One row per aspect the survey was given, with exactly one of four results: **`n findings`**, **`no findings`**, **`not applicable — <reason>`**, or **`died`**. These are four different things and a report that collapses them hands out a clean bill of health nobody earned — an aspect that never ran is not an aspect that found nothing.

Below the table, one line for anything tagged `review-territory` during the pass: *"3 defects surfaced during the survey — run `/review` to develop them."* They are never cards; improve does not report defects.

## Header

Repo name, date, and a compact legend: solid box = module, dashed line = seam, coloured arrow = leakage, filled dark box = deep module. No intro paragraph — straight into coverage, then candidates.

## Candidate card

Each candidate is one `<article>`:

- **Title** — short, names the deepening (e.g. "Collapse the Order intake pipeline").
- **Badge row** — recommendation strength as a `.strength` chip: `Strong`, `Worth exploring`, `Speculative`. Chips are solid fills with white text, never an outline — an outlined chip at 11px reads as low-contrast decoration. `Strong` fills with the accent; the rest fill muted. Severity beyond that is carried by border style (dashed, weight), never a third hue. Optionally a dependency-category tag (`in-process`, `local-substitutable`, `ports & adapters`, `mock`), which takes the same chip.
- **Files** — monospaced pill list (`.files li`).
- **Before / After diagram** — the centrepiece, a `.ba` grid of two hand-authored inline SVGs. See patterns below.
- **Problem** — one sentence. What hurts.
- **Solution** — one sentence. What changes.
- **Wins** — bullets, ≤6 words each: "Tests hit one interface", "Pricing stops leaking", "Delete 4 shallow wrappers".
- **ADR callout** (`.adr`, dashed box) — one line, if applicable.

No paragraphs of explanation. If the diagram needs a paragraph to be understood, redraw the diagram.

## Diagram patterns (all hand-authored inline SVG/CSS — no diagramming library)

Pick the pattern that fits; mix them so every card doesn't look the same. The tool ships reusable `<marker>` arrowheads (`#b` normal, `#bh` leak) inline once per page — reference them with `marker-end`, don't redefine them per fragment.

### Boxes-and-arrows (the workhorse for dependencies / call flow)

Modules as `<rect class="box">` with `<text>` labels; arrows as `<path class="edge">`. A leak edge gets `.edge.leak` (dashed, accent colour); a deep module gets `.box.deep` (filled dark, white text). Use for "X calls Y calls Z, and look at the mess" → "one interface".

### Cross-section (good for layered shallowness)

Stack horizontal bands to show the layers a call passes through. Before: 6 thin layers each doing nothing. After: 1 thick band labelled with the consolidated responsibility.

### Mass diagram (good for "interface as wide as implementation")

Two rectangles per module — interface surface area vs implementation. Before: interface nearly as tall as implementation (shallow). After: short interface, tall implementation (deep).

### Call-graph collapse

Before: a tree of calls as nested boxes. After: the same tree collapsed into one box, the now-internal calls shown faded inside it.

## Style guidance

- Lean editorial, not corporate-dashboard. Generous whitespace.
- **Two colours maximum plus neutrals** — ink and one accent. Severity, leakage, and warnings are carried by label text and border style (dashed, weight, fill vs. outline), never by a third or fourth hue.
- Keep before/after diagrams ~200px tall so they sit side by side without scrolling.
- Use small uppercase muted labels inside diagrams — they should read as schematic, not as UI.
- Real `<text>` labels (not paths) so diagrams stay searchable.

## Top recommendation section

One larger card (`.top`): candidate name, one sentence on why, an anchor link to its card. That's it.

**Every card is a ticket body in waiting.** Phase 08 files the surviving cards to the tracker, so a card whose Solution names an outcome instead of showing the change produces a ticket nobody can implement. Keep the shape — the signature, the call-stack diff, the before/after layout — inside the card rather than only in the diagram, since the diagram does not survive the trip to a plain-text issue body.

## Tone

Plain English, concise — but the architectural nouns and verbs come straight from the Vocabulary section of [ARCHITECTURE.md](ARCHITECTURE.md), never their `_Avoid_` substitutes. Concision is not an excuse to drift.

**Wins bullets** name the gain in glossary terms — *"locality: bugs concentrate in one module"*, *"leverage: one interface, N call sites"*, *"interface shrinks; implementation absorbs the wrappers"*. Don't write *"easier to maintain"* or *"cleaner code"* — those aren't in the glossary and don't earn their place.

No hedging, no throat-clearing, no "it's worth noting that…". If a sentence could be a bullet, make it a bullet. If a bullet could be cut, cut it.
