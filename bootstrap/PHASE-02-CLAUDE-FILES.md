# Phase 02 — CLAUDE Files

Two related artifacts: the committed root `CLAUDE.md` and the gitignored root `CLAUDE.local.md`.

## CLAUDE.md (repo root, committed)

- **Missing** → invoke built-in `/init` to populate from a codebase scan.
- **Standard** → no-op, unless it's long enough to be a relevance-signal candidate (below).
- **Non-standard:**
  - `AGENTS.md` exists — Claude Code reads both. Ask: *"You have `AGENTS.md`. Keep it (Claude Code reads both), or rename to `CLAUDE.md`?"* Default: keep.
  - `.claude/CLAUDE.md` exists — propose moving to root.

### Content quality: `<important if="condition">` blocks

Claude Code injects a system reminder with every CLAUDE.md: *"this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task."* The longer and flatter a CLAUDE.md is, the more of it gets silently ignored under that framing — including the parts that matter.

If the existing `CLAUDE.md` reads as one flat wall of rules (no XML relevance tags, roughly 100+ lines of domain-specific guidance), propose wrapping the conditionally-relevant sections in `<important if="condition">…</important>` tags — the same XML-tag pattern Claude Code's own system prompt uses, which gives the model an explicit relevance signal that cuts through the "may or may not be relevant" framing.

- **Foundational context stays bare** — project identity, project map, tech stack, anything relevant to 90%+ of tasks. Leave it as plain markdown at the top.
- **Domain-specific guidance gets wrapped** — testing patterns, API conventions, state management, i18n, anything relevant to a specific kind of task. Each rule or tight group of related rules gets its own narrowly-scoped condition (`<important if="you are adding or modifying API routes">`, not `<important if="you are writing or modifying any code">`).
- **Keep the commands table** — wrap it in one `<important if="you need to run commands to build, test, lint, or generate code">` block, but never drop commands from it.
- **Delete along the way**: anything a linter/formatter/pre-commit hook already enforces, code snippets (replace with a file path reference — they go stale), and vague non-actionable instructions ("follow best practices").
- Prefer this inline-conditional approach over sharding into separate files the agent has to discover via tool calls — the whole point is that everything stays in the one file, weighted by relevance, not scattered behind lookups.

Propose the rewrite; don't apply it silently — restructuring an existing file is the same permission gate as any other content rewrite.

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
