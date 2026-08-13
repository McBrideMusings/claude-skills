# Disband the swarm

Stop everything and leave no residue: no live agents, no worktrees, no branches the swarm created, no tabs it opened. Reach for this to end a run early, or to clean up after one that ended badly.

**Disband never discards work silently.** Every worker is either landed or reported, and anything holding unmerged or uncommitted work survives until the human says otherwise.

## 1. Take stock before touching anything

Build the full picture first — the run's returned array (or `/workflows` if a round is still going), `git worktree list`, and each `<worktree>/tmp/claude/verify/<item>.json`. You cannot decide what is safe to delete without it.

## 2. Sort every worker

| Worker | Do |
|---|---|
| verdict `PASS`/`SKIP`, fully merged | land it (SKILL.md step 6), then retire |
| verdict `PASS`/`SKIP`, not yet landed | land it, then retire |
| verdict `FAIL`/`BLOCKED`/absent, **no commits** | nothing to save → retire |
| verdict `FAIL`/`BLOCKED`/absent, **has commits** | **keep** — push the branch, leave the worktree, report it |
| still `working` | ask the human before interrupting it; a mid-flight worker may be minutes from a verdict |

A branch with commits and no passing verdict is the case that matters. Push it so the work survives the worktree, then leave both in place and name them in the report. Deleting it is the one irreversible mistake available here.

## 3. Retire what sorted clean

Per worker, using the recipe in SKILL.md step 7 — `worktree remove --force` + `branch -d` + remote delete, chained with `&&`, then `retire(handle)`: `herdr tab close <tab-id>` under the herdr transport, nothing under the subagent one.

A **still-running** worker must be stopped before its worktree goes: `herdr agent`'s pane is torn down by closing the tab, and a live subagent needs `TaskStop` first. Never `rm -rf` a worktree with a worker standing in it.

`branch -d` (never `-D`) is the safety interlock: git re-checks merged-ness and refuses if the branch still holds unmerged commits. **If `-d` refuses, stop and re-sort that worker** — the refusal means step 2 misjudged it.

## 4. Stop the watches

`TaskStop` the `Monitor`, and end the `/loop` heartbeat with `ScheduleWakeup(stop: true)`. Both outlive the swarm otherwise and will wake a session with nothing to manage. A workflow round still running is stopped the same way, or from `/workflows`.

## 5. Report

- **Landed** — issue, branch, merge commit.
- **Kept** — worktree path, branch (pushed), why it was not landed, and what the human must decide.
- **Retired** — count only; nothing was lost.
- **Left running** — any worker the human chose not to interrupt.
- **Filed** — every `needs human input` follow-up a worker left behind, with the issue it belonged to.

**Completion criterion:** `git worktree list` shows only the primary checkout, no swarm worker is live under the transport's own listing (and under herdr, `herdr tab list --workspace "$HERDR_WORKSPACE_ID"` shows only the orchestrator's tab), and every kept worker appears in the report with its branch pushed. A worktree that is gone but absent from the report means work was destroyed unrecorded.
