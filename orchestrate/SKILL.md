---
name: orchestrate
description: "Fan out a swarm of coding agents over an ironed-out backlog — one git worktree and one /implement pass per issue — then verify, land, retire, and re-dispatch as the dependency frontier advances. Workers never ask questions: anything needing a human decision is gated out before dispatch or filed and halted. Transport is picked by token — `orchestrate herdr|subagent|workflow` — or asked once when unnamed. Covers starting, checking on, and disbanding a swarm; one item is /implement, sequential items is /iterate."
---

# /orchestrate — fan work out to a swarm, land it, retire it

You **fan out** ready issues to a **swarm** of agents, each in its own git worktree, then bring their work back: verify, land, retire the worker, recompute what is now ready, dispatch again. The loop is the skill. Fanning out is the easy half; retiring workers and advancing the frontier is the half that makes it unattended.

## No worker ever asks the human anything

This is the load-bearing rule, and every other rule serves it.

**The human is involved at exactly two moments: the gate, before anything is dispatched, and the report, after the run.** In between, a swarm is unattended in the strong sense — there is no relay, no queue, no channel from a worker back to a person, and no way for one to exist.

This is not a behaviour orchestrate invents. **A worker is a `/implement` pass in continuous mode**, and continuous mode is already defined as never stopping for a prompt: a gate failure files a `needs human input: …` follow-up and halts the pass ([../implement/SKILL.md](../implement/SKILL.md), Phase 0.5). Orchestrate's whole contribution is to run many of those at once and to refuse to start when the backlog would make them halt.

The trade this makes, stated plainly: an issue that turns out to be ambiguous costs its whole dispatch, and waits for an `iron-out` pass before it can be tried again. In exchange nothing in the swarm is ever waiting on a person who has walked away — which is the entire point of a swarm.

**So the backlog must be workable before the run starts.** That is what the two gates in Pre-flight and step 3 are for. `orchestrate` does not discover ambiguity gracefully; it refuses to start on it.

## Transports

Three, differing in where a worker runs and what survives.

These are the same targets as [../delegate/TARGETS.md](../delegate/TARGETS.md) — `subagent` is that ladder's Claude agent, `herdr` is its herdr tab — with two differences that belong to swarms only: every worker gets a **git worktree**, and there is a fourth surface, `workflow`, which exists because a script can pace a whole round. Terminal.app is absent on purpose: a Terminal window holds no agent herdr can report a status for, so nothing here could read a worker's state.

| | **herdr** | **subagent** | **workflow** |
|---|---|---|---|
| Worker runs in | its own herdr tab, a real `claude`/`codex` process | an `Agent` call in this session | an `agent()` call inside a workflow script |
| Loop granularity | **per worker** — one finishes, you land and refill its slot | **per worker** | **per round** — the whole batch goes out, the script returns, you land the batch |
| Watchable | yes — switch to its tab and read it live | no | partly — `/workflows` shows each agent's progress and tokens |
| Cross-vendor | yes — any kind in herdr's `--kind` enum | no — Claude only | no — Claude only |
| Wake signal | a `Monitor` you arm and must keep alive | the harness's task notification, per agent | one notification when the whole round returns |
| Survives a dead orchestrator | yes ([REATTACH.md](REATTACH.md)) | no — the agents are children of this session | no — but the run is resumable in-session by `runId` |
| Concurrency | 4 | `min(16, cores - 2)` | the runtime's own cap, under the session's size guideline |

`Workflow`'s documented constraint — *no mid-run user input; only agent permission prompts can pause a run* — used to disqualify it. It costs nothing now that nothing asks.

### Choosing

**A transport named in the arguments wins, and no menu is printed.** The token `herdr`, `subagent`, or `workflow` anywhere in the arguments picks it — `orchestrate workflow`, `orchestrate label:api herdr`. Same convention as `implement delegate` and `iterate workflow`. This is how you A/B two transports over the same backlog without answering a prompt each run. Naming `herdr` outside herdr is an error, not a fallback: say so and stop.

With no token:

- `HERDR_ENV=1` → all three are available. State the trade in one line each and let the human pick before the first dispatch.
- Otherwise → **subagent or workflow**; do not offer herdr and do not stop.

The workflow transport calls the `Workflow` tool, which requires the human to have asked for it. **Naming it — by token or by picking it from the menu — is that request.** Do not reach for it under either other transport, and do not use `Workflow` for any other part of this skill.

Say which transport is running in the first status line and in the final report. The failure to avoid is not "picked the wrong one" — it is a run that quietly *became* another one, so the human waits on a `Monitor` that was never armed, or tabs over looking for workers that were never terminals.

### The transport is four verbs

Everything below is written against these. The mechanics live in the transport file; the policy stays here.

| Verb | herdr | subagent | workflow |
|---|---|---|---|
| `dispatch(…)` → handle | `tab create` + `agent start` + brief | `Agent(prompt, model, description)` | one `Workflow` call over the whole ready batch |
| `wake()` → handles + status | `Monitor` polling `herdr agent list` | task notification per agent | one notification when the round returns |
| `read(handle)` | `herdr pane read <pane> --lines 60` | the `Agent` tool result | the round's returned array |
| `retire(handle)` | worktree/branch teardown + `herdr tab close` | worktree/branch teardown | worktree/branch teardown |

**There is no fifth verb.** `answer(handle, text)` does not exist, on any transport, including the two that could technically support it. Do not add it back for "just this one case" — a swarm with one answerable worker is a swarm someone has to sit and watch.

- **herdr** → [TRANSPORT-HERDR.md](TRANSPORT-HERDR.md)
- **subagent** → [TRANSPORT-SUBAGENT.md](TRANSPORT-SUBAGENT.md)
- **workflow** → [TRANSPORT-WORKFLOW.md](TRANSPORT-WORKFLOW.md)

All three use the **same worktrees** (`git worktree add -b <branch>`, created by this skill, never by the transport), the **same verdict files**, and the **same landing** (step 6). Only the four verbs differ.

## Pre-flight

All must hold. Print the reason and stop otherwise.

1. **A transport is available and named** — see [Transports](#transports). What is forbidden is degrading to **sequential in-session work** — doing the issues yourself, one after another, in this pane. That is `/iterate`, and running it under this name is the silent-different-skill failure.
2. **In the primary checkout, not a worktree** — `git rev-parse --git-dir` must not contain `/worktrees/`. Only the primary checkout can hold the default branch, and landing needs it.
3. **Clean tree on the default branch**, up to date with the remote.
4. **The scope gate** — below. This one stops more runs than the other three combined, and it is supposed to.

### The scope gate — every issue in scope, before anything is dispatched

**The gate is `/implement`'s, not orchestrate's** — its Phase 0.5 AFK-ability self-assessment ([../implement/SKILL.md](../implement/SKILL.md)). Read it there; do not restate its tests here, and do not invent a second standard for what "workable" means. A worker will run that same gate against the same issue, so any standard orchestrate applied on top of it would just be a way for the two to disagree.

What orchestrate adds is **when it runs and what a failure costs**:

- **When:** up front, over **every issue in scope**, not just the frontier. An issue three blockers deep reaches the frontier mid-run, when there is no longer anyone to ask.
- **On failure:** the whole run stops. Do not dispatch the clean ones and leave the rest — list every failing issue with what it failed on, and hand the scope to `iron-out`. A backlog with an ambiguous issue in it is not a backlog this skill can work.

The `iron-out` skill exists for exactly this handoff and already runs implement's gate over a scope. Prefer invoking it over doing the gate pass by hand.

## Worker agents and models

A worker is a coding agent of a chosen **kind** running a chosen **model**. Neither is inherited from the orchestrator's session — both are read from config and passed explicitly at dispatch, on every transport.

**Config file:** `$CLAUDE_CONFIG_DIR/orchestrate.toml` — `~/.claude/orchestrate.toml`, or `~/.claude-work/orchestrate.toml` under the work profile, resolved by the variable so the two profiles differ without either being tracked. Untracked (`~/.claude/.gitignore` blanket-ignores `*`). Read once per run, at the first dispatch. Commented reference copy: [orchestrate.example.toml](orchestrate.example.toml)

```toml
max_workers = 4                  # may lower a transport's concurrency; may never raise it
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
| The model is passed **explicitly**, always — `-- --model <id>` under herdr, `model:` under subagent and workflow | omitting it inherits a default (the machine's, or this session's) — that is exactly the path a denied model takes into the swarm |
| **Never Fable.** `fable`, `claude-fable-5`, or any id containing `fable` | refuse the dispatch, name the model, stop. Not a silent fall back to the default — stop, so the config gets fixed |
| Model absent from a non-empty `allowed`, or present in `denied` | refuse the dispatch and name both the model and the list that rejected it |

Every layer below this skill accepts Fable happily: `claude --model` takes `fable` and `claude-fable-5` as ordinary aliases, and both the `Agent` tool's and `agent()`'s `model` enums list `fable`. This check is the only thing standing between the config and a Fable worker.

**Per transport:** subagent and workflow can only dispatch a model in their enum (`sonnet`, `opus`, `haiku`) — a config model outside it stops the run rather than dispatching with no model at all. `[agents.codex]` and every other non-`claude` kind is inert there; kinds are a herdr concept.

### Kinds that are not dispatchable

**reasonix (DeepSeek)** — blocked, and not by preference. `herdr agent start --kind` takes a fixed enum — `pi, claude, codex, gemini, cursor, devin, agy, cline, omp, mastracode, opencode, copilot, kimi, kiro, droid, amp, grok, hermes, kilo, qodercli, maki` — and `reasonix` is not in it, nor does herdr ship a detection manifest for it. Started the only way left, `herdr pane run <pane> 'reasonix chat'`, it holds no agent name and reports no `agent_status`, so step 4's wake signal and step 5's classification table have nothing to read and the unattended loop is gone — which is the whole skill. **What would unblock it:** a herdr agent kind plus a detection manifest classifying `working`/`idle`/`blocked`. Until then reasonix is reachable through the `delegate` router (`/implement delegate`), never as a swarm worker.

## Branches

| You want | Go to |
|---|---|
| Start a swarm | the loop below |
| The mechanics of a transport | [TRANSPORT-HERDR.md](TRANSPORT-HERDR.md) · [TRANSPORT-SUBAGENT.md](TRANSPORT-SUBAGENT.md) · [TRANSPORT-WORKFLOW.md](TRANSPORT-WORKFLOW.md) |
| Adopt a swarm already running (this session did not start it) | [REATTACH.md](REATTACH.md) — herdr only |
| Stop everything and tear it all down | [DISBAND.md](DISBAND.md) |

**Check for an existing swarm before starting one.** `herdr agent list` naming live agents, or `git worktree list` showing worktrees, means a swarm exists — reattach instead of fanning out a second one on top of it. Worktrees left by a dead subagent or workflow swarm look identical to a live one's: check whether anything is actually running before assuming either.

## The loop

### 1. Build the frontier

The **frontier** is the open issues whose blockers are all closed. Only the frontier is ever dispatched.

Read dependencies per issue, in this order:

1. **Native** — `gh issue view <n> --json blockedBy --jq '.blockedBy.totalCount'`.
2. **Prose fallback** — a `Blocked by: #70, #72` line in the body.

**Absence is not permission.** If native reports zero blockers *and* the body carries a `Blocked by:` line, the two disagree — surface it and dispatch nothing. If neither source yields a graph and more than one candidate exists, make the human confirm the order before dispatching. Treating "no graph found" as "nothing is blocked" fans work out onto unbuilt foundations, which is the failure this skill exists to prevent.

**Completion criterion:** every candidate issue is classified ready or blocked, with the blocker named.

### 2. Size the swarm

Dispatch `min(frontier size, max_workers, the transport's concurrency)`.

| Transport | Concurrency | Why that number |
|---|---|---|
| herdr | **4, hard** | a tab you may want to watch has to stay worth watching, and four tabs is what one screen's worth of switching can follow |
| subagent | `min(16, cores - 2)` | the harness's own cap; nothing is watching, so nothing else constrains it |
| workflow | the runtime's cap, under the session's size guideline | the script paces itself; `pipeline()` keeps items flowing as slots free |

`max_workers` in the config lowers any of these and raises none.

**Beyond the transport, the real constraint is merge surface.** Every concurrent branch is a potential conflict and a re-verify against a moved base (step 6). Landing N branches can cost up to N−1 re-verifies. If a run is spending more time re-verifying than implementing, lower `max_workers` — that is what it is for.

Topology, if the transport has any, is fixed by the transport file. Do not invent one.

#### Nothing is watching the workers

A herdr worker is invisible until someone switches to its tab; a subagent or workflow worker has nothing to switch to. The human is watching **this** pane and nothing else, and no worker can call for attention. **The wake signal (step 4) and the read on every wake (step 5) are the only way a worker is ever heard from.** Skipping one does not degrade the run; it silently strands a worker.

### 3. Fan out

Per ready issue, in order:

1. **Dispatch gate** — implement's gate again, on this issue's current body. It should pass; the scope gate already cleared it. If it fails now, do what a continuous `/implement` pass does with a gate failure — file the `needs human input: …` follow-up — then **skip the issue and keep going**. A single late failure does not stop a run already underway. Name every skipped issue in the report; a non-empty list means the scope gate missed something.
2. **Worktree** — `git -C <repo> worktree add -b <branch> ~/.worktrees/<repo>/<slug> <default-branch>`. **This skill creates it, never the transport** — that is why landing, verdict paths, and teardown are identical on all three. Create it **now, not earlier**: a worktree is evidence an issue was ready, never a bet that it will be.
3. **Model check** — resolve kind and model against [Worker agents and models](#worker-agents-and-models) and refuse the dispatch if either fails. This runs before the transport is touched, so a denied model cannot reach any of them.
4. **`dispatch(…)`** — the transport file. Returns the **handle** you will use for every later verb. The workflow transport dispatches the whole batch in one call rather than per issue; its file says how.
5. **Brief** — [BRIEF.md](BRIEF.md).

Record `slug → issue → handle → worktree → branch` as you go. Step 7 needs the handle.

**Naming `<slug>` and `<branch>`.** Both come from the issue title, same rules (the branch is `<slug>`; prefix it per the repo's convention if it has one). Adapted from jnsahaj/skills `ga`.

- Lowercase kebab-case, **3–4 words maximum**. These names appear in worktree paths, tmux session names, and PR lists — long ones are unreadable everywhere they show up.
- Prefix `fix-` when the issue is a bug. Nothing else gets a prefix.
- Abbreviate aggressively: `btn auth cfg nav perf err msg req res fmt val tmpl env deps`.

| Issue title | Slug |
|---|---|
| "the login button doesn't work on mobile" | `fix-mobile-login-btn` |
| "add a dark mode toggle to settings" | `dark-mode-toggle` |
| "search results are slow when filtering by date" | `fix-search-date-perf` |
| "implement rate limiting on the API" | `api-rate-limit` |
| "add webhook support for deployments" | `deploy-webhooks` |

Slugs must be unique within a run — on a collision, append the issue number rather than lengthening the name.

**Completion criterion:** every dispatched worker is confirmed working by the transport's own check — not by the dispatch call returning.

### 4. Arm the wake signal — `wake()`

The transport file says how. Two rules hold for all three:

- **Every non-working state wakes you, not just success.** `blocked`, `unknown`, errored, exited — *silence is not success*. A worker that gave up must not look identical to one still working.
- **Add a long `/loop` heartbeat (1200–1800s)** as a backstop, whatever the transport's own signal is. It catches a dead Monitor, a notification that never fires, and a worker stuck in a state that never changes.

### 5. Classify each waking worker

The states are herdr's vocabulary; the others map onto them — running → `working`, finished → `done`, errored or vanished → `unknown`. Nothing maps to `blocked` except a worker herdr caught sitting on an approval prompt, since no worker asks anything.

| State | Do |
|---|---|
| `working` | leave alone |
| `done`/`idle`, verdict `PASS`/`SKIP` **and** `commit` == branch head | land it (step 6) |
| `done`/`idle`, verdict `PASS`/`SKIP` but `commit` **behind** the head | **stale** — escalate; the tip commits shipped unverified |
| `done`/`idle`, verdict `FAIL`/`BLOCKED`/missing | report it, retire it, leave the issue open |
| `blocked` (herdr: an approval prompt) | escalate to the human; never auto-approve |
| `unknown` | report it, retire it; it does not prove completion |

The verdict is a file, not the worker's own words: `<worktree>/tmp/claude/verify/<item>.json`. **`/implement`'s Phase 1.5 owns that file** — its schema, when it is written, and what each verdict means. Orchestrate is only its reader; do not re-specify it here.

**A worker going quiet is liveness, not completion** — one that gave up, failed, or filed-and-halted ends in the same idle state as one that finished. Never tear down on transport state alone, and never on a worker's closing summary: a returned report is prose, the verdict is evidence.

**Check the verdict's `commit` against the branch head** (`git -C <worktree> rev-parse HEAD`) before trusting a `PASS`. implement already forbids handing forward a verdict whose `commit` is behind the head; this is orchestrate checking that it held, because orchestrate is the one that ships the result. Observed: a worker returned `PASS` at one commit, made one more, and the extra change landed on nothing but its own say-so.

#### `read(handle)` on EVERY wake

The verdict tells you what to do with the branch. The read tells you *why* the worker stopped — which follow-up it filed, which check failed, whether it ran at all. Both go in the report; neither substitutes for the other, and a `BLOCKED` verdict with no read behind it is an escalation nobody can act on.

**A worker that stopped is finished, whatever it stopped for.** There is nothing to unblock and nobody to relay to. Read it, record it, retire it (step 7), and let the issue stay open for the next `iron-out` pass.

### 6. Land it

From the **primary checkout**, one worker at a time:

1. Fetch, then compare `git merge-base origin/main <branch>` against `origin/main`'s head.
2. **Unchanged** → the worker's verdict still describes this exact tree; merge and push.
3. **Moved** → another branch landed since this worker forked. Merge, then **re-run `verify` on the merged result** before pushing. Two branches can each pass alone and break together.
4. **Conflict** → abort the merge, leave the worktree and branch intact, escalate. Never force-resolve.

Close the issue with what shipped.

### 7. Retire the worker

Teardown is the orchestrator's job because it is **structurally impossible for the worker**: git refuses to delete a branch that a worktree still has checked out, and the worker is standing in it. Whatever created a resource retires it — this skill made the worktree and the branch, so this skill removes them, on every transport.

```bash
git -C <worktree> status --short          # must be empty
git log <default>..<branch>               # must be empty — fully merged
rm -rf <worktree> && git -C <repo> worktree prune \
  && git -C <repo> branch -d <branch> \
  && git -C <repo> push origin --delete <branch>
```

Then `retire(handle)` — the transport's own teardown, which is a `herdr tab close` on one and nothing at all on the other two.

`git worktree remove` fails outright in a repo with submodules (`working trees containing submodules cannot be moved or removed`), which then cascades into `branch -d` failing — hence `rm -rf` plus `prune`. Chain with `&&`, never `;`: a `;`-chained success echo prints after a failed step and misreports teardown as done.

#### A worker that is done gets retired. Same wake, no exceptions.

**A live worker is a claim that it still has something to do.** Keep that claim true, every wake. Retire on **any** terminal outcome, not just a merge:

| Worker | Do |
|---|---|
| landed | retire |
| issue turned out already-done, wrong, or withdrawn | retire |
| branch you have decided never to land | retire |
| filed a `needs human input` follow-up and halted | **retire** — there is nothing to wait for |
| stopped with commits and no passing verdict | keep, escalate |
| uncommitted changes in the worktree | **keep** — the one hard stop |

Before retiring, check `git -C <worktree> status --short` and the unmerged-commit count exactly as above. **Uncommitted work in the worktree is the one thing that forbids teardown** — surface it and leave the worker alone. Never `rm -rf` over a dirty tree to reclaim a slot.

**Symptom you got it wrong:** more live workers than issues you can name a reason for. Reconcile every wake, against the transport's own listing — `herdr tab list --workspace "$HERDR_WORKSPACE_ID"` or the running-agent list. A worker with no reason to exist is a slot the frontier is waiting on.

Observed: three panes sat open across most of a run — one holding a worker with nothing left to do, waiting on a decision. The frontier had ready issues and nowhere to put them.

### 8. Recompute and re-dispatch

Landing a branch closes an issue, which may clear the last blocker on others. Rebuild the frontier (step 1) and fan out into the freed capacity (steps 2–3).

- **herdr and subagent** — capacity frees one worker at a time, and that is what paces the swarm.
- **workflow** — capacity frees a whole round at a time. Land every branch the round returned, retire them all, then dispatch the next round. Do not start a second workflow while one is running.

**The loop ends when** the frontier is empty and no worker is live.

### The report

The only other moment the human is involved. Name all of it:

- **Transport** used, and the concurrency it ran at.
- **Landed** — issue, branch, merge commit.
- **Skipped at the dispatch gate** — issue, which test failed, the follow-up filed. If this list is non-empty, the scope gate missed something; say so.
- **Stopped without a verdict** — issue, what the read showed, the follow-up filed.
- **Escalated** — conflicts, stale verdicts, dirty worktrees left standing.
- **Still blocked** — issue and the blocker it is waiting on.

## Worker rules the brief must carry

These are properties of the swarm, not of any one worker — [BRIEF.md](BRIEF.md) states them in full.

- **Never ask.** No worker has a channel to a human. An unresolved decision is a filed follow-up and a halt, never a question and never a guess.
- **One `/implement <n> continuous` per worker. Never `/iterate`.** `continuous` is what makes a worker file-and-halt instead of prompting. `/iterate` halts unless it is on the default branch, and git refuses a second checkout of it (`fatal: 'main' is already used by worktree at …`), so it cannot run in a worktree at all.
- **Workers never land.** Same constraint: `wrap-up`'s landing does `git checkout main`, which fails in a worktree. They commit and push their own branch; the orchestrator lands.
- **No repo-wide formatters.** One worker reformatting the workspace makes every sibling branch conflict on formatting alone. Format only what you touched.
