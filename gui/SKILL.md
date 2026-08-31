---
name: gui
description: "Front door for design and UI/UX work at every layer — visual design, layout, typography, colour, motion, AI-slop, plus user needs, product strategy and conceptual model. Verbs: `orient` (default), `sketch`, `critique`, `direction`, `bolder`/`quieter`. Use for any what-to-build, how-it-looks, design-review, redesign, mockup or wireframe decision."
---

# gui — design at every layer

The front door for design work, **pre-code and post-code**, across all seven layers — from what users actually do up to the pixels they see. It orchestrates two knowledge stores:

- **`layers/`** — the six layers beneath the screen (problem space and solution space).
- **`_domains/gui/`** — the surface: craft lenses and the register modes, the AI-slop catalog,
  direction and comps, amplitude, states and copy, fidelity, motion vocabulary.

Parallel to `game-dev` (which orchestrates `_domains/game/`). It does **not** own code *correctness*, tests, or verification — those are the engines (`review`, `tdd`, `verify`, `diagnose`), which gain UI competence by reading `_domains/gui/` and `_domains/{web,apple}/` when the `gui` label is in scope. The split: design judges whether the thing is *well designed*; the engines judge whether the code is *correct*. Don't reimplement the engines here.

Layers 1–6 adapted from **jamiemill/layers-skills** (MIT) — the Layers of Product Design framework, itself inspired by Jesse James Garrett's *The Elements of User Experience* (2000). Layer-7 craft material adapted from **Impeccable** (`pbakaus/impeccable`, Apache-2.0) and **Taste Skill** (`Leonxlnx/taste-skill`, MIT); each cell carries its own attribution.

## The framework — seven layers, three zones

Layers have *logical dependency*: lower layers are foundations for upper ones. Weak lower layers create UX debt that propagates upward.

**Reality** — complex, contradictory, evolving. Source of all learning.

**Problem space** — knowledge gathered from reality:
1. **Observed behaviour** — what users actually do → `layers/observed-behaviour.md`
2. **The domain** — concepts, terminology, mental models that exist independently of any product → `layers/domain.md`
3. **User needs** — what users are trying to achieve, and why → `layers/user-needs.md`

**Solution space** — deliberate decisions about what to build:
4. **Product & service strategy** — which needs to serve, what outcome to target → `layers/product-strategy.md`
5. **Conceptual model** — objects, relationships, states, vocabulary, interface-independent → `layers/conceptual-model.md`
6. **Interaction structure & flow** — places, affordances, connections, flow logic → `layers/interaction-flow.md`
7. **Surface** — words, visuals, feedback, hierarchy — what users encounter → `_domains/gui/`

The layers are not a linear process. Enter anywhere — but always check whether the foundations below are sound.

## The one rule — always name the reason

Every verdict is anchored to a concrete reason. At layers 1–6 that means stating a bad decision as a fact ("the model treats `Order` and `Cart` as one object but the surface shows them as two — that's a Shapeshifter"), never as "this feels off". At layer 7 it means a named principle, a specific slop tell from `_domains/gui/slop.md`, or a measured value (contrast ratio, tracking, duration, spacing off the scale) — never a bare "feels right". Ranking layouts, palettes and motion is the job here; ranking them *without* the reason is not.

The line that still holds: this covers *design quality*, not whether a game is fun.

## Design is decision-making — four kinds of progress

1. **Making decisions** — resolving something undecided.
2. **Uncovering unmade decisions** — discovering what hasn't been decided yet (often more valuable than 1).
3. **Evaluating decisions** — naming decisions already made that are risky, inconsistent, or wrong.
4. **Prioritising decisions** — lower layers are more foundational and carry more risk if wrong.

The job is to help the human make better decisions — **never to make them for them**.

## Modes

### Beneath the surface (layers 1–6)

- **`orient` (default when the question is *what to build*)** — a rapid diagnostic across all seven layers: rate each, name the **bottleneck** (the lowest layer with unresolved/risky decisions), recommend which layer to work next. Fast and light — a short audit table and one recommendation, not a report. Procedure (including the findings-only invocation other skills use) in [ORIENT.md](ORIENT.md) — load it when entering orient mode.
- **Work one layer** — when the live decision is known, load that layer's cell from `layers/` and offer a technique that fits the decision. Each cell is a *library of techniques for one layer, not a script*. How to apply a cell, the working principles, the time dimension, and the failure-mode signals live in [WORKING-LAYERS.md](WORKING-LAYERS.md) — load it when working a layer.

### The surface (layer 7)

- **`sketch` (lowest fidelity, first reach for any layout question)** — an ASCII layout in chat, plus a blank `.monojson` canvas stub on disk only if asked. The fastest way to get a layout in front of the user and a yes/no back. Procedure in [SKETCH.md](SKETCH.md) — load it when entering sketch mode. When ASCII can't carry the layout — real proportions, a wrapping grid, a long scroll, anything where *how much space each region takes* is the actual question — escalate to a rendered greybox, which is `spike`'s lowest fidelity — `~/.claude/skills/spike/tool/spike build --kind wireframe` (see SKETCH.md for when, and `../spike/SKILL.md` for the ladder above it). Still colourless, still structure only; the same decision at a fidelity ASCII can't reach.
- **Design lenses** — when the decision is *should this animate*, *how should this gesture feel*, *which principle does this serve*, *is the spacing/type/colour right*: load `_domains/gui/design.md` and apply its lenses (frequency, motion purpose, fluid-interaction, layout, typography, colour, Apple's eight principles, cohesion). Set the `gui` label in `.claude/domain` (`_domains/_detect.md`) when a repo's work is UI-centric, so the engines pick up the GUI cells too.
- **`critique` / `audit` (post-code)** — an interface already exists and the question is "is this good?" / "what's weak?" Apply the `_domains/gui/design.md` lenses, run the `_domains/gui/slop.md` catalog, run the `_domains/gui/opportunities.md` pass when motion is in scope (the four-question gate, the hunt-seam sweep, and its **required** rejected-candidates section — this is what `improve`'s `gui` aspect is asking for), **and** run the `_domains/gui/fidelity.md` structural pass (does the surface honour the decisions in the layers below — vocabulary, object consistency, breadboard completeness, error recovery, accessibility). Return ranked findings, each with its concrete reason and a proposed fix; tag each finding surface-fix or deeper-layer, and take the deeper ones into the matching `layers/` cell. Close with the standard escape hatch: `go` to apply every pick as tagged (deeper ones routed into their `layers/` cell), or `park` to apply them and stop. It is *not* code correctness or a11y/perf testing; that's the `review` / `verify` engines reading the same cells.
- **`direction` (new surface, or a replacement look)** — the question is *which visual world*, before
  any arrangement question. Load `_domains/gui/direction.md`. It carries the one finding that makes
  this a mode rather than a judgement call: a model's resonance ranking is deterministic across prompt
  framings, so the direction index is drawn from outside the model, presented as one hand with a re-roll,
  and raised by fused challengers. The same cell owns
  the comp discipline and the single path to image generation (the `generate` skill — never a direct
  API call from here).
- **`bolder` / `quieter` / `distill` / `overdrive` (the world is settled, the volume is wrong)** — load
  `_domains/gui/amplitude.md`. Scope is sovereign in all four: touch only the named target and add no
  colour, font, radius or primitive the surface doesn't already own.
- **States, edges and interface copy** — empty states, error messages, loading, first-run, i18n,
  overflow, destructive-action wording: `_domains/gui/states.md`. Run it as part of `critique` on any
  Operate surface; a happy path at full craft with browser-default everything else is the most reliable
  sign nobody used the thing.
- **Naming a motion effect** — the user describes an effect loosely and wants the term ("the bouncy thing when a popover opens"): answer from `_domains/gui/vocabulary.md`. Lead with the term; add a competing alternate only if one genuinely applies. Naming, not building.
- **Writing alt text for an image** — in a component, a doc, a README, a slide: answer from `_domains/gui/alt-text.md`. Return the line itself, nothing around it. Writing the description, not auditing a page's accessibility.

### The seam

When interaction structure is settled and the question becomes visual layout, `layers/interaction-flow.md` hands its breadboard straight to **sketch mode**. Breadboard (structure) → ASCII sketch (layout) → craft lenses. This is one hop inside this skill, not a handoff to another one.

## Findings-only invocation

When another skill (e.g. `improve`'s survey) invokes `critique` non-interactively: run it exactly as specified above — it already returns ranked findings with concrete reasons — with no file writes, no commits, no questions. Structure each finding as (finding, evidence/reason, strength, proposed fix, surface-fix vs deeper-layer tag). The equivalent contract for `orient` is in [ORIENT.md](ORIENT.md).

## Relationship to the rest of the account

- **`grill-me`** — pulls `layers/user-needs.md` (job-story discipline) and `layers/domain.md` (terminology-conflict discipline) into its elicitation interviews. Overlapping techniques live in the cells; `grill-me` reads them rather than duplicating.
- **`to-tickets`** — consumes the decisions this skill surfaces (needs, strategy, model) and turns them into a spec and tickets. This skill does the *deciding*; that one does the *writing-down and slicing*.
- **`spike`** — when the question is *which direction*, not *which arrangement*.

## When NOT to use

- Pure logic, backend, or data work — no design decision in play.
- A bug fix that doesn't change layout or motion.
- Reviewing or testing UI *code* — that's the `review` / `tdd` / `verify` engines (they read the UI cells themselves). This skill is the design-time decision, not the code pass.
- **The question is *which direction*, not *which arrangement*** — several genuinely different takes on one piece, differing on density, motion, personality, or interaction model. Sketch mode can't show those, so it filters on the wrong information: that's `spike` (working variants in one standalone HTML file behind a picker). Sketch stays the cheaper first reach when there's one design and the open question is where things sit.
- Writing the PRD or cutting tickets — that's `to-tickets` (this skill feeds it).
- Choosing a web library rather than designing the thing — `_domains/gui/libraries.md` answers it directly.
