# Transport: subagent

Workers are `Agent` calls in this session. No terminal, no tab, nothing to watch — but they run anywhere and need no `Monitor`, and the harness notifies you when each one finishes.

Available whether or not you are inside herdr. Chosen, and named in the report, exactly like the others.

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
  model: "<model from config>",      // see the constraint below
  prompt: "<BRIEF.md, filled in>"
)
```

**The handle is the `agentId` from the spawn result** — record it, and its name if the spawn result gives one.

**Model constraint on top of the config's own rules:** the `Agent` tool's `model` is an enum — `sonnet`, `opus`, `haiku`, `fable`. A config `model` outside that set cannot be dispatched here; stop and say so rather than silently omitting the parameter, because an omitted `model` inherits the parent's. **`fable` is in that enum and is refused**, exactly as under the other transport.

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

Nothing to close. A worker that ended its turn is already gone; SKILL.md step 7's worktree and branch teardown is the whole of retirement.

If a worker must be stopped **while still running** — a withdrawn issue, a wrong dispatch — `TaskStop` its task, then tear down. Never `rm -rf` a worktree with a live agent standing in it.
