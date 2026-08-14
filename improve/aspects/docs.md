# Aspect brief: `docs` (delegated → `docs`)

Axis tag: `docs`. Applicability: both `docs/` and `docs/.vitepress/` exist. If the site is missing entirely, that absence is `layout`'s finding, not yours — return `not applicable — no VitePress site (layout aspect owns its absence)` and stop, so the two aspects don't both report the same hole.

**Read:** `../../docs/SKILL.md`, its **Findings-only invocation** contract, then `PHASE-01-STATE-DETECTION.md` (run it) and `PHASE-03-AUDIT.md` (evaluate its mechanical and substantive checklists as a **report instead of applying them**). Skip Phases 05–07 entirely.

## Aspect-specific rules

- Each checklist hit becomes one finding with the artifact named: "`config.ts` needs the `.mts` rename", "`PRD.md` is stub-only". A checklist item that passes is not a finding.
- **Separate mechanical from substantive.** A mechanical hit (wrong extension, dead link, missing sidebar entry) is cheap and certain; a substantive one (a page that documents a flow the code no longer has) needs the code cited alongside the page. Don't let a pile of mechanical hits bury the one substantive finding.
- Do not create, migrate, or rename anything. The docs skill's act-don't-ask behavior is suspended for you.
