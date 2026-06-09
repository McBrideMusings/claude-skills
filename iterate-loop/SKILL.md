---
name: iterate-loop
description: "Continuous walk-away mode: repeatedly runs /iterate until a halt condition fires. Use when the user wants unattended end-to-end work across multiple tracked items in one sitting. Triggers: \"iterate loop\", \"/iterate-loop\", \"keep iterating\", \"loop iterate\", \"walk away and keep working\", \"auto-pilot the followups\". For a single pass, use /iterate instead."
---

# /iterate-loop — Continuous autonomous iteration

Drive multiple back-to-back `/iterate` passes via the `loop` skill. Each pass works one tracked item; the loop ends as soon as any pass halts.

For a single pass, use `/iterate`. This skill exists so continuous mode is discoverable as its own entry point rather than requiring users to know the `/loop /iterate` composition.

---

## When to Use

- User signals walk-away continuous work: "iterate loop", "keep iterating", "auto-pilot the followups"
- Multiple tracked items are ready and the user wants them worked back-to-back
- The user is fine with the loop stopping on the first halt condition (no second-guessing)

## When NOT to Use

- One specific item — use `/iterate` (single pass)
- Exploratory work with no tracked items — file follow-ups first
- The user wants to confirm each pass before the next — use `/iterate` repeatedly instead

---

## What this skill does

Invoke the `loop` skill with **`/iterate continuous`** as the inner command. The `loop` skill handles cadence and re-invocation; `/iterate` handles the actual work and halt logic.

The `continuous` token is load-bearing: it tells each `/iterate` pass it is running inside a loop, so the pass files its end-of-session follow-ups **autonomously** instead of pausing to ask which to write up (see `iterate`'s "Pass mode" section). A standalone `/iterate` omits the token and runs that follow-ups step interactively — the one prompt that would otherwise stall a loop, which is exactly why continuous mode suppresses it.

In practice this is equivalent to the user typing `/loop /iterate continuous` — this skill exists to make that composition discoverable as `/iterate-loop`.

---

## Halt behavior

The loop ends as soon as any `/iterate` pass halts. See `iterate` for the full halt-condition list (dirty tree, 5-commit threshold, empty queue, failed implementation, unresolved 75+ review issue, etc.).

When the loop ends, the user reviews accumulated commits with `git log --oneline @{u}..HEAD` and decides whether to resume.

---

## Notes

- This skill never invokes itself. It delegates to `loop` which delegates to `iterate`.
- Each inner `/iterate` pass produces at most one commit. The branch accumulates commits across passes, not within a pass.
- The 5-commit ahead-of-upstream threshold (enforced by `iterate`'s pre-flight) is the natural review pause.
