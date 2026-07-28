# Transport: subagent

Workers are `Agent` calls in this session. No terminal, no tab, nothing to watch — but they run anywhere, need no `Monitor`, and **are** answerable: a background subagent can `SendMessage` to `main`, and a `SendMessage` back resumes it from its transcript even after it has finished its turn.

This is the transport when `HERDR_ENV` is not `1`. It is chosen, and named in the report, exactly like the other one.

## What it cannot do — read this before dispatching

- **The swarm dies with this session.** The agents are children of it. Worktrees, branches, and verdict files survive; the workers do not, and there is no reattach. [REATTACH.md](REATTACH.md) applies to the herdr transport only; here, a dead orchestrator means re-dispatching every unfinished issue from its worktree.
- **Claude only.** No codex, no cross-vendor worker. `[agents.codex]` in the config is inert under this transport.
- **Questions are turn-shaped.** A worker cannot be interrupted mid-thought and cannot park mid-run waiting; it asks by ending its turn. Expect a worker to burn a whole turn to ask one question.
- **`Workflow` is not a substitute.** Its agents cannot be answered at all. Never reach for it here.

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

**The handle is the `agentId` from the spawn result** — record it. Prefer the agent's name when the spawn result gives one (`SendMessage` names keep working after an agent completes); fall back to the raw `agentId` otherwise.

**Model constraint on top of the config's own rules:** the `Agent` tool's `model` is an enum — `sonnet`, `opus`, `haiku`, `fable`. A config `model` outside that set cannot be dispatched here; stop and say so rather than silently omitting the parameter, because an omitted `model` inherits the parent's. **`fable` is in that enum and is refused**, exactly as under the other transport.

**Do not use `isolation: "worktree"`.** SKILL.md step 3 already created the worktree on a branch this skill will land; letting the tool make its own leaves the branch outside the orchestrator's control, and the tool auto-cleans a worktree it considers unchanged.

`<how-to-ask>` for the brief:

> **stop and ask by calling `SendMessage(to: "main", ...)` with your question, then end your turn.** Nobody can see this transcript. Your plain output is not delivered to anyone until your turn ends. Put the whole question in that one message — options, their concrete consequences, the `file:line` you are looking at — because you will not get a chance to add to it. Your answer arrives as a message that resumes you; carry on from there.

The brief must also carry, for this transport only:

> Work exclusively inside the git worktree at `<worktree-path>` — every command either runs with `git -C <worktree-path>` or after a `cd` into it. You did not start there.

**Confirmed working** = the spawn returned an agent id and the task shows as running. Nothing else to check.

## `wake()`

Nothing to arm. The harness re-invokes on a `<task-notification>` when an agent finishes, and delivers a worker's `SendMessage` to `main` on its own.

Still add the long `/loop` heartbeat (1200–1800s): a worker that ends its turn having said nothing produces a notification with no question and no verdict, and that is exactly the silently-stranded case.

## `read(handle)`

The worker's `SendMessage` to `main`, or the `Agent` tool result — its final report.

**Never `Read` the task's `.output` file for a subagent.** It is a symlink to the full subagent transcript in JSONL and will overflow this context. Use the tool result.

Read it against the verdict file, exactly as SKILL.md step 5 says: a returned report is prose, the verdict is evidence. A subagent that summarises "implemented and verified" without a verdict file at `<worktree>/tmp/claude/verify/<issue>.json` has not proven anything.

## `answer(handle, text)`

`SendMessage(to: "<name-or-agentId>", summary: "<5-10 words>", message: "<the human's answer, verbatim>")`.

This resumes the agent from its transcript, so it keeps everything it had worked out before it asked. Do not re-dispatch a fresh worker to deliver an answer — that throws away the context that made the question worth asking.

Relay the answer **verbatim**. The human answered the question the worker asked; a paraphrase is you answering a different one.

## `retire(handle)`

Nothing to close. A worker that ended its turn is already gone; SKILL.md step 7's worktree and branch teardown is the whole of retirement.

If a worker must be stopped **while still running** — a withdrawn issue, a wrong dispatch — `TaskStop` its task, then tear down. Never `rm -rf` a worktree with a live agent standing in it.
