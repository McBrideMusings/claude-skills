# Phase 01 — Build a Feedback Loop (Details)

This is the load-bearing part of `diagnose`. The rest of the phases just consume the signal this phase creates.

A fast, deterministic, agent-runnable pass / fail signal turns the bug into a search problem. Without one, no amount of staring at code helps.

## Ways to construct one — try in roughly this order

1. **Failing test** at whatever seam reaches the bug (unit / integration / e2e).
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** (Playwright / Puppeteer) — drives UI, asserts on DOM / console / network.
5. **Replay a captured trace.** Save a real request / payload / event log; replay through the code path in isolation.
6. **Throwaway harness.** Minimal subset (one service, mocked deps) that exercises the bug code path via one function call.
7. **Property / fuzz loop.** For "sometimes wrong output" bugs, run 1000 random inputs.
8. **Bisection harness.** If the bug appeared between two known states, automate "boot at state X, check, repeat" so `git bisect run` works.
9. **Differential loop.** Same input through old-vs-new (or two configs); diff outputs.
10. **HITL bash script.** Last resort — drive a human with a structured script that captures output back to you.

## Iterate on the loop itself

Treat the loop as a product:

- **Faster?** Cache setup, skip unrelated init, narrow scope.
- **Sharper signal?** Assert on the specific symptom, not "didn't crash".
- **More deterministic?** Pin time, seed RNG, isolate filesystem, freeze network.

A 2-second deterministic loop is a debugging superpower. A 30-second flaky loop is barely better than nothing.

## Non-deterministic bugs

Goal isn't a clean repro — it's a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows. A 50%-flake bug is debuggable; 1% isn't.

## When you genuinely cannot build a loop

Stop. List what you tried. Ask the user — in plain chat, never the `AskUserQuestion` tool / structured-question schema — for:

- (a) Environment access,
- (b) A captured artifact (HAR file, log dump, screen recording with timestamps), or
- (c) Permission to add temp instrumentation.

**Do not proceed to hypothesise without a loop.**
