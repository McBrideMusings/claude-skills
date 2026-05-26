# Phase 03 — Audit (Aligned Setup)

Both `docs/` and `.vitepress/` exist. Verify alignment, apply mechanical fixes silently, propose substantive changes.

## Mechanical (apply silently, report in summary)

1. Rename `config.ts` → `config.mts` (build fails otherwise on CommonJS).
2. Rename `api-surface.md` → `api.md`, update refs.
3. Collapse `docs/roadmap/` to `docs/roadmap.md` if folder has ≤ 2 files. Skip if 3+ initiative files.
4. Create missing universal stubs (`index.md`, `PRD.md`, `roadmap.md`, `file-map.md`).
4a. Convert any `roadmap.md` that uses plain bullets or prose items to GFM checkboxes (`- [ ]` / `- [x]`). Preserve section headings (Now / Next / Later / Deferred) and item text. Items that are clearly shipped get `- [x]`; everything else gets `- [ ]`.
5. Add `.gitignore` cache/dist entries (`docs/.vitepress/cache`, `docs/.vitepress/dist`).
6. Install VitePress if missing from devDeps.
7. Add `docs:dev` script if missing (port 5193 or main app port + 20).
8. Fix `admin.toml` `[commands.docs]` if missing or has sub-targets — see [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md) for the canonical shape.
9. Add `CLAUDE.md` Documentation section if missing — template in [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md).

## Substantive (propose with diff, ask first)

1. **Legacy planning docs** (`PHASE_*.md`, `FUTURE_FEATURES.md`, `PROJECT_PLAN.md`, `tasks/`, non-standard top-level files) → open GitHub issues for genuinely uncovered work, then delete source. Cross-reference existing issues before bulk-creating.
2. **New opt-in suggestions** if heuristics now match (e.g., project gained HTTP server → suggest `api.md`).
3. **Update-when table** in `CLAUDE.md` if the section exists but is missing the table.

## Summary

Report: what was applied mechanically, what was proposed substantively, what's pending.

If `docs/PRD.md` exists but is stub-only → offer [PHASE-05-POPULATE-PRD.md](PHASE-05-POPULATE-PRD.md) before exiting.

Then proceed to [PHASE-06-VERIFY.md](PHASE-06-VERIFY.md).
