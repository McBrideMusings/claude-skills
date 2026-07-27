# Game prototype overlay

Read by the `prototype` skill (per `_domains/_detect.md`) when the domain is `game`, **on top of** the
shape file. Which shape applies depends on the question, and both are common here:

- **Feel** ("does this jump/dash/recoil feel right") → [`prototype/UI.md`](../../prototype/UI.md)'s
  build discipline, but driven by hand rather than flipped through — see below.
- **Numbers** ("does this economy converge", "is this combat maths degenerate at level 40") →
  [`prototype/LOGIC.md`](../../prototype/LOGIC.md). A terminal simulation answers this far faster than
  a playable build, and it's the shape people skip when they shouldn't.
- **Engine or approach choice** ("client-authoritative or server-authoritative for this movement") →
  [`prototype/COMPARE.md`](../../prototype/COMPARE.md).

## The one hard rule carries over

`design.md`'s rule holds here without exception: **describe structure, never judge fun.** Report what
the mechanic does — the numbers, the input-to-response latency, the states reachable, what the loop
rewards — and stop. Whether it's fun is the user's call and only theirs, and a prototype exists
precisely so they can make it from something playable rather than from a description.

## The surface — one throwaway artifact, per engine

The invariant is the same as every other prototype: one throwaway thing, run directly, no production
file touched. What that thing *is* depends on the engine:

| Engine | Surface |
| --- | --- |
| Roblox | A scratch Place in Studio, driven through the `roblox` skill's Studio tools. Never edit the real game's scripts; a prototype Place is the file-equivalent here. |
| three.js / canvas / DOM | One self-contained HTML file at `<repo-root>/tmp/claude/prototypes/<slug>.html`, exactly as `UI.md` specifies. |
| Native (SpriteKit, SwiftUI, Unity) | A scratch target/scene inside a scratch project directory under `<repo-root>/tmp/claude/prototypes/<slug>/` — never a new target in the real project file. |
| Pure simulation (economy, combat maths, AI) | Terminal, per `LOGIC.md`. No renderer at all. |

## Isolate one mechanic

A game prototype answers **one** question, which means it contains one mechanic and the minimum world
needed to exercise it. No menus, no save system, no progression, no art beyond coloured shapes, no
sound unless the sound *is* the question. Everything else is noise that costs build time and hides the
thing being judged.

State the isolation explicitly at the top of the prototype: what's in, what's deliberately absent, and
what the user is being asked to feel out.

## Feel questions are driven, not flipped

The picker is a UI-shape device: it works when the user compares finished-looking directions at a
glance. Feel doesn't survive that — it needs hands on the controls for a minute at a time. So for feel
questions:

- **Expose the parameters live.** Jump height, gravity, coyote time, dash distance, recoil, camera lag
  — as on-screen sliders or number keys the user can nudge *while playing*, not constants they have to
  edit and rebuild. Print the current values on screen at all times.
- **Make the reset instant.** One key restarts the scenario. A feel prototype gets driven dozens of
  times per minute; any reload longer than a second changes what the user is willing to try.
- **Ship 2–3 named presets** when there are genuinely different directions (a floaty jump vs. a heavy
  one), switchable with a key — the same idea as the picker, adapted to a surface you play rather than
  look at.
- **The answer is the parameter values.** When the user says "that one" — capture the numbers. Those,
  not the prototype code, are what goes into the real game.

## What to measure and report

Objective things a prototype can establish that description can't:

- **Input-to-response latency** — frames between input and visible response. Anything above ~2 frames
  at 60 fps is felt even when it isn't consciously noticed.
- **Frame cost of the mechanic in isolation** — if it's already near budget alone, it won't survive a
  real scene. Defer raw profiling numbers to `_domains/game/profiling.md` and the platform cell.
- **Reachable states** — including the degenerate ones: infinite hover, softlock, a combo that skips
  the intended sequence. Push the mechanic to break, and report exactly how it broke.
- **Simulation results** for economy/maths questions — convergence, spread across N runs, where the
  curve goes flat or explodes. Run it many times; one run is an anecdote.

## Handoffs

- The loop already exists and the question is whether it plays → `_domains/game/testing.md`'s "does the
  core loop play" gate.
- Structural design questions before any code (MDA chain, clockwork) → `_domains/game/design.md` via
  `game-dev`.
- Frame budget on a real scene rather than an isolated mechanic → `profiling`.
