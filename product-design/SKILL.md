---
name: product-design
description: "Front door for the six product-design layers *beneath* the visual surface — the orchestrator over the `_domains/product/` knowledge store, parallel to how `ui-design` orchestrates `_domains/ui/`. Covers the problem-space and solution-space design DECISIONS that come before pixels: what users actually do (observed behaviour), the real-world concepts and vocabulary (domain), what users are trying to achieve (user needs / job stories), which needs to serve for what outcome (product strategy / opportunity trees), the objects/relationships/states independent of any interface (conceptual model / OOUX), and the places/affordances/flow logic (interaction structure / breadboarding). Its default `orient` mode audits all seven layers and names the bottleneck. Hands the breadboard off to `ui-design` sketch mode at the surface. Adapted from jamiemill/layers-skills (MIT). Use when the question is *what to build and why*, not *how it looks* — 'model the objects for this', 'turn these interviews into job stories', 'map the domain terminology', 'what layer is my problem really at', 'breadboard this flow', 'build an opportunity solution tree', '/product-design'. For the visual craft of an interface that already exists, that's `ui-design`."
---

# product-design

The front door for the **design decisions underneath the screen** — parallel to `ui-design` (which
owns the *surface*: visual craft, motion, type, colour, slop). This skill orchestrates over the
**`_domains/product/`** knowledge store, the same way `ui-design` orchestrates `_domains/ui/` and
`game-dev` orchestrates `_domains/game/`. It does the *problem-space and solution-space* thinking that
must be sound before the surface can be right.

Adapted from **jamiemill/layers-skills** (MIT) — the Layers of Product Design framework, itself
inspired by Jesse James Garrett's *The Elements of User Experience* (2000).

## The framework — seven layers, three zones

Layers have *logical dependency*: lower layers are foundations for upper ones. Weak lower layers create
UX debt that propagates upward.

**Reality** — complex, contradictory, evolving. Source of all learning.

**Problem space** — knowledge gathered from reality:
1. **Observed behaviour** — what users actually do → `_domains/product/observed-behaviour.md`
2. **The domain** — concepts, terminology, mental models that exist independently of any product → `_domains/product/domain.md`
3. **User needs** — what users are trying to achieve, and why → `_domains/product/user-needs.md`

**Solution space** — deliberate decisions about what to build:
4. **Product & service strategy** — which needs to serve, what outcome to target → `_domains/product/product-strategy.md`
5. **Conceptual model** — objects, relationships, states, vocabulary, interface-independent → `_domains/product/conceptual-model.md`
6. **Interaction structure & flow** — places, affordances, connections, flow logic → `_domains/product/interaction-flow.md`
7. **Surface** — words, visuals, feedback, hierarchy — what users encounter → **not here; that's `ui-design`**

The layers are not a linear process. Enter anywhere — but always check whether the foundations below
are sound.

## The one rule — this is decisions, not craft-taste

`ui-design` carries the carved subjective-ban exception (it may rank *visual craft*). This skill does
**not** rank taste — it works **decisions**. That is fully allowed under the global rules: naming which
decisions are unmade, evaluating a made decision as risky/inconsistent/wrong, and prioritising by which
layer is most foundational are all *objective* moves about the state of the design, not verdicts on
whether something is fun or pretty. Flag a bad decision as a fact ("the model treats `Order` and
`Cart` as one object but the surface shows them as two — that's a Shapeshifter"), never as "this feels
off". Do not drift into surface craft-ranking here; route that to `ui-design`.

## Design is decision-making — four kinds of progress

1. **Making decisions** — resolving something undecided.
2. **Uncovering unmade decisions** — discovering what hasn't been decided yet (often more valuable than 1).
3. **Evaluating decisions** — naming decisions already made that are risky, inconsistent, or wrong.
4. **Prioritising decisions** — lower layers are more foundational and carry more risk if wrong.

The job is to help the human make better decisions — **never to make them for them**.

## Modes

- **`orient` (default, first reach)** — a rapid diagnostic across all seven layers: rate each, name the
  **bottleneck** (the lowest layer with unresolved/risky decisions), recommend which layer to work next.
  Fast and light — a short audit table and one recommendation, not a report. Procedure below.
- **Work one layer** — when the live decision is known, load that layer's cell from `_domains/product/`
  and offer a technique that fits the decision. Each cell is a *library of techniques for one layer, not
  a script*: find the live decision, offer one or two techniques, work the decision, capture only the
  residue.
- **Hand off to the surface** — when interaction structure is settled and the question becomes visual
  layout, `interaction-flow.md` hands its breadboard to `ui-design` sketch mode. Breadboard (structure)
  → ASCII sketch (layout) → craft lenses.

## How to apply a layer cell

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

## `orient` mode procedure

Ask three framing questions, then audit each layer:

1. What product or feature are you working on?
2. What design challenge are you facing right now?
3. How far along — early exploration, active design, or fixing an existing product?

Rate each layer **Strong / Partial / Assumed / Weak / Not started / N/A** with one or two targeted
questions each (observed behaviour: what research exists? domain: how well is the space understood?
user needs: can the underlying job be articulated, not features? strategy: which need, which outcome,
is the link explicit? conceptual model: clear shared object model? interaction structure: clear key
journeys — breadboard/flow/code? surface: existing design system to fit?).

Produce a short audit table:

```
Layer                      | State       | Notes
---------------------------|-------------|----------------------------------------
Observed behaviour         |             |
The domain                 |             |
User needs                 |             |
Product & service strategy |             |
Conceptual model           |             |
Interaction structure      |             |
Surface                    |             |
```

**Bottleneck analysis:** name the lowest layer with Weak/Assumed/Not-started state — what decisions are
missing, what risk that creates above. Flag **assumed** layers separately (treated as decided but
unverified — the most dangerous). If a deadline changes the calculus, say so; sometimes the right move
isn't the most foundational one — name that tradeoff.

**Recommendation:** one specific layer cell to work next, and why. Close with a genuine offer to run it
or push back first.

## Relationship to the rest of the account

- **`ui-design`** — the seventh layer (surface). `interaction-flow.md` breadboards hand off to its
  sketch mode. `product-design` decides *what and why*; `ui-design` decides *how it looks*.
- **`grill-me`** — pulls `_domains/product/user-needs.md` (job-story discipline) and `domain.md`
  (terminology-conflict discipline) into its elicitation interviews. Overlapping techniques live in the
  cells; `grill-me` reads them rather than duplicating.
- **`to-spec` / `to-tickets`** — consume the decisions this skill surfaces (needs, strategy, model) and
  turn them into a PRD / tickets. This skill does the *deciding*; those do the *writing-down and slicing*.

## Capturing work

Capture is opt-in and light (principle 9). Ask once, early, whether to save a short decisions summary or
keep it in the conversation. Bias to brevity: the decisions made, surfaced, and open — not a retelling.
When writing Mermaid, use `<br/>` for line breaks in node labels (not `\n`).

## When NOT to use

- Visual craft of an existing interface (motion/type/colour/layout/slop) — that's `ui-design`.
- Pure implementation, backend, or bug work with no design decision in play.
- Writing the PRD or cutting tickets — that's `to-spec` / `to-tickets` (this skill feeds them).
