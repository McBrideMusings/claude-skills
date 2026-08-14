# Aspect brief: `claude-md` (native)

Axis tag: `claude-md`. Applicability: a committed `CLAUDE.md` exists at the repo root.

**Read first:** [../CLAUDE-MD.md](../CLAUDE-MD.md) — its "Audit mode" section at the end is your contract, and Phases 2, 3, 5, and 6 are what you run. Everything from Phase 7 on (build the hooks, author what was never written, rewrite the file) is the interactive run and is a write; you do none of it.

Judge whether the `CLAUDE.md` is actually going to be read and obeyed. Distinct from `layout`, which only asks whether the file exists in the right place.

## What to do, read-only

1. **Phase 2 — Measure.** Words and estimated tokens **per section**, never line count. Report the table; it is a finding in its own right when the file is past ~3,000 words (global) or ~1,200 (project).
2. **Phase 3 — Inventory what already enforces behavior.** `jq '.hooks' settings.json settings.local.json`, the auto-loaded skill descriptions, `MEMORY.md`, the session system prompt, `docs/`. Any rule already covered there is a delete.
3. **Phase 5 — Read the file's own history.** `git log --follow --format='%h|%ad|%s' --date=short -- CLAUDE.md`. Carry-over across rewrites is the strongest evidence available: survived every rewrite → load-bearing; removed once and added back → the removal was wrong, mark it permanent; added once and gone since → safe to leave out.
4. **Phase 6 — Triage** each rule to one of five verdicts: Keep / Compress / → hook / → doc or skill / Delete. Run the "Is it hookable?" test on every rule before assigning any other verdict.

## Aspect-specific rules

- **Read the file in full before judging it. Quote the actual line in every finding** — a finding that doesn't quote this repo's own `CLAUDE.md` is not a finding.
- **On a project `CLAUDE.md`, read the global one first** and treat everything the project file restates as duplication — that is usually the largest single finding available.
- **Never propose cutting a truth rule** ("only claim what you verified", "flag uncertainty"). Those stop invented facts; they are not severity filters.
- **A rule routed to a hook is not a deletion until the hook exists.** Say so in the proposed fix: the finding is "write hook X, then delete these N words", one item, in that order.
- The strongest hook signal is escalation in the prose itself — ⛔, HARD BAN, ALWAYS, NEVER, or a paragraph about how badly it went last time. Sort by emphasis and you have the hook backlog.
