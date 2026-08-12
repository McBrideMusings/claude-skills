# Transport: subagent

Workers are `Agent` calls in this session. No terminal, no tab, nothing to watch — but they run anywhere and need no `Monitor`, and the harness notifies you when each one finishes.

Available whether or not you are inside herdr, and **this is the transport a run with no token gets** ([SKILL.md](SKILL.md) → Choosing). Named in the first status line and the report exactly like the others — a default still gets said out loud.

**This transport could carry an answer to a worker. It must not.** `SendMessage` would resume a finished agent from its transcript, which is exactly why the ban is written here rather than left implicit: see [SKILL.md](SKILL.md) → No worker ever asks the human anything. The only text this skill ever sends a worker is its brief.

## What it cannot do — read this before dispatching

- **The swarm dies with this session.** The agents are children of it. Worktrees, branches, and verdict files survive; the workers do not, and there is no reattach. [REATTACH.md](REATTACH.md) applies to the herdr transport only; here, a dead orchestrator means re-dispatching every unfinished issue from its worktree.
- **Claude only.** No codex, no cross-vendor worker. `[agents.codex]` in the config is inert under this transport.
- **Nothing to watch mid-run.** A worker's state is unobservable until it finishes. The verdict file is the only thing it leaves behind while running.

## `dispatch(issue)` → handle

One `Agent` call, `run_in_background: true` (the default — do not make it synchronous; a blocking worker is a swarm of one).

```
Agent(
  description: "<slug>",             // 3-5 words; how it shows up in the task list
  subagent_type: "claude",           // or "general-purpose" — it needs full tools
  model: "sonnet" | "haiku",         // this issue's tier — see the constraint below
  prompt: "<BRIEF.md, filled in>"
)
```

**The handle is the `agentId` from the spawn result** — record it, and its name if the spawn result gives one.

**Model constraint on top of the config's own rules:** the `Agent` tool's `model` is an enum — `sonnet`, `opus`, `haiku`, `fable` — and this skill permits exactly two of them, `sonnet` and `haiku`, picked per issue by [SKILL.md](SKILL.md) → Picking the model per issue. A config model outside those two cannot be dispatched here; stop and say so rather than silently omitting the parameter, because an omitted `model` inherits the parent's — and this orchestrator often runs on Opus, which is precisely the model no worker may get. **`opus` and `fable` are in that enum and are both refused**, exactly as under the other transports.

**Do not use `isolation: "worktree"`.** SKILL.md step 3 already created the worktree on a branch this skill will land; letting the tool make its own leaves the branch outside the orchestrator's control, and the tool auto-cleans a worktree it considers unchanged.

The brief must carry, for this transport only:

> Work exclusively inside the git worktree at `<worktree-path>` — every command either runs with `git -C <worktree-path>` or after a `cd` into it. You did not start there.

**Confirmed working** = the spawn returned an agent id and the task shows as running. Nothing else to check.

## `wake()`

Nothing to arm. The harness re-invokes on a `<task-notification>` when an agent finishes.

Still add the long `/loop` heartbeat (1200–1800s): a worker that dies without finishing produces no notification at all, and that is exactly the silently-stranded case.

## `read(handle)`

The `Agent` tool result — the worker's final report.

**Never `Read` the task's `.output` file for a subagent.** It is a symlink to the full subagent transcript in JSONL and will overflow this context. Use the tool result.

Read it against the verdict file, exactly as SKILL.md step 5 says: a returned report is prose, the verdict is evidence. A subagent that summarises "implemented and verified" without a verdict file at `<worktree>/tmp/claude/verify/<issue>.json` has not proven anything.

## `retire(handle)`

**`TaskStop` the agent, then do SKILL.md step 7's worktree and branch teardown.** Every time, including a worker that already reported and landed — not only a withdrawn issue or a wrong dispatch.

**A worker that ended its turn is not necessarily gone.** A task notification fires whenever an agent stops with no live background children, and an agent that left a build, a monitor or any other background command running **resumes when that command finishes**. So the same agent notifies repeatedly, and each resumption is a real turn: it re-reads state, re-checks its build, and spends tokens. Once its branch is merged and its worktree removed, it is doing all of that inside a directory that no longer exists.

Observed: a worker delivered a `PASS`, its branch was landed and its worktree torn down, and it went on notifying five more times over the following two hours against a deleted worktree. Nothing in the transport state distinguishes that from useful work — the giveaway is a notification arriving from a worker whose issue you have already closed.

**Reconcile on every wake.** Any agent still listed as `running` whose issue is closed should have been stopped at landing; stop it now. `ListAgents` is the check.
