---
name: game-dev
description: "Orchestrator for building and iterating a game end-to-end. Conducts the arc — design, scaffold, playable loop, assets, polish/feel, verify, ship — delegating each phase to the right skill or axis. Explicit front door: run /game-dev to walk the whole arc, or name a phase to jump in ('add a boss', 'polish the game-feel'). One-off game asks (review/profile/generate) fire their own engines directly; reach here to conduct the whole build. Triggers: 'game-dev', 'build me a game', 'make a game', 'iterate on my game', 'game production pass'."
disable-model-invocation: true
---

# Game Dev

Own the end-to-end game outcome without holding any game knowledge yourself. `game-dev` is a
**conductor**: it walks the production arc and, at each phase, either **invokes a sibling skill** or
**reads an axis and implements inline**. The knowledge lives in `_domains/game/*` (game mode) and
`_platforms/<stack>/*` (the stack) — this skill sequences, it doesn't duplicate.

**Not prescriptive about tech stack.** A game may be a fresh Vite/three.js app or embedded in an
existing host (devvit, cloudflare, a native shell). `game-dev` never imposes a stack — it bolts the
game-specific pieces onto whatever the project already is.

## First: set the domain, then route

1. Ensure the `game` domain marker is set (see `../_domains/_detect.md`). On a new project the
   scaffold phase writes `.claude/domain game`; on an existing game it's classified-once and persisted.
   With the marker set, every engine invoked below automatically layers `_domains/game/*` on top of
   the platform axis.
2. **Full arc or jump-in?** A bare "build me a game" walks Phases 1→7. An ask that names a phase
   ("add a boss fight", "review the game", "the frame rate stutters") jumps straight to that phase —
   don't re-walk the whole arc for a scoped request.

## The arc

Each phase says what it delegates to. **Invoke** = run that skill. **Implement** = write the code
yourself, reading the named axis first (there is no build-the-gameplay engine; construction is guided
implementation, not a handoff).

| # | Phase | Delegates to |
| --- | --- | --- |
| 1 | **Design** | invoke `grill-me`; read `../_domains/game/design.md` (MDA / Clockwork — what is this, where's the decision) |
| 2 | **Scaffold** *(new game only)* | invoke `bootstrap` for the standard project layout; then implement a **thin, stack-agnostic** game-loop skeleton (canvas + fixed-step update / render split) into the existing host; write the `game` marker |
| 3 | **Playable loop** | implement, reading `_domains/game/*` + `_platforms/<stack>/*` |
| 4 | **Assets** | invoke `generate` (models / images / textures / music / sfx / dialogue) |
| 5 | **Polish / game-feel** | implement, reading `_domains/game/review.md` + `diagnose.md` (hitstop, screenshake, easing, input feel) |
| 6 | **Verify** | invoke `review`, `profiling`, `diagnose`, and testing — markers set, so each gets the game overlay |
| 7 | **Ship** | production build / release, reading `_platforms/<stack>/testing.md` |

## Design phase — surface structure, never judge fun

When you run Phase 1 (or any design feedback), the `design.md` lens names design *structure* — toy /
puzzle / contest / game, the MDA chain, where the ambiguous decision is — and lays out tradeoffs. It
**never** declares something fun, engaging, or "better". Present concrete structural facts; the human
decides what's good. This is a hard rule, not a style preference.

## Ledger

Keep a short running ledger of which phases ran, what each delegated to, and the evidence (screenshot,
profile number, review verdict). Don't call prototype-quality work shipped — Phase 6 gates Phase 7.

## What this is not

- Not a stack or a framework — it imposes no build tooling.
- Not a knowledge store — game knowledge is in `_domains/game/*`, stack knowledge in `_platforms/*`.
- Not auto-invoked — it's an explicit `/game-dev` on-ramp. One-off asks use the engines directly.

Adapted from majidmanzarpour/threejs-game-skills (`threejs-game-director`, `threejs-gameplay-systems`),
re-shaped as a thin conductor over the platform/domain axis system.
