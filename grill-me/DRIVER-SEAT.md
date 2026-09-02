# Driver-seat pass

Put the agent in the driver's seat of a plan or system and rewrite the plan so the system is maximally legible, drivable and accretive for an agent. One canonical text — every host below points here rather than restating it. The `driver-seat` lateral technique ([`../lateral/techniques/driver-seat.md`](../lateral/techniques/driver-seat.md)) reads this file in full and never restates the prompt below.

## The prompt

> OK, now I want you to think deeply about how to make this entire system as agent-intuitive, agent-ergonomic, and agent-accretive as you can possibly imagine. Put yourself in the driver's seat and imagine that YOU are the one using this system and driving it. What would most enable you to do an awesome job understanding the situation accurately and optimally controlling everything to drive the best and most accurate results possible, with the least expenditure of resources?
>
> Then make all the requisite changes to the various design documents and plans accordingly. Don't just think of the project as an assemblage of various parts or components: really try to profoundly and deeply conceptualize it as a synthetic SYSTEM that is maximally coherent, cohesive, modular, and interconnected, forming a tower of linked abstractions that are maximally legible to you as an agent. Really ruminate and meditate on all of this incredibly deeply before responding or taking any actions.

## What the three adjectives ask

### Agent-intuitive

From any file or state, can the agent find the next abstraction up and the next one down in one hop? Is every name the same in the code, the docs, the CLI and the tracker?

**Checkable question: from any given file, is the parent concept and the child concept each one hop away, and does the name for this thing match across code, docs, CLI and tracker?**

### Agent-ergonomic

Can every feature be driven and read back programmatically — CLI, API, admin task, fixture — with the fewest tokens to orient? No screenshot-only state, no "run it and watch." This is the planning-time half of CLAUDE.md's rule: "Build the agentic control surface as you go, without being told: every feature is programmatically detectable or manipulable, so a program can drive the project and read back its state."

**Checkable question: can an agent drive this feature and read its resulting state back without a human eyeballing a screen?**

### Agent-accretive

Does each slice leave a surface — a command, a schema, a fixture, a doc section — that the next slice builds on, rather than a one-off?

**Checkable question: what does the next slice reuse from this one, and can you name it?**

## The tower question

Write the system as a tower of linked abstractions, top to bottom, one line per level — the plan's own levels, not a generic template (mission → epic → slice → ticket → file → function, or plan → phase → component → seam, whatever the system's actual shape is). Mark every level that has no programmatic handle: nothing an agent can query, drive, or read back without a human doing it for them.

## Output contract

The output shape depends on who wrote the target text — the host names which shape it uses.

**Shape A — agent-written text** (for example, a spec the agent itself just drafted, like `to-tickets` Phase 03): edit the text in place, then report a **"Driver-seat changes"** list above the rewritten text — one line per change, naming what moved and why. Both land in the same approval message.

**Shape B — user-written text** (for example, the plan `grill-me` Grill mode is interviewing): make no edit. Emit the changes as a numbered slate in chat — one row per change, stating what moves, where (section), and why, in the plan's own vocabulary — closing with: *"Type `go` to apply every row, or answer per row (`1 apply, 3 skip`)."* Apply only the accepted rows, and only once the reply arrives.

The lens never touches text the user wrote without the slate. Never a verdict, never scratch output either way: the tower, the per-level questions, and any abandoned branch are working material, not the deliverable.

## Rules

- Run once, after the plan's structure is settled — not before there is a structure to make legible, and not more than once per pass.
- Produces candidates, not lower bars. A change that cannot name the surface it adds is dropped.
