# Game profiling axis

Read by the `profiling` engine when the `game` label is in scope, stacked alongside any matched stack label — no ordering between them.

Adapted from majidmanzarpour/threejs-game-skills.

A game has a hard, recurring deadline every other app doesn't: the frame. This axis says **what a
game must HIT and where the hitches come from**. It does not measure — use the platform's profiler
via `_domains/<p>/profiling.md` for raw FPS, frame time, allocation, and GPU numbers. This file
turns those numbers into a pass/fail gate.

## The frame-budget gate

Every frame — input, simulation, animation, camera, UI, and draw — must finish inside the budget or
the game visibly stutters. This is a *gameplay* gate: a dropped frame is dropped input and a broken
feel pass, not just an ugly graph.

| Target | Budget per frame | Use when |
| --- | --- | --- |
| 60 fps | 16.6 ms | Default for action, runners, shooters, anything twitch |
| 30 fps | 33.3 ms | Slower/strategy games, or a deliberate low-end floor |
| 120 fps | 8.3 ms | High-refresh target; only claim it if measured on real hardware |

The budget covers the *whole* frame, not just render. A 6 ms draw with 12 ms of simulation still
misses 60 fps. Measure the total, then attribute it (see classify below).

## Per-frame allocation and GC hitches

Smooth average FPS with periodic stutters is almost always garbage-collection pauses from per-frame
allocation. Watch for: new objects/arrays/closures created inside `update`, temp vectors/strings per
entity per frame, layout reads or DOM churn in the loop. Fix by hoisting allocations out of the hot
path and pooling. A single 40 ms GC pause is two dropped 60 fps frames — invisible in an average,
obvious in play.

## Spawn hitches

A frame that blows the budget the instant a wave, level, or effect appears is a spawn hitch:
first-time geometry/material/texture upload, shader compile, physics-body creation, or audio decode
happening synchronously mid-play. Watch the frame time *at the spawn boundary*, not the steady state.
Fixes: pre-warm/pool at load, build bodies off the critical frame, decode audio ahead of time.

## Classify before optimizing

| Bottleneck | Signals | Typical fix |
| --- | --- | --- |
| CPU / simulation | High frame time with low draw cost; physics/AI/animation heavy | Fewer dynamic bodies, sleeping, simpler colliders, pooling, spatial culling |
| GPU draw | Many draw calls, frequent material switches | Instancing for repeated detail, shared geometries/materials, batching |
| GPU fragment | Overdraw, heavy post, high pixel-density, transparent particles | Cap pixel density, fewer/limited post passes, fewer transparent layers |
| Memory | Growth over a session, undisposed resources on restart | Dispose on teardown, bounded caches, atlases/compression |
| Spawn | Hitch only at wave/level/effect start | Pre-warm, pool, move work off the spawn frame |

Change one thing, re-measure the *same scenario* (same viewport, state, camera, device), and confirm
no playability/readability regression before keeping it.

## Playtest perf metrics (report these, not vibes)

- [ ] Steady-state frame time vs budget, on the target device tier — captured on a real GPU, not headless.
- [ ] Worst-frame / hitch frequency during active play (not idle).
- [ ] Frame time at spawn/wave/effect boundaries.
- [ ] Session memory trend across several restarts (leak check).
- [ ] Before/after numbers for every optimization kept.

Headless/software-rendered FPS is functional-only — never report it as performance evidence. Get the
real numbers from `_domains/<p>/profiling.md`; this file only says whether they pass.
