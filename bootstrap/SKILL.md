---
name: bootstrap
description: "Idempotent project bootstrap AND audit. Walks through the standard layout (CLAUDE.md, .claude/CLAUDE.local.md, admin runner, VitePress docs, docs/CONTEXT.md, docs/adr/, docs/PRD.md, docs/ROADMAP.md). Creates what's missing, leaves standard-path artifacts alone, and proposes migrations for non-standard placements (e.g. root CLAUDE.local.md → .claude/CLAUDE.local.md, root CONTEXT.md → docs/CONTEXT.md, decisions/ → docs/adr/). Creates and wires missing standard artifacts automatically without asking; only genuinely destructive migrations (moving/deleting existing content) confirm, and it never asks about committing. Triggers: 'bootstrap', 'bootstrap this repo', 'init this project', 'set up the workflow', 'scaffold this project', 'set this up from scratch', 'wire up a new repo', 'audit my project layout', 'migrate this project to my standard layout'."
user_invocable: true
---

# Bootstrap

Walk through the standard project layout. **Create what's missing, migrate what's misplaced, leave what's already standard alone.**

**Idempotent.** Run as many times as wanted. Safe to point at a fresh repo OR an existing repo that's accumulated docs in non-standard places. Each phase has three branches: missing → create, standard → skip, non-standard → propose migration.

**Act, don't ask — additive work runs automatically.** Every phase creates and wires the missing standard artifacts *without asking permission* — no "shall I create admin.toml?", no "add VitePress?", no per-phase "proceed?" offer. Creating what's missing and wiring it is the whole point of the skill; do it. The user pre-empts by saying "skip X" / "no docs" up front (and "skip docs" / "don't worry about docs" silently skips Phases 04–05) — but silence means proceed, never means ask. The ONLY thing that stops for a question is a **genuinely destructive migration**: moving or renaming existing files (which can break references) or deleting/overwriting content the user already wrote. Those confirm (see the per-phase "Default: yes" prompts). Pure additive creation never does.

**Any confirmation you do surface is a plain-chat question** — never the `AskUserQuestion` tool / structured-question schema. Answered inline in free-form ("skip admin", "yes but leave the PRD"), which the chip-picker UI can't carry.

**Don't commit — and don't ask about committing.** Bootstrap prepares the ground and stops; the user (or `/wrap-up`) commits. Do NOT end with "commit to main?" or any variant — that is exactly the dumb question this rule kills. Just do the work, then report in one line what changed and what's staged. The user commits when they choose. (Destructive migrations may shuffle git history — leave the moves staged for the user to review.)

## Phases

Run in order. Phase 01 builds the audit table; later phases skip cleanly on the `standard` state and only do work on `missing` or `non-standard`.

| File | Purpose |
|---|---|
| [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md) | Probe non-standard locations, build the audit table |
| [PHASE-02-CLAUDE-FILES.md](PHASE-02-CLAUDE-FILES.md) | `CLAUDE.md` (root) + `.claude/CLAUDE.local.md` |
| [PHASE-03-ADMIN-RUNNER.md](PHASE-03-ADMIN-RUNNER.md) | `admin.toml` (delegates to `/admin`) |
| [PHASE-04-VITEPRESS-DOCS.md](PHASE-04-VITEPRESS-DOCS.md) | `docs/` + VitePress (delegates to `/docs`) |
| [PHASE-05-DOCS-ARTIFACTS.md](PHASE-05-DOCS-ARTIFACTS.md) | `docs/CONTEXT.md`, `docs/adr/`, `docs/PRD.md`, `docs/ROADMAP.md` |
| [PHASE-06-ISSUE-TRACKER.md](PHASE-06-ISSUE-TRACKER.md) | `gh auth status` + GitHub remote check, record fallback if needed |
| [PHASE-07-SUMMARY-AND-BACKFILL.md](PHASE-07-SUMMARY-AND-BACKFILL.md) | Before/after report + offer `/grill-me` Backfill on existing-codebase audits |

## Multi-project usage

Bootstrap is single-repo by design. For auditing a batch of repos, run once per repo from each repo's root: `cd ~/Projects/<repo> && /bootstrap`. Wrap with `/loop` if you want unattended sweeping. Don't try to audit a directory full of repos in one invocation — per-repo state is too varied for a single pass.

## When NOT to use

- Repo already matches the standard layout — running adds no value, but is harmless (every phase is `no-op`).
- Project explicitly wants a non-standard layout — note the deviation and exit.
- Project doesn't use Markdown for docs (Sphinx + RST, hosted docs platform) — Phase 04 + 05 are misaligned. Skip them or pick a different bootstrap.
- Worktree is dirty with unrelated uncommitted changes — bootstrap will add file moves to the dirty state, making review harder. Ask the user to commit or stash before running.
