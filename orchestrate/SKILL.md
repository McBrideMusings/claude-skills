---
name: orchestrate
description: "Fan out a swarm of coding agents across herdr tabs — one git worktree and one /implement pass per issue — then verify, land, retire, and re-dispatch as the dependency frontier advances. Requires HERDR_ENV=1. Covers starting, checking on, and disbanding a swarm; one item is /implement, sequential items in one terminal is /iterate."
---

# /orchestrate — fan work out to a swarm, land it, retire it

You **fan out** ready issues to a **swarm** of agents, each in its own herdr tab and git worktree, then bring their work back: verify, land, retire the worker, recompute what is now ready, dispatch again. The loop is the skill. Fanning out is the easy half; retiring workers and advancing the frontier is the half that makes it unattended.

**The human is interrupted for exactly two things: a `blocked` worker, and a worker that stopped without a passing verdict.** Everything else retires and re-dispatches itself. Every rule below serves that.

## Why terminals and not sub-agents

The work being fanned out is decision-laden — a worker will hit a design call only the human can make. A worker in a real terminal is **watchable and answerable mid-run**; a `Workflow` or `Agent` sub-agent is neither, however well it parallelises. That property is the reason for the herdr dependency, so never trade it away to fit more workers on screen.

Each worker sits in its **own tab**, so "watchable" now costs a tab switch — which is why step 5's relay carries the whole burden of making a worker answerable.

## Pre-flight

All must hold. Print the reason and stop otherwise.

1. **Inside herdr** — `test "${HERDR_ENV:-}" = 1`. Do not degrade to sequential in-session work when it fails; that silently becomes a different skill.
2. **In the primary checkout, not a worktree** — `git rev-parse --git-dir` must not contain `/worktrees/`. Only the primary checkout can hold the default branch, and landing needs it.
3. **Clean tree on the default branch**, up to date with the remote.

## Worker agents and models

A worker is a coding agent of a chosen **kind** running a chosen **model**. Neither is inherited from the orchestrator's session — both are read from config and passed explicitly at dispatch.

**Config file:** `$CLAUDE_CONFIG_DIR/orchestrate.toml` — `~/.claude/orchestrate.toml`, or `~/.claude-work/orchestrate.toml` under the work profile, resolved by the variable so the two profiles differ without either being tracked. Untracked (`~/.claude/.gitignore` blanket-ignores `*`). Read once per run, at the first dispatch. Commented reference copy: [orchestrate.example.toml](orchestrate.example.toml)

```toml
max_workers = 4                  # may lower the cap in "Four workers, hard cap"; may never raise it
default     = "claude"           # kind used when the dispatch does not name one

[agents.claude]                  # table key IS the herdr `agent start --kind` value
model   = "opus"
allowed = ["opus", "sonnet", "haiku"]
denied  = ["fable", "claude-fable-5"]

[agents.codex]
model   = ""                     # empty -> no --model flag; codex picks its own default
allowed = []                     # empty -> no allowlist; only `denied` applies
denied  = []
```

A kind is dispatchable **only** if it has an `[agents.<kind>]` block. Deleting a block disables that kind; there is no second place that also has to agree.

**Missing file** → dispatch `claude` on `opus` and say so in the run report. **Malformed file** → stop; do not fall back. A config that cannot be parsed is not a config that permits anything.

### The guardrails live in the file *and* here

The file is the readable statement of policy. These checks run at dispatch regardless of what the file says, so an edited, emptied, or deleted file cannot widen what the swarm may run.

| Rule | What the orchestrator does |
|---|---|
| Kind must appear in herdr's `agent start --kind` enum | refuse before calling herdr, name the kind |
| A `claude` worker is dispatched with an **explicit** `-- --model <id>`, always | omitting the flag inherits the machine's default model — that is exactly the path a denied model takes into the swarm |
| **Never Fable.** `fable`, `claude-fable-5`, or any id containing `fable` | refuse the dispatch, name the model, stop. Not a silent fall back to the default — stop, so the config gets fixed |
| Model absent from a non-empty `allowed`, or present in `denied` | refuse the dispatch and name both the model and the list that rejected it |

`claude --model` accepts `fable` and `claude-fable-5` as ordinary aliases, so nothing below this skill will reject them. This check is the only thing standing between the config and a Fable worker.

### Kinds that are not dispatchable

**reasonix (DeepSeek)** — blocked, and not by preference. `herdr agent start --kind` takes a fixed enum — `pi, claude, codex, gemini, cursor, devin, agy, cline, omp, mastracode, opencode, copilot, kimi, kiro, droid, amp, grok, hermes, kilo, qodercli, maki` — and `reasonix` is not in it, nor does herdr ship a detection manifest for it. Started the only way left, `herdr pane run <pane> 'reasonix chat'`, it holds no agent name and reports no `agent_status`, so step 4's wake Monitor and step 5's classification table have nothing to read and the unattended loop is gone — which is the whole skill. **What would unblock it:** a herdr agent kind plus a detection manifest classifying `working`/`idle`/`blocked`. Until then reasonix is reachable through the `delegate` router (`/implement delegate`), never as a swarm worker.

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

**Ready is not workable.** A frontier issue carrying an unresolved decision (`Type: HITL`, missing acceptance criteria, "decide whether"/"TBD" language) will only block its worker mid-run — invoke the `iron-out` skill on the scope before dispatching, so ambiguity is cleared before the fan-out instead of answered one relayed question at a time during it.

**Completion criterion:** every candidate issue is classified ready or blocked, with the blocker named.

### 2. Give each worker its own tab

#### The topology is fixed. Do not invent one.

**The orchestrator keeps its pane, whole, for the entire run. Every worker gets its own tab in the same workspace, holding one full-size pane.** Nothing is ever split.

```
workspace
├── tab 1   orchestrator (you) — never split, never closed
├── tab 2   worker: issue-71   ← one pane, the whole tab
├── tab 3   worker: issue-74
└── tab 4   worker: issue-80
```

`herdr tab create` puts the new tab in the active workspace, beside the orchestrator's, and returns both `.result.tab.tab_id` and `.result.root_pane.pane_id`. That root pane **is** the worker's pane. Nothing gets subdivided, so pane ratios and a `MIN_PANE` geometry check do not apply — a worker's pane is always the full tab.

**Never split `$HERDR_PANE_ID`.** Not once, for any reason. The orchestrator's pane is the only surface the human reads and the only place a worker's question can be answered.

Observed under the old shared-tab layout: workers tiled beside the orchestrator squeezed it into an 87×26 cell and the human could not follow the run.

#### Four workers, hard cap

Regardless of screen size, tab count, or frontier length; `max_workers` in the config may lower it and may never raise it.

The cap is no longer about pixels — every worker tab is full size now. **It is about the human.** Worker questions are relayed and answered strictly one at a time (step 5), so a fifth live worker cannot get answered any sooner; it only lengthens the queue in front of the answer that unblocks the other four. A fifth ready issue waits for a slot, and the freed slot is what paces the swarm.

#### Workers are out of sight now — that is the cost of this layout

In a shared tab a stuck worker was at least visible in the corner of the screen. In its own tab it is invisible until someone switches to it, and the human is watching the orchestrator's tab. **Every mechanism that surfaces a worker's state — the wake Monitor (step 4), the pane read on every wake (step 5), the question queue (step 5) — is now the only way a worker is ever heard from.** Skipping one does not degrade the run; it silently strands a worker.

### 3. Fan out

Per ready issue, in order:

1. **Worktree** — `git -C <repo> worktree add -b <branch> ~/.worktrees/<repo>/<slug> <default-branch>`. Create it **now, not earlier**: a worktree is evidence an issue was ready, never a bet that it will be.
2. **Tab** — `herdr tab create --workspace "$HERDR_WORKSPACE_ID" --cwd <worktree> --label <slug> --no-focus`. Keep `.result.tab.tab_id` (teardown needs it) and `.result.root_pane.pane_id` (the agent starts there). `--no-focus` is not cosmetic: focusing a worker's tab marks it seen and collapses a later `done` into `idle`.
3. **Agent** — `herdr agent start <slug> --kind <kind> --pane <root-pane-id> --timeout 120000 -- --model <model>`, with `<kind>` and `<model>` resolved and checked against **Worker agents and models** above. A `claude` worker always carries `-- --model <id>`.
4. **Brief** — send the prompt from [BRIEF.md](BRIEF.md), then **send Enter separately**: `herdr agent prompt <slug> '<text>'` pastes a long prompt without submitting it, leaving the worker idle at a filled input box. Follow every prompt with `herdr agent send-keys <slug> enter` and confirm the worker reaches `working`.

Record `slug → issue → tab_id → pane_id → worktree → branch` as you go. Step 7 needs the tab id, and a reattach rebuilds this table from `herdr tab list --workspace "$HERDR_WORKSPACE_ID"`.

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

**Never focus a worker's tab to inspect it.** Focusing a tab marks it seen and consumes `done`, collapsing it to `idle`. `herdr tab focus`, `herdr pane focus`, and `herdr agent focus` all do this; CLI *reads* do not. Always read via `herdr pane read` / `herdr agent list`.

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

#### Surface every worker question to the orchestrator's pane — in full, one at a time

A question asked in a worker tab is invisible. The human is watching the **orchestrator's** tab and nothing else. A question that stays in the worker tab blocks that worker forever, and the worker will not ask again.

**The queue is a file, not a memory.** `<repo>/tmp/claude/orchestrate/questions.json` in the primary checkout (absolute path from `git rev-parse --show-toplevel`). It survives the orchestrator being compacted or dying mid-run, which an in-context list does not — and a lost queue is a permanently stranded worker.

```json
[
  { "slug": "issue-71", "tab": "w1:t3", "issue": 71,
    "asked_at_commit": "a1b2c3d",
    "question": "<the worker's full question text>",
    "options": ["<option A + its concrete consequence>", "<option B + …>"],
    "recommendation": "<yours, with the file:line grounding the worker gave>",
    "status": "outstanding",
    "answer": null },
  { "slug": "issue-74", "tab": "w1:t4", "issue": 74,
    "asked_at_commit": "e4f5g6h",
    "question": "<…>", "options": [], "recommendation": "<…>",
    "status": "queued", "answer": null }
]
```

`status` is one of `queued` → `outstanding` → `answered` → `resolved`. **At most one record is `outstanding` at any moment.**

On every wake, per non-`working` worker parked on a question:

1. **Append it as `queued`** — full text, options with their concrete consequences, the file:line grounding, your recommendation. Never the summary "worker N is blocked"; that is not answerable, and the human should not have to switch tabs to find out what was meant.
2. **If a record is already `outstanding`, stop there.** Say nothing further to the human. A second question printed now buries the first, and the first is the one already holding a worker still.
3. **Otherwise promote the head of the queue to `outstanding`** and relay it into the orchestrator's pane, in full.
4. **On the human's answer** — write it into `answer`, set `answered`, deliver it with `herdr agent prompt <slug> '<answer>'` + `herdr agent send-keys <slug> enter`, confirm the worker reaches `working`, set `resolved`, then promote the next `queued` record and relay it. One answer, one unblocked worker, then the next question — never batched.

**A worker parked on an unrelayed question is an orchestrator bug, not a worker problem.** So is a `queued` record that never got promoted because nothing checked the queue after the last answer landed.

Re-read the worker's pane before relaying a *re-*ask. A worker that was answered, resumed, and stopped again is asking something **new** — its old record is `resolved`, and what it is asking now is a new record with new text. Never re-relay a `resolved` record's text because the worker is idle again; that is the failure recorded above.

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
herdr tab close <tab-id>
```

Close the **tab**, not the pane — the worker owns the whole tab, and a tab left holding an empty shell still occupies one of the four slots to anyone reading `herdr tab list`. Mark any `questions.json` record for that slug `resolved` in the same breath; a `queued` question belonging to a retired worker will otherwise be relayed to the human and answered into a pane that no longer exists.

`git worktree remove` fails outright in a repo with submodules (`working trees containing submodules cannot be moved or removed`), which then cascades into `branch -d` failing — hence `rm -rf` plus `prune`. Chain with `&&`, never `;`: a `;`-chained success echo prints after a failed step and misreports teardown as done.

#### A worker that is done gets its tab closed. Same wake, no exceptions.

**An open tab is a claim that a worker still has something to do.** Keep that claim true, every wake. Close the tab on **any** terminal outcome, not just a merge:

| Worker | Tab |
|---|---|
| landed | close |
| issue turned out already-done, wrong, or withdrawn | close |
| branch you have decided never to land | close |
| finished, but the *issue* still needs a human decision | **close** — see below |
| stopped with commits and no passing verdict | keep, escalate |
| uncommitted changes in the worktree | **keep** — the one hard stop |

The fourth row is the one that gets fumbled. An unanswered question about *what to build* does not need a live agent sitting in a worktree: the question lives in `questions.json` and gets relayed from the orchestrator's pane (step 5), and if the worker has nothing left to do until that question is answered, its tab is pure cost. Close it and re-dispatch the issue later.

Before closing, check `git -C <worktree> status --short` and the unmerged-commit count exactly as above. **Uncommitted work in the worktree is the one thing that forbids teardown** — surface it and leave the tab alone. Never `rm -rf` over a dirty tree to reclaim a slot.

**Symptom you got it wrong:** `herdr tab list --workspace "$HERDR_WORKSPACE_ID"` shows more tabs than you have live workers. Reconcile it every wake — a tab with no live agent and no reason to exist is a slot the frontier is waiting on.

Observed: three panes sat open across most of a run — one holding a worker with nothing left to do, waiting on a decision that lived in the root pane. The frontier had ready issues and nowhere to put them.

### 8. Recompute and re-dispatch

Landing a branch closes an issue, which may clear the last blocker on others. Rebuild the frontier (step 1), and fan out into the slot the closed tab just freed (steps 2–3). The freed slot is what paces the swarm.

**The loop ends when** the frontier is empty and no worker is live. Report what landed, what escalated, and what remains blocked and on what.

## Worker rules the brief must carry

These are properties of the swarm, not of any one worker — [BRIEF.md](BRIEF.md) states them in full.

- **One `/implement <n>` per worker. Never `/iterate`.** `/iterate` halts unless it is on the default branch, and git refuses a second checkout of it (`fatal: 'main' is already used by worktree at …`), so it cannot run in a worktree at all.
- **Workers never land.** Same constraint: `wrap-up`'s landing does `git checkout main`, which fails in a worktree. They commit and push their own branch; the orchestrator lands.
- **No repo-wide formatters.** One worker reformatting the workspace makes every sibling branch conflict on formatting alone. Format only what you touched.
