---
name: orchestrate
description: "Fan out a swarm of coding agents — one git worktree and one /implement pass per issue — then verify, land, retire, and re-dispatch as the dependency frontier advances. Workers run either as herdr tabs (watchable, answerable live, cross-vendor) or as Claude subagents (anywhere, no herdr needed). Covers starting, checking on, and disbanding a swarm; one item is /implement, sequential items in one terminal is /iterate."
---

# /orchestrate — fan work out to a swarm, land it, retire it

You **fan out** ready issues to a **swarm** of agents, each in its own git worktree, then bring their work back: verify, land, retire the worker, recompute what is now ready, dispatch again. The loop is the skill. Fanning out is the easy half; retiring workers and advancing the frontier is the half that makes it unattended.

**The human is interrupted for exactly two things: a `blocked` worker, and a worker that stopped without a passing verdict.** Everything else retires and re-dispatches itself. Every rule below serves that.

## Transports

The work being fanned out is decision-laden — a worker will hit a design call only the human can make, so **a worker must be answerable**. Two transports satisfy that, and they give up different things.

| | **herdr** | **subagent** |
|---|---|---|
| Worker runs in | its own herdr tab, a real `claude`/`codex` process | an `Agent` call in this session |
| Watchable | yes — switch to its tab and read it live | **no** — nothing to look at until it reports |
| Answerable | live, mid-run: `herdr agent prompt` into a parked worker | turn-shaped: the worker ends its turn to ask, `SendMessage` resumes it from its transcript |
| Cross-vendor | yes — any kind in herdr's `--kind` enum | no — Claude only |
| Wake signal | a `Monitor` you arm and must keep alive | the harness's own task notification |
| Survives a dead orchestrator | yes — tabs and agents outlive the session ([REATTACH.md](REATTACH.md)) | **no** — the agents are children of this session |

Neither is a fallback for the other. `Workflow` is not a transport at all: its agents cannot be answered mid-run, which is the one property this skill will not trade.

### Choosing

**Only offer what the environment actually has.**

- `HERDR_ENV=1` → both are available. State the trade in one line each and let the human pick before the first dispatch.
- Otherwise → **subagent, no question asked**. Do not offer herdr, do not print a menu with one option, do not stop.

Say which transport is running in the first status line and in the final report. The failure to avoid is not "picked the wrong one" — it is a run that quietly *became* the other one, so the human tabs over looking for workers that were never terminals, or waits on a Monitor that was never armed.

### The transport is five verbs

Everything below is written against these. The mechanics live in the transport file; the policy stays here.

| Verb | herdr | subagent |
|---|---|---|
| `dispatch(issue)` → handle | `tab create` + `agent start` + brief | `Agent(prompt, model, description)` |
| `wake()` → handles + status | `Monitor` polling `herdr agent list` | task notification per agent |
| `read(handle)` → what it needs | `herdr pane read <pane> --lines 60` | the agent's `SendMessage` to `main`, or its final report |
| `answer(handle, text)` | `herdr agent prompt` + `send-keys enter` | `SendMessage(to: <name-or-agentId>, ...)` |
| `retire(handle)` | worktree/branch teardown + `herdr tab close` | worktree/branch teardown; nothing to close |

- **herdr** → [TRANSPORT-HERDR.md](TRANSPORT-HERDR.md)
- **subagent** → [TRANSPORT-SUBAGENT.md](TRANSPORT-SUBAGENT.md)

Both transports use the **same worktrees** (`git worktree add -b <branch>`, created by this skill, never by the transport), the **same verdict files**, the **same landing** (step 6), and the **same question queue** (step 5). Only the five verbs differ.

## Pre-flight

All must hold. Print the reason and stop otherwise.

1. **A transport is available and named** — see [Transports](#transports). `test "${HERDR_ENV:-}" = 1` no longer gates the skill; it decides which transports are on offer. What is still forbidden is degrading to **sequential in-session work** — doing the issues yourself, one after another, in this pane. That is `/iterate`, and running it under this name is the silent-different-skill failure.
2. **In the primary checkout, not a worktree** — `git rev-parse --git-dir` must not contain `/worktrees/`. Only the primary checkout can hold the default branch, and landing needs it.
3. **Clean tree on the default branch**, up to date with the remote.

## Worker agents and models

A worker is a coding agent of a chosen **kind** running a chosen **model**. Neither is inherited from the orchestrator's session — both are read from config and passed explicitly at dispatch, under **both** transports.

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
| Kind must appear in herdr's `agent start --kind` enum | refuse before dispatching, name the kind |
| The model is passed **explicitly**, always — `-- --model <id>` under herdr, `model:` under subagent | omitting it inherits a default (the machine's, or this session's) — that is exactly the path a denied model takes into the swarm |
| **Never Fable.** `fable`, `claude-fable-5`, or any id containing `fable` | refuse the dispatch, name the model, stop. Not a silent fall back to the default — stop, so the config gets fixed |
| Model absent from a non-empty `allowed`, or present in `denied` | refuse the dispatch and name both the model and the list that rejected it |

Both layers below this skill accept Fable happily: `claude --model` takes `fable` and `claude-fable-5` as ordinary aliases, and the `Agent` tool's `model` enum literally lists `fable`. This check is the only thing standing between the config and a Fable worker.

**Per transport:** the subagent transport can only dispatch a model in the `Agent` tool's enum (`sonnet`, `opus`, `haiku`) — a config model outside it stops the run rather than dispatching with no `model` at all. `[agents.codex]` and every other non-`claude` kind is inert there; kinds are a herdr concept.

### Kinds that are not dispatchable

**reasonix (DeepSeek)** — blocked, and not by preference. `herdr agent start --kind` takes a fixed enum — `pi, claude, codex, gemini, cursor, devin, agy, cline, omp, mastracode, opencode, copilot, kimi, kiro, droid, amp, grok, hermes, kilo, qodercli, maki` — and `reasonix` is not in it, nor does herdr ship a detection manifest for it. Started the only way left, `herdr pane run <pane> 'reasonix chat'`, it holds no agent name and reports no `agent_status`, so step 4's wake Monitor and step 5's classification table have nothing to read and the unattended loop is gone — which is the whole skill. **What would unblock it:** a herdr agent kind plus a detection manifest classifying `working`/`idle`/`blocked`. Until then reasonix is reachable through the `delegate` router (`/implement delegate`), never as a swarm worker.

## Branches

| You want | Go to |
|---|---|
| Start a swarm | the loop below |
| The mechanics of a transport | [TRANSPORT-HERDR.md](TRANSPORT-HERDR.md) · [TRANSPORT-SUBAGENT.md](TRANSPORT-SUBAGENT.md) |
| Adopt a swarm already running (this session did not start it) | [REATTACH.md](REATTACH.md) — herdr only |
| Stop everything and tear it all down | [DISBAND.md](DISBAND.md) |

**Check for an existing swarm before starting one.** `herdr agent list` naming live agents, or `git worktree list` showing worktrees, means a swarm exists — reattach instead of fanning out a second one on top of it. Worktrees left by a dead subagent swarm look identical to a live one's: check whether anything is actually running before assuming either.

## The loop

### 1. Build the frontier

The **frontier** is the open issues whose blockers are all closed. Only the frontier is ever dispatched.

Read dependencies per issue, in this order:

1. **Native** — `gh issue view <n> --json blockedBy --jq '.blockedBy.totalCount'`.
2. **Prose fallback** — a `Blocked by: #70, #72` line in the body.

**Absence is not permission.** If native reports zero blockers *and* the body carries a `Blocked by:` line, the two disagree — surface it and dispatch nothing. If neither source yields a graph and more than one candidate exists, make the human confirm the order before dispatching. Treating "no graph found" as "nothing is blocked" fans work out onto unbuilt foundations, which is the failure this skill exists to prevent.

**Ready is not workable.** A frontier issue carrying an unresolved decision (`Type: HITL`, missing acceptance criteria, "decide whether"/"TBD" language) will only block its worker mid-run — invoke the `iron-out` skill on the scope before dispatching, so ambiguity is cleared before the fan-out instead of answered one relayed question at a time during it.

**Completion criterion:** every candidate issue is classified ready or blocked, with the blocker named.

### 2. Size the swarm

**Four workers, hard cap** — both transports, regardless of screen size, tab count, machine, or frontier length. `max_workers` in the config may lower it and may never raise it.

The cap is not about pixels; a herdr worker owns a full tab and a subagent worker has no geometry at all. **It is about the human.** Worker questions are relayed and answered strictly one at a time (step 5), so a fifth live worker cannot get answered any sooner — it only lengthens the queue in front of the answer that unblocks the other four. A fifth ready issue waits for a slot, and the freed slot is what paces the swarm.

Topology, if the transport has any, is fixed by the transport file. Do not invent one.

#### Workers are out of sight — under both transports

A herdr worker is invisible until someone switches to its tab; a subagent worker has nothing to switch to. Either way the human is watching **this** pane and nothing else. **Every mechanism that surfaces a worker's state — the wake signal (step 4), the read on every wake (step 5), the question queue (step 5) — is the only way a worker is ever heard from.** Skipping one does not degrade the run; it silently strands a worker.

### 3. Fan out

Per ready issue, in order:

1. **Worktree** — `git -C <repo> worktree add -b <branch> ~/.worktrees/<repo>/<slug> <default-branch>`. **This skill creates it, never the transport** — that is why landing, verdict paths, and teardown are identical on both. Create it **now, not earlier**: a worktree is evidence an issue was ready, never a bet that it will be.
2. **Model check** — resolve kind and model against [Worker agents and models](#worker-agents-and-models) and refuse the dispatch if either fails. This runs before the transport is touched, so a denied model cannot reach either one.
3. **`dispatch(issue)`** — the transport file. Returns the **handle** you will use for every later verb.
4. **Brief** — [BRIEF.md](BRIEF.md), with its `<how-to-ask>` clause filled in by the transport.

Record `slug → issue → handle → worktree → branch` as you go. Step 7 needs the handle.

**Completion criterion:** every dispatched worker is confirmed working by the transport's own check — not by the dispatch call returning.

### 4. Arm the wake signal — `wake()`

The transport file says how. Two rules hold for both:

- **Every non-working state wakes you, not just success.** `blocked`, `unknown`, errored, exited — *silence is not success*. A worker wedged waiting on an answer must not look identical to one still working.
- **Add a long `/loop` heartbeat (1200–1800s)** as a backstop, whatever the transport's own signal is. It catches a dead Monitor, a notification that never fires, and a worker stuck in a state that never changes.

### 5. Classify each waking worker

The states are herdr's vocabulary; the subagent transport maps onto them — running → `working`, turn ended → `done`, a `SendMessage` asking something → `blocked`, an errored or vanished agent → `unknown`.

| State | Do |
|---|---|
| `working` | leave alone |
| `blocked` | escalate to the human; never auto-close |
| `done`/`idle`, verdict `PASS`/`SKIP` **and** `commit` == branch head | land it (step 6) |
| `done`/`idle`, verdict `PASS`/`SKIP` but `commit` **behind** the head | **stale** — escalate; the tip commits shipped unverified |
| `done`/`idle`, verdict `FAIL`/`BLOCKED`/missing | escalate — it stopped without finishing |
| `unknown` | escalate; it does not prove completion |

The verdict is a file, not the worker's own words: `<worktree>/tmp/claude/verify/<item>.json`, written by `/implement`'s Phase 1.5, at the same path under both transports. **A worker going quiet is liveness, not completion** — one that gave up, failed, or stopped to ask ends in the same idle state as one that finished. Never tear down on transport state alone, and never on a subagent's closing summary: a returned report is prose, the verdict is evidence.

**Check the verdict's `commit` against the branch head** (`git -C <worktree> rev-parse HEAD`) before trusting a `PASS`. A verdict describes one tree; commits made after it are unverified. Observed: a worker returned `PASS` at one commit, made one more, and the extra change landed on nothing but its own say-so.

#### `read(handle)` on EVERY wake. The verdict file alone will lie to you.

The verdict is written once and never updated. A worker that halted, got answered, resumed, and then stopped to ask something *new* still has its **original** verdict sitting on disk. Reading only the file, you will report "still blocked on the same thing" while a fresh, unasked question sits unread — indefinitely, because nothing else will ever surface it.

So on every wake, for every non-`working` worker: read the verdict file **and** `read(handle)`. The file tells you what to do with the branch; the read tells you what the worker needs from the human. They answer different questions and neither substitutes for the other.

Observed: a worker's `BLOCKED` verdict was re-reported to the human four times across ~40 minutes while its pane held a completely different question it had already moved on to — the human had answered the original in-pane and the orchestrator never noticed.

#### Surface every worker question here — in full, one at a time

A question a worker asks where it stands is invisible — in another tab, or inside a subagent's report nobody relayed. The human is watching **this** pane and nothing else. An unrelayed question blocks that worker forever, and the worker will not ask again.

**The queue is a file, not a memory.** `<repo>/tmp/claude/orchestrate/questions.json` in the primary checkout (absolute path from `git rev-parse --show-toplevel`). It survives the orchestrator being compacted or dying mid-run, which an in-context list does not — and a lost queue is a permanently stranded worker.

```json
[
  { "slug": "issue-71", "issue": 71,
    "handle": "w1:t3",
    "asked_at_commit": "a1b2c3d",
    "question": "<the worker's full question text>",
    "options": ["<option A + its concrete consequence>", "<option B + …>"],
    "recommendation": "<yours, with the file:line grounding the worker gave>",
    "status": "outstanding",
    "answer": null },
  { "slug": "issue-74", "issue": 74,
    "handle": "a7f3c1e2-...",
    "asked_at_commit": "e4f5g6h",
    "question": "<…>", "options": [], "recommendation": "<…>",
    "status": "queued", "answer": null }
]
```

`status` is one of `queued` → `outstanding` → `answered` → `resolved`. **At most one record is `outstanding` at any moment.**

On every wake, per non-`working` worker parked on a question:

1. **Append it as `queued`** — full text, options with their concrete consequences, the file:line grounding, your recommendation. Never the summary "worker N is blocked"; that is not answerable, and the human must not have to go find what was meant.
2. **If a record is already `outstanding`, stop there.** Say nothing further to the human. A second question printed now buries the first, and the first is the one already holding a worker still.
3. **Otherwise promote the head of the queue to `outstanding`** and relay it into this pane, in full.
4. **On the human's answer** — write it into `answer`, set `answered`, deliver it with `answer(handle, text)`, confirm the worker is working again, set `resolved`, then promote the next `queued` record and relay it. One answer, one unblocked worker, then the next question — never batched.

**A worker parked on an unrelayed question is an orchestrator bug, not a worker problem.** So is a `queued` record that never got promoted because nothing checked the queue after the last answer landed.

Re-read the worker before relaying a *re-*ask. A worker that was answered, resumed, and stopped again is asking something **new** — its old record is `resolved`, and what it is asking now is a new record with new text. Never re-relay a `resolved` record's text because the worker is idle again; that is the failure recorded above.

### 6. Land it

From the **primary checkout**, one worker at a time:

1. Fetch, then compare `git merge-base origin/main <branch>` against `origin/main`'s head.
2. **Unchanged** → the worker's verdict still describes this exact tree; merge and push.
3. **Moved** → another branch landed since this worker forked. Merge, then **re-run `verify` on the merged result** before pushing. Two branches can each pass alone and break together.
4. **Conflict** → abort the merge, leave the worktree and branch intact, escalate. Never force-resolve.

Close the issue with what shipped.

### 7. Retire the worker

Teardown is the orchestrator's job because it is **structurally impossible for the worker**: git refuses to delete a branch that a worktree still has checked out, and the worker is standing in it. Whatever created a resource retires it — this skill made the worktree and the branch, so this skill removes them, under both transports.

```bash
git -C <worktree> status --short          # must be empty
git log <default>..<branch>               # must be empty — fully merged
rm -rf <worktree> && git -C <repo> worktree prune \
  && git -C <repo> branch -d <branch> \
  && git -C <repo> push origin --delete <branch>
```

Then `retire(handle)` — the transport's own teardown, which is a `herdr tab close` on one and nothing at all on the other.

Mark any `questions.json` record for that slug `resolved` in the same breath. A `queued` question belonging to a retired worker will otherwise be relayed to the human and answered into a worker that no longer exists.

`git worktree remove` fails outright in a repo with submodules (`working trees containing submodules cannot be moved or removed`), which then cascades into `branch -d` failing — hence `rm -rf` plus `prune`. Chain with `&&`, never `;`: a `;`-chained success echo prints after a failed step and misreports teardown as done.

#### A worker that is done gets retired. Same wake, no exceptions.

**A live worker is a claim that it still has something to do.** Keep that claim true, every wake. Retire on **any** terminal outcome, not just a merge:

| Worker | Do |
|---|---|
| landed | retire |
| issue turned out already-done, wrong, or withdrawn | retire |
| branch you have decided never to land | retire |
| finished, but the *issue* still needs a human decision | **retire** — see below |
| stopped with commits and no passing verdict | keep, escalate |
| uncommitted changes in the worktree | **keep** — the one hard stop |

The fourth row is the one that gets fumbled. An unanswered question about *what to build* does not need a live worker sitting in a worktree: the question lives in `questions.json` and gets relayed from this pane (step 5), and if the worker has nothing left to do until it is answered, keeping it costs a slot for nothing. Retire it and re-dispatch the issue later.

Before retiring, check `git -C <worktree> status --short` and the unmerged-commit count exactly as above. **Uncommitted work in the worktree is the one thing that forbids teardown** — surface it and leave the worker alone. Never `rm -rf` over a dirty tree to reclaim a slot.

**Symptom you got it wrong:** more live workers than issues you can name a reason for. Reconcile every wake, against the transport's own listing — `herdr tab list --workspace "$HERDR_WORKSPACE_ID"` or the running-agent list. A worker with no reason to exist is a slot the frontier is waiting on.

Observed: three panes sat open across most of a run — one holding a worker with nothing left to do, waiting on a decision that lived in the root pane. The frontier had ready issues and nowhere to put them.

### 8. Recompute and re-dispatch

Landing a branch closes an issue, which may clear the last blocker on others. Rebuild the frontier (step 1), and fan out into the slot the retirement just freed (steps 2–3). The freed slot is what paces the swarm.

**The loop ends when** the frontier is empty and no worker is live. Report the transport used, what landed, what escalated, and what remains blocked and on what.

## Worker rules the brief must carry

These are properties of the swarm, not of any one worker — [BRIEF.md](BRIEF.md) states them in full.

- **One `/implement <n>` per worker. Never `/iterate`.** `/iterate` halts unless it is on the default branch, and git refuses a second checkout of it (`fatal: 'main' is already used by worktree at …`), so it cannot run in a worktree at all.
- **Workers never land.** Same constraint: `wrap-up`'s landing does `git checkout main`, which fails in a worktree. They commit and push their own branch; the orchestrator lands.
- **No repo-wide formatters.** One worker reformatting the workspace makes every sibling branch conflict on formatting alone. Format only what you touched.
