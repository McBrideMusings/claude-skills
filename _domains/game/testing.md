# Game testing axis

Read by the `testing` engine when the `game` label is in scope, stacked alongside any matched stack label — no ordering between them.

Adapted from majidmanzarpour/threejs-game-skills.

A game that builds, renders, and passes unit tests can still be unplayable. The core game test is
behavioral: **drive the game through real input and confirm it actually plays** — the objective
progresses, the player responds, nothing softlocks, no errors. The matched stack label (`_domains/<stack>/
testing.md`) supplies the harness/driver; this label says what to assert.

## "Does the core loop play" gate

Before any release-ready claim, the loop must clear all of these:

- [ ] Starts from a clean load with zero console/runtime errors through the whole run.
- [ ] Primary verb is mapped to real input and moves the player (distance above threshold).
- [ ] Objective progresses (score, waves, distance, or completion) during the run.
- [ ] Fail state is reachable AND the retry path restores play (a loop that can't be failed has no
      pressure; a fail that can't be retried is a release blocker).
- [ ] Pause / restart / resize / refocus don't break the loop or leak state.

A slice that cannot be controlled or restarted is rejected, not "mostly done".

## Manual playtest checklist

- [ ] Play the main loop ≥2 minutes from a clean load.
- [ ] Verify controls, camera, objective feedback, failure/retry, progression.
- [ ] Rapid input changes; edge movement against arena boundaries; collisions from multiple angles.
- [ ] Audio unlocks after the first gesture; mute/volume behave.
- [ ] Watch for unreadable moments, camera occlusion, jitter, missed feedback.
- [ ] Capture desktop and mobile active-play screenshots.
- [ ] Record every bug as reproduction steps + expected vs actual.

## Scripted bot playtest

An automated run drives the game through scripted real input and measures whether it plays. The
renderer proves it *draws*; the bot proves it *plays*. Prerequisites: a per-frame diagnostics
snapshot (frame, score/objective, complete/fail, player position) and reproducible test hooks
(`seed()`, `setState()`), with **all randomness routed through the seeded RNG** — otherwise the
metrics are noise.

| Metric | Meaning | Failure reading |
| --- | --- | --- |
| framesAdvanced | Loop survived the run | Stall = crash or frozen loop |
| distanceTravelled | Input responsiveness | Near-zero under held keys = broken input mapping |
| scoreAfter − scoreBefore, stepOfFirstScore | Objective progression + how fast a naive player finds it | Never scores = objective unreachable/unreadable/broken |
| softlockWindows | Windows where frames advanced but held input made no motion/progress | Repeated = stuck geometry, dead input, unrecovered fail |
| time-to-first-fail | Fail states only | Can't fail = no pressure |
| console/page errors | Whole run | Must be empty |

The `INPUT_SCRIPT` must express the game's *core verb*, not arbitrary key mashing — a runner holds
forward and switches lanes; a tower-defense bot places affordable towers via hooks and starts waves.
Add game-specific hooks (e.g. `forceWave`, `buildFirstOpenPad`) where raw keys can't express the verb.
Report the decision as added / extended / skipped with reason, plus the seed used.

## Difficulty / fairness verification

Difficulty claims must be backed by two-skill-level bot runs, never intuition. Run the bot fast
(0 ms reaction delay between steps) and slow (e.g. 300 ms), compare survival time and score:

- Delayed bot survives as long as the fast one → difficulty pressure is decorative.
- Even the fast script can't survive the first threat → the opening is unfair.

Report both runs when difficulty tuning is in scope.

## Headless caveats

Run WebGL/GPU game suites single-worker (parallel headless contexts share a software rasterizer and
flake timed phases). Headless/software FPS is functional-only — assert behavior (frames, distance,
score, softlock, errors), never performance. Real perf numbers come from `_domains/<p>/profiling.md`.
