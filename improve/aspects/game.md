# Aspect brief: `game` (domain cells, read directly)

Axis tag: `game`. Applicability: the `game` label is in scope per [`../../_detect.md`](../../_detect.md) — an explicit `improve game` argument wins outright, then the committed `.claude/domain` marker, and only then classification. Resolved for you in Phase 01; if you are reading this, the label is in scope.

**Read:** the two lenses this aspect runs, stated here.

- **Design lens.** MDA (mechanics, dynamics, aesthetics): name the intended aesthetics (sensation, fantasy, narrative, challenge, fellowship, discovery, expression, submission), then trace whether the mechanics produce dynamics that deliver them. Clockwork: classify the thing as toy (no goal), puzzle (goal, one solution to find), contest (goal, tests execution, no branching choice) or game (goal, ambiguous decisions) by asking where the ambiguous decision is.
- **Review lens.** Game-feel presence in dependency order: input latency (visible response within about 100 ms), response curves, contact feedback (a visual and an audio response for each score, pickup, damage and death), camera shake (trauma-based, capped), audio variation. Visual-readability scorecard of ten surfaces scored 0–3 on active-play frames. HUD and menu readability. Level and encounter intent. Difficulty-curve sanity.

*Knowledge base: search it for "game design", "game review", "game balance", and the game's genre (for example "autobattler"). If you have none, skip this line and don't mention it.*

This file is the read-only contract for that game knowledge.

## The contract

No file writes, no commits, no questions. Answer from the repo — scene files, entity definitions, tuning constants, input handling, HUD layout, level data, `docs/PRD.md`, `docs/CONTEXT.md` — and mark what the artifacts can't answer `Unknown` rather than guessing it.

## The one hard rule, which outranks everything else here

**Describe structure, never judge fun.** The design lens says this and it binds you completely. You may say the MDA chain is incoherent — that the stated aesthetic has no dynamic producing it, and no mechanic producing that dynamic. You may say the primary verb has no impact frames, no camera response, and no sound hook. You may not say the game is boring, shallow, or unfun. A fun verdict is not a finding, it is an opinion with a citation stapled to it, and it scores 0.

## What to look at

- **MDA coherence** — does each stated aesthetic trace back through a dynamic to a mechanic that exists in the code? A break in the chain is the finding, and you name the missing link.
- **Clockwork** — what is actually being built, and does the structure in the repo match it?
- **Game-feel presence** — does the primary verb land with weight: impact frames, screen shake, audio hook, animation follow-through. Absence is an opportunity, and it is the most common finding this aspect produces.
- **Visual-readability scorecard** — score active-play frames, never idle title screens. Say which frames you scored, or that you scored none and the finding is source-only.
- **HUD / menu readability**, **level and encounter design intent**, **difficulty-curve sanity**.
- **Balance structure** — when the game has costs, a roster or competing strategies: list the resources, compare power to cost across the roster, and check whether any stored stat or type is never read by the rules (so it cannot counter anything). Report outliers as numbers with the file that holds them. Win rates and dominant strategies need a seeded batch, so mark them `Unknown` unless one was run.

## Aspect-specific rules

- A finding cites the file that carries the mechanic — the tuning constant, the input handler, the animation state. "Add screen shake" with no verb named and no handler cited is ungrounded.
- Something already broken in play (a soft-lock, an unreachable state) is `review`'s. Tag it `review-territory` and move on.
