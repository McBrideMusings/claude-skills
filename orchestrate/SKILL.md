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

**reasonix (DeepSeek)** — blocked, and not by preference. `herdr agent start --kind` takes a fixed enum — `pi, claude, codex, gemini, cursor, devin, agy, cline, omp, mastracode, opencode, copilot, kimi, kiro, droid, amp, grok, hermes, kilo, qodercli, maki` — and `reasonix` is not in it, nor does herdr ship a detection manifest for it. Started the only way left, `herdr pane run <pane> 'reasonix chat'`, it holds no agent name and reports no `agent_status`, so step 4's wake signal and step 5's classification table have nothing to read and the unattended loop is gone — which is the whole skill. **What would unblock it:** a herdr agent kind plus a detection manifest classifying `working`/`idle`/`blocked`. Until then reasonix is reachable through the `dispatch` router (`/implement delegate`), never as a swarm worker.

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

Resolve the issue backend via [`../ref-tracker/_detect.md`](../ref-tracker/_detect.md), then read dependencies per issue, in this order:

1. **Native** — on beads, `bd ready --json` *is* the frontier, already computed (`bd ready --explain --json` names each blocker for the report); on GitHub, `gh issue view <n> --json blockedBy --jq '.blockedBy.totalCount'`.
2. **Prose fallback** — a `Blocked by: #70, #72` line in the body.

**Absence is not permission.** If native reports zero blockers *and* the body carries a `Blocked by:` line, the two disagree — surface it and dispatch nothing. If neither source yields a graph and more than one candidate exists, make the human confirm the order before dispatching. Treating "no graph found" as "nothing is blocked" fans work out onto unbuilt foundations, which is the failure this skill exists to prevent.

**Completion criterion:** every candidate issue is classified ready or blocked, with the blocker named.

**Bare invocation — no issue numbers, label, or milestone named — builds this frontier from the whole open backlog and dispatches it, no go-ahead prompt.** The user has stated standing consent for this (2026-08-19): a bare `/orchestrate` should never re-litigate "should I dispatch" — that conversation is settled at invocation time, not per run.

To keep an unreviewed swarm from fanning out onto vague or high-blast-radius work, the **default scope excludes**, automatically and without asking:

- any issue with the `spec` label — a spec is a decision to make, not a slice to implement
- any issue attached to a milestone — milestone issues here are the vague Phase-N buckets ("Web UI Server Infrastructure"), not sliced work
- anything that fails the dispatch gate at step 3 (implement's Phase 0.5 AFK check), same as a named scope — a single such failure files its follow-up and is skipped, it does not stop the round, since a bare run was never vetted by a human in the first place

Everything else in the frontier goes out this round, sized per step 2. **State the exclusions in the report** (count of spec/milestone issues held back, by number) so they stay visible even though nobody confirmed them. A named scope (issue numbers, `label:X`, `milestone:X`) bypasses these default exclusions entirely — naming a scope is itself the human's review, so everything named is eligible.

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

   **Then link the local files in, by hand, in the same breath:**

   ```bash
   CLAUDE_PROJECT_DIR=<worktree> bash ~/.claude/hooks/worktree-link-locals.sh
   ```

   **Then mark it as a worker worktree, in the same breath:**

   ```bash
   touch "$(git -C <worktree> rev-parse --absolute-git-dir)/SWARM-WORKER"
   ```

   That marker is what `~/.claude/hooks/swarm-worker-push-guard.sh` reads to deny `git push`, `git merge` onto `main`, `gh pr`/`gh issue` writes, and `bd` writes. It denies them two ways: from a command that names this worktree, and — because a workflow worker's cwd is the primary checkout, not its worktree — from any **subagent** in a repo where a marker is live. The orchestrator is the main loop, carries no `agent_type` on its hook payload, and so lands the round from that same cwd unimpeded. **It is the only thing that actually stops a worker landing its own work** — the prompts have said "you do not push, merge, open a PR" since 2026-08-16 and workers did all three anyway: two pushed to `origin/main`, and on 2026-08-17 a Green-stage agent ran `git push origin <branch>:main`, opened a PR, self-merged it, and closed the issue, all from a prompt whose first paragraph said "Execute ONLY the phase named below."

   It lives in the git admin dir rather than the working tree so a worker staging its own files cannot commit it, `git status` never shows it, and `git worktree remove` deletes it — a marker cannot outlive its round. A worktree with no marker is untouched by the hook, which is what keeps `land: 'self'` passes (`/iterate`, a standalone `/implement`, `EnterWorktree`) working normally.

   Run it after every `worktree add`, recovery dispatches included. Skipping it does not weaken the round's rules; it removes the only enforcement they have.

   That link hook normally fires on `SessionStart`/`CwdChanged` and brings in every gitignored local file a worktree needs — `admin.toml`, `.env*`, `CLAUDE.local.md`, `.mcp.json`, and **`.claude/skills/*`**. **It never fires for an orchestrated worker.** The trigger is a Claude session entering the worktree, and no session ever does: this skill creates the worktree from the primary checkout with a plain `git worktree add`, and workflow-transport workers inherit the orchestrator's `CLAUDE_PROJECT_DIR`, which is the primary checkout. So the hook has to be invoked directly, here.

   **The expensive half is the skills, not the config.** A project's `verify-project` skill is routinely gitignored — it holds machine-specific paths — so it does not ride the branch, and a worker without it reaches Phase 1.5 with no idea how this project is verified. Observed 2026-08-15 on `stash-mobile`: four workers dispatched, `.claude/skills/verify/` present in the primary checkout and absent from all four worktrees, caught only because the orchestrator went looking after the round was already running. A missing `admin.toml` fails loudly on the first build; a missing verify skill just produces a weaker verdict.

   Run it after every `worktree add`, including a recovery dispatch into an existing worktree.
3. **Device, if the work has one** — see [A worktree isolates source and nothing else](#a-worktree-isolates-source-and-nothing-else), and read `../_domains/<label>/orchestrate.md` for the commands. Created here, alongside the worktree.
4. **Model check** — resolve the kind, then pick this issue's tier with [Picking the model per issue](#picking-the-model-per-issue), then check the resolved id against [Worker agents and models](#worker-agents-and-models) and refuse the dispatch if either fails. This runs before the transport is touched, so a denied model cannot reach any of them. Record the tier next to the slug; the run report names it.
5. **Worktree still there?** — the last thing before the transport is touched, for **every** worktree in the batch, not just the one being dispatched:

   ```bash
   git -C <repo> rev-parse --absolute-git-dir >/dev/null 2>&1 || echo MISSING
   test -d <worktree>/.git && test -f "$(git -C <worktree> rev-parse --absolute-git-dir)/SWARM-WORKER" || echo "MISSING <worktree>"
   ```

   **Any `MISSING` halts the round.** Do not dispatch, do not re-create it silently — say which slugs are gone and stop, so the cause gets looked at rather than papered over.

   **Why this check exists (`term-bvlt`).** Creation succeeding is not evidence the worktree is there when the worker starts. On 2026-08-28 an orchestrate round created four worktrees, confirmed each, and `~/.claude/tools/git-sweep.sh` — running from this same session's `Stop` hook at 22:17:53 UTC (6:17pm ET) — removed all four as "merged into main", because a worktree created at the tip of the default branch has no commits of its own and a clean tree. Two workers found the directory gone and recreated it at a base they chose themselves; two halted and their dispatches were lost. `git-sweep.sh` now refuses a worktree carrying a `SWARM-WORKER` or `SELF-LAND` marker, so that specific cause is closed — this check is what makes the *next* one loud at dispatch instead of silent until the round returns.
6. **`dispatch(…)`** — the transport file. Returns the **handle** you will use for every later verb. The workflow transport dispatches the whole batch in one call rather than per issue; its file says how.
7. **Brief** — [BRIEF.md](BRIEF.md).

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
- **Arm a long heartbeat (1200–1800s)** as a backstop, whatever the transport's own signal is. It catches a dead Monitor, a notification that never fires, and a worker stuck in a state that never changes.

  **The mechanism, because naming only the outcome does not work.** `ScheduleWakeup` is the only tool that schedules a wake, and it exists **only inside a `/loop`** — a session started as a bare `/orchestrate` cannot call it. So arming the heartbeat is a step, not an assumption: **immediately after the first `dispatch(…)` returns, invoke the `loop` skill in dynamic mode** — `Skill(loop, "check the running orchestrate round: sweep every live worker's worktree, land anything finished, dispatch the next round when the frontier frees")` — with no interval, so you pace it yourself. From that point `ScheduleWakeup` is callable, and every turn ends with one:

  ```
  ScheduleWakeup({ delaySeconds: 1500, noop: <true if nothing changed>,
                   prompt: "<the same /loop input verbatim>",
                   reason: "backstop while round <n> runs" })
  ```

  Call `ScheduleWakeup({stop: true})` when the loop ends — the frontier is empty and no worker is live.

  Observed 2026-08-17: an orchestrator read the old wording ("add a long `/loop` heartbeat"), found `ScheduleWakeup` unavailable outside a loop, dispatched a four-worker round with no backstop at all, and correctly reported that it had none — the instruction named a result with no route to it, so the only compliant move left was to announce the gap.

  **If you genuinely cannot arm one** — the `loop` skill is unavailable, or the human declined it — say so in the dispatch message in one line, naming what the run is relying on instead (usually the transport's own notification). A missing backstop the human knows about is a risk; a missing backstop nobody mentioned is how a round dies silently.
- **Sweep every live worker's worktree on each wake and on each heartbeat — not just the one that woke.** The transport tells you an agent *stopped*; only the worktree tells you whether it *finished*. Three commands per worker:

```bash
git -C <worktree> log --oneline <default-branch>..<branch>   # commits: none means nothing landable
git -C <worktree> status --short                             # dirty: work exists, uncommitted
ls -l $(~/.claude/tools/repo-slug --path <worktree>)/verify/<item>.json               # verdict, and its mtime
```

  Read them together. **Commits + clean tree + verdict** is a worker that finished. **No commits + dirty tree** is a worker that did not — whatever the transport says, and whatever its closing message claims. A dirty tree whose mtimes are still advancing is mid-flight; the same tree unchanged across two sweeps is stranded, and stranded means [recovery](#recovering-a-stranded-worker), never teardown. The worker that just woke is the one you already know about; the sweep is for the others.

### 5. Classify each waking worker

The states are herdr's vocabulary; the others map onto them — running → `working`, finished → `done`, errored or vanished → `unknown`. Nothing maps to `blocked` except a worker herdr caught sitting on an approval prompt, since no worker asks anything.

| State | Do |
|---|---|
| `working` | leave alone |
| `done`/`idle`, verdict `PASS`/`SKIP`, branch has ≥1 commit past the base, `verified_parent` == branch head's parent, tree clean | land it (step 6) |
| verdict `PASS`/`SKIP` but the branch has **no commits past the base** | **not a pass — it is empty.** The verdict describes code in no commit. Keep the worktree, [recover it](#recovering-a-stranded-worker); never land, never tear down |
| verdict `PASS`/`SKIP` but `verified_parent` **names no object in this repo** | **not a pass — it is no verdict.** The sha was written without reading git, so nothing in the file was measured against a real tree. Keep the worktree, [recover it](#recovering-a-stranded-worker); never land, never tear down |
| `done`/`idle`, verdict `PASS`/`SKIP` but `verified_parent` resolves and is **not** the branch head's parent, or the tree is dirty | **stale** — escalate; the tip commits or the uncommitted edits shipped unverified |
| `done`/`idle`, verdict `FAIL`/`BLOCKED`/missing, worker ran `haiku` | retire it, tear the worktree down, and re-dispatch the issue **once** on `model` (sonnet) through step 3; name the retry in the report |
| `done`/`idle`, verdict `FAIL`/`BLOCKED`/missing, worker ran `sonnet` | report it, retire it, leave the issue open. No escalation above sonnet exists — a second failure is work for `iron-out`, not a bigger model |
| `blocked` (herdr: an approval prompt) | escalate to the human; never auto-approve |
| `unknown` | report it, retire it; it does not prove completion |

**A `PASS` whose diff added tests and whose verdict has no `mutation` block is not a pass.** `/implement` Phase 1.5 requires the worker to strip its production change, re-run only the new tests, and record the real failure text; a verdict missing that — or carrying `discriminates: false` — is a pass that proved nothing about the test it shipped. Land it if the behavioural evidence stands on its own, but say so in the report and file the test as a follow-up. Observed 2026-08-16: three landed tests each rebuilt the production logic inside the test body, and all three passed with the fix reverted.

The verdict is a file, not the worker's own words: `$(~/.claude/tools/repo-slug --path <worktree>)/verify/<item>.json`. **`/implement`'s Phase 1.5 owns that file** — its schema, when it is written, and what each verdict means. Orchestrate is only its reader; do not re-specify it here.

**Copy the verdict into the primary checkout the moment you read it, before anything else happens to that worktree:**

```bash
cp $(~/.claude/tools/repo-slug --path <worktree>)/verify/<item>.json $(~/.claude/tools/repo-slug --path <repo>)/verify/<item>.json
```

Both sides are the same tool, keyed by which checkout you hand it. The worker's verdict is filed under the **worktree's** slug, and a worktree exists for one round — its slug is a name nobody can reconstruct once step 7 deletes the tree, and the three-day sweep takes the directory with it. **The repo's own verdict directory is the one a later reader can find**, and if the copy never happens it stops at whatever the last non-swarm pass wrote, which reads from the outside exactly like a swarm that skipped verification entirely.

Observed: a seven-issue run landed six slices, each driven at its surface by its own worker, each with a verdict the orchestrator read before merging — and left no verdict file behind for any of them. The reviewer afterwards could not tell "verified, evidence deleted" from "never verified", and had to re-drive the whole integrated result to find out.

Copy it at read time, not at teardown time. A worker can be retired for reasons that skip step 6 entirely (a `FAIL`, an `unknown`, an issue that turned out already done), and those verdicts are worth keeping too — a `FAIL` nobody can read afterwards is the one you most needed.

**A worker going quiet is liveness, not completion** — one that gave up, failed, or filed-and-halted ends in the same idle state as one that finished. Never tear down on transport state alone, and never on a worker's closing summary: a returned report is prose, the verdict is evidence.

**And the reverse also holds: a notification is not a death.** On the subagent transport one fires whenever an agent stops with no live background children, so an agent that left a build running notifies, then resumes when the build ends. Judge by whether the worktree is changing — new commits, a verdict file, touched sources — not by the notification. Observed in one round: four workers were each declared dead on their first notification and three recovery dispatches were fired into worktrees whose original workers were still alive, briefly putting two agents in the same tree. The tell that they were not dead was `ListAgents` showing them `running` again after being reported `completed`.

**Check the verdict's `verified_parent` against the branch head's parent** before trusting a `PASS`:

```bash
git -C <worktree> cat-file -e <verified_parent>^{commit}   # must succeed
git -C <worktree> rev-parse <branch>^                      # must equal the verdict's verified_parent
```

**Run the `cat-file` first, and stop there when it fails.** A sha that names no object in the repo was never read out of git, so the verdict measured nothing — that is a different verdict class from a stale one, not a harsher one. Observed: a verdict carrying `bb85bca17fe86dfa3c7a26b8c4c6a5b7d9e2f3a4`, 40 valid hex characters naming no object, on a branch whose real fork point was `25bee4a`. The comparison alone reads that as stale and sends the reader off to work out which commits shipped unverified, when the answer is that nothing in the verdict was ever verified.

`verify` runs before anything is committed, so the only sha it can honestly record is the parent of the commit its work becomes. Wrap then makes exactly one commit. On an honest pass those match; when they don't, something was committed after the verdict was written and is shipping unverified. Observed: a worker returned `PASS` at one commit, made one more, and the extra change landed on nothing but its own say-so.

**Do not expect a `commit` field, and never ask anyone to add one.** Earlier versions had `verify` write `commit` (meaning the parent) and a later `restamp` stage rewrite it to the wrap sha. That stage was refused by the safety classifier on all twelve workers of one swarm (iptv-mac, 2026-08-20) as audit tampering — correctly, since it asked an agent to write "this commit was verified" about a commit no stage had verified. The field is named for what it truthfully holds so that nothing has to correct it afterwards.

**A verdict whose `verified_parent` is the base commit is a different failure — emptiness, not staleness.** It means the worker wrote its verdict before committing anything. Observed: a `PASS` verdict naming the base `main` commit, on a branch with zero commits and five files of uncommitted work. Nothing about that reads as wrong until you look. `git -C <worktree> log --oneline <default-branch>..<branch>` returning empty is the check to run, because it holds even when the verdict omits the sha entirely — and a comparison phrased only in terms of the head's parent lets this straight through.

#### `read(handle)` on EVERY wake

The verdict tells you what to do with the branch. The read tells you *why* the worker stopped — which follow-up it filed, which check failed, whether it ran at all. Both go in the report; neither substitutes for the other, and a `BLOCKED` verdict with no read behind it is an escalation nobody can act on.

**A worker that stopped is finished, whatever it stopped for.** There is nothing to unblock and nobody to relay to. Read it, record it, retire it (step 7), and let the issue stay open for the next `iron-out` pass.

### 6. Land it

From the **primary checkout**, one worker at a time:

1. Fetch, then compare `git merge-base origin/main <branch>` against `origin/main`'s head.
2. **Unchanged** → the worker's verdict still describes this exact tree; merge and push.
3. **Moved** → another branch landed since this worker forked. Merge, then **re-run `verify` on the merged result** before pushing. Two branches can each pass alone and break together.
4. **Conflict** → abort the merge, leave the worktree and branch intact, escalate. Never force-resolve.

Then **write the returned object's `index_entries`** into the shared index files the brief told the worker not to touch ([BRIEF.md](BRIEF.md)), and commit them with the merge or immediately after. They come back in the round's result array, not in the verdict file — a Wrap stage that wrote them to the verdict path would destroy the verdict. This is the orchestrator's half of that trade and it is not optional: suppressing the edits without making them swaps a loud merge conflict for a silently stale index, which is the failure those files exist to prevent. A landed `PASS` whose worker added a file and named no entry gets that gap recorded in the report, not skipped.

Close the issue with what shipped.

### 7. Retire the worker

Teardown is the orchestrator's job because it is **structurally impossible for the worker**: git refuses to delete a branch that a worktree still has checked out, and the worker is standing in it. Whatever created a resource retires it — this skill made the worktree and the branch, so this skill removes them, on every transport.

```bash
ls $(~/.claude/tools/repo-slug --path <worktree>)/verify/*.json    # every verdict in there, by name
test -f $(~/.claude/tools/repo-slug --path <repo>)/verify/<item>.json   # the one you copied out — step 5
git -C <worktree> status --short          # must be empty
git log <default>..<branch>               # must be empty — fully merged
pgrep -f "<worktree>" | xargs -r ps -o pid=,comm=   # must be empty — nothing is standing in it
git -C <repo> worktree remove --force <worktree> \
  && git -C <repo> branch -d <branch>
```

**No `push origin --delete`.** Workers do not push, so a worker branch exists only locally and there is nothing on the remote to delete — the command fails with `remote ref does not exist` and, chained with `&&`, makes a clean teardown read as a failed one. Run it only if you pushed the branch yourself for some reason, and then only after `git -C <repo> ls-remote --exit-code origin <branch>` confirms it is there.

**The first two lines are not a formality.** `worktree remove --force` is the last moment the verdict exists. If the copy from step 5 is missing, do it now rather than removing the worktree — this is the check that stops a whole swarm's evidence disappearing one worker at a time, each teardown looking perfectly clean as it goes.

**List the directory; do not just `test -f` the path you expect.** A `test -f` against one exact name passes vacuously when the worker wrote a differently-named file, and `--force` then deletes the only copy. Observed on `etv-station` #182, 2026-08-16: a worker left a complete `FAIL` verdict — naming the exact cause at `daemon.rs:2344` — at `/private/tmp/claude/<repo-slug>/verify/undefined.json`, found by listing the directory rather than by looking for it. It survived only because the tree was also dirty, which forbids teardown for an unrelated reason. **Any `.json` in there that is not `<item>.json` blocks teardown**: copy it out under a name that includes the worker's issue and branch, then decide. Two workers in one round can both write `undefined.json`, and once copied to the primary checkout they are indistinguishable — so never copy one out under the name it already has.

**A live process in the worktree forbids teardown exactly as uncommitted work does.** `worktree remove --force` deletes the directory out from under whatever is standing in it, and that process keeps running against a path that no longer exists. Observed on `term`, 2026-08-25: a Metro bundler started at 01:29 inside `~/.worktrees/term/perm-questionnaire/apps/phone`, step 7 removed the worktree at 01:36, and the user's app red-screened with `Unable to resolve module ./index from /Users/pierce/.worktrees/term/perm-questionnaire/apps/phone/`. The tree was clean and fully merged, so every other check passed. The damage surfaced minutes later in the user's app and read as a broken build, not as teardown.

**Refuse, do not name-and-remove.** A swarm retires workers unattended, so "removed, and this killed PID 15916" is still an unattended removal — the sentence lands in a round report nobody reads until the app is already broken. Deferring costs one worktree's disk; the branch is already merged and the round moves on. Say which condition fired and which process holds it — `worktree 4 (#182): pgrep found 15916 node …/apps/phone; not removed` — so the next pass retires it rather than re-deriving why it was skipped.

`pgrep -f` matches the command line, not the working directory: it catches a bundler, dev server or watch process launched with the path in its argv, and misses a bare shell that `cd`'d in. When it is empty and you still suspect a hold, `lsof +D <worktree>` walks the tree and answers for certain — slower, and worth it only then. Quote the path (it contains no metacharacters today, but a branch slug can), and use `xargs -r`: without it, BSD xargs still runs `ps` once when pgrep found nothing, with no pids to select on, so what prints depends on the calling terminal rather than on the worktree. Never `pgrep -fl` — an npm-exec process carries its whole inherited environment in the command column, so one match is ~10,000 characters (`cc-k0m`).

**A gitignored file the worker created is invisible to every check above, and `hooks/worktree-remove-locals-guard.sh` denies the removal when one exists.** `git status --short` reads git's view, so a file git is told to ignore leaves it empty. Observed on a `dl-ayz` round: worker `dl-ayz.1.2` created `admin.toml` — gitignored globally, never committed — teardown's every check passed, and `--force` took the repo's only copy of its build, test and dev commands. The guard compares the worktree against the primary checkout on the `pattern` names in `~/.config/repo/config.toml`, the same list `repo populate` brings in, and names the file it found. Copy that file to the primary checkout, then re-run the removal.

**Retire the worker's device too**, if step 3 gave it one — the platform cell you read there has the teardown commands. Whatever it is, it survives its worker and holds resources; a long run that skips this ends with one per issue still alive.

Then `retire(handle)` — the transport's own teardown: a `herdr tab close` on one, a `TaskStop` on the other two.

**Stop the agent before removing its worktree, not after, and do it even for a worker that already reported and landed.** On the subagent and workflow transports a worker that ended its turn may not be finished: an agent that left a background command running resumes when that command completes, so it keeps waking, keeps spending tokens, and — once you have merged its branch and removed its worktree — does so inside a directory that no longer exists. Observed: a landed worker went on notifying five more times across two hours against a deleted worktree, because teardown was treated as the whole of retirement.

**Reconcile every wake.** A notification from a worker whose issue is already closed means one was left running; stop it. Any agent `ListAgents` shows as `running` with no open issue behind it is the same failure.

**`--force` is load-bearing in a repo with submodules.** Plain `git worktree remove` refuses with `fatal: working trees containing submodules cannot be moved or removed`, which then cascades into `branch -d` failing because the worktree still holds the branch. `--force` removes it cleanly (checked on git 2.50.1 against a worktree with the submodule checked out), so it replaces the older `rm -rf` + `worktree prune` dance. Chain with `&&`, never `;`: a `;`-chained success echo prints after a failed step and misreports teardown as done.

#### Recovering a stranded worker

A worker with **uncommitted work and no commits** can be neither retired (teardown destroys the work) nor landed (there is nothing to merge). Dispatch a **recovery worker into the same worktree** — an ordinary step-3 dispatch with three additions:

- Say plainly that this is a recovery, paste what the previous worker left (`git status --short`), and state that it never committed.
- Say the existing verdict file is **not** evidence and must be overwritten, naming the commit it wrongly claims, so the recovery worker does not trust it.
- Make the ordering its first instruction: judge the existing work against the acceptance criteria, finish what is missing, then **commit and push before anything optional**.

Do not create a second worktree, and do not merge the default branch into the stranded branch — integration stays the orchestrator's job at landing.

#### A report from a worker you already retired is not new work

A stopped worker can still surface a report afterwards — a late notification, a resumed turn, an agent that had a background child outlive it. Observed on the retired subagent transport: a worker reported five more times across two hours after its branch was merged, its issue closed and its worktree removed, describing work in a directory that no longer existed.

Do not act on it. **Cross-check the handle against the issues you have already closed before treating any report as live**, and never let one re-open a slug you have landed.

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

**An empty frontier is not an empty backlog, and the report must say which one you hit.** The frontier is only the issues that pass the AFK gate; on a large tracker it goes dry while most of the backlog is still open, and every issue the gate rejected is a decision waiting on the human, not a dead end. So ending the loop is the moment to name the **Next batch** — the gate failures, each with your pick, handed to `iron-out`. Observed 2026-08-23 on `etv-station`: three rounds landed 8 issues, the gate then rejected 5 of 5 candidates with ~90 issues still open, and the run reported "frontier empty" and stopped — filing those 5 under **Follow-up needed** as blockers, three of them with no recommendation at all.

### Pane rotation between rounds (optional, herdr only)

Landing a round leaves this session holding everything it read while doing it — every worker's returned object, every re-verify, every conflict resolution. That accumulation is dead weight for the *next* round: it does not need to know how round 1 landed, only that it did. Running every round in the same session lets that weight build for the life of the swarm.

**When `HERDR_ENV=1` and a round has just landed, propose rotating to a fresh pane for the next one — do not do it silently.** State the proposal in one line and wait: *"Round N landed. Dispatch round N+1 from a fresh pane so it starts with no round-1 context, and close this one once it's running?"* A "no" or no response keeps the swarm in this session exactly as before this section existed — rotation is an offer, not a new default, because closing the calling pane ends this session and that is the kind of hard-to-reverse action this project's global instructions require confirming first.

On a "yes", **relay this pane — do not split a new one.** The next round runs in the
same repo at the same path, so there is nothing for a second pane to do that clearing
this one does not do better: no window where the old pane is closed and the new one
never started, and no second pane to leave behind if the brief fails to land.

1. **Stop this session's loop** — `ScheduleWakeup({stop: true})`. A relay ends this
   context; a live wake obligation pointed at it would fire into a session that is gone.
2. **Invoke `relay`** with a self-contained brief for round `N+1`, since it starts with
   none of this session's context: the repo path, that this is `/orchestrate` continuing
   an existing swarm, that round `N` just landed (name the issues and commits), and to
   run its own pre-flight — rebuilding the frontier itself rather than trusting a stale
   list handed across the rotation.
3. **End the turn.** `relay` writes the marker; the `Stop` hook clears this pane and
   delivers the brief to the fresh session. Do not call `herdr` yourself, and do not
   close the pane — there is no pane to close, and input sent while this session is
   still busy is dropped.

If the clear fails, the relay sender delivers the brief into this existing context
instead and logs why, so the round continues either way. That fallback is why relay has
no equivalent of the old "confirm the new pane started before closing this one" step —
nothing is ever closed.

**Do not rotate mid-round.** This applies only between rounds, at the same point step 8 already re-dispatches — a round in flight has a live `wake()` obligation that a closed pane cannot honor.

### The report

The only other moment the human is involved. This list is **additive to** `CLAUDE.md` §Finishing work, not a replacement for it — a swarm run is a coding task, so it closes with **Files changed / Unchanged / Follow-up needed** and with **Run:** / **Look for:** steps, once for the run as a whole rather than once per issue. Measured 2026-08-20/21 on `stash-mobile`: 830 turns, ~20 issues landed, neither block appeared once, because this list reads complete and gets filled instead. Then name all of it:

- **Transport** used, and the concurrency it ran at.
- **Models** — `slug → sonnet|haiku` for every dispatch, or a count per tier when the swarm is large, plus every issue that was re-dispatched from haiku to sonnet after a failure. A tier split nobody can see is a tier split nobody can correct.
- **Landed** — issue, branch, merge commit.
- **Skipped at the dispatch gate** — issue, which test failed, the follow-up filed. If this list is non-empty, the scope gate missed something; say so.
- **Stopped without a verdict** — issue, what the read showed, the follow-up filed.
- **Escalated** — conflicts, stale verdicts, dirty worktrees left standing.
- **Still blocked** — issue and the blocker it is waiting on.
- **Index entries written**, and any landed branch that added a file and named none — that is a stale index in the making, and it is only visible here.
- **Verdicts preserved** — one line listing the `$(~/.claude/tools/repo-slug --path <repo>)/verify/<item>.json` files now in the primary checkout, and naming any landed issue that has none. A swarm that lands six slices should leave six verdicts behind; anything less means the evidence went out with a worktree and the next person to look will have to re-drive the result to learn what you already knew.
- **Next batch** — the issues that failed the gate this run, each with **your pick** for what unblocks it, and the skill that does it (usually `iron-out`). Every other line above is backward-looking, and an empty frontier is not an empty backlog: the loop's terminal condition is "no issue passes the gate", which on a hundred-issue tracker means the gate is the bottleneck, not the work. A report that stops at **Still blocked** hands back a list of obstacles with nothing to answer.

**Then close with the escape hatch, always** — this report ends in recommendations, so `CLAUDE.md` §Deciding & designing binds it exactly as it binds `review` and `wrap-up`:

> Type `go` to apply my picks as described, or answer per item (`1 fix, 5 file, rest skip`).

Give every item in **Next batch** and **Follow-up needed** its own pick first, so `go` has something to mean. Measured 2026-08-23 across every non-subagent transcript: of 244 replies whose `Follow-up needed` carried two or more real items, exactly **one** named a way to accept them — and the miss is always the last turn of a long run, the one where re-typing costs most. `hooks/go-hatch-check.py` catches it on `Stop`; this line is what stops it happening.

## Worker rules the brief must carry

These are properties of the swarm, not of any one worker — [BRIEF.md](BRIEF.md) states them in full.

- **Never ask.** No worker has a channel to a human. An unresolved decision is a filed follow-up and a halt, never a question and never a guess.
- **One `/implement <n> continuous` per worker. Never `/iterate`.** `continuous` is what makes a worker file-and-halt instead of prompting. `/iterate` halts unless it is on the default branch, and git refuses a second checkout of it (`fatal: 'main' is already used by worktree at …`), so it cannot run in a worktree at all.
- **Workers never land, and never push — and step 3's `SWARM-WORKER` marker is what makes that true.** Every clause below is prose an agent has already been observed reading and ignoring; the marker turns them into a denied tool call. A worker's Wrap stage is a four-step commit, not `wrap-up` with its landing and tracker steps subtracted — `implement.js` generates it from `land: 'caller'`. It ends at the commit: a linked worktree shares the primary checkout's object store, so the orchestrator already has every worker commit and lands from there.

  **Do not reinstate "do not push to the default branch" as the rule.** That was the rule, in the brief and in `implement.js`, and 2026-08-16 two workers merged into `main` and pushed to `origin/main` anyway. `git checkout main` does fail in a worktree — the sentence claiming that makes landing impossible was wrong, and it stopped everyone looking. The workers ran `git -C <primary-checkout>`. A worker whose pass contains no push at all has nothing to route around.
- **Workers never invoke `/code-review`.** `implement.js` has a Review stage that is handed the worktree path and diffs against the sha the pass started from with `git -C`. Nested inside a worker, `/code-review` resolved its own cwd to *this* session's primary checkout and reviewed a clean `main` three times on 2026-08-16 — "no changes to review" reads as "no findings", so the gate passed on a diff nobody saw. The returned object carries `review: {findings, blocking}`. A worker that reached Review and could not read a diff **halts** and returns `halted_on: "review"` instead of a result — there is no completed pass whose diff went unread, so nothing to check for.
- **No repo-wide formatters.** One worker reformatting the workspace makes every sibling branch conflict on formatting alone. Format only what you touched.
- **No edits to the repo's shared index files.** A file map, a component registry, a docs table of contents — anything every change appends a row to — collides across branches by construction. Workers report the row they would have written; the orchestrator writes it at landing (step 6).
