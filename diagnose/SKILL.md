---
name: diagnose
description: "Disciplined diagnosis loop for hard bugs and performance regressions: build a feedback loop → reproduce → hypothesise → instrument → fix → regression-test. Triggers: 'diagnose this', 'debug this', 'X is broken', 'X is throwing', 'X is failing', 'what's wrong with X', 'perf regression', 'something's slow'."
---

# Diagnose

A discipline for hard bugs. Skip phases only when explicitly justified.

When exploring, use `docs/CONTEXT.md` vocabulary for the modules involved. Check `docs/adr/` for prior decisions in the area you're touching.

## Phase 01 — Build a Feedback Loop

**This is the skill.** Everything else is mechanical. A fast, deterministic, agent-runnable pass / fail signal turns the bug into a search problem.

Full guidance — the 10 ways to construct a loop, iteration tips, non-deterministic-bug handling, the "I can't build a loop" escape — lives in [FEEDBACK-LOOP.md](FEEDBACK-LOOP.md). Read it when starting Phase 01.

**Completion gate:** name a command you have already run at least once — paste the invocation and its output. If you catch yourself reading code to build a theory before this command exists, stop. Do not proceed to Phase 02 without it.

## Phase 02 — Reproduce

Run the loop. Confirm:

- [ ] The loop produces **the failure the user described** — not a different one nearby. Wrong bug = wrong fix.
- [ ] Reproducible across runs (or at a high enough rate for non-deterministic bugs).
- [ ] Exact symptom captured (error message, wrong output, slow timing).

**Minimise.** Shrink the repro to the smallest scenario that still reproduces — cut inputs, callers, and config one at a time until everything remaining is load-bearing. This narrows the hypothesis space before Phase 03 and gives Phase 05 a correct seam to test against.

## Phase 03 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any. Single-hypothesis generation anchors on the first plausible idea.

Each must be **falsifiable** — state the prediction:

> "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."

If you can't state the prediction, it's a vibe. Discard or sharpen.

**Show the ranked list to the user before testing.** They often re-rank instantly ("we just deployed a change to #3") or know hypotheses they've ruled out. Don't block — proceed with your ranking if the user is AFK.

## Phase 04 — Instrument

Each probe maps to a Phase 03 prediction. **Change one variable at a time.**

Tool preference:

1. **Debugger / REPL inspection** if supported. One breakpoint beats ten logs.
2. **Targeted logs** at boundaries that distinguish hypotheses.
3. Never "log everything and grep".

**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup at the end is a single grep. Untagged logs survive; tagged logs die.

**Perf branch.** For perf regressions, logs are usually wrong. Establish a baseline (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.

## Phase 05 — Fix + Regression Test

Write the regression test **before the fix** — but only if there's a **correct seam**.

A correct seam exercises the **real bug pattern** at the actual call site. A too-shallow seam (single-caller test when the bug needs multiple, unit test that can't replicate the chain) gives false confidence.

**If no correct seam exists, that's the finding itself.** Note it — the architecture is preventing the bug from being locked down. Flag for Phase 06.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Re-run the Phase 01 loop against the original (un-minimised) scenario.

## Phase 06 — Cleanup + Post-Mortem

Required before done:

- [ ] Original repro no longer reproduces
- [ ] Regression test passes (or absence of seam is documented)
- [ ] All `[DEBUG-...]` instrumentation removed (`grep` the prefix)
- [ ] Throwaway prototypes deleted or moved to a clearly-marked debug location
- [ ] The winning hypothesis is stated in the commit / PR message — so the next debugger learns

**Then ask: what would have prevented this bug?** If the answer is architectural (no good test seam, tangled callers, hidden coupling), hand off to `/improve-codebase-architecture` with specifics. Make the recommendation **after** the fix — you have more information now than when you started.
