# HTML Report Format

Serves both report shapes: a single-aspect architecture review, and the **survey report** (one `<section>` per aspect, one card per finding, cross-aspect Top recommendation). The card fields and diagram patterns below are written for architecture cards; other aspects' cards keep Title / badge / Files / Problem / Solution and swap the before/after SVG for whatever carries the finding (a table, a config snippet, a layer-audit table) — same components, same tone.

The report is one **hermetic** HTML file, and **`explain` owns the rendering** — a findings report is an explanation, so it is built with the same tool, tokens, type scale, and `.diagram` / `.compare` / `.callout` / `.legend` / `.cite` classes. This file owns only what is specific to a report: the card fields, the coverage table, and the diagram patterns below. Read [../_folios/CONTRACT.md](../_folios/CONTRACT.md) for the class vocabulary. The diagrams carry the weight; prose is sparse and uses the glossary terms (the Vocabulary section of [ARCHITECTURE.md](ARCHITECTURE.md)) without ceremony.

## Build it

Write a **body fragment** — content only, no doctype, no `<head>`, no CSS. The tool supplies the hermetic structure, the tokens, both themes, and the theme toggle:

```bash
"$HOME/.claude/tools/explainer" build \
  --title "Architecture review — {repo name}" \
  --fragment <repo-root>/tmp/claude/explainers/<slug>.body.html \
  --out <repo-root>/tmp/claude/explainers/<slug>.html
```

(Survey report: title it "Improvement survey — {repo name}".) The tool rejects any network request, so the hermetic rule is enforced rather than remembered. Every path absolute — resolve the repo root with `git rev-parse --show-toplevel` in its own Bash call.

Follow [`../explain/SKILL.md`](../explain/SKILL.md) § Verify, then open it for the rest: **screenshot it and look at it** in both themes, then hand it over with a bare `open <absolute-path>` on its own line.

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

Repo name, date, and a compact **`.legend`**: solid box = module, dashed line = seam (`--c-muted`), red arrow = leakage (`--c-danger`), thick dark box = deep module. No intro paragraph — straight into the candidates.

## Candidate card

Each candidate is one `<article>`:

- **Title** — short, names the deepening (e.g. "Collapse the Order intake pipeline").
- **Badge row** — recommendation strength: `Strong` → `.callout--happy` green, `Worth exploring` → `.callout--warn` amber, `Speculative` → `--c-muted`. Optionally a dependency-category tag (`in-process`, `local-substitutable`, `ports & adapters`, `mock`).
- **Files** — monospaced list (the `.cite` pill style works well).
- **Before / After diagram** — the centrepiece, a `.compare` of two hand-authored inline SVGs. See patterns below.
- **Problem** — one sentence. What hurts.
- **Solution** — one sentence. What changes.
- **Wins** — bullets, ≤6 words each: "Tests hit one interface", "Pricing stops leaking", "Delete 4 shallow wrappers".
- **ADR callout** (if applicable) — one line in a `.callout--warn` box.

No paragraphs of explanation. If the diagram needs a paragraph to be understood, redraw the diagram.

## Diagram patterns (all hand-authored inline SVG/CSS — no diagramming library)

Pick the pattern that fits; mix them so every card doesn't look the same.

### Boxes-and-arrows (the workhorse for dependencies / call flow)

Modules as `<rect>` with `<text>` labels; arrows as `<line>`/`<path>`. Color leakage edges `--c-danger`, the deep module a filled dark box. Use for "X calls Y calls Z, and look at the mess" → "one interface".

### Cross-section (good for layered shallowness)

Stack horizontal bands to show the layers a call passes through. Before: 6 thin layers each doing nothing. After: 1 thick band labelled with the consolidated responsibility.

### Mass diagram (good for "interface as wide as implementation")

Two rectangles per module — interface surface area vs implementation. Before: interface nearly as tall as implementation (shallow). After: short interface, tall implementation (deep).

### Call-graph collapse

Before: a tree of calls as nested boxes. After: the same tree collapsed into one box, the now-internal calls shown faded (`--c-muted`) inside it.

## Style guidance

- Lean editorial, not corporate-dashboard. Generous whitespace.
- Color sparingly and semantically — `--c-danger` for leakage, `--c-warn` for ADR warnings, `--c-accent` for the one highlight. Never decorative.
- Keep before/after diagrams ~320px tall so they sit side by side without scrolling.
- Use small uppercase muted labels inside diagrams — they should read as schematic, not as UI.
- Real `<text>` labels (not paths) so diagrams stay searchable and theme correctly in light/dark.

## Top recommendation section

One larger card: candidate name, one sentence on why, an anchor link to its card. That's it.

**Every card is a ticket body in waiting.** Phase 08 files the surviving cards to the tracker, so a card whose Solution names an outcome instead of showing the change produces a ticket nobody can implement. Keep the shape — the signature, the call-stack diff, the before/after layout — inside the card rather than only in the diagram, since the diagram does not survive the trip to a plain-text issue body.

## Tone

Plain English, concise — but the architectural nouns and verbs come straight from the Vocabulary section of [ARCHITECTURE.md](ARCHITECTURE.md), never their `_Avoid_` substitutes. Concision is not an excuse to drift.

**Wins bullets** name the gain in glossary terms — *"locality: bugs concentrate in one module"*, *"leverage: one interface, N call sites"*, *"interface shrinks; implementation absorbs the wrappers"*. Don't write *"easier to maintain"* or *"cleaner code"* — those aren't in the glossary and don't earn their place.

No hedging, no throat-clearing, no "it's worth noting that…". If a sentence could be a bullet, make it a bullet. If a bullet could be cut, cut it.
