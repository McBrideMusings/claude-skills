---
name: driver-seat
description: Put the agent in the driver's seat of a settled plan or system and rewrite it so it is maximally legible, drivable, and accretive for an agent to operate. Use when the plan's structure is settled but nothing says how an agent drives or reads the system back, when a design doc reads as an assemblage of parts rather than a coherent tower of abstractions, or when a spec is about to be approved and no one has asked whether an agent could operate it. Triggers include "driver-seat", "agent-ergonomics pass", "put yourself in the driver's seat", "is this legible to an agent". Do NOT use for analytical work like debugging, code review, or implementation tasks, and do NOT use before the plan's structure exists — this rewrites a settled shape, it does not invent one.
---

# Driver-seat

## What this technique does

Puts the agent in the driver's seat of a plan or system that already has a shape, and asks what would most enable *that agent* to understand the situation accurately and drive it to correct results with the least wasted motion. It is not a divergence technique in the usual lateral sense — it does not generate options to choose between. It walks the system as a tower of linked abstractions and asks, level by level, whether the tower is legible, drivable, and accretive; then it edits the plan in place to close what it finds.

Source: [`../../grill-me/DRIVER-SEAT.md`](../../grill-me/DRIVER-SEAT.md) — read it in full before running this technique. It holds the prompt this technique embodies.

## Workflow

### Step 1: Confirm the target

A valid target is a plan, spec, or design document whose structure is already settled — phases named, components identified, the shape decided. Good phrasings: "run driver-seat over this plan before we lock it", "check whether this spec is drivable". If the structure is still open — nobody has decided the phases, components, or slices yet — refuse and say so: this technique rewrites a settled shape for legibility, it does not invent the shape. Point back at whatever produced the plan (`grill-me`, `to-tickets` Phase 03, the design doc itself) to finish settling it first.

### Step 2: Read the canonical text

Read [`../../grill-me/DRIVER-SEAT.md`](../../grill-me/DRIVER-SEAT.md) in full. Do NOT restate the prompt block from that file anywhere in your output — quote it nowhere. It is the one place in the repo that text lives.

### Step 3: Build the tower

Write the system as a tower of linked abstractions, top to bottom, one line per level, using the plan's own levels rather than a generic template. Mark every level that has no programmatic handle — nothing an agent can query, drive, or read back without a human doing it by hand.

### Step 4: Ask the three questions per level

For each level of the tower, in order, ask the three checkable questions from DRIVER-SEAT.md:

- **Agent-intuitive** — is the parent and the child concept each one hop away, and does the name match across code, docs, CLI, and tracker?
- **Agent-ergonomic** — can this level be driven and read back programmatically, with the fewest tokens to orient?
- **Agent-accretive** — what does the next level (or the next slice at this level) reuse from this one?

Not every level yields a change — a level with a clean programmatic handle and a consistent name gets no edit, and that is a correct result, not a gap in the pass.

### Step 5: Edit the plan in place

For every level that failed one of the three questions, make the smallest edit that adds the missing surface — a command, a schema, a fixture, a doc section, a renamed term. Edit the actual plan/spec/docs file; do not produce a separate report file.

### Step 6: Emit the changes list

Above the rewritten text, print the **"Driver-seat changes"** list: one line per change, what moved and why. Never a verdict on the plan as a whole, never the tower or the per-level questions as visible output — those are working material.

## Honesty mechanics

A level that yields no change is shown as such in the tower walk, not silently skipped — for example: `Level: ticket body → no gap found; already carries file:line and a runnable command.` A pass where every single level produces a change is a tell that the questions were rubber-stamped rather than actually asked against each level.

## What NOT to do

- **Don't invent structure.** If the plan has no settled shape yet, refuse per Step 1 rather than designing one under this technique's name.
- **Don't quote the prompt block.** Point at DRIVER-SEAT.md; never copy its text into a technique run, a finding, or a ticket body.
- **Don't produce a verdict.** "This plan is agent-ergonomic" or "this plan fails driver-seat" are not this technique's output — only the changes list and the edited text are.
- **Don't run it more than once per pass.** One driver-seat rewrite per settled plan; re-running it on the same plan without new structure just relitigates the same tower.

## References

- [`../../grill-me/DRIVER-SEAT.md`](../../grill-me/DRIVER-SEAT.md) — the canonical prompt, the three adjectives, the tower question, and the output contract
- [`examples/driver-seat.md`](../examples/driver-seat.md) — a real session showing the full shape, an honest no-change level included
