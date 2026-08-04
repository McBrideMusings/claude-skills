---
name: ui-design
description: "Front door for UI/interface work, pre- and post-code — the orchestrator over the `_domains/ui/` knowledge store. Lowest-fidelity mode is an ASCII layout sketch (+ Monodraw stub), the first reach for any layout decision; broader questions layer in the craft lenses, AI-slop catalog, and motion-term glossary. Also critiques/audits existing interfaces, every verdict anchored to a concrete reason. Use for any UI/layout/typography/colour/motion decision or layout code change; the layers beneath the visual surface are `product-design`."
---

# ui-design

The front door for interface work — **pre-code and post-code**. Parallel to `game-dev` (which
orchestrates over `_domains/game/`), this skill orchestrates over the **`_domains/ui/`** knowledge
store: it does the *planning and sketching* (pre-code) **and the design-craft critique/audit** of an
interface that already exists (post-code), leaning on the store for the discipline lenses, the slop
catalog, and motion vocabulary. It does **not** own code *correctness*, tests, or verification — those
are the engines (`review`, `tdd`, `verify`, `diagnose`), which gain UI competence by reading
`_domains/ui/` and `_platforms/{web,apple}/` when the `ui` domain is in scope. The split: design judges
whether the interface is *good craft*; the engines judge whether the code is *correct*. Don't
reimplement the engines here.

## The one rule — judge craft, always name the reason

Design is the one place the global subjective-ban is *lifted* (see the design-craft exception in
`~/.claude/CLAUDE.md`). Here you MAY say a layout is stronger, a palette is off, a motion is
decoration, or an interface reads as AI-slop — and rank options. The catch: **every verdict is anchored
to a concrete reason** — a named principle, a specific slop tell from `_domains/ui/slop.md`, or a
measured value (contrast ratio, tracking, duration, spacing off the scale). Never a bare "feels right".
The line that still holds: this covers *craft quality of an interface*, not whether a game is fun.
Same contract as `_domains/ui/design.md`.

## Modes

- **`sketch` (default, lowest fidelity, first reach)** — an ASCII layout in chat + an empty `.monojson`
  stub on disk. The fastest way to get a layout in front of the user and a yes/no back. Reach for it
  first on any layout question. Procedure in [SKETCH.md](SKETCH.md) — load it when entering sketch mode.
- **Design lenses** — when the decision is *should this animate*, *how should this gesture feel*, *which
  principle does this serve*, *is the spacing/type/colour right*: load `_domains/ui/design.md` and apply
  its lenses (frequency, motion purpose, fluid-interaction, layout, typography, colour, Apple's eight
  principles, cohesion). Set the `ui` domain marker (`_domains/_detect.md`) when a repo's work is
  UI-centric, so the engines pick up the UI cells too.
- **`critique` / `audit` (post-code)** — an interface already exists and the question is "is this good?"
  / "what's weak?" Apply the `_domains/ui/design.md` lenses, run the `_domains/ui/slop.md` catalog, run
  the `_domains/ui/opportunities.md` pass when motion is in scope (the four-question gate, the hunt-seam
  sweep, and its **required** rejected-candidates section — this is what `improve`'s `ui` aspect is
  asking for), **and** run the `_domains/ui/fidelity.md` structural pass (does the surface honour the decisions in the layers
  below — vocabulary, object consistency, breadboard completeness, error recovery, accessibility). Return
  ranked findings, each with its concrete reason (named principle, slop tell, measured value, or fidelity
  discipline) and a proposed fix; tag each finding surface-fix or deeper-layer (route deeper ones to
  `product-design`). This is craft-quality judgement — now allowed. It is *not* code correctness or
  a11y/perf testing; that's the `review` / `verify` engines reading the same cells.
- **Naming a motion effect** — the user describes an effect loosely and wants the term ("the bouncy
  thing when a popover opens"): answer from `_domains/ui/vocabulary.md`. Lead with the term; add a
  competing alternate only if one genuinely applies. Naming, not building.
- **Writing alt text for an image** — in a component, a doc, a README, a slide: answer from
  `_domains/ui/alt-text.md`. Return the line itself, nothing around it. Writing the description, not
  auditing a page's accessibility.

## Findings-only invocation

When another skill (e.g. `improve`'s survey) invokes `critique` non-interactively: run it exactly as specified above — it already returns ranked findings with concrete reasons — with no file writes, no commits, no questions. Structure each finding as (finding, evidence/reason, strength, proposed fix, surface-fix vs deeper-layer tag).

## When NOT to use

- Pure logic, backend, or data work — no UI surface.
- A bug fix that doesn't change layout or motion.
- Reviewing or testing UI *code* — that's the `review` / `tdd` / `verify` engines (they read the UI
  cells themselves). This skill is the design-time decision, not the code pass.
- **The question is *which direction*, not *which arrangement*** — several genuinely different takes on
  one piece, differing on density, motion, personality, or interaction model. Sketch mode can't show
  those, so it filters on the wrong information: that's `prototype` (working variants in one standalone
  HTML file behind a picker). Sketch stays the cheaper first reach when there's one design and the open
  question is where things sit.
- Choosing a web library rather than designing the thing — `_domains/ui/libraries.md` answers it
  directly.

