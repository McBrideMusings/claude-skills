# Phase 07 — Commit

Commit everything the docs skill touched together so the history is one coherent step.

## Files to stage

- `docs/` (new universal files, opt-in folders, content)
- `package.json` (added `docs:dev` script, devDep)
- `CLAUDE.md` (Documentation section)
- `.gitignore` (cache/dist entries)
- `admin.toml` (if wired)

## Commit

One-sentence message describing what was done. Examples:

- *"Bootstrap VitePress docs site at /docs with universal layout (PRD, roadmap, file-map) and admin wiring."*
- *"Audit /docs and apply mechanical fixes (config.mts rename, .gitignore entries, missing CLAUDE.md section)."*
- *"Migrate plain-markdown /docs to VitePress, categorizing loose docs into architecture/guide/development."*

No body; the diff speaks for itself.

Ownership decides whether to run the commit, per the global Git rules: on a repo the user owns (origin owner `mcbridemusings`, or no remote), commit straight to `main` without asking; on someone else's repo, commit on a feature branch. One exception: when this skill was invoked from `/bootstrap`, don't commit — leave everything staged and hand back, since bootstrap's Phase 07 reports and the user commits.
