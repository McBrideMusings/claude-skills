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
```

## Who reads what

The four code engines (`review`/`diagnose`/`profiling`/`testing`) work like `_platforms/`: after
loading the platform axis, each checks the domain marker and — if present — loads
`_domains/<domain>/<engine>.md` and applies it on top.

The store **also feeds planning skills**, not just engines. A `design.md` cell holds design-time
critique lenses (for `game`: MDA, and Burgun's toy/puzzle/contest/game); `grill-me`, `wayfinder`, and
`game-dev`'s design phase read it optionally when the domain is in scope. Design cells name structure
and tradeoffs — they never deliver a fun/good verdict.

## Current state

`game/` — all four engine cells + a `design.md` planning cell, seeded from
majidmanzarpour/threejs-game-skills. The `game-dev` orchestrator conducts end-to-end game builds over
this store and sets the `game` marker on scaffold. Add domains as new kinds of software appear.
