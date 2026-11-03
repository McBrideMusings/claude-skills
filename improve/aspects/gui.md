# Aspect brief: `gui`

Axis tag: `gui` — matching the `gui` label. Applicability: a UI surface exists — rendered components, a stylesheet, a terminal UI, a page. No surface → return `not applicable — <reason>` and stop.

**Passes.** Run each against a screenshot of the running surface, not the source. No file writes, no commits, no questions.

1. **Lenses** — the craft lenses (type, color, spacing, motion, layout).
2. **Slop** — the catalog of generic-AI-interface tells.
3. **Motion opportunities** — the four-question gate (frequency, purpose, speed, function) with a required rejected-candidates section.
4. **Fidelity** — does the surface honour the layers beneath it: vocabulary, object consistency, breadboard completeness, error recovery, accessibility.
5. **Grouping** — six audit questions, each answered explicitly; with no screenshot, say the pass is unrun.
6. **Usability heuristics** — Nielsen's ten, each finding naming the heuristic it breaks.
7. **States and copy** — empty, loading, error and success states on any operating surface.
8. **Launch readiness** — for a whole site or app: one-liner, one call to action per page, title, meta, favicon, no placeholder text.
9. **Stated personality** — below.

A pass with nothing to judge is marked `N/A: <missing element>`, never ticked and never dropped.

*Knowledge base: search it for "gui critique", "gui motion opportunities". If you have none, skip this line and don't mention it.*

The motion-opportunities pass always runs here: absent motion is an opportunity this aspect owns and no other one looks for.

The stated-personality pass (pass 9) is attempted on every run here: in an owned repo with a `DESIGN.md`, the critique measures the surface against that file's `## Overview`, and a finding quotes the Overview sentence it contradicts.

## Aspect-specific rules

- **Every verdict is anchored to a concrete reason** — the craft lens it fails, the slop-catalog entry it matches, the motion term it's missing. "Looks dated" with no lens named is ungrounded.
- Rank findings by severity, and keep the **surface-fix vs deeper-layer** tag on each finding. A finding tagged deeper-layer is telling you the real owner is `product`, not `gui`; say so in the finding rather than proposing a paint job over it, and name `redesign <surface>` as its fix. The survey never runs `redesign` itself.
- Evidence is a component path and, where the finding is about rendered output, what you actually looked at. If you did not render anything, say the critique is source-only — a claim about how something looks that was never looked at caps at 50 under [../GROUNDING.md](../GROUNDING.md).
