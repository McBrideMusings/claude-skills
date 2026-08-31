---
name: ref-game-dev
description: Game development — game feel, playable loop, fixed timestep, prototyping, tuning, profiling — plus the end-to-end build arc. Load before designing, building, reviewing or conducting a whole game build.
---

# Game knowledge

| Open | When |
| --- | --- |
| [`../_domains/game/context.md`](../_domains/game/context.md) | The whole cell — open before designing, building or reviewing game mechanics. |
| [`../_domains/game/design.md`](../_domains/game/design.md) | Designing a mechanic, a loop, or a progression. |
| [`../_domains/game/prototype.md`](../_domains/game/prototype.md) | Building a throwaway to find out whether something is fun. |
| [`../_domains/game/testing.md`](../_domains/game/testing.md) | Testing gameplay — what is worth asserting and what has to be felt. |
| [`../_domains/game/profiling.md`](../_domains/game/profiling.md) | Frame budget, spikes, allocation in the loop. |
| [`../_domains/game/diagnose.md`](../_domains/game/diagnose.md) | Debugging a physics, timing or state bug. |
| [`../_domains/game/review.md`](../_domains/game/review.md) | Reviewing gameplay code. |
| [`../_domains/game/roblox.md`](../_domains/game/roblox.md) | The target is Roblox — Luau, DataStores, replication. |

3D rendering craft is [`ref-threejs`](../ref-threejs/SKILL.md).

## Building a game end-to-end — the arc

Conduct the build without holding game knowledge inline: sequence the phases, delegating each to its
owning skill or implementing while reading the named axis. Knowledge lives in `_domains/game/*` (game
mode) and `_domains/<stack>/*` (the stack) — never duplicate it here. Impose no tech stack: a game may
be a fresh Vite/three.js app or embedded in an existing host (devvit, cloudflare, a native shell);
bolt the game-specific pieces onto whatever the project already is.

First, ensure the `game` label is set in the `.claude/domain` marker (see
[`../_domains/_detect.md`](../_domains/_detect.md)) — on a new project the scaffold phase writes
`**: game` plus stack labels — so every engine invoked below stacks `_domains/game/*` automatically.
A bare "build me a game" walks Phases 1→7; an ask naming a phase ("add a boss fight", "the frame rate
stutters") jumps straight there.

| # | Phase | Delegates to |
| --- | --- | --- |
| 1 | **Design** | invoke `grill-me`; read [`../_domains/game/design.md`](../_domains/game/design.md) (MDA / Clockwork — what is this, where's the decision) |
| 2 | **Scaffold** *(new game only)* | invoke `bootstrap`; then implement a thin, stack-agnostic game-loop skeleton (canvas + fixed-step update / render split) into the existing host; write the `game` marker |
| 3 | **Playable loop** | implement, reading `_domains/game/*` + `_domains/<stack>/*` |
| 4 | **Assets** | invoke `generate` (models / images / textures / music / sfx / dialogue) |
| 5 | **Polish / game-feel** | implement, reading [`review.md`](../_domains/game/review.md) + [`diagnose.md`](../_domains/game/diagnose.md) (hitstop, screenshake, easing, input feel) |
| 6 | **Verify** | invoke `review`, `profiling`, `diagnose`, and testing — markers set, so each gets the game overlay |
| 7 | **Ship** | production build / release, reading `_domains/<stack>/testing.md`; refuses to start until the ledger has a Phase 6 entry with a review verdict |

**Design phase surfaces structure, never judges fun.** The `design.md` lens names design *structure* —
toy / puzzle / contest / game, the MDA chain, where the ambiguous decision is — and lays out tradeoffs.
It never declares something fun, engaging, or "better"; present concrete structural facts and the human
decides. Hard rule, not a style preference.

**Ledger.** Keep a short running ledger of which phases ran, what each delegated to, and the evidence
(screenshot, profile number, review verdict) at `/private/tmp/claude/<repo-slug>/game-ledger.md`.
Phase 6 gates Phase 7 — don't call prototype-quality work shipped.

(Arc adapted from majidmanzarpour/threejs-game-skills, re-shaped as a thin conductor over the merged
`_domains/` label store.)
