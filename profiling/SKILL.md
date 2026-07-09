---
name: profiling
description: "Measure where a program spends its time, memory, or energy and optimize the dominant cost — proactive, no bug required. Establishes a baseline, measures with the platform's profiler, isolates the hottest cost, changes one thing, re-measures. Triggers: 'profile this', 'where's the time going', 'where's the memory going', 'is this fast enough', 'make X faster', 'optimize this', 'why is this slow' (no regression/baseline), 'performance audit'."
---

# Profiling

Proactive measurement and optimization. Use when the goal is to **measure and improve** resource
use — CPU, wall-clock, memory, launch, energy — not to fix a defect.

**Boundary vs `diagnose`.** If something is *wrong* — a bug, or a perf **regression against a
known-good baseline** — that's `diagnose` (reactive: reproduce → hypothesise → fix). `profiling` is
for open-ended "measure / make it faster" with no defect asserted. When a diagnose perf-branch needs
the instrument catalog, it reads the same platform axis this skill uses — no duplication.

The process below is platform-agnostic. **Which** profiler to run and **how to read it** comes from
the platform axis: detect the platform via `_platforms/_detect.md`, then read
`_platforms/<platform>/profiling.md` if it exists. With no axis, run the loop with whatever profiler
the stack provides.

If a **domain** is in scope too (detect via `_domains/_detect.md` — e.g. a `game`), read
`_domains/<domain>/profiling.md` **on top of** the platform axis. The domain file sets the target the
work must hit (e.g. a 16.6 ms game frame budget); the platform profiler supplies the raw numbers.

## Phase 01 — Pick the metric and the workload

- Name the resource that matters (main-thread time? peak memory? cold-launch ms? energy?). One at a
  time — optimizing CPU can cost memory.
- Fix a **representative workload** you can re-run identically: real data volume, real device/config,
  not toy inputs. Optimizing an unrepresentative workload optimizes the wrong thing.

## Phase 02 — Baseline

Measure the current cost **before touching anything**, and write the number down. Everything after
is judged against this. No baseline → no way to prove an improvement, so this gate is mandatory. Use
the platform axis's profiler (e.g. Instruments Time Profiler, `perf`, `py-spy`, Chrome perf panel).

## Phase 03 — Isolate the dominant cost

- Read the profile top-down: find the single largest contributor, not a scatter of small ones.
- Confirm it's real and repeatable across runs before optimizing — profilers lie under noise (other
  apps, debug builds, cold caches). Follow the axis's ground rules (release build, on-device, etc.).
- Inspect the actual code path the profile names before proposing any change.

## Phase 04 — Change one thing

Apply the **smallest** change that targets the measured bottleneck. One variable at a time — batched
changes make the re-measure uninterpretable. Resist fixing costs the profile didn't flag.

## Phase 05 — Re-measure vs baseline

Re-run the identical workload and compare to the Phase 02 number. Keep the change only if it moved
the metric meaningfully. Stop when you hit the target or the next contributor isn't worth it — don't
micro-optimize past the point that matters. Leave a repeatable measurement (a signpost, a benchmark,
a noted command) so the win doesn't silently regress later.

## When there's no platform axis

Run the same five phases with the stack's native tooling. If profiling isn't feasible (no profiler,
can't reproduce the workload), say so explicitly rather than guessing at hot paths from reading code.
