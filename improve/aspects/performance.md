# Aspect brief: `performance` (delegated → `profiling`)

Axis tag: `performance`. Applicability: the app is launchable through an **existing** entry point — an `./admin` task or a package script. Check this before anything else; if there is none, return `not measurable — no launchable entry point` and stop.

**Read:** `../../profiling/SKILL.md`, its **Findings-only invocation** contract and **Phases 01–03 only** (pick the metric and workload → baseline → isolate the dominant cost). Phases 04–05 are the interactive fix loop and change code; you run neither.

## Aspect-specific rules

- **Infer the metric and the workload from the project type and name both in every finding**, so the premise can be rejected: game → the frame budget in `../../_domains/game/profiling.md`; web → load and interaction; CLI → startup.
- **Never guess hot paths from reading code.** If you could not launch it or no profiler is available, the answer is `not measurable — <reason>`. A guessed hot path scores 0 under [../GROUNDING.md](../GROUNDING.md) and wastes the one aspect that could have produced a number.
- Every finding carries the **measured cost** — milliseconds, frames, allocations, requests — and the share of total it represents. This is the aspect most able to make a win checkable; use that.
- Do not create an entry point, add a script, or install a profiler. All three are writes.
