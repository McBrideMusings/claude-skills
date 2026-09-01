# Phase 04 — Migrate (Plain Markdown → VitePress)

`docs/` exists but has no `.vitepress/`. Migrate the existing markdown to the VitePress layout without overwriting user content.

## Steps

1. **Run Phase 02 install + universal file creation** — but **don't overwrite** existing content in `PRD.md` / `file-map.md`. Only create what's missing.
2. **Categorize each loose `docs/*.md`** into the standard buckets:
   - Architectural deep-dive → `docs/architecture/<name>.md`
   - User guide → `docs/guide/<name>.md`
   - Contributor doc → `docs/development/<name>.md`
   - Phase/feature/task doc → migrate to issues on the repo's tracker (invoke `issues`); don't keep in repo
3. **Show migration table before moving.** Don't auto-delete originals — present the proposed moves, closed with: *"Type `go` to move everything as listed, or answer per row (`2 skip, rest move`)."* Default when nobody can answer: move nothing.
4. **Wire admin / CLAUDE.md / .gitignore** per [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md) (steps 6–8).
5. Proceed to [PHASE-06-VERIFY.md](PHASE-06-VERIFY.md).

If after migrating, `docs/PRD.md` is empty or stub-only → offer [PHASE-05-POPULATE-PRD.md](PHASE-05-POPULATE-PRD.md) before exiting.
