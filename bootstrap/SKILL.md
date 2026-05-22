---
name: bootstrap
description: "Idempotent project bootstrap AND audit. Walks through the standard layout (CLAUDE.md, .claude/CLAUDE.local.md, admin runner, VitePress docs, docs/CONTEXT.md, docs/adr/, docs/PRD.md, docs/ROADMAP.md). Creates what's missing, leaves standard-path artifacts alone, and proposes migrations for non-standard placements (e.g. root CLAUDE.local.md → .claude/CLAUDE.local.md, root CONTEXT.md → docs/CONTEXT.md, decisions/ → docs/adr/). Each phase is offered, not forced. Triggers: 'bootstrap', 'bootstrap this repo', 'init this project', 'set up the workflow', 'scaffold this project', 'set this up from scratch', 'wire up a new repo', 'audit my project layout', 'migrate this project to my standard layout'."
user_invocable: true
---

# Bootstrap

Walk through the standard project layout. **Create what's missing, migrate what's misplaced, leave what's already standard alone.**

**Idempotent.** Run as many times as wanted. Safe to point at a fresh repo OR an existing repo that's accumulated docs in non-standard places. Each phase has three branches: missing → create, standard → skip, non-standard → propose migration.

**Each phase is offered, not forced.** The user can skip any phase inline ("skip admin", "no docs", "leave the PRD where it is"). If the user opens with "skip docs" / "don't worry about docs", silently skip Phases 04–05.

**Don't commit.** Bootstrap prepares the ground; the user (or `/wrap-up`) commits. Migrations may shuffle git history — let the user review the staged moves before committing.

## Phases

Run in order. Phase 01 builds the audit table; later phases skip cleanly on the `standard` state and only do work on `missing` or `non-standard`.

| File | Purpose |
|---|---|
| [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md) | Probe non-standard locations, build the audit table |
| [PHASE-02-CLAUDE-FILES.md](PHASE-02-CLAUDE-FILES.md) | `CLAUDE.md` (root) + `.claude/CLAUDE.local.md` |
| [PHASE-03-ADMIN-RUNNER.md](PHASE-03-ADMIN-RUNNER.md) | `admin.toml` + `./admin` (delegates to `/admin`) |
| [PHASE-04-VITEPRESS-DOCS.md](PHASE-04-VITEPRESS-DOCS.md) | `docs/` + VitePress (delegates to `/docs`) |
| [PHASE-05-DOCS-ARTIFACTS.md](PHASE-05-DOCS-ARTIFACTS.md) | `docs/CONTEXT.md`, `docs/adr/`, `docs/PRD.md`, `docs/ROADMAP.md` |
| [PHASE-06-ISSUE-TRACKER.md](PHASE-06-ISSUE-TRACKER.md) | `gh auth status` + GitHub remote check, record fallback if needed |
| [PHASE-07-SUMMARY-AND-BACKFILL.md](PHASE-07-SUMMARY-AND-BACKFILL.md) | Before/after report + offer `/brainstorm` Backfill on existing-codebase audits |

## Multi-project usage

Bootstrap is single-repo by design. For auditing a batch of repos, run once per repo from each repo's root: `cd ~/Projects/<repo> && /bootstrap`. Wrap with `/loop` if you want unattended sweeping. Don't try to audit a directory full of repos in one invocation — per-repo state is too varied for a single pass.

## When NOT to use

- Repo already matches the standard layout — running adds no value, but is harmless (every phase is `no-op`).
- Project explicitly wants a non-standard layout — note the deviation and exit.
- Project doesn't use Markdown for docs (Sphinx + RST, hosted docs platform) — Phase 04 + 05 are misaligned. Skip them or pick a different bootstrap.
- Worktree is dirty with unrelated uncommitted changes — bootstrap will add file moves to the dirty state, making review harder. Ask the user to commit or stash before running.
