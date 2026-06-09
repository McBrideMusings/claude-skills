---
name: explainer
description: "Generate a fully self-contained, visually-rich HTML explainer document you open in a browser to understand a topic — diagrams, infographics, semantic color, annotated code. Primary use: explain your OWN code (grounded with file:line tags, never invented); also explains world-knowledge concepts. The heavyweight artifact cousin of zoom-out. Triggers: 'explain this', 'explainer', 'make me an explainer', 'explain how X works', 'visual explainer', 'walk me through X', '/explainer'."
---

# explainer

Produce **one hermetic `.html` file** that explains something — a subsystem in this codebase, or a world-knowledge concept — using designed visuals (inline SVG diagrams, semantic color, infographics, annotated code) so the user can open it in a browser and *get it*.

This is the heavyweight, artifact-producing cousin of `zoom-out`. `zoom-out` is a quick text map in chat; `explainer` is a standalone document you keep open while you work.

## Two sources, one spine

- **B-mode — code explainer (primary).** A target in *this* repo: a file, a subsystem, a flow ("how the statusline auth works"). The spine is the same as A-mode, plus the **grounding layer** (below). This is what the skill is for.
- **A-mode — world-knowledge explainer.** A topic with no codebase ("explain Raft", "explain VAT"). No `file:line` tags; grounding degrades to "don't invent specifics — if a claim needs a current fact you don't hold, say so or look it up."

Sometimes a programming concept is better explained from world knowledge than from the specific code — that's fine, that's A-mode applied to a code topic. Pick the source per request.

## The hard rules (never break)

1. **Hermetic.** The output is a single `.html` file: zero network requests, **no external libraries** (no Mermaid/D3/Tailwind/Prism CDN), no web fonts. CSS in `<style>`, all diagrams as inline `<svg>` or CSS, system-font stack. It must render identically offline, on a plane, in five years. See `DESIGN-SYSTEM.md`.
2. **No hallucinated code (B-mode).** Never describe a mechanism you haven't actually read. Every concrete code claim carries a `file:line` tag rendered next to the diagram node / step / statement. The doc is a **map back into the code**, not a plausible story. If you didn't open it, you can't draw it.
3. **Semantic color.** Color *encodes meaning* (data / control-flow / happy-path / danger / caution), defined once in the design system — never decorative. See `DESIGN-SYSTEM.md`.
4. **Static-first.** Lightweight inline vanilla JS is allowed only where a dense section earns it (collapse/expand, tabbed concept↔code). No JS for anything that plain HTML can do.

## Workflow

### 1. Classify the archetype

Pick the shape that fits — this tells you the skeleton and the signature diagram. See `ARCHETYPES.md`.

- **Process / Mechanism** — how something runs over time → step timeline + sequence diagram
- **Architecture / System** — how parts fit → module map + data-flow
- **Comparison / Tradeoff** — X vs Y → side-by-side + decision table
- **Concept** — one idea deeply → analogy anchor + layered "go deeper" reveals
- **Decision** — why a choice was made → forces → options → consequences

When unsure, default to **Process** for "how does X work" and **Architecture** for "how does X fit together".

### 2. Gather (B-mode)

Explore as far as needed to actually understand — read the real files, follow the callers, use `docs/CONTEXT.md` vocabulary if it exists. Quality of the explainer is capped by how well you understood the code. Do not start rendering until the mechanism is clear and every claim you plan to make is backed by a file you've read. A-mode: synthesize from knowledge; if a specific fact is shaky, flag it rather than invent it.

### 3. Infer the knobs

From the prompt, infer **archetype · depth · audience** (e.g. `explainer eli5 how the statusline auth works` → Concept, shallow, beginner). Don't interview — generate with the inferred defaults. The refine loop (step 6) is the escape hatch.

### 4. Render

Clone `assets/scaffold.html` and fill it. The scaffold already wires the hermetic structure, the semantic-color tokens, `prefers-color-scheme` light/dark, and the component classes. Assemble from the component kit (`DESIGN-SYSTEM.md`) and the archetype skeleton (`ARCHETYPES.md`). Hand-author every diagram as inline SVG/CSS. Tag every B-mode code claim with `file:line`.

Write to **`<repo>/tmp/claude/explainers/<slug>.html`** (or `./tmp/claude/explainers/` if not in a repo). `<slug>` is a kebab-case topic slug.

### 5. Open it

Launch it for the user: `open <path>` on macOS. Emit the path on its own line, no trailing punctuation, so it stays ⌘-clickable.

### 6. Refine in place

After it opens, offer cheap adjustments and **regenerate the same file in place**: "deeper on X · simpler · shift focus to Y · shorter". No new files per refinement — overwrite the slug.

### 7. Keep (on request)

Ephemeral by default — `tmp/claude/explainers/` is age-pruned with the rest of `tmp/claude/`. If the user says keep it:

- **Inside a repo** → move to `<repo>/docs/explainers/<slug>.html` (committed on purpose, shareable with the team).
- **Not in a repo** → move to `~/explainers/<slug>.html`.

Don't auto-keep; wait for the user to ask.

## Pruning

`tmp/claude/explainers/` follows the account-wide tmp-file age policy — prune files older than the standard window when the skill runs, same as other `tmp/claude/...` writers.

## When NOT to use

- The user wants a quick in-chat orientation, not a document → use `zoom-out`.
- The user wants the code *changed*, audited, or debugged → that's `audit` / `diagnose`, not an explainer.
- A one-line answer suffices → just answer in chat.

## Reference files

- `DESIGN-SYSTEM.md` — hermetic constraints, semantic-color tokens, component vocabulary.
- `ARCHETYPES.md` — the five shapes: skeleton + signature diagram for each.
- `assets/scaffold.html` — the hermetic starter template to clone and fill.
