# Apple profiling axis

Read by the `profiling` engine (and by `diagnose`'s perf branch) when the platform is `apple`.
Supplies the profiler catalog, ground rules, and per-category deep-dive references. The engine's
measure→baseline→isolate→fix→re-measure loop is platform-agnostic; this file says *which instrument
and how to read it*.

Adapted from MengTo/Skills `performance-profiling`. Deep-dive references in `profiling/` are copied
verbatim from that skill.

## Pick the workflow before changing code

| Problem | Instrument / tool | Key metric | Deep dive |
| --- | --- | --- | --- |
| UI hangs > 250 ms | Time Profiler + Hangs | hang duration, main-thread stack | [profiling/time-profiler.md](profiling/time-profiler.md) |
| High CPU | Time Profiler | CPU % by function, call-tree weight | [profiling/time-profiler.md](profiling/time-profiler.md) |
| Memory leak | Leaks + Memory Graph | leaked bytes, retain-cycle paths | [profiling/memory-profiling.md](profiling/memory-profiling.md) |
| Memory growth | Allocations | live bytes, generation analysis | [profiling/memory-profiling.md](profiling/memory-profiling.md) |
| Slow launch | App Launch | time to first frame, pre-/post-main | [profiling/launch-optimization.md](profiling/launch-optimization.md) |
| Battery drain | Energy Log | energy impact, CPU/GPU/network activity | [profiling/energy-diagnostics.md](profiling/energy-diagnostics.md) |
| Thermal throttling | Activity Monitor / Instruments | thermal-state transitions | [profiling/energy-diagnostics.md](profiling/energy-diagnostics.md) |
| Network waste | Network profiler | redundant fetches, payload size | [profiling/energy-diagnostics.md](profiling/energy-diagnostics.md) |

"App feels slow" → start with time-profiler, then memory. Pre-release audit → read all four + the
checklist below.

## Ground rules (measurements are worthless if these slip)

- Profile **on device**, not Simulator (Simulator uses host CPU/memory).
- **Release** configuration — optimizations move hot paths.
- Representative data, not empty DBs or toy assets.
- Close unrelated apps to cut noise.
- Keep before/after numbers so the outcome is concrete, not vibes.
- Add `os_signpost` markers where a workflow needs ongoing timing visibility.

## Xcode diagnostics (Scheme ▸ Run ▸ Diagnostics)

| Setting | Use for |
| --- | --- |
| Main Thread Checker | UI work off the main thread |
| Thread Sanitizer | data races, unsafe shared state |
| Address Sanitizer | buffer overflow, use-after-free |
| Malloc Stack Logging | allocation call stacks |
| Zombie Objects | messages to deallocated objects |

## MetricKit — production monitoring

Subscribe an `MXMetricManagerSubscriber` for field data on launch time, hang time, and peak memory,
plus `MXDiagnosticPayload` hang call-stack trees. Use it to catch regressions that never show on a
dev device. (Full subscriber skeleton in the upstream skill; wire `didReceive` for
`applicationLaunchMetrics`, `applicationResponsivenessMetrics`, `memoryMetrics`.)

## Review checklist

**Responsiveness** — no sync main-thread work > 100 ms; no main-thread file I/O or network; large
Core Data / SwiftData fetches on background contexts; images decode off-main; `@MainActor` only
where UI access is truly needed.
**Memory** — no retain cycles in delegates/closures/observers/async tasks; large resources released
when off-screen; bounded caches; `autoreleasepool` in tight ObjC-object loops.
**Launch** — no heavy work in `@main App` `init()`; defer non-essential init; minimize dynamic
frameworks; no sync network during launch.
**Energy** — right `BGTaskScheduler` request type; location accuracy matched to need; timers use
tolerance for coalescing; network batched and cached.
