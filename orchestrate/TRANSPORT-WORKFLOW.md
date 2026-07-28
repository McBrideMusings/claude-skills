# Transport: workflow

Workers are `agent()` calls inside a workflow script. The script holds the fan-out; the runtime executes it in the background; the whole batch returns at once as data.

**This transport is per-round, not per-worker.** The other two dispatch one worker into one freed slot. This one dispatches a batch, waits for the batch, lands the batch, and dispatches the next. Everything downstream of `wake()` in [SKILL.md](SKILL.md) happens in batches here.

Available whether or not you are inside herdr. **It calls the `Workflow` tool, which requires the human to have asked for it — the human picking this transport is that request.** Do not reach for `Workflow` anywhere else in this skill.

## What it cannot do — read this before dispatching

- **No mid-run input, at all.** The runtime's documented constraint: *only agent permission prompts can pause a run; for sign-off between stages, run each stage as its own workflow.* That is why a round is the unit — the sign-off between rounds is the landing step.
- **No filesystem or shell from the script itself.** Only its agents can read, write, and run commands. Worktrees are therefore created by SKILL.md step 3 **before** the workflow launches, exactly as under the other transports; the script never makes one.
- **The swarm dies with this session** — like subagent, no reattach. But a run is **resumable in-session** by its `runId`: unchanged `agent()` calls return cached results and only the failed or edited ones re-run.
- **Claude only.** `[agents.codex]` is inert here.
- **Cost is not per-worker.** A round of N issues is N implement passes running at once. Watch `/workflows` for the running token total, and keep rounds small enough that a bad brief does not burn the whole frontier.

## `dispatch(batch)` → handle

**One `Workflow` call for the whole ready batch.** Not one per issue — that would be a workflow of one, which is a subagent with extra steps.

Pass the batch through `args` as real JSON — a list of `{issue, slug, worktree, branch, title}` objects, one per issue that cleared step 3. Never a JSON-encoded string; the script would receive one string and `args.map` would throw.

The script's shape:

```js
export const meta = {
  name: 'orchestrate-round',
  description: 'Run one /implement pass per issue in an ironed-out batch',
  phases: [{ title: 'Implement' }],
}

const results = await pipeline(
  args,
  item => agent(BRIEF(item), { label: item.slug, phase: 'Implement', model: MODEL, schema: RESULT }),
)

return results.filter(Boolean)
```

- **`pipeline()`, not `parallel()`.** There is no cross-item stage here, so a barrier would only make every item wait for the slowest.
- **`schema`** forces each agent to return a validated object rather than prose. Ask for `{issue, verdict, branch, commit, halted_on}` — the same facts the verdict file holds, so the two can be checked against each other.
- **`model`** comes from the config, explicitly, per [SKILL.md](SKILL.md) → Worker agents and models. `agent()`'s enum includes `fable`; it is refused here like everywhere else.
- **`BRIEF(item)`** is [BRIEF.md](BRIEF.md), filled in. Add the same clause the subagent transport needs — the agent does not start inside the worktree:

> Work exclusively inside the git worktree at `<worktree-path>` — every command either runs with `git -C <worktree-path>` or after a `cd` into it. You did not start there.

**The handle is the run's `runId`**, plus the batch you passed. Record both: the `runId` is what resumes a partially failed round, and the batch is what tells you which worktrees exist.

The tool result also gives the path the script was persisted to, under the session directory. Keep it — editing that file and relaunching with `scriptPath` is how a round gets fixed without being retyped.

## `wake()`

Nothing to arm. One `<task-notification>` arrives when the whole round returns.

Still add the long `/loop` heartbeat (1200–1800s). One notification for a whole round means one thing that can fail to arrive, and a round can run for a long time before anyone notices it did not.

To watch mid-round, the human runs `/workflows` — per-agent progress, tokens, and a stop control. That is a human affordance, not a channel: **do not treat a running agent's progress line as a read.**

## `read(handle)`

The round's returned array — the validated objects your `schema` demanded, straight into context with no transcripts attached.

Check every element against its verdict file exactly as SKILL.md step 5 says. **The returned object is still prose's cousin** — it is what the agent asserted about itself. `<worktree>/tmp/claude/verify/<issue>.json` is the evidence, and a `PASS` in the array with no verdict file on disk is not a pass.

`null` in the array means that item's agent died or was skipped. Treat it as `unknown`: report it, retire it, leave the issue open.

If the round returned something surprising — empty, or shorter than the batch — read `<transcriptDir>/journal.jsonl` before theorising. It records each agent's actual return value.

## `retire(handle)`

Nothing to close; the run is over when it returns. SKILL.md step 7's worktree and branch teardown is the whole of retirement, and it runs **per item in the batch**, not per round.

To stop a round early, the human stops it from `/workflows`; completed agents keep their work. `TaskStop` on the run does the same from here. Never `rm -rf` a worktree belonging to a round that is still running.
