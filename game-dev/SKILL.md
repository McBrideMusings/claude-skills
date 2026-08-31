---
name: game-dev
description: "Conduct a game build end-to-end — design, scaffold, playable loop, assets, feel, ship — routing each phase to the owning skill. Use for whole builds or a named phase."
---

# Game Dev

Own the end-to-end game outcome without holding any game knowledge yourself. `game-dev` is a
**conductor**: it walks the production arc and, at each phase, either **invokes a sibling skill** or
**reads an axis and implements inline**. The knowledge lives in `_domains/game/*` (game mode) and
`_domains/<stack>/*` (the stack) — this skill sequences, it doesn't duplicate.

**Not prescriptive about tech stack.** A game may be a fresh Vite/three.js app or embedded in an
existing host (devvit, cloudflare, a native shell). `game-dev` never imposes a stack — it bolts the
game-specific pieces onto whatever the project already is.

## First: set the domain, then route

1. Ensure the `game` label is set in the `.claude/domain` marker (see `../_domains/_detect.md`). On a
   new project the scaffold phase writes `**: game` (plus any stack labels); on an existing game it's
   classified-once and persisted. With the marker set, every engine invoked below automatically stacks
   `_domains/game/*` alongside whatever stack label the diff also matches.
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
| 3 | **Playable loop** | implement, reading `_domains/game/*` + `_domains/<stack>/*` |
| 4 | **Assets** | invoke `generate` (models / images / textures / music / sfx / dialogue) |
| 5 | **Polish / game-feel** | implement, reading `_domains/game/review.md` + `diagnose.md` (hitstop, screenshake, easing, input feel) |
| 6 | **Verify** | invoke `review`, `profiling`, `diagnose`, and testing — markers set, so each gets the game overlay |
| 7 | **Ship** | production build / release, reading `_domains/<stack>/testing.md`. Refuses to start until the ledger has a Phase 6 entry with a review verdict |

## Design phase — surface structure, never judge fun

When you run Phase 1 (or any design feedback), the `design.md` lens names design *structure* — toy /
puzzle / contest / game, the MDA chain, where the ambiguous decision is — and lays out tradeoffs. It
**never** declares something fun, engaging, or "better". Present concrete structural facts; the human
decides what's good. This is a hard rule, not a style preference.

## Ledger

Keep a short running ledger of which phases ran, what each delegated to, and the evidence (screenshot,
profile number, review verdict), at `/private/tmp/claude/<repo-slug>/game-dev-ledger.md`. Don't call
prototype-quality work shipped — Phase 6 gates Phase 7: Phase 7 refuses to start until the ledger has a
Phase 6 entry with a review verdict.

## What this is not

- Not a stack or a framework — it imposes no build tooling.
- Not a knowledge store — game knowledge is in `_domains/game/*`, stack knowledge in `_domains/*`.
- Not auto-invoked — it's an explicit `/game-dev` on-ramp. One-off asks use the engines directly.

Adapted from majidmanzarpour/threejs-game-skills (`threejs-game-director`, `threejs-gameplay-systems`),
re-shaped as a thin conductor over the merged `_domains/` label store.
