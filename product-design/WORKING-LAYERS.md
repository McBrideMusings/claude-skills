# Working a layer — how to apply a cell

Each cell is a library of techniques, **not** a checklist to run to completion. Don't march every step
and emit a stack of artefacts.

1. **Find the live decisions.** What at this layer is genuinely undecided, risky, or worth surfacing?
   (`orient` finds these across all layers.) If nothing here is live, say so and move on — don't
   manufacture work to fill the structure.
2. **Offer a technique that fits the decision.** Each cell lists techniques with the situations they
   suit. Suggest one or two; let the human choose.
3. **Work the decision; capture only the residue.** Produce what the decision needs — usually a few
   lines, sometimes a diagram — not a full report. The conversation is the working surface.

## Principles (apply across all sessions)

1. **Decisions, not outputs.** An artefact is useful only insofar as it represents a decision made or surfaced. Name the decision, not just the diagram.
2. **Uncover before you resolve.** Surfacing decisions the human didn't know they needed is often worth more than answering the ones they did.
3. **Work at one layer at a time.** Conflating problem space with solution space, or surface with conceptual model, produces confused output.
4. **Check foundations before building upward.** Before an upper layer, audit the layer below; flag instability.
5. **The conceptual model is the most neglected load-bearing layer.** Give it more attention than feels comfortable.
6. **Flag bad decisions, not just missing ones.**
7. **Steer, don't be steered.** Don't jump to surface output before foundational decisions are made.
8. **Design principle vs. implementation decision.** Some decisions are stateable without knowing system constraints (what should happen from the user's view); others are entangled with implementation — articulate the UX requirement, shape a question, carry it into a design+engineering conversation. Don't force a premature answer.
9. **Capture decisions, not transcripts.** Default to lightweight output: decisions made, decisions surfaced, open questions. A diagram earns its place only when it encodes a decision. Each cell's "Produce" list is a menu, not a mandate.
10. **Push forward, pull back.** The layers aren't a one-way climb. When work at a layer feels floating, probe a layer or two up (sketch a flow, a screen, a bet) to discover what the lower layer actually needs, then come back down. Probing upward to *learn* ≠ committing upward to *build*.

## The time dimension — probe proactively

Temporal decisions get overlooked. They cluster at two layers:

**Conceptual model:** intermediate action states (saving/pending/approving are model states); read-model
lag (write→visible gap — flag as an engineering question); relationship temporality ("all products in
Europe" — now, or as membership changes?); deletion semantics (archive/trash/hard/regulatory); history
(does the object's past matter?).

**Interaction structure:** post-action state (after submit, what's shown? does the redirected list
reflect the change?); optimistic vs. pessimistic updates; empty/loading/partial states (every place has
a lifecycle — design all of them); error and failure paths (validation, server error, network drop,
concurrent edit — required steps, not afterthoughts).

## Failure-mode signals

**OOUX object failure modes** (Sophia Prater): **Shapeshifter** (same object, very different forms
across contexts — deeper fix if the model doesn't define it clearly); **Masked** (different object types
look identical); **Broken** (an object's data/actions scattered with no cross-linking → interaction
structure, `interaction-flow.md`); **Isolated** (objects with no visible relationships → conceptual
model, `conceptual-model.md`).

**Nielsen heuristics, root-layer mapping:** "match between system and real world" violations almost
always root in the *conceptual model*, not the surface; "user control and freedom" is an *interaction
structure* decision. Patching these at the surface treats symptoms.

## Capturing work

Capture is opt-in and light (principle 9). Ask once, early, whether to save a short decisions summary or
keep it in the conversation. Bias to brevity: the decisions made, surfaced, and open — not a retelling.
When writing Mermaid, use `<br/>` for line breaks in node labels (not `\n`).
