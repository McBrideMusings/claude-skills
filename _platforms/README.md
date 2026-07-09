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
| `verify` | `<p>/testing.md` | when driving the change (wiring pending — see followups) |

## Attribution

The `apple/` column is adapted from [MengTo/Skills](https://github.com/MengTo/Skills)
(`swiftui-pro` by Paul Hudson, `swiftui-debugging`, `performance-profiling`) — see that repo's
LICENSE. `apple/profiling/*.md` are copied verbatim from its `performance-profiling/references/`.
