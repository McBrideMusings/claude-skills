# gui — injected context

> Design all states: empty, loading, error, partial. Colour never carries meaning alone.

Graphical interfaces — desktop, web, and mobile. The design principles are shared across
all three; the platform label says where it ships. Terminal interfaces are [`ref/tui`](../tui/context.md),
a sibling, and most of this does not apply there.

- **Every state gets designed, not just the happy one** — empty, loading, error, partial,
  too-much-content, and the one-item case.
- **Never let colour alone carry meaning.** Pair it with text, shape, or position.
- **Interactive targets need a visible affordance and a focus ring**; keyboard reachability
  is not optional.
- **Use the built-in component before writing your own** — [native-first.md](native-first.md).

## Files

| Open | When |
| --- | --- |
| [`orient.md`](orient.md) | Deciding what to build — which design layer is the bottleneck. |
| [`working-layers.md`](working-layers.md) | Working one of the seven design layers; the framework and its principles. |
| [`layers/observed-behaviour.md`](layers/observed-behaviour.md) | Planning or reading user research: interviews, observation, what users actually do today. |
| [`layers/domain.md`](layers/domain.md) | Mapping the users' domain and its vocabulary, or resolving terms that mean different things to different people. |
| [`layers/user-needs.md`](layers/user-needs.md) | Writing job stories or eliciting what users need, separate from any proposed solution. |
| [`layers/product-strategy.md`](layers/product-strategy.md) | Deciding a product's scope, direction or which bet to make, before specifying features. |
| [`layers/conceptual-model.md`](layers/conceptual-model.md) | Deciding what objects a product has, how they relate, their states and their names. |
| [`layers/interaction-flow.md`](layers/interaction-flow.md) | Deciding how a user moves through screens and steps to finish a task, before any layout. |
| [`sketch.md`](sketch.md) | Laying out one design as ASCII in chat, before any rendered wireframe. |
| [`sketch/greybox.md`](sketch/greybox.md) | A layout question that depends on real proportions and needs a rendered greybox wireframe. |
| [`sketch/canvas.md`](sketch/canvas.md) | Handing the user a blank Monodraw canvas to redraw a sketch in, or reading what they drew. |
| [`critique.md`](critique.md) | Judging whether an existing interface is well designed — every pass, run against a screenshot. |
| [`heuristics.md`](heuristics.md) | Running Nielsen's ten usability heuristics over an interface, or rating how severe a usability problem is. |
| [`states.md`](states.md) | Enumerating empty, loading, error, partial, too-much and one-item cases. |
| [`selection.md`](selection.md) | Building or reviewing anything a person selects to inspect — a row, a graph node, a map point, a card — and its deselect. |
| [`design.md`](design.md) | Composing a new screen or component. |
| [`design/motion.md`](design/motion.md) | Deciding whether a press, transition, drag, toast or modal animates, and why. |
| [`design/typography.md`](design/typography.md) | Setting type on a screen: sizes, tracking, leading, font pairing, line length, numerals. |
| [`design/layout.md`](design/layout.md) | Setting spacing, alignment, hierarchy, cards, radii or touch targets on a screen. |
| [`design/grouping.md`](design/grouping.md) | Checking whether a label, price, status or action sits with the object it belongs to. |
| [`design/gestalt.md`](design/gestalt.md) | Checking proximity, enclosure, alignment, connectors or figure-ground on a screen. |
| [`design/colour.md`](design/colour.md) | Choosing a palette, a colour ramp, dark mode or a gradient, or checking contrast. |
| [`design/polish.md`](design/polish.md) | Finishing a built UI: shadows, scrollbars, selection, focus rings, press feedback, theme switching. |
| [`direction.md`](direction.md) | Choosing the visual world for something new. |
| [`fidelity.md`](fidelity.md) | Deciding how finished a mockup needs to be. |
| [`vocabulary.md`](vocabulary.md) | Naming what you are looking at before critiquing it. |
| [`slop.md`](slop.md) | Judging whether an interface reads as AI-generated. |
| [`slop/stand-ins.md`](slop/stand-ins.md) | Checking a screen for stand-ins: emoji icons, a system display font, mono as costume, fake charts, an unneeded modal. |
| [`slop/structure.md`](slop/structure.md) | Laying out a landing or marketing page: hero, bento grid, logo wall, spec table, zigzag sections. |
| [`slop/copy.md`](slop/copy.md) | Writing landing-page copy: separators, badges, social proof, step labels, calls to action. |
| [`slop/colour-and-type.md`](slop/colour-and-type.md) | Picking a page background, gradient, neutral tint, display serif or glow. |
| [`amplitude.md`](amplitude.md) | Making a design bolder or quieter. |
| [`opportunities.md`](opportunities.md) | Hunting for missing or weak motion — the gap no other lens looks for. |
| [`icons.md`](icons.md) | Picking or drawing iconography. |
| [`alt-text.md`](alt-text.md) | Writing alt text and accessible labels. |
| [`a11y.md`](a11y.md) | Verifying accessibility on an interface, including the desktop/tablet/phone viewport walk. |
| [`forms.md`](forms.md) | Designing or critiquing a form: validation timing, inline errors, defaults, autofill, submit states, multi-step. |
| [`../audio/volume.md`](../audio/volume.md) | Building or critiquing a volume slider or any audio gain control. |
| [`copy.md`](copy.md) | Writing the words in the interface: labels, errors, toggles, tone. |
| [`native-first.md`](native-first.md) | Tempted to write a component the platform already ships. |
| [`libraries.md`](libraries.md) | Choosing a component or styling library. |
| [`prototype.md`](prototype.md) | Building a throwaway to settle a design question. |
| [`review.md`](review.md) | Reviewing an interface change for motion defects and slop. |
| [`scripts/preflight.mjs`](scripts/preflight.mjs) | Scanning HTML, CSS or component files for slop tells and craft defects before reading them. |
| [`review-floor.md`](review-floor.md) | Reviewing any UI diff for accessibility and misbinding regressions, including removed lines. |
| [`launch-readiness.md`](launch-readiness.md) | Reviewing a whole site or app about to ship — the last-mile checklist `states.md` and `slop.md` don't cover. |

Sketches and wireframes are built by `spike`; a critique runs as `improve gui`, and code defects as `review`.
