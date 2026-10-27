---
name: redesign
description: "Rethink a UI, process or feature that isn't working, from how the system works up to how it looks. Use when something is hard to use or laid out wrong, when the user asks to redesign, rethink or start over, or when a pass builds a new UI surface. Starts by checking the code does what the interface implies. Not for bugs, polish or small tweaks."
---

# Redesign

Control words (`go`, `park`, `dispatch`, `implement`, `verify` …) are defined in
[`../CONTEXT.md`](../CONTEXT.md).

A hard-to-use interface usually misrepresents the system under it. The interface is a mix of ideas about how the system works, or the system doesn't work the way the interface says (a list that is really several lists, a queue that never fills ahead). So a redesign works forward from the system: what it does, what the user wants, how the two meet, and only then what it looks like. Starting at the surface repaints the mismatch.

**Two entries.** An existing thing that isn't working runs steps 0–4. A new UI surface with no existing thing to check runs step 4 only. Anything else (a bug, polish, a one-line tweak) is not this skill: say so in one line and stop.

## Steps

Each step ends on a completion criterion. Do not start step 4 before step 3's decisions are made.

**0. Name what isn't working.** One sentence from the user, and whether the target is a screen, a process or a feature. *Done when* the sentence and target are written down.

**1. The system as built.** Read the code, not the docs, and run [`../ref-cells/gui/layers/system-as-built.md`](../ref-cells/gui/layers/system-as-built.md). *Done when* every collection, count, status, queue and action the target shows has a row (interface implies | code does | `file:line`) or is marked `Unknown`.

**2. What.** List what the user wants to do, and what the system can do about each, separate from how it does it and how the screen presents it. Take the jobs from [`../ref-cells/gui/layers/user-needs.md`](../ref-cells/gui/layers/user-needs.md). Mark each job *native*, *by workaround* or *cannot*. *Done when* every job in scope has one mark.

**3. Conceptual model.** Reconcile step 1's mismatches against the objects, relations, states and verbs in [`../ref-cells/gui/layers/conceptual-model.md`](../ref-cells/gui/layers/conceptual-model.md). Each mismatch is a decision for the user, labelled by what it does: *make the interface say what the system does*, *make the system do what the interface says*, or *change both*. Present them as an option set per [`../CHAT-FORMAT.md`](../CHAT-FORMAT.md), then wait. A fix that is a guard (retry, cache, refresh button) is labelled as one. *Done when* each mismatch has a decision.

**4. Structure and surface.** Only now: the flow ([`../ref-cells/gui/layers/interaction-flow.md`](../ref-cells/gui/layers/interaction-flow.md)), then the surface.

- **A new look for a UI surface** (a new surface, or the user asked for one): run [`../ref-cells/gui/direction.md`](../ref-cells/gui/direction.md). It derives grounded directions and assigns one with a roll outside the model, because the model's own pick repeats. Hand the assigned direction to `spike` as variants.
- **An existing surface with a `DESIGN.md`**: the design system is the standard. Redesign the flow and structure inside it and skip the roll unless the user asks for a new look.
- **A process or feature with no screen**: lay out the steps and handoffs the same way. If this step stalls, `lateral concept-fan` generates the missing options.

*Done when* the user has seen the flow and each surface variant, rendered.

## What this never does

- Decide for the user. Steps 1–3 surface decisions; the user makes them.
- Start from the surface because the surface is where the complaint was.
- Re-ask a decision step 3 already settled.

## Callers

`improve`'s `gui` and `product` aspects name `redesign <target>` as the fix for a deeper-layer finding and never run it inside a survey. `implement` runs step 4's roll before building a new UI surface in a repo with no `DESIGN.md`. `spike` runs it when a variant set collapses onto one direction.
