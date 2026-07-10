# UI design axis

Read by **planning** skills (`design`, `grill-me`, `wayfinder`) when the domain is `ui`. Design-time
critique lenses for interactive interfaces — not a code engine. Loaded on top of whatever the planning
skill already does, the same way the engines layer platform + domain.

Sources: **Emil Kowalski's design engineering** (animations.dev) — Sonner/Vaul author. **Apple —
*Designing Fluid Interfaces*** (WWDC 2018), ***The Details of UI Typography*** (WWDC 2020),
***Principles of Great Design***. These are platform-agnostic design ideas; the CSS/SwiftUI that
*implements* them lives in `_platforms/web/` and `_platforms/apple/`, not here.

## The one hard rule — describe structure, never judge feel

This cell names a design's *structure* and its concrete tradeoffs so **the human** decides. It must
**never** claim something is fun, beautiful, usable, intuitive, "feels good/right", or "works better",
and never rank options by any such quality. The source material is full of felt-quality language
("feels responsive", "feels sluggish") — every instance is converted here to **what the thing
objectively does + when the user perceives it**. Allowed: "`ease-in` delays visible movement to the
end of the curve, and entry is the moment the user watches most — so the motion is perceived later."
Banned: "`ease-in` feels bad." If a lens tempts a feel-verdict, restate it as a mechanism + a tradeoff
and stop.

## Lens 1 — should this animate at all? (frequency)

Motion cost scales with how often it's seen. This is a structural decision, not a taste call:

| Frequency | Structural consequence |
| --- | --- |
| 100+/day (keyboard shortcuts, command-palette toggle) | Animation adds latency to a repeated action; the delay compounds. → none |
| Tens/day (hover, list nav) | Repeated delay, smaller. → remove or drastically reduce |
| Occasional (modals, drawers, toasts) | Delay paid rarely; motion can carry spatial meaning. → standard |
| Rare / first-time (onboarding, celebration) | Paid once. → room for elaboration |

**Keyboard-initiated actions carry no animation** — they repeat hundreds of times daily, and each
animation frame is latency between intent and result. (Raycast opens its palette with no transition.)

## Lens 2 — what is the motion's purpose?

Every animation must map to one concrete function, or it's decoration on a path the user repeats:

- **Spatial consistency** — an element enters and exits along the same path, so its origin/return is
  predictable (a toast that slides in from the right dismisses to the right).
- **State indication** — the motion *is* the signal that state changed (a morphing button).
- **Explanation** — shows how something works (a marketing/onboarding sequence).
- **Feedback** — confirms input was received (press → `scale(0.97)`).
- **Preventing a jarring change** — bridges an abrupt appear/disappear.

"It looks cool" on a frequently-seen element is decoration, not a purpose — name that as a fact.

## Lens 3 — fluid-interaction principles (Apple)

For anything the user can touch/drag, these are the structural properties that separate direct
manipulation from a scripted animation:

- **Response** — feedback appears on pointer-*down*, continuous *through* the gesture, not only at
  release. Latency on the input path is a regression.
- **Direct manipulation** — the element tracks the pointer 1:1 and respects where it was grabbed.
- **Interruptibility** — the single most load-bearing property: motion can be grabbed and reversed
  mid-flight, starting from its current on-screen value, never the target value. Springs have this by
  construction; fixed-duration keyframes do not.
- **Momentum** — a released flick projects to where the gesture was going, not the release point.
- **Spatial consistency** — enter and exit mirror; interactions anchor to their trigger.

## Lens 4 — Apple's eight design principles (reasoning vocabulary)

Names to reason with, not a scoreboard: **Purpose** (decide what *not* to build), **Agency** (choices +
easy undo), **Responsibility** (privacy/safety, anticipate misuse), **Familiarity** (honor known
metaphors and their physics), **Flexibility** (adapt to device/ability/context), **Simplicity** (strip
to the core; not minimalism), **Craft** (every spacing/timing value is deliberate and defensible),
**Delight** (the result of the other seven, not confetti). Use them to name *which* principle a
decision serves or violates — structurally, never as a quality verdict.

## Lens 5 — typography discipline

- **Tracking is size-specific.** Large display text wants negative tracking; small text wants slightly
  positive. A single `letter-spacing` for all sizes is wrong somewhere.
- **Leading tracks size inversely** — tight on headings, looser on body.
- **Hierarchy = weight + size + leading as a set**, not size alone.
- **Scale layout *with* text** (relative units) so a larger user text-size doesn't break it.

## Lens 6 — cohesion

Motion and craft values should be consistent with the component's stated personality and the rest of
the product (a dashboard's motion is crisp and fast; a playful surface can be bouncier). Report a
mismatch as a fact ("this crossfade is 500ms while every other transition here is <200ms"), never as
"this feels off". When motion has no purpose (Lens 2) and is frequently seen (Lens 1), deleting it is
a legitimate option to put on the table.

## How a planning skill applies this

1. Classify the surface and name what each animation's **purpose** is (Lens 2) and how **often** it's
   seen (Lens 1) — objectively.
2. For touch/drag surfaces, check the fluid-interaction properties (Lens 3) are present or name which
   are missing.
3. Name which of the eight principles (Lens 4) a decision serves or fights.
4. Present findings as facts + tradeoffs. The human judges what's good; this cell never does.

## Where the concrete values live

Exact curves, durations, spring parameters, and the GPU-property rules are **implementation** — they
live in `_platforms/web/review.md` and `_platforms/apple/review.md`, loaded by the `review` engine.
The reverse glossary of motion terms is `vocabulary.md` in this directory.

## Room for more lenses

Add cells as they earn their place. Same rule on every lens added: structure and tradeoffs, never a
feel-verdict.
