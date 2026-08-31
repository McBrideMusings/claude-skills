---
name: bootstrap
description: "Idempotent bootstrap and audit of the standard repo layout (CLAUDE.md, CLAUDE.local.md, .gitignore, admin runner, VitePress docs, docs/CONTEXT.md, docs/adr/). Use for setting up, scaffolding, or auditing a repo's layout, including checking an existing project against the standard."
user_invocable: true
---

# Bootstrap

Walk through the standard project layout. **Create what's missing, migrate what's misplaced, leave what's already standard alone.**

**Idempotent.** Run as many times as wanted. Safe to point at a fresh repo OR an existing repo that's accumulated docs in non-standard places. Each phase has three branches: missing → create, standard → skip, non-standard → propose migration.

**Act, don't ask — additive work runs automatically.** Every phase creates and wires the missing standard artifacts *without asking permission* — no "shall I create admin.toml?", no "add VitePress?", no per-phase "proceed?" offer. Creating what's missing and wiring it is the whole point of the skill; do it. The user pre-empts by saying "skip X" / "no docs" up front (and "skip docs" / "don't worry about docs" silently skips Phases 04–05) — but silence means proceed, never means ask. The ONLY thing that stops for a question is a **genuinely destructive migration**: moving or renaming existing files (which can break references) or deleting/overwriting content the user already wrote. Those confirm (see the per-phase "Default: yes" prompts). Pure additive creation never does. **One further exception:** Phase 06's issue-backend choice asks, because there is no "standard" tracker to create — picking one changes where every future ticket lives and `bd init` writes git hooks into the user's repo.

**Override, stated here because this skill contradicts standing steering.** `CLAUDE.md`
§Deciding & designing requires options and a pick before significant work and at every
decision point inside it. **This skill overrides that for creating a missing standard
artifact, and only for that** — writing `CLAUDE.md`, `CLAUDE.local.md`, `.gitignore` lines,
`admin.toml`, `docs/CONTEXT.md` and `docs/adr/` is a no-question action even though each is a
file appearing in the user's repo. Everything else in this skill stays under the options rule:
the Phase 05 issue-backend choice, every destructive migration, and any judgement call a phase
does not name. Without this line the two rules are simply in conflict, and whichever one gets
obeyed is invisible to the user.

**Any confirmation you do surface is a plain-chat question** — never the `AskUserQuestion` tool / structured-question schema. Answered inline in free-form ("skip admin", "yes but leave the glossary"), which the chip-picker UI can't carry.

**Don't commit — and don't ask about committing.** Bootstrap prepares the ground and stops; the user (or `/wrap-up`) commits. Do NOT end with "commit to main?" or any variant — that is exactly the dumb question this rule kills. Just do the work, then report per [PHASE-07-SUMMARY-AND-BACKFILL.md](PHASE-07-SUMMARY-AND-BACKFILL.md). The user commits when they choose. (Destructive migrations may shuffle git history — leave the moves staged for the user to review.)

## Phases

Run in order. Phase 01 builds the audit table; later phases skip cleanly on the `standard` state and only do work on `missing` or `non-standard`.

| File | Purpose |
|---|---|
| [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md) | Probe non-standard locations, build the audit table |
| [PHASE-02-CLAUDE-FILES.md](PHASE-02-CLAUDE-FILES.md) | `CLAUDE.md` (root) + `CLAUDE.local.md` (root) |
| [PHASE-03-ADMIN-RUNNER.md](PHASE-03-ADMIN-RUNNER.md) | `admin.toml` (delegates to `/admin`) |
| [PHASE-04-VITEPRESS-DOCS.md](PHASE-04-VITEPRESS-DOCS.md) | `docs/` + VitePress (delegates to `/docs`) |
| [PHASE-05-ISSUE-TRACKER.md](PHASE-05-ISSUE-TRACKER.md) | Resolve the issue backend (beads / GitHub / local), offer `bd init` or a GitHub→beads migration, record the answer |
| [PHASE-06-DOCS-ARTIFACTS.md](PHASE-06-DOCS-ARTIFACTS.md) | `docs/CONTEXT.md`, `docs/adr/`. No PRD, no roadmap — the phase says why |
| [PHASE-07-SUMMARY-AND-BACKFILL.md](PHASE-07-SUMMARY-AND-BACKFILL.md) | Before/after report + offer `/grill-me` Backfill on existing-codebase audits |

## Findings-only invocation

When another skill (e.g. `improve`'s survey) invokes this for audit-only: run [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md) and return its audit table as structured findings (artifact, state `missing`/`standard`/`non-standard`, proposed action) — the act-don't-ask rule is **suspended**: create nothing, migrate nothing, run no later phases. No file writes, no commits, no questions.

## Multi-project usage

Bootstrap is single-repo by design. For auditing a batch of repos, run once per repo from each repo's root: `cd ~/Projects/<repo> && /bootstrap`. Wrap with `/loop` if you want unattended sweeping. Don't try to audit a directory full of repos in one invocation — per-repo state is too varied for a single pass.

## When NOT to use

- Repo already matches the standard layout — running adds no value, but is harmless (every phase is `no-op`).
- Project explicitly wants a non-standard layout — note the deviation and exit.
- Project doesn't use Markdown for docs (Sphinx + RST, hosted docs platform) — Phase 04 + 05 are misaligned. Skip them or pick a different bootstrap.
- Worktree is dirty with unrelated uncommitted changes — bootstrap will add file moves to the dirty state, making review harder. Ask the user to commit or stash before running.
