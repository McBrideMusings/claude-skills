# Phase 01 — State Detection

Inspect what already exists, then route to the right downstream phase.

## Inspect

- `docs/` existence
- `.vitepress/config.{mts,ts}` existence
- Universal files: `docs/index.md`, `docs/PRD.md`, `docs/roadmap.md`, `docs/file-map.md`
- Other `docs/*.md` (loose markdown — feeds Phase 04 categorization)
- `package.json` `docs:dev` script + `vitepress` devDep
- `admin.toml` `[commands.docs]`
- `CLAUDE.md` `## Documentation` section
- Legacy planning docs at repo root: `PHASE_*.md`, `FUTURE_FEATURES.md`, `PROJECT_PLAN.md`, `tasks/`

## Route

| State | Next phase |
|---|---|
| No `docs/` | [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md) |
| `docs/` exists, no `.vitepress/` | [PHASE-04-MIGRATE.md](PHASE-04-MIGRATE.md) |
| Both `docs/` and `.vitepress/` exist | [PHASE-03-AUDIT.md](PHASE-03-AUDIT.md) |
| User asked to write / draft / populate the PRD, AND `docs/PRD.md` exists (stub or filled) | [PHASE-05-POPULATE-PRD.md](PHASE-05-POPULATE-PRD.md) (skip layout work) |
| User asked to write / draft / populate the PRD, but no `docs/` yet | [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md) (creates the stub; offers PHASE-05 once it exists) |

If `docs/PRD.md` exists but is just a stub (H1 + TODO, or near-empty) at the end of Phase 02 / 03, **offer Phase 05 before exiting**.

After Phase 02 / 03 / 04 complete, always run [PHASE-06-VERIFY.md](PHASE-06-VERIFY.md) then [PHASE-07-COMMIT.md](PHASE-07-COMMIT.md).
