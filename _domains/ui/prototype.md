# UI prototype overlay

Read by the `prototype` skill (per `_domains/_detect.md`) when the domain is `ui`, **on top of** the
shape file — almost always [`prototype/UI.md`](../../prototype/UI.md), occasionally `LOGIC.md` when the
question is about interaction state rather than appearance. The shape file says how to build the
harness; this cell says what makes the variants worth looking at.

## Every variant clears the craft bar individually

Divergence is not a licence to ship a sloppy variant. A weak variant doesn't widen the exploration —
it loses on execution and teaches nothing about the direction it was standing for. Before showing the
set, each variant passes:

- **`design.md` Lens 1 (frequency)** — how often is this piece seen? That decides whether it animates
  at all. A variant whose whole identity is motion on a 100+/day surface is not a direction, it's a
  mistake with a name.
- **`design.md` Lens 2 (purpose)** — every animation in every variant maps to feedback, spatial
  consistency, state indication, explanation, or preventing a jarring change. "It looks cool" isn't on
  the list, including inside the boldest variant.
- **Motion mechanics** — `ease-out` on entrances (never `ease-in`), UI motion under 300 ms,
  `transform`/`opacity` only, `transform-origin` anchored to the trigger for popovers and menus,
  reduced-motion handled (gentler, not zero). Exact curves and durations: `_platforms/web/review.md`.
- **`slop.md`** — run the catalog over each variant. A variant built out of AI tells (hero-metric
  template, gradient text, over-rounded card grid, purple-blue gradient) is dead on arrival regardless
  of its axis.

## The axes variants diverge on

Name the axis in a phrase before writing any code. Legitimate axes, roughly in order of how much they
actually change the answer:

| Axis | What differs |
| --- | --- |
| **Layout** | Where things sit relative to each other — stacked vs. split, list vs. grid, inline vs. overlay |
| **Interaction model** | What the user does — click vs. drag, one step vs. progressive disclosure, inline edit vs. modal |
| **Density** | How much fits on screen — compact operator tool vs. generous single-focus |
| **Information hierarchy** | What's primary — the number, the label, the action, the trend |
| **Personality** | Restrained vs. expressive: type scale, colour commitment, corner language |
| **Motion story** | How the piece arrives and leaves — and one variant with no motion at all is a valid direction |

Not axes: accent colour, corner radius, copy, icon set. Two variants separated only by those are one
variant.

## What "realistic" means for UI

- **Content**: real product vocabulary (the actual domain nouns from `docs/CONTEXT.md` if it exists),
  plausible names, plausible numbers, realistic string lengths — including the long one that wraps.
- **Context**: the piece renders against what it will actually sit next to. A toast needs a page
  behind it; a card needs siblings; a row needs 40 more rows and an empty state.
- **States**: at minimum the loaded state, plus whichever of empty / loading / error / overflow the
  brief turns on. A variant that only exists in its best state hides where it breaks.

## Judging is allowed here — with a reason attached

This is the carved design-craft exception (see `design.md`, "the one rule"). When the user asks which
variant is stronger, answer — anchored to a named principle, a slop tell, or a measured value, and to
the product's personality and how often the piece is seen. Never a bare "this one feels better", and
never a pre-picked favourite in the presentation table.

## Handoffs

- One design, question is arrangement → `ui-design` sketch mode (ASCII in chat) is cheaper.
- Interface already exists and the question is "what's weak" → `ui-design` critique mode with
  `design.md` + `slop.md` + `fidelity.md`.
- Where should motion be *added* to an existing surface → `opportunities.md`.
- Need a library rather than a hand-rolled component → `libraries.md`.
