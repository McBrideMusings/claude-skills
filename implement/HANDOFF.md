# Brief — from a cleared item to a running pass

This only ever runs from the chat session: an `implement` pass never invokes itself
recursively, so a session driving this from inside an `Agent` call should say so rather than
try.

## 1. What "cleared" means

An item is offerable when four cheap queries all say so — this is a check, not a judgement call:

- **A slice.** `bd show <id> --json` carries a parent, `bd children <id>` is empty, and the title does not begin `Verify:` or `Land:`. A parent is broken down first (`issues/breakdown.md`) and its slices are what get offered; the Verify and Land children are this session's and never run as a pass.
- **Open.** `bd show <id> --json` reads its status.
- **Not carrying the `human` label.** `human` is beads' one legal bare label, and there is deliberately no positive "AFK" label — removing `human` from an item is what makes it AFK. Check for its absence; do not invent a label to check for its presence.
- **Listed by `bd ready --json`.** Nothing blocks it. Run `bd recompute-blocked` first — `bd ready` reads a denormalized flag that goes stale after a hand-resolved merge and will silently hide ready work.
- **Sized.** Count the distinct files the item's body names — paths, backticked or bare, under the repo root. Fewer than three, and the body does not state that the item is a fan-out root or an expand–contract stage, means the item is under `backlog spec`'s slice-size floor. This is checked here, against the whole scope, rather than per item, because merging needs the neighbour, which only a view of the whole scope can see. An under-floor item is not excluded here; it is flagged for the merge offer in § 2.

Passing all five makes an item eligible to offer, not yet ready to run. The readiness gate below is what decides that, run once per item, here in chat.

**The readiness gate.** A pass has no gate of its own — it trusts whatever it is handed — so this session applies three tests to the item text before ever offering it, reading code through an `Explore` subagent wherever the text alone does not settle a test. All three must pass:

1. **Plan test.** Can you state a concrete plan *right now* — the files to touch, the changes to make, and an objective acceptance check that would prove it done? If you cannot name the files, or cannot name a check whose result would settle whether it is finished, the item is not understood well enough to work unwatched.
2. **Objectivity test.** Is "done" verifiable without a qualitative, taste, product or design call that is the user's to make? Does the item hide an unresolved decision, missing information, or an ambiguity that would have to be *invented* to proceed? If so it fails — inventing that answer autonomously is exactly the mistake this gate exists to stop.
3. **Reachability test.** Does every file the item names, and every acceptance criterion, live inside the one repo it would be confined to? A nested submodule (for example `claude-skills` inside `~/.claude`) is a *different* repo even though it sits inside the parent's directory tree. An item naming a path in both fails this test and is split into one item per repo before either half is offered.

An item failing any test is not offered. Be strict: this gate exists to stop a pass that would otherwise guess at intent and produce confidently wrong work — a clear "not ready, here's why" is a good outcome, not a failure.

Bare `implement` resolves its item the same way `backlog next` would, in chat, before this gate runs; `implement <parent>` runs the breakdown in chat first, then gates each slice child the same way.

## 2. Sizing before the offer

Apply the floor from § 1 across whatever scope is being offered. Every under-floor item is paired with the in-scope neighbour it is joined to by an edge — its blocker, or the item it blocks. Pair it with its blocker when both are in scope. Each pair becomes one slate row:

```
2. Merge cc-111 into cc-112 — cc-111 names 2 files (src/tokens.js, src/styles.css) and cc-112 consumes both. My pick: merge.
```

`go` performs the merge in `bd`: the surviving item's body gains the absorbed item's body under a `## Absorbed from <id>` heading, dependencies are re-pointed onto the surviving item with `bd dep add`/`bd dep remove`, and the absorbed item is closed with `bd close <id> --reason "merged into <survivor-id>"`. A merged item runs as one pass. `<id> skip` leaves that item as is — offered on its own, under floor.

Never re-implement what `bd` computes for what's ready or blocked. `bd ready`, `bd blocked`, and `bd swarm validate` answer that, and a second implementation is free to disagree with the one beads ships.

## 3. The offer is a slate row, never a new word

When an item clears, it does not invent vocabulary — it becomes one more row on the slate already in front of the user, in plain chat, never a tool-driven picker:

```
3. Run cc-111 as an implement pass — AFK, nothing blocks it. My pick: run.
```

`go` takes it with the rest of the slate. `3 skip` declines just that row. `park` applies every disposition, including this one, and stops rather than continuing into the pass. This is the machinery the user's own global instructions already define — a slate row accepted IS the ask, `go` is the only accept word, and `park` is the second word a slate that proposes next work names — so no third accept word is added here, and none should be added later. Shape and canonical wording: [`../CHAT-FORMAT.md`](../CHAT-FORMAT.md) §Slate row and §Hatch.

When several items are ready at once, each still gets its own row — `implement` runs one item at a time, so there is no bundled "run all of these" word to reach for.

## 4. Who lands what comes back

The session that offered the row and got `go` — the same one that then runs the pass. It holds the whole picture: the interview that led here, the work itself, and the verdict, and that is deliberate. See [`SKILL.md`](SKILL.md) for the steps and the gate.

One line for the pressure valve: when this session's context fills mid-pass, `relay`'s own mid-pass case (`../relay/SKILL.md` §Relaying mid-pass) is what carries the branch forward — it only works between two of the pass's own commits, never over a dirty tree.
