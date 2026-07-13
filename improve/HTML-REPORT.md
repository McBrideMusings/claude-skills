# HTML Report Format

The architectural review is one **hermetic** HTML file — same hard rules as the `explain` skill. Reuse [../explain/DESIGN-SYSTEM.md](../explain/DESIGN-SYSTEM.md): its semantic-color tokens, type scale, and the `.diagram` / `.compare` / `.callout` / `.legend` component classes. The diagrams carry the weight; prose is sparse and uses the glossary terms (the Vocabulary section of [SKILL.md](SKILL.md)) without ceremony.

## Hermetic constraints (non-negotiable)

- **One file.** CSS in a single `<style>`, every diagram as inline `<svg>` or CSS. No external file references.
- **No network.** No CDN `<script>`/`<link>`, no Tailwind, no Mermaid, no web fonts, no remote images. It must render identically offline, in five years.
- **System fonts**, and **both schemes** via `prefers-color-scheme` — drive every color from the design-system CSS variables, never a hardcoded hex in markup.

If you've already built an `explain` artifact, clone its `assets/scaffold.html` and fill it — the hermetic structure, color tokens, and component classes are already wired.

## Skeleton

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture review — {repo name}</title>
    <style>/* design-system tokens + components, inline */</style>
  </head>
  <body>
    <main>
      <header><!-- repo name, date, legend --></header>
      <section id="candidates"><!-- one card per candidate --></section>
      <section id="top-recommendation"><!-- the one to tackle first --></section>
    </main>
  </body>
</html>
```

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

## Tone

Plain English, concise — but the architectural nouns and verbs come straight from the Vocabulary section of [SKILL.md](SKILL.md). Concision is not an excuse to drift.

**Use exactly:** module, interface, implementation, depth, deep, shallow, seam, adapter, leverage, locality.

**Never substitute:** component, service, unit (for module) · API, signature (for interface) · boundary (for seam) · layer, wrapper (for module, when you mean module).

**Wins bullets** name the gain in glossary terms — *"locality: bugs concentrate in one module"*, *"leverage: one interface, N call sites"*, *"interface shrinks; implementation absorbs the wrappers"*. Don't write *"easier to maintain"* or *"cleaner code"* — those aren't in the glossary and don't earn their place.

No hedging, no throat-clearing, no "it's worth noting that…". If a sentence could be a bullet, make it a bullet. If a bullet could be cut, cut it.
