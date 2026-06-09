# explainer — design system

One baked-in visual language. Every explainer is a member of this family. The point of the visuals is *comprehension*, not decoration — color and shape **encode information**.

## Hermetic constraints (non-negotiable)

- **One file.** Everything inline: CSS in a single `<style>`, all diagrams as inline `<svg>` or CSS, JS (if any) in a single `<script>`.
- **No network.** No `<link>` to a CDN, no `@import url(...)`, no web fonts, no remote images. If you truly need a raster, base64-embed it — but for code/concepts you almost never do.
- **System fonts.** Use the stack in the scaffold. Monospace for code/identifiers, system sans for prose.
- **Both schemes.** Honor `prefers-color-scheme`; the scaffold defines tokens for light and dark. Never hardcode a hex in markup — use the CSS variables.

## Semantic color — the load-bearing rule

Hue means the same thing in every explainer. Defined once as CSS variables; never repurpose a role for decoration.

| Role | Variable | Means |
|------|----------|-------|
| **Data / state** | `--c-data` (blue) | values, state, stored things, payloads |
| **Control flow** | `--c-flow` (indigo/violet) | calls, branches, the path execution takes |
| **Happy path** | `--c-happy` (green) | success, the normal case, "this is fine" |
| **Danger / edge** | `--c-danger` (red) | errors, failure modes, edge cases, "here be dragons" |
| **Caution / gotcha** | `--c-warn` (amber) | surprising behavior, footguns, "watch out" |
| **Structure / muted** | `--c-muted` | frames, labels, secondary text, gridlines |
| **Accent** | `--c-accent` | the one highlight color; section markers, active states |

When a diagram uses color, **add a tiny legend** if more than two roles appear — the reader must know blue=data, not "blue because pretty".

## Type & rhythm

- Type scale (rem): `2.0 / 1.5 / 1.25 / 1.0 / 0.875`. Don't invent sizes.
- Generous line-height for prose (1.6), tight for code (1.4).
- Max content width ~`72ch` for prose; diagrams may go full-bleed within a section.
- Consistent vertical rhythm via the spacing scale in the scaffold (`--s-1`..`--s-6`).

## Component vocabulary

Assemble docs from these — don't invent one-off styles. Classes are defined in the scaffold.

- **`.hero`** — title, one-line "what this is", archetype badge, and a 1–2 sentence "why you'd read this".
- **`.callout`** with modifier (`.callout--data/.--flow/.--happy/.--danger/.--warn`) — a colored aside. Use the semantic role, not vibes.
- **`.diagram`** — a framed figure wrapping inline SVG/CSS, with a `<figcaption>`. Every diagram gets a caption.
- **`.steps`** — numbered vertical step list (Process archetype's backbone). Each step can carry a `file:line` tag.
- **`.compare`** — two- or three-column side-by-side panel (Comparison archetype).
- **`.code`** — annotated code block: monospace, semantic-colored spans for the parts that matter (hand-colored, no Prism), and inline annotations pointing at lines.
- **`.cite`** — the `file:line` tag. Small monospace pill, muted, sits next to the claim it backs. B-mode only.
- **`.reveal`** — `<details>`-based "go deeper" disclosure for layered Concept explainers. Static-first: this is plain `<details>`, no JS needed.
- **`.legend`** — color-role key for a diagram.

## Diagrams — hand-authored, always

No diagramming library. Build them from inline SVG (boxes, arrows, sequence lifelines, grids) or CSS (flow rows, layered stacks). Patterns:

- **Sequence** — vertical lifelines + horizontal arrows; color arrows by `--c-flow`, payloads by `--c-data`.
- **Module map** — boxes connected by arrows; group with subtle background bands; danger boundaries in `--c-danger`.
- **Timeline** — left-rail numbered steps; the rail is the spine of a Process doc.
- **Memory/layout grid** — CSS grid of labeled cells, colored by what lives there.
- **Before/after** — `.compare` with a delta column.

Keep SVGs readable: real `<text>` labels (not paths), `currentColor` or CSS-var fills so they theme correctly in light/dark.

## Accessibility / robustness

- Never rely on color alone — pair hue with a label, icon-shape, or border style.
- Diagrams use real text, so they're searchable and scale crisply.
- Works at any width down to a phone: prefer CSS flex/grid that wraps over fixed pixel canvases where practical.
