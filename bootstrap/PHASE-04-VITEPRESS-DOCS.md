# Phase 04 — VitePress Docs

`docs/` + `.vitepress/config.mts`.

## Run the docs-site flow

The docs-site flow ([`docs-site/DOCS-SITE.md`](docs-site/DOCS-SITE.md)) has its own state-detection and three modes. Match its routing:

- **No `docs/`** → run [`docs-site/PHASE-02-BOOTSTRAP.md`](docs-site/PHASE-02-BOOTSTRAP.md) (Bootstrap, greenfield).
- **`docs/` exists without `.vitepress/`** → run [`docs-site/PHASE-04-MIGRATE.md`](docs-site/PHASE-04-MIGRATE.md) (Migrate plain markdown to VitePress, with categorization of loose `docs/*.md` into `architecture/` / `guide/` / `development/`).
- **Both exist** → run [`docs-site/PHASE-03-AUDIT.md`](docs-site/PHASE-03-AUDIT.md) (Audit, applies mechanical fixes silently and proposes substantive ones).

Carry the **legacy planning doc paths** noted in [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md) (`PHASE_*.md`, `FUTURE_FEATURES.md`, `PROJECT_PLAN.md`, `tasks/`) into that flow. Its audit phase offers to convert them into issues, then delete.

Then proceed to [PHASE-05-ISSUE-TRACKER.md](PHASE-05-ISSUE-TRACKER.md).
