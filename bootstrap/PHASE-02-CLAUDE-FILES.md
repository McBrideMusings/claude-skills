# Phase 02 — CLAUDE Files

Two related artifacts: the committed root `CLAUDE.md` and the gitignored root `CLAUDE.local.md`.

## CLAUDE.md (repo root, committed)

- **Missing** → invoke built-in `/init` to populate from a codebase scan.
- **Standard** → no-op.
- **Non-standard:**
  - `AGENTS.md` exists — Claude Code reads both. Ask: *"You have `AGENTS.md`. Keep it (Claude Code reads both), or rename to `CLAUDE.md`?"* Default: keep.
  - `.claude/CLAUDE.md` exists — propose moving to root.

## CLAUDE.local.md (repo root, gitignored, per-project local notes)

Path is **`<project>/CLAUDE.local.md`** — the repo **root**, NOT inside `.claude/`. Claude Code
only auto-loads a local memory file at the root (`./CLAUDE.local.md`); a file at
`.claude/CLAUDE.local.md` is **never loaded** — it's a dead zone unless a committed `CLAUDE.md`
`@import`s it. Root is the only place it loads with no import, so root is the standard.

- **Missing:**
  1. Write the stub (below) to `<project>/CLAUDE.local.md`.
  2. Ensure `.gitignore` has `*.local.*` (the glob covers it at root or anywhere).
- **Standard** (at repo root) → no-op.
- **Non-standard at `.claude/CLAUDE.local.md`** (inside `.claude/` — the dead zone):
  1. Propose the move to root: `mv .claude/CLAUDE.local.md CLAUDE.local.md` (plain `mv` — these are gitignored/untracked). If git *is* tracking it, `git mv` instead and flag that a local-only file got committed.
  2. If a root `CLAUDE.local.md` already exists, **merge** the two (never overwrite — the `.claude/` copy may hold different content), then remove the `.claude/` one.
  3. Ensure `.gitignore` has `*.local.*`; drop any stale `.claude/*.local.md` line.
- **Non-standard at `.claude.local.md`** (dotfile at root): propose rename to `CLAUDE.local.md`.

## Stub for new root `CLAUDE.local.md`

```md
# Local notes — {project}

Project-specific overrides and notes that should NOT be committed.
This file is gitignored.

## Conventions
{anything quirky about this repo's workflow}

## Issue tracker
{e.g. "GitHub Issues via `gh`" or "local markdown in .scratch/"}

## Open questions
- {anything load-bearing the user wants to remember}
```

Then proceed to [PHASE-03-ADMIN-RUNNER.md](PHASE-03-ADMIN-RUNNER.md).
