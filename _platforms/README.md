# `_platforms/` — shared platform-knowledge store

Not a skill. A **matrix of platform × engine** knowledge that the workflow-engine skills
(`review`, `diagnose`, `profiling`, and — via `tdd`/`verify` — testing) read from at run time.
The leading `_` and the absence of any `SKILL.md` keep this directory from registering as a skill.

## Why it exists

Each engine holds its *process* once and stays platform-agnostic. Platform-specific knowledge
(SwiftUI idioms, Instruments, XCTest, web-vitals, …) lives here **once per platform**, and each
engine loads only the single small file for the platform actually in scope — so a Python diff
never pays the context cost of Apple knowledge, and Apple knowledge isn't copied into four skills.

## Layout

```
_platforms/
  _detect.md            <- how every engine decides which platform is in scope
  <platform>/
    review.md           <- lens brief the `review` engine adds when this platform is detected
    diagnose.md         <- what to instrument, read at diagnose Phase 04
    profiling.md        <- profiler catalog, read by the `profiling` engine (and diagnose's perf branch)
    testing.md          <- frameworks/harness/idioms, read by `tdd` (write test) and `verify` (drive it)
    orchestrate.md      <- what N parallel workers must each get their own of, and how to pin to it
```

A cell may be absent — the engine then runs generic-only for that platform. Add a platform by
adding a directory; add an engine column by adding that filename across the platforms that need it.

## Who reads what

| Engine | Reads | When |
| --- | --- | --- |
| `review` | `<p>/review.md` | Phase 04 — added as one extra lens sub-agent if the file exists |
| `diagnose` | `<p>/diagnose.md`, `<p>/profiling.md` (perf) | Phase 04 (Instrument) |
| `profiling` | `<p>/profiling.md` | after platform detect |
| `tdd` | `<p>/testing.md` | Phase 01/02 (write the failing test) |
| project `verify` | `<p>/testing.md` | when a repo's own `.claude/skills/verify-project/` drives the change |
| `orchestrate` | `<p>/orchestrate.md` | step 3 (fan out) and step 7 (retire), per worker |

The built-in `verify`/`run` skills are compiled into the Claude Code binary and cannot read this
store directly. The testing axis reaches verification two ways instead: `tdd` reads it when writing
tests, and a **project-local** `verify` skill (which built-in `verify` bootstraps per repo) can read
`_platforms/<p>/testing.md` for stack-specific drive/harness knowledge.

## Attribution

Adapted from [MengTo/Skills](https://github.com/MengTo/Skills) — see that repo's LICENSE:
- `apple/` — `swiftui-pro` (Paul Hudson), `swiftui-debugging`, `performance-profiling`.
  `apple/profiling/*.md` copied verbatim from its `performance-profiling/references/`.
- `web/profiling.md` (+ `web/profiling/browser-profiling.md`) — `optimize-web-animations`.

- `web/review.md` and `apple/review.md`'s motion block — emilkowalski/skills (`emil-design-eng`,
  `apple-design`, `review-animations`). The platform-agnostic design principles behind them live in
  `_domains/ui/`.

Columns are filled as real work in a stack appears, not pre-built. Current state: `apple` has all
five cells; `web` has `profiling` + `testing` + `review`; `threejs` has `review` + `diagnose` +
`profiling` + `testing` (WebGL stack only — game knowledge lives in the domain store).
`web/diagnose` backfills when needed, and `orchestrate` exists only for `apple` — that column
fills the first time a swarm runs on a stack with a shared device, port, or database.

## Domain overlay

A parallel store, [`../_domains/`](../_domains/README.md), holds **domain × engine** knowledge — a
*mode* of development (e.g. `game`) rather than a stack. Engines read the platform axis first, then
layer the domain axis on top when a domain marker is in scope. See `_domains/_detect.md`.

## The other shared store

[`../_tracker/`](../_tracker/README.md) is the third `_`-prefixed store, and it works differently
from these two: not knowledge layered onto an engine, but the **issue backend** a skill writes to —
beads, GitHub, or a local file, resolved per repo by `_tracker/_detect.md`. Any skill that creates,
reads, closes, or comments on a tracked item reads it. Unrelated to platform or domain detection;
a repo resolves all three independently.
