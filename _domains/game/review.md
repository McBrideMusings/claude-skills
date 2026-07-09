# Game review axis

Read by the `review` engine when the domain is `game` — loaded on top of the platform axis, not instead of it.

Adapted from majidmanzarpour/threejs-game-skills.

A game is judged by whether it *plays*, not whether it renders. This lens adds five game-only
questions to the review. You judge presence and correctness of these systems — never whether the
game is "fun"; that is the human's call. Surface concrete gaps, let the user decide taste.

## Game-feel presence (does the primary verb land with weight)

Feel is state communication, applied in dependency order — each layer needs the one before it.

| Layer | Review question |
| --- | --- |
| Input latency | Primary verb produces a visible response within ~100ms? If not, nothing else matters — flag first. |
| Response curves | Player motion uses accel/decel/easing, not instant snap? |
| Contact feedback | Every score / pickup / damage / death has ≥1 visual AND ≥1 audio response? |
| Camera | Shake is trauma-based (`trauma²` curve, per-second decay, hard cap), scaled to event weight? |
| Audio | Repeated samples pitch/volume-varied (no machine-gun repeat)? Sound fires on the impact frame? |

Readability rule (this is a *bug* gate, not polish): if shake, flash, or hitstop hides the thing the
player must react to next, it is a defect. Hitstop must scale gameplay delta only — camera, tweens,
HUD keep real delta; the frame must keep drawing during a freeze.

## Visual-readability scorecard (score active-play frames, not idle title screens)

Ten surfaces, each 0–3 (0 placeholder, 1 basic, 2 premium, 3 showcase): art direction, hero/player,
obstacles/enemies, rewards, world/environment, materials, lighting, VFX, UI/HUD, performance
evidence. Premium = every category ≥2, average ≥2.3. Self-scores drift optimistic — for any
premium/showcase claim, run a fresh-eyes pass (independent reviewer sees only screenshots + this
rubric, take the lower score per category) or an adversarial self-review (argue each score is a 1
first). Automatic fails: primitive-dominant frame, one repeated obstacle silhouette, HUD is
stat/debug cards, fog/darkness/bloom hiding missing geometry, not playable through real input.

## HUD / menu readability

- [ ] Health/status readable during normal AND high-action moments.
- [ ] Objective/progress visible without competing with threats or pickups.
- [ ] Text contrast legible over bright, dark, and moving backgrounds.
- [ ] Meters/timers/counters have fixed-width containers — dynamic values never shift layout.
- [ ] HUD avoids the focal area and likely threat/spawn lanes; respects mobile safe areas.
- [ ] Menus cover expected states: pause, resume, restart, settings, win/lose.
- [ ] UI is driven by the game-state model, does not re-implement simulation rules, and no UI
      transition delays input or hides the next decision.

## Level / encounter design intent

Reject "explore a cool scene" — a level must shape decisions. Check the space defines: player start →
first decision → first reward → first threat; a learning beat before a punishing combination; a
recovery beat after high pressure; telegraphed hazards; escalation every 20–60s (or per wave/lap/
phase). A decorative space that does not change player choices is a finding.

## Difficulty-curve sanity

- [ ] One new concept introduced at a time, combined only after it's understood.
- [ ] Challenge grows via timing / density / speed / scarcity / enemy-mix — not just "more things".
- [ ] Early failures recoverable unless the genre is intentionally harsh.
- [ ] A real decision exists in the first 30 seconds; the main mechanic can't be ignored.
- [ ] Tuning lives in named constants, and changes are recorded.

Performance readability is a gameplay gate, not just a graphics one — see `profiling.md` for the
frame budget; use the platform's profiler via `_platforms/<p>/profiling.md` for the raw numbers.
