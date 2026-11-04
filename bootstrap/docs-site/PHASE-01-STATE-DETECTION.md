# Phase 01 — State Detection

Inspect what already exists, then route to the right downstream phase.

## Inspect

- `docs/` existence
- `.vitepress/config.{mts,ts}` existence
- Universal files: `docs/index.md`, `docs/file-map.md`
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

After Phase 02 / 03 / 04 complete, always run [PHASE-05-VERIFY.md](PHASE-05-VERIFY.md) then [PHASE-06-COMMIT.md](PHASE-06-COMMIT.md).
