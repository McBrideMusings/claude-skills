# Handoff — from a cleared item to a running pass

**This document asks for `Workflow`.** A session carries a standing instruction not to call `Workflow` unless the user, a `CLAUDE.md` file, or a skill asks for it — this file is the skill asking. A session that reaches this document through any calling skill has that condition satisfied and may call `Workflow` per [`SKILL.md`](SKILL.md) directly; it does not need to ask again. This only ever runs from the chat session — `SKILL.md`'s pre-flight notes that `Workflow` is unavailable inside a subagent, so a session driving this from inside an `Agent` call cannot dispatch and should say so rather than try.

## 1. What "cleared" means

An item is dispatchable when four cheap queries all say so — this is a check, not a judgement call:

- **A slice.** `bd show <id> --json` carries a parent, `bd children <id>` is empty, and the title does not begin `Verify:` or `Land:`. A parent is broken down first (`issues/breakdown.md`) and its slices are what get offered; the Verify and Land children are this session's and never dispatch.
- **Open.** `bd show <id> --json` reads its status.
- **Not carrying the `human` label.** `human` is beads' one legal bare label, and there is deliberately no positive "AFK" label — removing `human` from an item is what makes it AFK. Check for its absence; do not invent a label to check for its presence.
- **Listed by `bd ready --json`.** Nothing blocks it. Run `bd recompute-blocked` first — `bd ready` reads a denormalized flag that goes stale after a hand-resolved merge and will silently hide ready work.
- **Sized.** Count the distinct files the item's body names — paths, backticked or bare, under the repo root. Fewer than three, and the body does not state that the item is a fan-out root or an expand–contract stage, means the item is under `backlog spec`'s slice-size floor. This is checked here, against the whole queue, rather than in the pass's own Gate, because Gate sees one item at a time and can only halt it — merging needs the neighbour, which only the orchestrator can see. An under-floor item is not excluded here; it is flagged for the merge offer in § 2.

Passing all five makes an item eligible to offer, not verified. The `implement` pass runs its own Gate stage regardless, on every item, every time — this five-query check is a filter that keeps unready items off the offer, never a substitute for the pass's own gate.

## 2. The shape comes from the graph

Before computing shape, apply the floor from § 1 across the whole queue. Every under-floor item is paired with the in-scope neighbour it is joined to by an edge — its blocker, or the item it blocks. When both are in scope, pair it with its blocker: a sequential queue commits to landing the blocker first regardless, so folding the smaller item into the one already ahead of it in line adds no new ordering decision. Each pair becomes one slate row:

```
2. Merge cc-111 into cc-112 — cc-111 names 2 files (src/tokens.js, src/styles.css) and cc-112 consumes both. My pick: merge.
```

`go` performs the merge in `bd`: the surviving item's body gains the absorbed item's body under a `## Absorbed from <id>` heading, dependencies are re-pointed onto the surviving item with `bd dep add`/`bd dep remove`, and the absorbed item is closed with `bd close <id> --reason "merged into <survivor-id>"`. A merged item runs as one pass. `<id> skip` leaves that item as is — offered on its own, under floor.

With merges applied, compute the shape. `bd ready --json` is the unblocked front:

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
