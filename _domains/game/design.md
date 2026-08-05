# Game design axis

Read by **planning** skills (`grill-me`, `iron-out`, `game-dev`'s design phase) when the domain is
`game`. Design-time critique lenses — not a code engine. Loaded on top of whatever the planning skill
already does, the same way the engines layer platform + domain.

Sources: **MDA framework** — Hunicke, LeBlanc, Zubek, 2004 —
<https://en.wikipedia.org/wiki/MDA_framework>. **Clockwork / toy–puzzle–contest–game** — Keith Burgun,
Game Developer — <https://www.gamedeveloper.com/design/why-you-need-the-clockwork-game->.

## The one hard rule — describe structure, never judge fun

This cell exists to name a design's *structure* in concrete terms and lay out tradeoffs, so **the
human** can decide. It must **never** claim something is fun, engaging, satisfying, intuitive,
"feels good", or "works better", and never rank options by any such quality. Allowed: "by Burgun's
lens there's no ambiguous decision here, so this is a puzzle, not a game." Banned: "this is the fun",
"players will enjoy this more". If a lens tempts a fun-verdict, convert it to a structural fact + a
tradeoff and stop.

## MDA — is the chain coherent?

Designer authors **Mechanics** (rules/systems) → those produce **Dynamics** (run-time behaviour) →
which the player reads as **Aesthetics** (the intended experience). The designer builds left-to-right;
the player experiences right-to-left. The check is concrete, not evaluative:

- **Name the intended aesthetics**, using the 8 as vocabulary (not a scoreboard): sensation, fantasy,
  narrative, challenge, fellowship, discovery, expression, submission (pastime).
- **Trace the chain:** do the mechanics actually produce dynamics that deliver those aesthetics? A
  stated aim of *discovery* with fully-revealed mechanics is a **structural mismatch** — surface it.
- Report mismatches as facts ("mechanics X produce dynamic Y, which serves *challenge*, not the stated
  *fellowship*"), never as "this isn't fun."

## Clockwork — what are you actually building?

Burgun's taxonomy, distinguished by **goal** and **decisions**:

| Form | Goal? | In-the-moment decisions? | Test question |
| --- | --- | --- | --- |
| **Toy** | no | — | freeform interaction, no win/lose (a ball, a sandbox) |
| **Puzzle** | yes | a *solution to find* (converges) | is there one right answer to discover? |
| **Contest** | yes | measures *execution*, not choice | does it test skill/speed with no branching choice? |
| **Game** | yes | *ambiguous* — no single right move | where is the decision with no knowable best answer? |

The load-bearing question: **"where is the ambiguous decision?"** If there isn't one, the thing is a
puzzle or contest, not a game — state that plainly and ask whether it's intended (both are legitimate;
the point is to build the one you meant to).

## How a planning skill applies this

1. Classify the artifact (toy/puzzle/contest/game) and name its intended aesthetics — **objectively**.
2. Trace the MDA chain; surface any mechanic→dynamic→aesthetic mismatch as a structural fact.
3. Point out where a stated intent and the structure disagree ("you called it a game, but every
   decision has a knowable best move — that's a puzzle").
4. Present findings as facts + tradeoffs. The human judges what's good; this cell never does.

## Room for more lenses

Add cells as they earn their place — loops & arcs, Schell's elemental tetrad, formal elements
(MDA/Clockwork are the seed pair, not the whole toolbox). Same rule applies to every lens added:
structure and tradeoffs, never a fun-verdict.
