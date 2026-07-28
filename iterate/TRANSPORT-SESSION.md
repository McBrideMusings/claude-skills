# Transport: session

Each `/implement` pass runs **here**, in this session, in this pane. The default, and what `iterate` has always done.

## Driving the loop

Hand the **whole per-iteration block** from [SKILL.md](SKILL.md) to the `loop` skill as the unit to repeat. It owns cadence and re-invocation; without it the run halts after the first iteration, which is the single most common way a walk-away run turns out not to have been one.

`iterate` never invokes itself and never calls `implement` in a loop directly — it hands the harness to `loop` and `loop` brings it back.

## Running one pass

Invoke `/implement continuous …` via the Skill tool, exactly as SKILL.md step 4 writes it. Nothing wraps it, nothing watches it — it is this session doing the work.

**Confirmed landed** = the branch merged or a PR opened, checked before cutting the next branch. `wrap-up` returning is not the check.

## What this costs

**Every pass's context lands in this window, and they accumulate.** Twenty passes of implementation, review, and wrap-up is far more than one context holds, so a long run will be compacted mid-flight — usually somewhere unhelpful. Two consequences worth planning around:

- The frozen queue and the ownership verdict must survive compaction. They are re-derivable (the selector is deterministic; ownership is a git remote lookup), so re-derive rather than trusting a remembered list.
- A run that has already compacted twice is a run whose report will be thin. That is a reason to prefer the workflow transport for long queues, not a reason to shorten the queue.

## What this buys

- **You can watch it and stop it**, because it is your session — the run is interruptible at any point, and everything it did is in the transcript above.
- **No opt-in needed.** No `Workflow` tool, no size guideline, no separate runtime.
- **Permission prompts are yours to answer.** Under this transport a prompt pauses the run and waits; it does not fail the pass. That is also why implement's BASH COMMAND RULES matter so much here — a prompt fired at 3am pauses a run nobody is awake to unblock.
