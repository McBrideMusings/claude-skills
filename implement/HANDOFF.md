# Handoff — from a cleared item to a running pass

**This document asks for `Workflow`.** A session carries a standing instruction not to call `Workflow` unless the user, a `CLAUDE.md` file, or a skill asks for it — this file is the skill asking. A session that reaches this document through any calling skill has that condition satisfied and may call `Workflow` per [`SKILL.md`](SKILL.md) directly; it does not need to ask again. This only ever runs from the chat session — `SKILL.md`'s pre-flight notes that `Workflow` is unavailable inside a subagent, so a session driving this from inside an `Agent` call cannot dispatch and should say so rather than try.

## 1. What "cleared" means

An item is dispatchable when four cheap queries all say so — this is a check, not a judgement call:

- **A slice.** `bd show <id> --json` carries a parent, `bd children <id>` is empty, and the title does not begin `Verify:` or `Land:`. A parent is broken down first (`issues/breakdown.md`) and its slices are what get offered; the Verify and Land children are this session's and never dispatch.
- **Open.** `bd show <id> --json` reads its status.
- **Not carrying the `human` label.** `human` is beads' one legal bare label, and there is deliberately no positive "AFK" label — removing `human` from an item is what makes it AFK. Check for its absence; do not invent a label to check for its presence.
- **Listed by `bd ready --json`.** Nothing blocks it. Run `bd recompute-blocked` first — `bd ready` reads a denormalized flag that goes stale after a hand-resolved merge and will silently hide ready work.

Passing all four makes an item eligible to offer, not verified. The `implement` pass runs its own Gate stage regardless, on every item, every time — this four-query check is a filter that keeps unready items off the offer, never a substitute for the pass's own gate.

## 2. The shape comes from the graph

Never ask the user which shape to use — compute it. `bd ready --json` is the unblocked front:

- Items in the front with no edges between them dispatch as a swarm — `implement swarm <ids>`.
- Items in the front with edges between them become a sequential queue, each behind its blocker — `implement <ids>` in dependency order.
- A mixed scope gets both: swarm the front, queue what sits behind it.

Never re-implement what `bd` computes. `bd ready`, `bd blocked`, and `bd swarm validate` answer all of this, and a second implementation is free to disagree with the one beads ships.

One constraint the graph does not carry: **two items whose briefs name the same file do not swarm**, because sibling branches collide by construction. Queue them instead. This is the general form of the append-target rule a swarm pass already has to honor for a single file everyone edits — a changelog, a file map, a component registry — extended to any file two briefs both name; the briefs say which files they touch, so this is readable without running anything.

A refinement to that rule: when the only file two briefs share is a **mount file** — a root component such as `App.jsx`, a router table, a barrel `index.*`, a plugin list — they do swarm. The test for a mount file: across the sibling briefs, the only change it ever takes is adding a line or a block that references the new work, never logic. When that test holds, rewrite each brief before dispatch: drop the mount file from its file list, and add the line `Mount: return the exact lines to add to <file> in followups; do not edit <file>`. The orchestrator applies the returned mount lines itself after landing each pass, one commit per pass, then re-runs that pass's `recheck`.

## 3. The offer is a slate row, never a new word

When an item clears, it does not invent vocabulary — it becomes one more row on the slate already in front of the user, in plain chat, never a tool-driven picker:

```
3. Dispatch cc-111 as an implement pass — AFK, nothing blocks it. My pick: dispatch.
```

`go` takes it with the rest of the slate. `3 skip` declines just that row. `park` applies every disposition, including this one, and stops rather than continuing into the dispatch. This is the machinery the user's own global instructions already define — a slate row accepted IS the ask, `go` is the only accept word, and `park` is the second word a slate that proposes next work names — so no third accept word is added here, and none should be added later.

Known cost: a dispatch row looks like every other row, so `go` can launch several workflows by momentum. Mitigate by naming the count in the row whenever it is more than one item: `Dispatch 4 items as a swarm — cc-111, cc-105, cc-140, cc-162`.

## 4. Who lands what comes back

The dispatching session — the one that offered the row and got `go`. It holds the whole picture: the interview that led here, the dispatch itself, and the verdict that comes back, and that is deliberate — nothing about verifying or landing a pass moves to the pass itself. See [`SKILL.md`](SKILL.md)'s verify loop ("The verify loop — this session's job, not the pass's") for the mechanics; this document does not restate them.

One line for the pressure valve: when the dispatching session's context fills, it `relay`s itself in the same pane, carrying the in-flight branch list forward so nothing landed or still running gets lost. How the relay carries that list is a separate concern from this one.
