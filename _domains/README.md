# `_domains/` — shared domain-knowledge store

Not a skill. A **matrix of domain × engine** knowledge layered on top of `_platforms/`. A *domain*
is a mode of software development (`game`, …) that adds knowledge the platform axis can't carry — a
game needs game-loop determinism and playtest discipline whether it runs on three.js, SpriteKit, or
Unity. The leading `_` and the absence of any `SKILL.md` keep this directory from registering as a
skill (same mechanism as `_platforms/`).

## vs `_platforms/`

- `_platforms/<p>/` = the **stack** — three.js draw calls, Instruments, py-spy. Auto-detected from
  files in scope.
- `_domains/<d>/` = the **mode** — game loop, playtest, frame-budget gate. Marker-detected (see
  `_detect.md`), because modes have no file signature.

Engines read **both**: platform axis first, domain overlay on top.

## Layout

```
_domains/
  _detect.md            <- marker-first detection (classify-once, offer-stub)
  <domain>/
    review.md           <- extra lens the `review` engine adds when this domain is in scope
    diagnose.md         <- domain-specific "what to watch" at diagnose's instrument phase
    profiling.md        <- domain performance gate (defers raw numbers to the platform profiler)
    testing.md          <- domain test discipline, read by `tdd`/`verify`
    design.md           <- OPTIONAL: design-time critique lenses, read by PLANNING skills (not engines)
    prototype.md        <- OPTIONAL: what a throwaway prototype answers in this domain, read by `prototype`
```

## Who reads what

The four code engines (`review`/`diagnose`/`profiling`/`testing`) work like `_platforms/`: after
loading the platform axis, each checks the domain marker and — if present — loads
`_domains/<domain>/<engine>.md` and applies it on top.

The store **also feeds planning skills**, not just engines. A `design.md` cell holds design-time
critique lenses (for `game`: MDA, and Burgun's toy/puzzle/contest/game); `grill-me`, `iron-out`, and
`game-dev`'s design phase read it optionally when the domain is in scope. Design cells name structure
and tradeoffs — they never deliver a fun/good verdict.

## Current state

`game/` — all four engine cells + a `design.md` planning cell + `prototype.md` (feel vs. numbers
questions, the throwaway surface per engine, isolate-one-mechanic discipline), seeded from
majidmanzarpour/threejs-game-skills. The `game-dev` orchestrator conducts end-to-end game builds over
this store and sets the `game` marker on scaffold.

`ui/` — `design.md` (planning-time critique lenses) + `review.md` (motion **defect** lens for the
`review` engine — jank, interruptibility/state-stranding, accessibility) + `opportunities.md` (the
**opportunity** half: the four-question gate, the hunt-seam sweep, and the required rejected-candidates
section, read by `ui-design` critique mode, which is what `improve`'s `ui` aspect loads) + `slop.md`
(objective AI-slop banned-patterns catalog, read by `ui-design` critique mode and the `review`/`verify`
engines; harvested from pbakaus/impeccable + Leonxlnx/taste-skill) + `fidelity.md` (structural surface
audit, from jamiemill/layers-skills) + `prototype.md` (the craft bar and divergence axes for
`prototype`'s UI shape) + `vocabulary.md` (a reference — the reverse motion-term glossary, read by
`ui-design` and `explain`, not an engine cell) + `libraries.md` (a reference — curated web/React library
picks, read by `ui-design` and `implement`). Seeded from emilkowalski/skills. The `ui-design` skill is
the planning orchestrator over this store; the implementation-level values live in
`_platforms/web/review.md` and `_platforms/apple/review.md`.

The `review` / `improve` line inside `ui/`: **`review.md` is what's broken, `opportunities.md` is
what's missing or weak.** Craft judgements never enter a code review; defects never wait for an
improvement pass.

`product/` — the six problem-space and solution-space design layers *beneath* the surface:
`observed-behaviour.md`, `user-needs.md`, `domain.md`, `product-strategy.md`, `conceptual-model.md`,
`interaction-flow.md`. Adapted from jamiemill/layers-skills (MIT). The `product-design` orchestrator
conducts the layer work over this store; `interaction-flow.md` hands its breadboard off to the
`ui-design` sketch mode, and `grill-me` pulls `user-needs.md` + `domain.md` for elicitation discipline.
Add domains as new kinds of software appear.
