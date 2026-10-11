# Motion lenses

Part of [`design.md`](../design.md) — its one rule holds here: every verdict carries its concrete reason.

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
- **Feedback** — confirms input was received (press → `scale(0.96)`).
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

## Lens 6 — cohesion

Motion and craft values should be consistent with the component's stated personality and the rest of
the product (a dashboard's motion is crisp and fast; a playful surface can be bouncier). Report a
mismatch as a fact ("this crossfade is 500ms while every other transition here is <200ms"), never as
"this feels off". When motion has no purpose (Lens 2) and is frequently seen (Lens 1), deleting it is
a legitimate option to put on the table.
