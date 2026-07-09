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
```

## Who reads what

Same engine set as `_platforms/`. Each engine, after loading the platform axis, checks the domain
marker and — if present — loads `_domains/<domain>/<engine>.md` and applies it on top.

## Current state

`game/` — all four cells, seeded from majidmanzarpour/threejs-game-skills. Add domains as new kinds
of software appear; the `game-builder` orchestrator (planned) sets the `game` marker on scaffold.
