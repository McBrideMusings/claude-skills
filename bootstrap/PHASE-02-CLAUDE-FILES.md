# Phase 02 — CLAUDE Files

Two related artifacts: the committed root `CLAUDE.md` and the gitignored `.claude/CLAUDE.local.md`.

## CLAUDE.md (repo root, committed)

- **Missing** → invoke built-in `/init` to populate from a codebase scan.
- **Standard** → no-op.
- **Non-standard:**
  - `AGENTS.md` exists — Claude Code reads both. Ask: *"You have `AGENTS.md`. Keep it (Claude Code reads both), or rename to `CLAUDE.md`?"* Default: keep.
  - `.claude/CLAUDE.md` exists — propose moving to root.

## .claude/CLAUDE.local.md (gitignored, per-project local notes)

Path is **`<project>/.claude/CLAUDE.local.md`** — inside the project's `.claude/` directory, not at the repo root.

- **Missing:**
  1. Create the `.claude/` directory if needed.
  2. Write the stub (below).
  3. Ensure `.gitignore` has `.claude/*.local.md`.
- **Standard** → no-op.
- **Non-standard at `./CLAUDE.local.md`** (repo root):
  1. **Privacy check:** is git tracking it? `git ls-files --error-unmatch CLAUDE.local.md 2>/dev/null`. If tracked → flag concern (this file is supposed to be local-only) and ask user before proceeding.
  2. Propose: `git mv CLAUDE.local.md .claude/CLAUDE.local.md` (or plain `mv` if untracked).
  3. Update `.gitignore`: remove any old `CLAUDE.local.md` line, add `.claude/*.local.md`.
- **Non-standard at `.claude.local.md`** (dotfile at root): propose move + rename.

## Stub for new `.claude/CLAUDE.local.md`

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
