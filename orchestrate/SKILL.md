---
name: orchestrate
description: "Fan out a swarm of coding agents over an ironed-out backlog — one git worktree and one /implement pass per issue — then verify, land, retire, and re-dispatch as the dependency frontier advances. Workers never ask questions: anything needing a human decision is gated out before dispatch or filed and halted. Every worker is a staged `/implement` workflow in its own git worktree. Covers starting, checking on, and disbanding a swarm; one item is /implement, sequential items is /iterate."
---

# /orchestrate — fan work out to a swarm, land it, retire it

You **fan out** ready issues to a **swarm** of agents, each in its own git worktree, then bring their work back: verify, land, retire the worker, recompute what is now ready, dispatch again. The loop is the skill. Fanning out is the easy half; retiring workers and advancing the frontier is the half that makes it unattended.

## No worker ever asks the human anything

This is the load-bearing rule, and every other rule serves it.

**The human is involved at exactly two moments: the gate, before anything is dispatched, and the report, after the run.** In between, a swarm is unattended in the strong sense — there is no relay, no queue, no channel from a worker back to a person, and no way for one to exist.

This is not a behaviour orchestrate invents. **A worker is a `/implement` pass in continuous mode**, and continuous mode is already defined as never stopping for a prompt: a gate failure files a `needs human input: …` follow-up and halts the pass ([../implement/SKILL.md](../implement/SKILL.md), Phase 0.5). Orchestrate's whole contribution is to run many of those at once and to refuse to start when the backlog would make them halt.

The trade this makes, stated plainly: an issue that turns out to be ambiguous costs its whole dispatch, and waits for an `iron-out` pass before it can be tried again. In exchange nothing in the swarm is ever waiting on a person who has walked away — which is the entire point of a swarm.

**So the backlog must be workable before the run starts.** That is what the two gates in Pre-flight and step 3 are for. `orchestrate` does not discover ambiguity gracefully; it refuses to start on it.

## Transport — one, and it is workflow

**Every worker is `workflow('implement', { … })` inside a workflow script.** There is no transport menu, no transport token, and no default to pick. Invoking `/orchestrate` is the request that authorizes the `Workflow` tool.

→ [TRANSPORT-WORKFLOW.md](TRANSPORT-WORKFLOW.md)

Every worker still gets its own **git worktree**, created by this skill before the round launches — the script itself has no filesystem access.

### Why the other two are gone

They were not equivalent options that got trimmed for tidiness. A worker dispatched as a single `Agent` call — which is what both the subagent and herdr transports did — runs all six implement phases in **one context that grows all pass**. Measured across 24h of session logs: 40 such workers averaged ~300 turns, peaked between 243k and 406k context, and together were **37% of all token spend**.

Only the workflow transport can call `workflow('implement')`, which is what splits a pass into per-phase contexts. So the old claim that *"neither changes what the workers themselves spend — N issues is N `/implement` passes on any transport"* stopped being true. The transports were not peers; two of them were the expensive shape.

### What was lost with them, stated plainly

- **Live watching.** herdr let you switch to a worker's tab and read it. `/workflows` gives per-agent progress, tokens, and a stop control instead — a summary, not a transcript.
- **Cross-vendor workers.** herdr could dispatch `codex` and other kinds. Workflow is Claude-only.
- **Surviving a dead orchestrator.** herdr workers outlived the session and could be reattached. A workflow run dies with this session; it is resumable in-session by its `runId`, which covers a stopped or partially failed round but **not** a crashed orchestrator.

That last one is a real capability that no longer exists anywhere in this skill. If a long unattended swarm needs to survive the orchestrator dying, that is a reason to reopen this decision — not something the workflow transport quietly handles.

### The constraint that shapes everything below

**The unit is a round, not a worker.** The whole batch goes out, the script returns, you land the batch, then you dispatch the next. The frontier sits still until the slowest item in a round finishes. Keep rounds small enough that one bad brief does not burn the whole frontier.

`Workflow`'s documented limit — *no mid-run user input; only agent permission prompts can pause a run* — is why a round is the unit: the sign-off between rounds is the landing step.

### The transport is four verbs

Everything below is written against these. The mechanics live in the transport file; the policy stays here.

| Verb | herdr | subagent | workflow |
|---|---|---|---|
| `dispatch(…)` → handle | `tab create` + `agent start` + brief | `Agent(prompt, model, description)` | one `Workflow` call over the whole ready batch |
| `wake()` → handles + status | `Monitor` polling `herdr agent list` | task notification per agent | one notification when the round returns |
| `read(handle)` | `herdr pane read <pane> --lines 60` | the `Agent` tool result | the round's returned array |
| `retire(handle)` | worktree/branch teardown + `herdr tab close` | `TaskStop` + worktree/branch teardown | `TaskStop` + worktree/branch teardown |

**There is no fifth verb.** `answer(handle, text)` does not exist, on any transport, including the two that could technically support it. Do not add it back for "just this one case" — a swarm with one answerable worker is a swarm someone has to sit and watch.

→ [TRANSPORT-WORKFLOW.md](TRANSPORT-WORKFLOW.md)

Worktrees (`git worktree add -b <branch>`) are created by this skill, never by the transport; verdict files and landing (step 6) are unchanged.

## Pre-flight

All must hold. Print the reason and stop otherwise.

1. **The `Workflow` tool is available** — see [Transport](#transport--one-and-it-is-workflow). What is forbidden is degrading to **sequential in-session work** — doing the issues yourself, one after another, in this pane. That is `/iterate`, and running it under this name is the silent-different-skill failure.
2. **In the primary checkout, not a worktree** — `git rev-parse --git-dir` must not contain `/worktrees/`. Only the primary checkout can hold the default branch, and landing needs it. **Run the command; do not eyeball the path** — a worktree parked next to the repo (`<repo>-<slug>/`) reads like a clone.

   This is also what keeps a round silent. `~/.claude/hooks/cross-worktree-write-guard.sh` asks before a session writes into a different worktree of the same repo, and exempts exactly one direction: primary checkout → linked worktree. Workflow-transport workers inherit the orchestrator's `CLAUDE_PROJECT_DIR`, so **every worker write is judged against wherever this session is standing.** From the primary checkout they all pass. From a worktree they all ask — one prompt per file, per worker, for the whole round, with no permission rule that silences it. Observed 2026-08-15: a round dispatched from `test-foresight-home-screen` prompted on every edit and had to be killed mid-flight.

   If the check fails, `cd` to the primary checkout and start there. Do not disable the hook, and do not relocate the worker worktrees — the trigger is same-repo-different-worktree, so moving them changes nothing.
3. **Clean tree on the default branch**, up to date with the remote.
4. **On a beads repo, tracker writes are single-writer.** All worktrees share the main repository's one `.beads` workspace, and beads' default embedded Dolt engine serves one writer at a time — N workers each running `bd update --claim` or `bd close` will contend, and a loser gets an error, not a queue. So: **workers never write to beads.** They report their verdict file as always; this orchestrator does every claim, comment, and close from the primary checkout at steps 5–7, where the writes are already serialised. If the repo has run `bd init --server`, concurrent writes are safe and this restriction lifts — check with `bd where --json`: a `database_path` ending in `embeddeddolt` is embedded (single writer), one ending in `dolt` is server mode. Say which mode you found.
5. **The scope gate** — below. This one stops more runs than the other three combined, and it is supposed to.

### The scope gate — every issue in scope, before anything is dispatched

**The gate is `/implement`'s, not orchestrate's** — its Phase 0.5 AFK-ability self-assessment ([../implement/SKILL.md](../implement/SKILL.md)). Read it there; do not restate its tests here, and do not invent a second standard for what "workable" means. A worker will run that same gate against the same issue, so any standard orchestrate applied on top of it would just be a way for the two to disagree.

What orchestrate adds is **when it runs and what a failure costs**:

- **When:** up front, over **every issue in scope**, not just the frontier. An issue three blockers deep reaches the frontier mid-run, when there is no longer anyone to ask.
- **On failure:** the whole run stops. Do not dispatch the clean ones and leave the rest — list every failing issue with what it failed on, and hand the scope to `iron-out`. A backlog with an ambiguous issue in it is not a backlog this skill can work.

The `iron-out` skill exists for exactly this handoff and already runs implement's gate over a scope. Prefer invoking it over doing the gate pass by hand.

## Worker agents and models

A worker is a coding agent of a chosen **kind** running a chosen **model**. Neither is inherited from the orchestrator's session — the kind and the two candidate models come from config, and the model is passed explicitly at dispatch, on every transport.

**Only two models ever run a worker: `sonnet` and `haiku`.** Never Opus, never Fable — see [Never Opus, never Fable](#never-opus-never-fable). Which of the two an issue gets is decided per issue, at dispatch, by [Picking the model per issue](#picking-the-model-per-issue).

**Config file:** `$CLAUDE_CONFIG_DIR/orchestrate.toml` — `~/.claude/orchestrate.toml`, or `~/.claude-work/orchestrate.toml` under the work profile, resolved by the variable so the two profiles differ without either being tracked. Untracked (`~/.claude/.gitignore` blanket-ignores `*`). Read once per run, at the first dispatch. Commented reference copy: [orchestrate.example.toml](orchestrate.example.toml)

```toml
max_workers = 4                  # may lower a transport's concurrency; may never raise it
default     = "claude"           # kind used when the dispatch does not name one

[agents.claude]                  # table key IS the herdr `agent start --kind` value
model        = "sonnet"          # the harder tier, and the default when unsure
model_simple = "haiku"           # the cheaper tier, for narrow well-specified work
allowed      = ["sonnet", "haiku"]
denied       = ["opus", "fable", "claude-fable-5"]

[agents.codex]
model   = ""                     # empty -> no --model flag; codex picks its own default
allowed = []                     # empty -> no allowlist; only `denied` applies
denied  = []
```

A kind is dispatchable **only** if it has an `[agents.<kind>]` block. Deleting a block disables that kind; there is no second place that also has to agree.

A `model_simple` missing from a block means that kind has one tier: every issue on it gets `model`.

**Missing file** → dispatch `claude` with `sonnet`/`haiku` as the two tiers, pick per issue as below, and say in the run report that no config was found. **Malformed file** → stop; do not fall back. A config that cannot be parsed is not a config that permits anything.

### Sonnet and Haiku are the only worker models

Orchestrated work is dispatched away-from-keyboard against a written brief. The worker is not deciding what to build — it is following a spec that survived the readiness gate, in an isolated worktree, with its output verified before it lands. That is Sonnet's job, and for the narrowest issues it is Haiku's. Neither tier is chosen to save money; they are chosen because execution against a settled spec is what they are for, and running a whole swarm on the expensive model buys judgment the brief already supplied.

### Picking the model per issue

Decided **per issue, at dispatch** — step 3's model check — from the issue body and the brief you are about to write, not from the run as a whole. A swarm normally runs a mix.

| Give the issue `model_simple` (haiku) when **all** of these hold | Give it `model` (sonnet) when **any** of these hold |
|---|---|
| The issue names the wrong behaviour concretely — an input, the output it produced, the output it should have produced | The issue states a goal rather than a change ("make search feel faster", "add offline support") |
| The cause is already located, or locating it is one grep — a named file, function, constant, or config key | The cause is unknown, or the issue is a symptom with no named source |
| The change is confined to one or two files and does not add a new module, surface, or interface | The change adds a new feature surface, a new module, or a new public interface |
| Nothing about the shape of the fix is open — a bounds check, an off-by-one, a wrong operator, a missing field, a string, a version bump, a mechanical rename, a test added to an existing suite | The shape of the fix is open: a refactor whose structure is not settled, a design decision inside the implementation, cross-cutting edits across three or more files |
| Verification is an existing command that already exists and passes today | Verification needs new scaffolding, a new test harness, or driving a UI |

**When the two columns disagree, or you are unsure, use `model`.** The cost of a wrong Sonnet is a slightly more expensive worker; the cost of a wrong Haiku is a worktree of plausible wrong code that step 5 has to catch and step 3 has to re-dispatch.

**A failed Haiku issue is re-dispatched on `model`, once, and the report says so.** A failed Sonnet issue is *not* escalated — there is nowhere above Sonnet to go here. Twice-failed work is not a model problem: file the follow-up and hand the issue to `iron-out`.

Say the per-issue split in the run report — `slug → model`, or a count per tier when the swarm is large.

### The guardrails live in the file *and* here

The file is the readable statement of policy. These checks run at dispatch regardless of what the file says, so an edited, emptied, or deleted file cannot widen what the swarm may run.

| Rule | What the orchestrator does |
|---|---|
| Kind must appear in herdr's `agent start --kind` enum | refuse before dispatching, name the kind |
| The model is passed **explicitly**, always — `-- --model <id>` under herdr, `model:` under subagent and workflow | omitting it inherits a default (the machine's, or this session's) — that is exactly the path a denied model takes into the swarm |
| **A `claude` worker runs `sonnet` or `haiku`, and nothing else** | any other id — refuse the dispatch, name the model, stop |
| **Never Opus.** `opus`, `claude-opus-5`, `claude-opus-5[1m]`, or any id containing `opus` | refuse the dispatch, name the model, stop. This holds even when the orchestrator itself is running on Opus — the session's model is never inherited |
| **Never Fable.** `fable`, `claude-fable-5`, or any id containing `fable` | refuse the dispatch, name the model, stop. Not a silent fall back to the default — stop, so the config gets fixed |
| Model absent from a non-empty `allowed`, or present in `denied` | refuse the dispatch and name both the model and the list that rejected it |

#### Never Opus, never Fable

Every layer below this skill accepts both happily: `claude --model` takes `opus`, `fable`, and `claude-fable-5` as ordinary aliases, and both the `Agent` tool's and `agent()`'s `model` enums list `opus` and `fable`. This check is the only thing standing between the config and an Opus or Fable worker.

Refusal is by substring, not by exact match — `opus` and `fable` appearing anywhere in the id (`claude-opus-5`, `us.anthropic.claude-opus-…`, `claude-fable-5`) is enough. And it is a **stop**, never a quiet downgrade to `sonnet`: a config asking for a banned model is a config to fix, and silently substituting hides it.

**Per transport:** subagent and workflow can only dispatch a model in their enum (`sonnet`, `opus`, `haiku`, `fable`) — of which this skill permits exactly `sonnet` and `haiku`; a config model outside those two stops the run rather than dispatching with no model at all. `[agents.codex]` and every other non-`claude` kind is inert there; kinds are a herdr concept.

### Kinds that are not dispatchable

**reasonix (DeepSeek)** — blocked, and not by preference. `herdr agent start --kind` takes a fixed enum — `pi, claude, codex, gemini, cursor, devin, agy, cline, omp, mastracode, opencode, copilot, kimi, kiro, droid, amp, grok, hermes, kilo, qodercli, maki` — and `reasonix` is not in it, nor does herdr ship a detection manifest for it. Started the only way left, `herdr pane run <pane> 'reasonix chat'`, it holds no agent name and reports no `agent_status`, so step 4's wake signal and step 5's classification table have nothing to read and the unattended loop is gone — which is the whole skill. **What would unblock it:** a herdr agent kind plus a detection manifest classifying `working`/`idle`/`blocked`. Until then reasonix is reachable through the `delegate` router (`/implement delegate`), never as a swarm worker.

## Branches

| You want | Go to |
|---|---|
| Start a swarm | the loop below |
| The mechanics of the transport | [TRANSPORT-WORKFLOW.md](TRANSPORT-WORKFLOW.md) |
| Stop everything and tear it all down | [DISBAND.md](DISBAND.md) |

**Check for an existing swarm before starting one.** `herdr agent list` naming live agents, or `git worktree list` showing worktrees, means a swarm exists — reattach instead of fanning out a second one on top of it. Worktrees left by a dead subagent or workflow swarm look identical to a live one's: check whether anything is actually running before assuming either.

## The loop

### 1. Build the frontier

The **frontier** is the open issues whose blockers are all closed. Only the frontier is ever dispatched.

Resolve the issue backend via [`../_tracker/_detect.md`](../_tracker/_detect.md), then read dependencies per issue, in this order:

1. **Native** — on beads, `bd ready --json` *is* the frontier, already computed (`bd ready --explain --json` names each blocker for the report); on GitHub, `gh issue view <n> --json blockedBy --jq '.blockedBy.totalCount'`.
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

#### A worktree isolates source and nothing else

A worktree gives each worker its own checkout. It gives them nothing else. Everything downstream of the build is still one shared thing: the device the app installs onto, the bundle id it installs under, the container that bundle id owns, the simulator's pasteboard and keychain, a local database or dev server on a fixed port.

So two workers verifying at the same time can each be looking at the other's build. The symptoms do not read as a collision — a worker reports its own new button missing, or a timed observation comes out wrong, and both look like a bug in the change under test. **Suspect the shared device before the diff whenever a worker reports its own change absent.**

**The rule, on every platform:** ask "what does the verification touch that the worktree does not cover" — a device, an emulator, a browser profile, a dev server port, a local database, a Docker container name. Whatever the answer names, give each worker its own, **pin every command to that specific one by id rather than by name**, and retire it in step 7 alongside the worktree. A name resolves to whichever instance answers to it; an id does not. The answer to that question is rarely nothing.

**The commands live in the shared domain store, not here** — one project's toolchain is dead weight in every other project's context, and orchestrate is not the only engine that needs them.

Resolve the labels with [../_domains/_detect.md](../_domains/_detect.md) — the same way `review`, `diagnose`, and `profiling` do — then read `../_domains/<label>/orchestrate.md` for each matched label that has one. Do it **in step 3, before creating anything**. Today only [apple](../_domains/apple/orchestrate.md) has that cell; a matched label with no cell is a no-op, not an error — apply the rule above yourself, and add the cell if the run teaches you the commands.

#### Nothing is watching the workers

A herdr worker is invisible until someone switches to its tab; a subagent or workflow worker has nothing to switch to. The human is watching **this** pane and nothing else, and no worker can call for attention. **The wake signal (step 4) and the read on every wake (step 5) are the only way a worker is ever heard from.** Skipping one does not degrade the run; it silently strands a worker.

### 3. Fan out

Per ready issue, in order:

1. **Dispatch gate** — implement's gate again, on this issue's current body. It should pass; the scope gate already cleared it. If it fails now, do what a continuous `/implement` pass does with a gate failure — file the `needs human input: …` follow-up — then **skip the issue and keep going**. A single late failure does not stop a run already underway. Name every skipped issue in the report; a non-empty list means the scope gate missed something.
2. **Worktree** — `git -C <repo> worktree add -b <branch> ~/.worktrees/<repo>/<slug> <default-branch>`. **This skill creates it, never the transport** — that is why landing, verdict paths, and teardown are identical on all three. Create it **now, not earlier**: a worktree is evidence an issue was ready, never a bet that it will be.
3. **Device, if the work has one** — see [A worktree isolates source and nothing else](#a-worktree-isolates-source-and-nothing-else), and read `../_domains/<label>/orchestrate.md` for the commands. Created here, alongside the worktree.
4. **Model check** — resolve the kind, then pick this issue's tier with [Picking the model per issue](#picking-the-model-per-issue), then check the resolved id against [Worker agents and models](#worker-agents-and-models) and refuse the dispatch if either fails. This runs before the transport is touched, so a denied model cannot reach any of them. Record the tier next to the slug; the run report names it.
5. **`dispatch(…)`** — the transport file. Returns the **handle** you will use for every later verb. The workflow transport dispatches the whole batch in one call rather than per issue; its file says how.
6. **Brief** — [BRIEF.md](BRIEF.md).

Record `slug → issue → model → handle → worktree → branch → device` as you go. Step 7 needs the handle and the device.

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
| `done`/`idle`, verdict `FAIL`/`BLOCKED`/missing, worker ran `haiku` | retire it, tear the worktree down, and re-dispatch the issue **once** on `model` (sonnet) through step 3; name the retry in the report |
| `done`/`idle`, verdict `FAIL`/`BLOCKED`/missing, worker ran `sonnet` | report it, retire it, leave the issue open. No escalation above sonnet exists — a second failure is work for `iron-out`, not a bigger model |
| `blocked` (herdr: an approval prompt) | escalate to the human; never auto-approve |
| `unknown` | report it, retire it; it does not prove completion |

The verdict is a file, not the worker's own words: `<worktree>/tmp/claude/verify/<item>.json`. **`/implement`'s Phase 1.5 owns that file** — its schema, when it is written, and what each verdict means. Orchestrate is only its reader; do not re-specify it here.

**Copy the verdict into the primary checkout the moment you read it, before anything else happens to that worktree:**

```bash
mkdir -p <repo>/tmp/claude/verify
cp <worktree>/tmp/claude/verify/<item>.json <repo>/tmp/claude/verify/<item>.json
```

The verdict lives inside the worktree, `tmp/` is gitignored so it never rides the branch, and step 7 removes the worktree with `--force`. **Teardown therefore destroys the only copy of the evidence for every slice the swarm lands.** The work was verified and nothing records it: `tmp/claude/verify/` in the primary checkout stops at whatever the last non-swarm pass wrote, which reads from the outside exactly like a swarm that skipped verification entirely.

Observed: a seven-issue run landed six slices, each driven at its surface by its own worker, each with a verdict the orchestrator read before merging — and left no verdict file behind for any of them. The reviewer afterwards could not tell "verified, evidence deleted" from "never verified", and had to re-drive the whole integrated result to find out.

Copy it at read time, not at teardown time. A worker can be retired for reasons that skip step 6 entirely (a `FAIL`, an `unknown`, an issue that turned out already done), and those verdicts are worth keeping too — a `FAIL` nobody can read afterwards is the one you most needed.

**A worker going quiet is liveness, not completion** — one that gave up, failed, or filed-and-halted ends in the same idle state as one that finished. Never tear down on transport state alone, and never on a worker's closing summary: a returned report is prose, the verdict is evidence.

**And the reverse also holds: a notification is not a death.** On the subagent transport one fires whenever an agent stops with no live background children, so an agent that left a build running notifies, then resumes when the build ends. Judge by whether the worktree is changing — new commits, a verdict file, touched sources — not by the notification. Observed in one round: four workers were each declared dead on their first notification and three recovery dispatches were fired into worktrees whose original workers were still alive, briefly putting two agents in the same tree. The tell that they were not dead was `ListAgents` showing them `running` again after being reported `completed`.

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

Then **write the verdict's `index_entries`** into the shared index files the brief told the worker not to touch ([BRIEF.md](BRIEF.md)), and commit them with the merge or immediately after. This is the orchestrator's half of that trade and it is not optional: suppressing the edits without making them swaps a loud merge conflict for a silently stale index, which is the failure those files exist to prevent. A landed `PASS` whose worker added a file and named no entry gets that gap recorded in the report, not skipped.

Close the issue with what shipped.

### 7. Retire the worker

Teardown is the orchestrator's job because it is **structurally impossible for the worker**: git refuses to delete a branch that a worktree still has checked out, and the worker is standing in it. Whatever created a resource retires it — this skill made the worktree and the branch, so this skill removes them, on every transport.

```bash
test -f <repo>/tmp/claude/verify/<item>.json   # the verdict is already out — step 5
git -C <worktree> status --short          # must be empty
git log <default>..<branch>               # must be empty — fully merged
git -C <repo> worktree remove --force <worktree> \
  && git -C <repo> branch -d <branch> \
  && git -C <repo> push origin --delete <branch>
```

**The first line is not a formality.** `worktree remove --force` is the last moment the verdict exists. If the copy from step 5 is missing, do it now rather than removing the worktree — this is the check that stops a whole swarm's evidence disappearing one worker at a time, each teardown looking perfectly clean as it goes.

**Retire the worker's device too**, if step 3 gave it one — the platform cell you read there has the teardown commands. Whatever it is, it survives its worker and holds resources; a long run that skips this ends with one per issue still alive.

Then `retire(handle)` — the transport's own teardown: a `herdr tab close` on one, a `TaskStop` on the other two.

**Stop the agent before removing its worktree, not after, and do it even for a worker that already reported and landed.** On the subagent and workflow transports a worker that ended its turn may not be finished: an agent that left a background command running resumes when that command completes, so it keeps waking, keeps spending tokens, and — once you have merged its branch and removed its worktree — does so inside a directory that no longer exists. Observed: a landed worker went on notifying five more times across two hours against a deleted worktree, because teardown was treated as the whole of retirement.

**Reconcile every wake.** A notification from a worker whose issue is already closed means one was left running; stop it. Any agent `ListAgents` shows as `running` with no open issue behind it is the same failure.

**`--force` is load-bearing in a repo with submodules.** Plain `git worktree remove` refuses with `fatal: working trees containing submodules cannot be moved or removed`, which then cascades into `branch -d` failing because the worktree still holds the branch. `--force` removes it cleanly (checked on git 2.50.1 against a worktree with the submodule checked out), so it replaces the older `rm -rf` + `worktree prune` dance. Chain with `&&`, never `;`: a `;`-chained success echo prints after a failed step and misreports teardown as done.

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
- **Models** — `slug → sonnet|haiku` for every dispatch, or a count per tier when the swarm is large, plus every issue that was re-dispatched from haiku to sonnet after a failure. A tier split nobody can see is a tier split nobody can correct.
- **Landed** — issue, branch, merge commit.
- **Skipped at the dispatch gate** — issue, which test failed, the follow-up filed. If this list is non-empty, the scope gate missed something; say so.
- **Stopped without a verdict** — issue, what the read showed, the follow-up filed.
- **Escalated** — conflicts, stale verdicts, dirty worktrees left standing.
- **Still blocked** — issue and the blocker it is waiting on.
- **Index entries written**, and any landed branch that added a file and named none — that is a stale index in the making, and it is only visible here.
- **Verdicts preserved** — one line listing the `tmp/claude/verify/<item>.json` files now in the primary checkout, and naming any landed issue that has none. A swarm that lands six slices should leave six verdicts behind; anything less means the evidence went out with a worktree and the next person to look will have to re-drive the result to learn what you already knew.

## Worker rules the brief must carry

These are properties of the swarm, not of any one worker — [BRIEF.md](BRIEF.md) states them in full.

- **Never ask.** No worker has a channel to a human. An unresolved decision is a filed follow-up and a halt, never a question and never a guess.
- **One `/implement <n> continuous` per worker. Never `/iterate`.** `continuous` is what makes a worker file-and-halt instead of prompting. `/iterate` halts unless it is on the default branch, and git refuses a second checkout of it (`fatal: 'main' is already used by worktree at …`), so it cannot run in a worktree at all.
- **Workers never land.** Same constraint: `wrap-up`'s landing does `git checkout main`, which fails in a worktree. They commit and push their own branch; the orchestrator lands.
- **No repo-wide formatters.** One worker reformatting the workspace makes every sibling branch conflict on formatting alone. Format only what you touched.
- **No edits to the repo's shared index files.** A file map, a component registry, a docs table of contents — anything every change appends a row to — collides across branches by construction. Workers report the row they would have written; the orchestrator writes it at landing (step 6).
