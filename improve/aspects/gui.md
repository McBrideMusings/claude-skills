# Aspect brief: `gui` (delegated → `ui-design`)

Axis tag: `gui` — matching the `_domains/gui/` label, not the owning skill's name. Applicability: a UI surface exists — rendered components, a stylesheet, a terminal UI, a page. No surface → return `not applicable — <reason>` and stop.

**Read:** `../../ui-design/SKILL.md`, its **`critique` / `audit` (post-code)** mode and its **Findings-only invocation** contract. Run critique exactly as specified there — it already returns ranked findings with concrete reasons.

Also read `../../_domains/gui/opportunities.md` for missing or weak motion; absent motion is an opportunity this aspect owns and no other one looks for.

## Aspect-specific rules

- **Every verdict is anchored to a concrete reason** — the craft lens it fails, the slop-catalog entry it matches, the motion term it's missing. "Looks dated" with no lens named is ungrounded.
- Keep the **surface-fix vs deeper-layer** tag on each finding. A finding tagged deeper-layer is telling you the real owner is `product`, not `gui`; say so in the finding rather than proposing a paint job over it.
- Evidence is a component path and, where the finding is about rendered output, what you actually looked at. If you did not render anything, say the critique is source-only — a claim about how something looks that was never looked at caps at 50 under [../GROUNDING.md](../GROUNDING.md).
