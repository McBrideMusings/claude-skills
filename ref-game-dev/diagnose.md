# Game diagnose axis

Read by the `diagnose` engine when the `game` label is in scope, stacked alongside any matched stack label — no ordering between them.

Adapted from majidmanzarpour/threejs-game-skills.

What to watch when a game misbehaves — the bug classes a game's shape produces. Stack-agnostic:
this says *what to instrument and what pattern to look for*; the matched stack label (`ref-<stack>/
diagnose.md`) says which tool reads it. Reproduce first, capture errors, identify the owning system,
fix the root cause there, retest the exact broken path.

## Instrument the game state every frame

Publish a diagnostics snapshot the harness and bots can read: current frame, game state, score/
objective, complete/fail flags, player position/velocity, entity counts, active collisions, input
intents. Without it, every bug below is guesswork. Gate it off (or strip) for release.

## Bug classes and what to watch

| Class | Symptom | Watch for |
| --- | --- | --- |
| Nondeterministic update order | Behavior differs run-to-run on the same seed | Undefined order of `input → physics → systems → animation → camera → UI → render`; `Math.random` (or any wall-clock/unsystematic RNG) in a gameplay/effect path; effects driven by `Date.now()` instead of accumulated game time |
| Input latency | Verb feels laggy or dropped | Response > ~100ms; input collected inside simulation instead of a separate stage; feedback gating the verb behind an animation finishing |
| Collision / physics glitch | Tunneling, stuck-on-geometry, jitter | Detailed visual mesh used as collider; variable render delta driving physics instead of a fixed-step accumulator; missing CCD on fast bodies; collider scale/rotation/offset out of sync with the visual; transforms reconciled in two places |
| Spawn / despawn | Leaks, ghosts, stale hits | Objects not pooled; despawn skips listeners/timers/effects/bodies; restart leaves stale entities alive |
| State-machine | Softlock, dead input, double-fire | Transitions that stop the update loop or restart timers; missing exit from fail/pause; two loops fighting; a state with no recoverable exit |
| Save / restore | Restart plays differently; corrupt resume | Seed not restored, so RNG diverges; snapshot misses live entities/timers; restore doesn't clear the prior run's listeners/effects first |

## Determinism is the load-bearing invariant

Bot playtests, screenshot baselines, and reproducible bug reports all die if the sim isn't
deterministic. Route ALL randomness (spawn jitter, pitch variance, shake seeds) through one seeded
RNG. Drive time-based effects from accumulated game time passed into `update(delta, elapsed)`, never
`performance.now()`/`Date.now()`. Clamp or fixed-step the delta so a tab sleep or frame spike can't
teleport bodies. A bug that only repros "sometimes" is almost always a determinism leak — hunt the
unseeded call before anything else.

## Restart / teardown checklist (the #1 source of "second play is broken")

- [ ] Entities, projectiles, particles cleared.
- [ ] Timers and cooldowns reset.
- [ ] Event listeners removed and re-attached once.
- [ ] Physics bodies/colliders disposed and rebuilt.
- [ ] Score/objective/fail state reset to initial.
- [ ] Seed re-applied so the run is reproducible.
- [ ] Camera/shake/tween state zeroed.

## Triage order

1. Reproduce locally with the same input path the user used.
2. Read the first console/runtime error before editing.
3. Confirm you're running the expected build, not a stale one.
4. Name the owner: loop, input, physics, spawn, state-machine, save, camera, or UI.
5. Fix the structural cause in the owning system; retest the exact broken path.

For perf-shaped bugs (frame drops, GC hitches, spawn hitches) branch to `profiling.md` and read raw
numbers with the platform profiler via `ref-<p>/profiling.md`.
