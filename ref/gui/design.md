# UI design axis

Read by **planning** skills (`grill-me`, `issues shape`, `issues iron-out`, [`critique.md`](critique.md)) when the domain is `gui`. Design-time
critique lenses for interactive interfaces — not a code engine. Loaded on top of whatever the planning
skill already does, the same way the engines layer platform + domain.

Sources: **Emil Kowalski's design engineering** (animations.dev) — Sonner/Vaul author. **Apple —
*Designing Fluid Interfaces*** (WWDC 2018), ***The Details of UI Typography*** (WWDC 2020),
***Principles of Great Design***. These are platform-agnostic design ideas; the CSS/SwiftUI that
*implements* them lives in `ref/web/` and `ref/apple/`, not here.

## The one rule — judge craft, always anchor to a concrete reason

This cell ranks designs and calls craft quality: a layout is stronger, a palette is off, a motion is
decoration, an interface reads as AI-slop. **The catch: every verdict is anchored to a concrete
reason** — a named principle from these lenses, a specific slop tell from `slop.md`, or a measured
value (contrast ratio, tracking, duration, a spacing value off the scale). Allowed: "`ease-in` delays
visible movement to the end of the curve, and entry is the moment the user watches most — so it reads
as sluggish; use `ease-out`." Also allowed: "Option B is stronger — its hierarchy uses size + weight +
space together where A leans on size alone." Not allowed: a bare "B feels better" with no reason. The
line that still holds: this covers *interface craft*, never whether a game is fun. If a lens tempts a
verdict, give the verdict **and** its concrete reason — don't stop at the mechanism.

## Lens 0 — register: what does success look like on *this* surface?

Every other lens is read through this one. Pick the register from **the requested surface, not the
product**: a developer tool's landing page is still Persuade; a fashion house's documentation is still
Read; a docs index is Read, not Persuade.

| Register | The visitor… | What outranks what |
| --- | --- | --- |
| **Persuade** | decides and acts — landing, marketing, pricing | Design *is* the product. Earn attention and action. |
| **Operate** | completes a task — app UI, dashboards, editors, admin, settings | Scanability, consistency and native expectation outrank expression. Brand lives in precise details. |
| **Read** | understands something — docs, articles, guides, changelogs | Structure for comprehension first, then make the reading worth staying in. |
| **Experience** | is inside the work — portfolios, galleries, showcases | The artifact leads from the first viewport; the interface recedes. |

**Operate and Read have their own failure mode.** It isn't flatness, it's *strangeness without
purpose*: over-decorated buttons, mismatched form controls, gratuitous motion, display fonts where
labels should be, invented affordances for standard tasks. Familiarity is a feature here — the bar is
*earned* familiarity, and the tool should disappear into the task. Concretely, on Operate/Read:

- **One type family is usually right**, on a **fixed `rem` scale** (never `clamp()` — users view at
  consistent DPI and a fluid `h1` that shrinks inside a sidebar looks worse) with a **tighter ratio,
  1.125–1.2**. There are more type elements here than on a brand surface, so exaggerated contrast is
  noise. Prose still caps at 65–75ch; tables can run to 120ch+.
- **Restrained colour is the floor**, not a choice. A single surface can earn Committed. Standardise a
  state-rich semantic vocabulary (hover/focus/active/disabled/selected/loading/error/warning/success/
  info) and give panels and sidebars a second neutral layer.
- **Motion is 150–250ms and conveys state only.** No orchestrated page-load sequences — users load into
  a task, not a title card. Responsive behaviour is *structural* (collapsing sidebar, responsive table),
  not fluid typography.
- **Consistency over surprise.** If the save button looks different on two screens, one of them is
  wrong. Delight is saved for moments, not spread across pages.

Operate can afford what brand surfaces can't: system fonts, standard navigation patterns, and real
density when users need it.

## Lens 4 — Apple's eight design principles (reasoning vocabulary)

Names to reason with, not a scoreboard: **Purpose** (decide what *not* to build), **Agency** (choices +
easy undo), **Responsibility** (privacy/safety, anticipate misuse), **Familiarity** (honor known
metaphors and their physics), **Flexibility** (adapt to device/ability/context), **Simplicity** (strip
to the core; not minimalism), **Craft** (every spacing/timing value is deliberate and defensible),
**Delight** (the result of the other seven, not confetti). Use them to name *which* principle a
decision serves or violates — structurally, never as a quality verdict.

## The other lenses

Each is a page in [`design/`](design/), read through the register above. A full pass reads them all, and polish only when UI is being edited.

| Lens | Page |
| --- | --- |
| 1 frequency, 2 purpose, 3 fluid interaction, 6 cohesion | [`design/motion.md`](design/motion.md) |
| 5 typography | [`design/typography.md`](design/typography.md) |
| 7 layout and space | [`design/layout.md`](design/layout.md) |
| Grouping and misbinding: the audit questions | [`design/grouping.md`](design/grouping.md) |
| The nine Gestalt principles behind grouping | [`design/gestalt.md`](design/gestalt.md) |
| 8 colour | [`design/colour.md`](design/colour.md) |
| Polish: checks on the built result, when UI is being edited | [`design/polish.md`](design/polish.md) |

## How a planning skill applies this

1. Classify the surface and name what each animation's **purpose** is (Lens 2) and how **often** it's
   seen (Lens 1) — objectively.
2. For touch/drag surfaces, check the fluid-interaction properties (Lens 3) are present or name which
   are missing.
3. Name which of the eight principles (Lens 4) a decision serves or fights.
4. Run the surface against `slop.md` and the layout/type/colour lenses (7/8/5).
5. Present ranked findings: each is a verdict **plus its concrete reason** (principle, slop tell, or
   measured value) **plus a fix**. Recommend the stronger option and say why. The user still owns the
   final call, but you no longer stop at "here are the tradeoffs" — you say which is better craft.

## Where the concrete values live

Exact curves, durations, spring parameters, and the GPU-property rules are **implementation** — they
live in `ref/web/review.md` and `ref/apple/review.md`, loaded by the `review` engine.
The reverse glossary of motion terms is `motion-vocabulary.md` in this directory.

## Room for more lenses

Add cells as they earn their place. Same rule on every lens added: a verdict is fine, but it always
carries its concrete reason — a named principle, a slop tell, or a measured value.
