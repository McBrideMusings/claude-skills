# Reattach to a running swarm

The orchestrator session is mortal — it hits a context limit or crashes — while the swarm outlives it: agents keep working, worktrees and branches stay on disk. Reattach rebuilds the orchestrator's state from what is actually there, then resumes the loop.

**Nothing about the swarm lives in the dead session.** State is reconstructed from four observable places, never from memory or a handoff note.

## Rebuild state

Run the pre-flight from SKILL.md first — reattach still needs herdr and the primary checkout.

| Read | With | Gives |
|---|---|---|
| Live workers + status | `herdr agent list` | which panes still hold agents, and their state |
| Pane geometry | `herdr pane layout --pane <id>` | free slots, and the swarm's current width |
| Worktrees + branches | `git -C <repo> worktree list` | every worker's tree, including ones whose pane died |
| Verdicts | `<worktree>/tmp/claude/verify/<item>.json` per worktree | what each worker actually achieved |

Join them on the worktree path. Each row is one worker; the set of rows is the swarm.

## Classify what you find

A dead orchestrator leaves states the running loop never produces. Handle these before resuming:

| Worktree | Pane/agent | Verdict file | Meaning → do |
|---|---|---|---|
| exists | live | absent | still working → adopt it, no action |
| exists | live | present | finished while unattended → land and retire (SKILL.md steps 6–7) |
| exists | **gone** | present | pane died after finishing → land and retire; there is no pane to close |
| exists | **gone** | absent | **orphan** — work may be uncommitted and unverified. Do not delete it. Inspect `git -C <worktree> status --short` and `git log <default>..<branch>`, then escalate with what you found |
| gone | live | — | pane outlived its tree → escalate; the agent has nowhere to work |

**Never delete an orphan to tidy up.** An orphan is the one state that can hold work nobody has seen. Escalate and let the human decide.

## Resume

Once every row is classified and the land-and-retire cases are cleared:

1. Re-arm the `Monitor` and the heartbeat — the old session's watches died with it, and no notification is replayed.
2. Recompute the frontier (SKILL.md step 1). Issues closed by the previous session change it.
3. Fan out into free slots.

**Completion criterion:** every worktree in `git worktree list` maps to a live adopted worker, a landed-and-retired one, or a named escalation. A worktree unaccounted for means the rebuild is not finished.
