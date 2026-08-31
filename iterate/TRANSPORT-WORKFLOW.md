# Transport: workflow

Each `/implement` pass runs as `workflow('implement', { … })` — a child workflow, not a single `agent()` call. The script holds the outer loop; the runtime executes it in the background; this session holds only the final report.

**One workflow call is one chunk — at most 5 iterations, never the whole queue.** A longer run is several chunks with a `relay` between them, so the context that accumulates around a run (pre-flight, resolved queue, outcomes, report) resets every 5 items instead of growing for 20. [SKILL.md](SKILL.md) owns the chunk/run cap split; this file owns the script that works one chunk.

The relay boundary and the workflow boundary **must be the same boundary**: `resumeFromRunId` only works inside the session that launched the run, so relaying mid-workflow would abandon a live run with no way to resume it.

**Never `agent(PASS(item))`.** A pass dispatched as one agent runs all six implement phases in one growing context — see [SKILL.md](SKILL.md) for why that dominates token spend. `workflow('implement')` gives each phase its own context. Nesting is one level: this script is the parent, `~/.claude/workflows/implement.js` is the child, and the child's stages are plain agents.

Selected by the `workflow` token in the arguments. **That token is the human's request for the `Workflow` tool** — do not reach for it otherwise.

## ⛔ Sequential. Never `pipeline()`, never `parallel()`.

The script uses a plain `for … of` with `await`, one agent at a time, start to finish.

Every other workflow in this repo fans out; this one must not. Each iteration branches from the *current* head of the default line and lands into it, so two concurrent agents would branch from the same head and race each other into the default branch — the exact failure the one-branch-one-item design exists to prevent. `pipeline()` here does not make the run faster, it makes it corrupt.

If you want concurrency, the answer is `/orchestrate`, which pays for it with a worktree per worker.

## The script

```js
export const meta = {
  name: 'iterate-chunk',
  description: 'Run one /implement pass per queued item, sequentially, landing each',
  phases: [{ title: 'Iterate' }],
}

// args.queue is THIS CHUNK's slice — at most 5 items, sliced by SKILL.md before launch.
// args.used is how many iterations earlier chunks already spent, against the run cap of 20.
const outcomes = []
for (const item of args.queue) {
  if (args.used + outcomes.length >= args.runCap) break
  const r = await workflow('implement', { resolved: item.item, branch: item.branch, model: MODEL, mode: 'continuous', land: 'self' })
  outcomes.push(r)
  if (r && r.outcome === 'environment_stop') break
  log(`${args.used + outcomes.length}/${args.runCap}: ${item.label} -> ${r ? r.outcome : 'died'}`)
}
return outcomes
```

- **`args`** carries this chunk's slice of the queue, `used` and `runCap`, the default branch name, and the ownership verdict — resolved by [SKILL.md](SKILL.md) before launch. Pass it as real JSON, never a JSON-encoded string.
- **`args.used` is what survives a relay.** The chunk itself is stateless; the running total travels in the relay brief and comes back in as `used`. Drop it and the 20-iteration safety valve never fires, because every chunk starts counting from zero.
- **Slice, never re-resolve.** The chunk's queue is a slice of the frozen queue handed forward verbatim. A relayed context that re-runs the selector gets a different queue — the backlog moved while this run was landing branches.
- **`land: 'self'`** — unlike an `/orchestrate` worker, an iterate pass lands its own branch and closes its own item. That is the child's default when no `worktree` is passed, but state it: the contrast with `/orchestrate`'s `land: 'caller'` is the whole reason the two loops differ, and `mode: 'continuous'` is identical in both.
- **`schema`** forces each agent to return `{item, outcome, branch, landed, reason}` rather than prose. `outcome` is one of `landed` / `item_failure` / `environment_stop`, matching SKILL.md's own classification — do not invent a fourth.
- **The `break` on `environment_stop` is the rule from SKILL.md**, not a new one: an item-level failure skips, an environment stop ends the run. The script is where that rule becomes mechanical instead of remembered.
- **BACKLOG-WIDE runs work here too**, with no frozen queue to hand `args` — the loop becomes a `while` and each agent runs triage itself. Iterations are sequential and each lands before the next starts, so an agent's `gh issue list` does see what the previous one closed; picking is not blind. Two costs to accept before choosing it, though:

  ```js
  const outcomes = []
  while (outcomes.length < args.chunkCap && args.used + outcomes.length < args.runCap) {
    const r = await workflow('implement', { model: MODEL, mode: 'continuous', land: 'self' })  // no item: implement's Resolve stage picks one via triage
    outcomes.push(r)
    if (!r || r.outcome !== 'landed') break        // backlog-wide: first halt wins (SKILL.md)
  }
  return outcomes
  ```

  Backlog-wide chunks are bounded by `chunkCap` (5) rather than a slice, since there is no frozen queue to slice. The relay brief carries `used` forward exactly the same way.

  1. **The stopping condition is an agent's word.** A scoped run ends when a list you can see runs out. This one ends when an agent reports that triage found nothing actionable — the script has no way to check that claim. A wrong report ends the run early or burns an iteration on nothing.
  2. **A full triage read per iteration**, inside every agent, on top of the pass itself.

  Prefer resolving a selector first and running scoped. Reach for backlog-wide here when you genuinely want "whatever is next, twenty times" and are content to trust each pass's own account of the backlog.

## What the agent must do that the script cannot

**The script has no filesystem or shell access.** Everything git is the agent's job, so the per-iteration brief carries the whole block from SKILL.md's loop, not just step 4:

> Refresh to the default branch and fast-forward it. Cut `auto-iterate/<UTC timestamp you generate now>`. Run `/implement <item> continuous`. Confirm the branch landed. If the tree will not come back clean or the pull no longer fast-forwards, return `environment_stop` with what you found — do not attempt the item.

The timestamp is generated **by the agent**, in its shell. Workflow scripts cannot call `Date.now()` or `new Date()` — they throw, because a clock would break resume.

## Caps interact — read both

- **SKILL.md's run cap of 20 iterations** is the safety valve, enforced by the `args.used + outcomes.length >= args.runCap` break above and carried across relays in `args.used`.
- **SKILL.md's chunk cap of 5** is what one workflow call may schedule. It sits comfortably under this session's `medium` workflow size guideline of 15 agents, which the old cap of 20 did not — chunking is how that conflict got resolved rather than documented.

A workflow scheduling more than 25 agents, or projecting past 1.5M tokens, raises a `Large workflow` warning in the task panel. A 5-item chunk never gets near it.

## Reading the result

One `<task-notification>` when the whole run returns; the return value is the `outcomes` array, straight into context with no transcripts attached.

`null` in the array means that agent died — treat it as an item-level failure with an unknown reason, and say so in the report rather than guessing.

If the array is empty or shorter than expected, read `<transcriptDir>/journal.jsonl` before theorising. It records each agent's actual return value.

The tool result gives the persisted script path and a `runId`. Keep both: editing the script and relaunching with `scriptPath`, or resuming with `resumeFromRunId`, is how a run that died halfway continues without re-doing the passes that already landed. **Resume only works within the same session.**

## What this buys, and what it costs

**Buys:** twenty passes without twenty passes' worth of context in this window; a codified loop you can read and re-run; resumability within a chunk; a stop control in `/workflows`. Chunking adds the rest: the scaffolding *around* the passes resets every 5 items instead of growing across all 20.

**Costs of chunking specifically:** one pre-flight per chunk instead of one per run — four git-refresh-and-verify rounds over a 20-item queue rather than one. That is the price of four clean contexts, and it is the cheaper half of the trade.

**Costs:** you cannot answer a permission prompt to keep a pass alive — the runtime pauses only for agent permission prompts and takes no other input. A prompt nobody answers is the run's problem, not a pause. implement's BASH COMMAND RULES are load-bearing here: one non-allowlisted command kills a pass.
