---
name: product-design
description: "Front door for the product-design layers beneath the visual surface — observed behaviour, domain vocabulary, user needs/job stories, product strategy/opportunity trees, conceptual model/OOUX, interaction structure/breadboarding — orchestrating the `_domains/product/` store. Default `orient` mode audits all layers and names the bottleneck; hands breadboards to `ui-design` at the surface. Use when the question is what to build and why, not how it looks — that's `ui-design`."
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
  Fast and light — a short audit table and one recommendation, not a report. Procedure (including the
  findings-only invocation other skills use) in [ORIENT.md](ORIENT.md) — load it when entering orient mode.
- **Work one layer** — when the live decision is known, load that layer's cell from `_domains/product/`
  and offer a technique that fits the decision. Each cell is a *library of techniques for one layer, not
  a script*. How to apply a cell, the working principles, the time dimension, and the failure-mode
  signals live in [WORKING-LAYERS.md](WORKING-LAYERS.md) — load it when working a layer.
- **Hand off to the surface** — when interaction structure is settled and the question becomes visual
  layout, `interaction-flow.md` hands its breadboard to `ui-design` sketch mode. Breadboard (structure)
  → ASCII sketch (layout) → craft lenses.

## Relationship to the rest of the account

- **`ui-design`** — the seventh layer (surface). `interaction-flow.md` breadboards hand off to its
  sketch mode. `product-design` decides *what and why*; `ui-design` decides *how it looks*.
- **`grill-me`** — pulls `_domains/product/user-needs.md` (job-story discipline) and `domain.md`
  (terminology-conflict discipline) into its elicitation interviews. Overlapping techniques live in the
  cells; `grill-me` reads them rather than duplicating.
- **`to-spec` / `to-tickets`** — consume the decisions this skill surfaces (needs, strategy, model) and
  turn them into a PRD / tickets. This skill does the *deciding*; those do the *writing-down and slicing*.

## When NOT to use

- Visual craft of an existing interface (motion/type/colour/layout/slop) — that's `ui-design`.
- Pure implementation, backend, or bug work with no design decision in play.
- Writing the PRD or cutting tickets — that's `to-spec` / `to-tickets` (this skill feeds them).
