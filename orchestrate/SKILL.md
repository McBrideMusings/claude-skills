---
name: orchestrate
description: "Fan out a swarm of coding agents across herdr panes — one git worktree and one /implement pass per issue — then verify, land, retire, and re-dispatch as the dependency frontier advances. Requires HERDR_ENV=1. Covers starting, checking on, and disbanding a swarm; one item is /implement, sequential items in one terminal is /iterate."
---

# /orchestrate — fan work out to a swarm, land it, retire it

You **fan out** ready issues to a **swarm** of agents, each in its own pane and worktree, then bring their work back: verify, land, retire the worker, recompute what is now ready, dispatch again. The loop is the skill. Fanning out is the easy half; retiring workers and advancing the frontier is the half that makes it unattended.

**The human is interrupted for exactly two things: a `blocked` worker, and a worker that stopped without a passing verdict.** Everything else retires and re-dispatches itself. Every rule below serves that.

## Why panes and not sub-agents

The work being fanned out is decision-laden — a worker will hit a design call only the human can make. A pane worker is **watchable and answerable mid-run**; a `Workflow` or `Agent` sub-agent is neither, however well it parallelises. That property is the reason for the herdr dependency, so never trade it away to fit more workers on screen.

## Pre-flight

All must hold. Print the reason and stop otherwise.

1. **Inside herdr** — `test "${HERDR_ENV:-}" = 1`. Do not degrade to sequential in-session work when it fails; that silently becomes a different skill.
2. **In the primary checkout, not a worktree** — `git rev-parse --git-dir` must not contain `/worktrees/`. Only the primary checkout can hold the default branch, and landing needs it.
3. **Clean tree on the default branch**, up to date with the remote.

## Branches

| You want | Go to |
|---|---|
| Start a swarm | the loop below |
| Adopt a swarm already running (this session did not start it) | [REATTACH.md](REATTACH.md) |
| Stop everything and tear it all down | [DISBAND.md](DISBAND.md) |

**Check for an existing swarm before starting one.** `herdr agent list` naming live agents, or `git worktree list` showing worktrees, means a swarm exists — reattach instead of fanning out a second one on top of it.

## The loop

### 1. Build the frontier

The **frontier** is the open issues whose blockers are all closed. Only the frontier is ever dispatched.

Read dependencies per issue, in this order:

1. **Native** — `gh issue view <n> --json blockedBy --jq '.blockedBy.totalCount'`.
2. **Prose fallback** — a `Blocked by: #70, #72` line in the body.

**Absence is not permission.** If native reports zero blockers *and* the body carries a `Blocked by:` line, the two disagree — surface it and dispatch nothing. If neither source yields a graph and more than one candidate exists, make the human confirm the order before dispatching. Treating "no graph found" as "nothing is blocked" fans work out onto unbuilt foundations, which is the failure this skill exists to prevent.

**Ready is not workable.** A frontier issue carrying an unresolved decision (`Type: HITL`, missing acceptance criteria, "decide whether"/"TBD" language) will only block its worker mid-run — invoke the `iron-out` skill on the scope before dispatching, so ambiguity is cleared before the fan-out instead of answered across N panes during it.

**Completion criterion:** every candidate issue is classified ready or blocked, with the blocker named.

### 2. Size the swarm

Pane readability caps the swarm, not appetite — a pane too small to read destroys the watchable-and-answerable property above.

#### The layout is fixed. Do not invent one.

**One full-height orchestrator column on the LEFT. A grid of at most FOUR worker panes to its RIGHT.** Nothing else.

```
┌──────────────┬──────────────┬──────────────┐
│              │              │              │
│              │   worker 1   │   worker 2   │
│              │              │              │
│ orchestrator ├──────────────┼──────────────┤
│  (you) —     │              │              │
│  full height │   worker 3   │   worker 4   │
│              │              │              │
└──────────────┴──────────────┴──────────────┘
```

The orchestrator pane is the one the human reads. It **keeps its full height for the whole run** and is never split horizontally, never shrunk into a worker cell, never tiled into the same grid as the workers.

Build it exactly this way:

1. **Carve the worker region once, up front** — one `herdr pane split "$HERDR_PANE_ID" --direction right --ratio <r>` where `<r>` leaves the orchestrator roughly a third. That single child pane is the **worker region**. Never split `$HERDR_PANE_ID` again for any reason.
2. **Subdivide the worker region only.** Split the region right for a second column, then split each column down for a second row. Every later worker splits a *worker* pane, never the orchestrator's.
3. **Four workers is the hard cap**, regardless of screen size or frontier length. A fifth ready issue waits for a slot to free — that is what paces the swarm.

**Symptom you got it wrong:** the orchestrator's pane is the same height as a worker's, or `herdr pane layout` shows it at less than full height. If you ever split `$HERDR_PANE_ID` a second time, you have already broken it.

Observed failure: splitting the orchestrator pane right, then down, then splitting workers off it again produced an unreadable jumble with the orchestrator squeezed into a 87×26 cell — the human could not follow the run, which is the entire purpose of the pane layout.

#### Sizing within the cap

Read the geometry (`herdr pane layout --pane "$HERDR_PANE_ID"`) and check each prospective worker cell against **`MIN_PANE` = 80 cols × 24 rows**. Dispatch `min(frontier size, 4, cells that clear MIN_PANE)`.

Observed: 113×17 was unusable, 99×34 was fine. If four cells will not clear `MIN_PANE`, run fewer workers — never shrink the orchestrator column to make room.

### 3. Fan out

Per ready issue, in order:

1. **Worktree** — `git -C <repo> worktree add -b <branch> ~/.worktrees/<repo>/<slug> <default-branch>`. Create it **now, not earlier**: a worktree is evidence an issue was ready, never a bet that it will be.
2. **Pane** — `herdr pane split <target> --direction right|down --ratio <r> --cwd <worktree> --no-focus`. `<target>` is a pane **inside the worker region**, never `$HERDR_PANE_ID` — see the fixed layout in step 2.
3. **Agent** — `herdr agent start <slug> --kind claude --pane <id> --timeout 120000`.
4. **Brief** — send the prompt from [BRIEF.md](BRIEF.md), then **send Enter separately**: `herdr agent prompt <slug> '<text>'` pastes a long prompt without submitting it, leaving the worker idle at a filled input box. Follow every prompt with `herdr agent send-keys <slug> enter` and confirm the worker reaches `working`.

**Completion criterion:** every dispatched worker reports `working` in `herdr agent list`.

### 4. Arm the wake signal

A persistent `Monitor` polling `herdr agent list`, emitting one line whenever a named worker's status is **not** `working`:

```bash
while true; do
  herdr agent list | jq -r '.result.agents[] | select(.name != null) | select(.agent_status != "working") | "\(.name) \(.agent_status)"'
  sleep 20
done
```

Emit on `blocked` and `unknown` too, never only `done` — *silence is not success*. A worker wedged waiting on an answer must not look identical to one still working.

Add a long `/loop` heartbeat (1200–1800s) as a backstop for a dead Monitor or a worker stuck in a state that never changes.

**Never focus a worker to inspect it.** Focusing consumes `done`, collapsing it to `idle`. CLI reads do not — always read via CLI.

### 5. Classify each waking worker

| State | Do |
|---|---|
| `working` | leave alone |
| `blocked` | escalate to the human; never auto-close |
| `done`/`idle`, verdict `PASS`/`SKIP` **and** `commit` == branch head | land it (step 6) |
| `done`/`idle`, verdict `PASS`/`SKIP` but `commit` **behind** the head | **stale** — escalate; the tip commits shipped unverified |
| `done`/`idle`, verdict `FAIL`/`BLOCKED`/missing | escalate — it stopped without finishing |
| `unknown` | escalate; it does not prove completion |

The verdict is a file, not the pane's chat: `<worktree>/tmp/claude/verify/<item>.json`, written by `/implement`'s Phase 1.5. **A pane going quiet is liveness, not completion** — a worker that gave up, failed, or stopped to ask lands in the same idle state. Never tear down on pane state alone.

**Check the verdict's `commit` against the branch head** (`git -C <worktree> rev-parse HEAD`) before trusting a `PASS`. A verdict describes one tree; commits made after it are unverified. Observed: a worker returned `PASS` at one commit, made one more, and the extra change landed on nothing but its own say-so.

#### Read the pane on EVERY wake. The verdict file alone will lie to you.

The verdict is written once and never updated. A worker that halted, got answered, resumed, and then stopped to ask something *new* still has its **original** verdict sitting on disk. Reading only the file, you will report "still blocked on the same thing" while a fresh, unasked question sits in the pane — indefinitely, because nothing else will ever surface it.

So on every wake, for every non-`working` worker: read the verdict file **and** `herdr pane read <pane-id> --lines 60`. The file tells you what to do with the branch; the pane tells you what the worker needs from the human. They answer different questions and neither substitutes for the other.

Observed: a worker's `BLOCKED` verdict was re-reported to the human four times across ~40 minutes while the pane held a completely different question it had already moved on to — the human had answered the original in-pane and the orchestrator never noticed.

#### Surface every worker question to the root pane, in full, immediately

A question asked in a worker pane is invisible. The human is watching the **orchestrator's** pane; that is the whole reason the swarm uses panes instead of sub-agents. A question that stays in the worker pane blocks that worker forever.

The moment a worker is found parked on a question, relay it into the root pane: what it is asking, the options with their concrete consequences, the file:line grounding it gave, and a recommendation. Never summarize it as "worker N is blocked" — that is not answerable. Never wait for a "better moment" to batch several together.

**A worker parked on an unrelayed question is an orchestrator bug, not a worker problem.**

### 6. Land it

From the **primary checkout**, one worker at a time:

1. Fetch, then compare `git merge-base origin/main <branch>` against `origin/main`'s head.
2. **Unchanged** → the worker's verdict still describes this exact tree; merge and push.
3. **Moved** → another branch landed since this worker forked. Merge, then **re-run `verify` on the merged result** before pushing. Two branches can each pass alone and break together.
4. **Conflict** → abort the merge, leave the worktree and branch intact, escalate. Never force-resolve.

Close the issue with what shipped.

### 7. Retire the worker

Teardown is the orchestrator's job because it is **structurally impossible for the worker**: git refuses to delete a branch that a worktree still has checked out, and the worker is standing in it. Whatever created a resource retires it.

```bash
git -C <worktree> status --short          # must be empty
git log <default>..<branch>               # must be empty — fully merged
rm -rf <worktree> && git -C <repo> worktree prune \
  && git -C <repo> branch -d <branch> \
  && git -C <repo> push origin --delete <branch>
herdr pane close <pane-id>
```

`git worktree remove` fails outright in a repo with submodules (`working trees containing submodules cannot be moved or removed`), which then cascades into `branch -d` failing — hence `rm -rf` plus `prune`. Chain with `&&`, never `;`: a `;`-chained success echo prints after a failed step and misreports teardown as done.

#### Close the pane the moment its work is over — landing is not the only ending

Retire on **any** terminal outcome, not just a merge. A worker whose issue turned out to be already-done, wrong, or withdrawn is finished; so is one whose branch you will never land. Its pane is a slot the frontier needs, and a screen of stale panes is what makes a swarm unreadable.

**A pane still open means a worker still has something to do.** Keep that true. If it has nothing left to do, close it — even when the issue stays open, even when the human still owes an answer about the *issue*. An unanswered question about what to build does not require a live agent sitting in a worktree; the question belongs in the root pane (step 5), and the pane can go.

Before closing, check `git -C <worktree> status --short` and the unmerged-commit count, exactly as above. **Uncommitted work in the worktree is the one thing that forbids teardown** — surface it and leave the pane alone. Never `rm -rf` over a dirty tree to reclaim a slot.

Observed: three panes sat open across most of a run — one holding a worker with nothing left to do, waiting on a decision that lived in the root pane. The frontier had ready issues and nowhere to put them.

### 8. Recompute and re-dispatch

Landing a branch closes an issue, which may clear the last blocker on others. Rebuild the frontier (step 1), and fan out into the pane slot the retirement just freed (steps 2–3). The freed slot is what paces the swarm.

**The loop ends when** the frontier is empty and no worker is live. Report what landed, what escalated, and what remains blocked and on what.

## Worker rules the brief must carry

These are properties of the swarm, not of any one worker — [BRIEF.md](BRIEF.md) states them in full.

- **One `/implement <n>` per worker. Never `/iterate`.** `/iterate` halts unless it is on the default branch, and git refuses a second checkout of it (`fatal: 'main' is already used by worktree at …`), so it cannot run in a worktree at all.
- **Workers never land.** Same constraint: `wrap-up`'s landing does `git checkout main`, which fails in a worktree. They commit and push their own branch; the orchestrator lands.
- **No repo-wide formatters.** One worker reformatting the workspace makes every sibling branch conflict on formatting alone. Format only what you touched.
