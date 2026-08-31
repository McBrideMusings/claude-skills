---
name: profiling
description: "Measure where a program spends time, memory, or energy and optimize the dominant cost. Use for 'make it faster', 'why is this slow', performance audits with no regression baseline (regressions are `diagnose`)."
---

# Profiling

Proactive measurement and optimization. Use when the goal is to **measure and improve** resource
use — CPU, wall-clock, memory, launch, energy — not to fix a defect.

**Boundary vs `diagnose`.** If something is *wrong* — a bug, or a perf **regression against a
known-good baseline** — that's `diagnose` (reactive: reproduce → hypothesise → fix). `profiling` is
for open-ended "measure / make it faster" with no defect asserted. When a diagnose perf-branch needs
the instrument catalog, it reads the same labels this skill uses — no duplication.

The process below is stack-agnostic. **Which** profiler to run and **how to read it** comes from the
labels in scope: resolve via `_detect.md`, then read `ref-<label>/profiling.md` for
each matched label. A stack label (e.g. `apple`) supplies the profiler and how to read it; a mode
label (e.g. `game`) sets the target the work must hit (a 16.6 ms frame budget) on top of it — no
ordering, load every matched cell. With no matching label, run the loop with whatever profiler the
stack provides.

## Phase 01 — Pick the metric and the workload

- Name the resource that matters (main-thread time? peak memory? cold-launch ms? energy?). One at a
  time — optimizing CPU can cost memory.
- Fix a **representative workload** you can re-run identically: real data volume, real device/config,
  not toy inputs. Optimizing an unrepresentative workload optimizes the wrong thing.

## Phase 02 — Baseline

Measure the current cost **before touching anything**, and write the number down. Everything after
is judged against this. No baseline → no way to prove an improvement, so this gate is mandatory. Use
the matched label's profiler (e.g. Instruments Time Profiler, `perf`, `py-spy`, Chrome perf panel).

Completion: the baseline number is stated in chat before Phase 03 begins.

## Phase 03 — Isolate the dominant cost

Quote the Phase 02 number here; if none was recorded, return to Phase 02.

- Read the profile top-down: find the single largest contributor, not a scatter of small ones.
- Confirm it's real and repeatable across runs before optimizing — profilers lie under noise (other
  apps, debug builds, cold caches). Follow the label's ground rules (release build, on-device, etc.).
- Inspect the actual code path the profile names before proposing any change.

## Phase 04 — Change one thing

Apply the **smallest** change that targets the measured bottleneck. One variable at a time — batched
changes make the re-measure uninterpretable. Resist fixing costs the profile didn't flag.

## Phase 05 — Re-measure vs baseline

Re-run the identical workload and compare to the Phase 02 number. Keep the change only if it moved
the metric meaningfully. Stop when you hit the target or the next contributor isn't worth it — don't
micro-optimize past the point that matters. Leave a repeatable measurement (a signpost, a benchmark,
a noted command) so the win doesn't silently regress later.

## Findings-only invocation

When another skill (e.g. `improve`'s survey) invokes this for audit: run **Phases 01–03 only** and return the dominant-cost findings — Phases 04–05 belong to an interactive session; change no code. Infer the metric and workload from the project type (game → the frame budget in `ref-game-dev/profiling.md`; web → load/interaction; CLI → startup) and **name both in the findings** so the premise can be rejected. Launch only through an existing entry point (an `./admin` task or package script). If no launchable entry point or profiler exists, return "not measurable — <reason>" instead of guessing hot paths from code. No file writes, no commits, no questions.

## When no label matches

Run the same five phases with the stack's native tooling. If profiling isn't feasible (no profiler,
can't reproduce the workload), say so explicitly rather than guessing at hot paths from reading code.
