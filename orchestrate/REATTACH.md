# Reattach to a running swarm

**herdr transport only.** Subagent workers are children of the orchestrator's session and die with it — there is nothing to reattach to. If the dead run used subagents, its worktrees, branches, and verdict files are still on disk: read those, land what passed, and **re-dispatch** the rest as new workers. Everything below assumes live agents in live tabs.

The orchestrator session is mortal — it hits a context limit or crashes — while a herdr swarm outlives it: agents keep working, worktrees and branches stay on disk. Reattach rebuilds the orchestrator's state from what is actually there, then resumes the loop.

**Nothing about the swarm lives in the dead session.** State is reconstructed from five observable places, never from memory or a handoff note.

## Rebuild state

Run the pre-flight from SKILL.md first — reattach still needs herdr and the primary checkout.

| Read | With | Gives |
|---|---|---|
| Live workers + status | `herdr agent list` | which panes still hold agents, and their state |
| Worker tabs | `herdr tab list --workspace "$HERDR_WORKSPACE_ID"` | one tab per worker, labelled with its slug; open slots against the cap of four |
| Worktrees + branches | `git -C <repo> worktree list` | every worker's tree, including ones whose tab died |
| Verdicts | `<worktree>/tmp/claude/verify/<item>.json` per worktree | what each worker actually achieved |
| Outstanding questions | `<repo>/tmp/claude/orchestrate/questions.json` | what the previous orchestrator had already asked, answered, or left queued |

Join them on the worktree path — the tab's label is the slug, which is the worktree's directory name. Each row is one worker; the set of rows is the swarm.

**Resume the question queue before dispatching anything.** A record left `outstanding` was relayed to a human who may have answered into a pane the dead orchestrator was no longer reading; re-read that worker's pane (`herdr pane read <pane-id> --lines 60`) to see whether it moved on, and reconcile. A record left `queued` was never relayed at all — that worker has been waiting on a question nobody has ever seen. Clear the queue down to at most one `outstanding` record, oldest first, before step 3 of the resume.

## Classify what you find

A dead orchestrator leaves states the running loop never produces. Handle these before resuming:

| Worktree | Tab/agent | Verdict file | Meaning → do |
|---|---|---|---|
| exists | live | absent | still working → adopt it, no action |
| exists | live | present | finished while unattended → land and retire (SKILL.md steps 6–7) |
| exists | **gone** | present | tab died after finishing → land and retire; there is no tab to close |
| exists | **gone** | absent | **orphan** — work may be uncommitted and unverified. Do not delete it. Inspect `git -C <worktree> status --short` and `git log <default>..<branch>`, then escalate with what you found |
| gone | live | — | tab outlived its tree → escalate; the agent has nowhere to work |
| — | tab open, **no agent** | — | leftover shell holding a slot → close the tab |

**Never delete an orphan to tidy up.** An orphan is the one state that can hold work nobody has seen. Escalate and let the human decide.

## Resume

Once every row is classified and the land-and-retire cases are cleared:

1. Re-arm the `Monitor` and the heartbeat — the old session's watches died with it, and no notification is replayed.
2. Recompute the frontier (SKILL.md step 1). Issues closed by the previous session change it.
3. Fan out into free slots.

**Completion criterion:** every worktree in `git worktree list` maps to a live adopted worker, a landed-and-retired one, or a named escalation; every tab in `herdr tab list` maps to a live worker or the orchestrator; and `questions.json` holds at most one `outstanding` record. A worktree unaccounted for means the rebuild is not finished.
