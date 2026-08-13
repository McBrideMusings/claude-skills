# Transport: workflow

Workers are `workflow('implement', …)` child workflows inside a workflow script. The script holds the fan-out; the runtime executes it in the background; the whole batch returns at once as data.

**This transport is per-round, not per-worker.** It dispatches a batch, waits for the batch, lands the batch, and dispatches the next. Everything downstream of `wake()` in [SKILL.md](SKILL.md) happens in batches here.

**It calls the `Workflow` tool, which requires the human to have asked for it — invoking `/orchestrate` is that request.** Do not reach for `Workflow` anywhere else in this skill.

## What it cannot do — read this before dispatching

- **No mid-run input, at all.** The runtime's documented constraint: *only agent permission prompts can pause a run; for sign-off between stages, run each stage as its own workflow.* That is why a round is the unit — the sign-off between rounds is the landing step.
- **No filesystem or shell from the script itself.** Only its agents can read, write, and run commands. Worktrees are therefore created by SKILL.md step 3 **before** the workflow launches, exactly as under the other transports; the script never makes one.
- **The swarm dies with this session** — there is no reattach anywhere in this skill any more. A run is **resumable in-session** by its `runId`: unchanged calls return cached results and only the failed or edited ones re-run. A crashed orchestrator loses the round.
- **Claude only.** `[agents.codex]` is inert here.
- **Cost is not per-worker.** A round of N issues is N implement passes running at once. Watch `/workflows` for the running token total, and keep rounds small enough that a bad brief does not burn the whole frontier.

## `dispatch(batch)` → handle

**One `Workflow` call for the whole ready batch.** Not one per issue — that would be a workflow of one, which is a subagent with extra steps.

Pass the batch through `args` as real JSON — a list of `{issue, slug, worktree, branch, title, model}` objects, one per issue that cleared step 3. Never a JSON-encoded string; the script would receive one string and `args.map` would throw.

The script's shape:

```js
export const meta = {
  name: 'orchestrate-round',
  description: 'Run one /implement pass per issue in an ironed-out batch',
  phases: [{ title: 'Implement' }],
}

const results = await pipeline(
  args,
  item => workflow('implement', {
    resolved: item.item,          // already fetched and gated by the scope gate
    worktree: item.worktree,
    branch:   item.branch,
    model:    item.model,
    mode:     'continuous',
  }),
)

return results.filter(Boolean)
```

- **`workflow('implement', …)`, not `agent(BRIEF(item))`.** This is the whole point of the transport and it is not a stylistic choice. A worker that is one `agent()` call runs all six implement phases in one context: measured over 24h, 40 such workers averaged ~300 turns, peaked between 243k and 406k context, and were **37% of all token spend**. `workflow('implement')` runs the same pass with each phase in its own context, and only a small validated object crosses each boundary. `~/.claude/workflows/implement.js` holds the stages.
- **Nesting is exactly one level.** This script is the parent, `implement.js` is the child, and the child's stages are plain `agent()` calls that **cannot** open a further workflow. That is why `implement.js` inlines wrap-up's phases instead of calling `workflow('wrap-up')`. A third level throws at runtime, mid-round.
- **`pipeline()`, not `parallel()`.** There is no cross-item stage here, so a barrier would only make every item wait for the slowest.
- **`resolved`** carries the item the scope gate already fetched and cleared, so the child skips its own Resolve and Gate stages instead of re-fetching an issue this skill has already read. Pass the whole record, not just the number.
- **`model`** is **per item**, `"sonnet"` or `"haiku"`, resolved in step 3 by [SKILL.md](SKILL.md) → Picking the model per issue and carried in `args` — not one constant for the round. Do not omit it: with no `model` the child inherits the main-loop model, which is the orchestrator's own and frequently Opus. `opus` and `fable` are refused here like everywhere else.
- **[BRIEF.md](BRIEF.md) still governs worker behaviour** — `implement.js` reads the implement and wrap-up SKILL.md files itself, and the worktree clause is generated from the `worktree` argument. Do not paste the brief in as a prompt; pass the arguments and let the child assemble it.

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
