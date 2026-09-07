# Phase 03 — Audit (Aligned Setup)

Both `docs/` and `.vitepress/` exist. Verify alignment, apply mechanical fixes silently, propose substantive changes.

## Mechanical (apply silently, report in summary)

1. Rename `config.ts` → `config.mts` (build fails otherwise on CommonJS).
2. Rename `api-surface.md` → `api.md`, update refs.
3. Create missing universal stubs (`index.md`, `file-map.md`).
4. Add `.gitignore` cache/dist entries (`docs/.vitepress/cache`, `docs/.vitepress/dist`).
5. Install VitePress if missing from devDeps.
6. Add `docs:dev` script if missing (port 5193 or main app port + 20).
7. Fix `admin.toml` `[commands.docs]` if missing or has sub-targets — see [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md) for the canonical shape.
8. Add `CLAUDE.md` Documentation section if missing — template in [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md).

**A roadmap file is never created here and never repaired in place.** An existing one migrates to the tracker — that is a substantive proposal, item 1 below, not a mechanical fix.

## Substantive (propose with diff, ask first)

Present every substantive hit as one numbered slate, closed with the escape hatch: *"Type `go` to apply every proposal, or answer per item (`1 skip, 2 apply`)."* Default when nobody can answer (findings-only, or an unattended run): propose only, apply nothing.

1. **Legacy planning docs** (`docs/roadmap.md`, `docs/roadmap/`, `ROADMAP.md`, `PHASE_*.md`, `FUTURE_FEATURES.md`, `PROJECT_PLAN.md`, `tasks/`, non-standard top-level files) → open issues on the repo's tracker for genuinely uncovered work, then delete source. Cross-reference existing issues before bulk-creating.

   A roadmap file is this category, not a universal file. It cannot express a blocking edge, so it drifts from the tracker and neither copy can be shown wrong. Its items become issues with real dependency edges; `backlog shape` then prints the roadmap from the graph. Never leave both standing.
2. **New opt-in suggestions** if heuristics now match (e.g., project gained HTTP server → suggest `api.md`).
3. **Update-when table** in `CLAUDE.md` if the section exists but is missing the table.

## Summary

Report: what was applied mechanically, what was proposed substantively, what's pending.

Then proceed to [PHASE-05-VERIFY.md](PHASE-05-VERIFY.md).
