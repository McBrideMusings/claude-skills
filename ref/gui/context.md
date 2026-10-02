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
| [`layers/`](layers/) | One cell per layer beneath the screen: observed behaviour, domain, user needs, strategy, conceptual model, interaction flow. |
| [`sketch.md`](sketch.md) | Laying out one design as ASCII in chat, before any rendered wireframe. |
| [`critique.md`](critique.md) | Judging whether an existing interface is well designed — every pass, run against a screenshot. |
| [`states.md`](states.md) | Enumerating empty, loading, error, partial, too-much and one-item cases. |
| [`design.md`](design.md) | Composing a new screen or component. |
| [`grouping.md`](grouping.md) | Deciding what the eye will bind to what — grouping, enclosure, alignment, misbinding. |
| [`direction.md`](direction.md) | Choosing the visual world for something new. |
| [`fidelity.md`](fidelity.md) | Deciding how finished a mockup needs to be. |
| [`vocabulary.md`](vocabulary.md) | Naming what you are looking at before critiquing it. |
| [`slop.md`](slop.md) | Judging whether an interface reads as AI-generated. |
| [`amplitude.md`](amplitude.md) | Making a design bolder or quieter. |
| [`opportunities.md`](opportunities.md) | Hunting for missing or weak motion — the gap no other lens looks for. |
| [`icons.md`](icons.md) | Picking or drawing iconography. |
| [`alt-text.md`](alt-text.md) | Writing alt text and accessible labels. |
| [`a11y.md`](a11y.md) | Verifying accessibility on an interface, including the desktop/tablet/phone viewport walk. |
| [`forms.md`](forms.md) | Designing or critiquing a form: validation timing, inline errors, defaults, autofill, submit states, multi-step. |
| [`volume.md`](volume.md) | Building or critiquing a volume slider or any audio gain control. |
| [`copy.md`](copy.md) | Writing the words in the interface: labels, errors, toggles, tone. |
| [`native-first.md`](native-first.md) | Tempted to write a component the platform already ships. |
| [`libraries.md`](libraries.md) | Choosing a component or styling library. |
| [`prototype.md`](prototype.md) | Building a throwaway to settle a design question. |
| [`review.md`](review.md) | Reviewing an interface change for motion defects and slop. |
| [`launch-readiness.md`](launch-readiness.md) | Reviewing a whole site or app about to ship — the last-mile checklist `states.md` and `slop.md` don't cover. |

Sketches and wireframes are built by `spike`; a critique runs as `improve gui`, and code defects as `review`.
