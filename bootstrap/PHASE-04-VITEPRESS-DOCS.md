# Phase 04 — VitePress Docs

`docs/` + `.vitepress/config.mts`.

## Delegate to the `docs` skill

The `docs` skill has its own state-detection and three modes. Match its routing:

- **No `docs/`** → invoke `/docs` Phase 02 (Bootstrap, greenfield).
- **`docs/` exists without `.vitepress/`** → invoke `/docs` Phase 04 (Migrate plain markdown to VitePress, with categorization of loose `docs/*.md` into `architecture/` / `guide/` / `development/`).
- **Both exist** → invoke `/docs` Phase 03 (Audit, applies mechanical fixes silently and proposes substantive ones).

When invoking docs, also pass the **legacy planning doc paths** noted in [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md) (`PHASE_*.md`, `FUTURE_FEATURES.md`, `PROJECT_PLAN.md`, `tasks/`). The `docs` audit phase will offer to convert them into GitHub issues, then delete.

Then proceed to [PHASE-05-DOCS-ARTIFACTS.md](PHASE-05-DOCS-ARTIFACTS.md).
