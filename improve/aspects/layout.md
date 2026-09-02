# Aspect brief: `layout` (delegated → `bootstrap`)

Axis tag: `layout`. Applicability: always.

**Read:** `../../bootstrap/SKILL.md`, its **Findings-only invocation** contract, then run `PHASE-01-STATE-DETECTION.md` and return its audit table as findings. Run no later phase.

**bootstrap's act-don't-ask rule is suspended for you.** Create nothing, migrate nothing, commit nothing. This is the one delegated aspect whose owner normally writes files by default, so the suspension matters more here than anywhere else.

## Aspect-specific rules

- Each row of the audit table is one finding: the artifact, its state (`missing` / `standard` / `non-standard`), and the proposed action. `standard` rows are not findings — drop them.
- **A `non-standard` row states where the artifact is now and where the standard puts it.** "Non-standard placement" with no current path is un-actionable.
- Missing `docs/` + `.vitepress/` (the VitePress site itself) is **yours** — the `docs` aspect is always-applicable and owns content organisation whether or not a site exists, but the site's presence is this aspect's finding. Say what the site would carry, not just that it's missing.
- `CLAUDE.md` existing in the right place is yours; whether it will be read and obeyed is `claude-md`'s. Don't cross into content.
