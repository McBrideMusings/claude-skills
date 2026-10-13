# Polish — checks on the built result

Part of [`design.md`](../design.md) — its one rule holds here: every verdict carries its concrete reason.

Load these when UI is actually being *edited*, not during planning. Each is a check on what shipped,
not on an intention. Most are already stated in the other lenses; these are the
ones that get skipped:

- **Depth.** A shadow carries an offset **and** a soft blur. A zero-offset coloured halo is decoration,
  not depth. Pick a border or a defined shadow, never both as decoration (cf. the Codex ghost-card in
  `../slop.md`).
- **Shadows take the surface's hue.** A shadow is the background darkened, so tint it toward the
  background's hue. A pure black shadow (`rgba(0,0,0,…)`) on a light tinted page reads as grey dirt
  beside it.
- **Browser surfaces.** The parts you did not draw still carry the design: **text selection, the caret,
  scrollbars, focus rings, underline offset, and the numerals in tabular data** all ship with browser
  defaults belonging to no design system. Theme them from the palette. This is the cheapest signal that
  a page was *built* rather than assembled, and the one models skip most reliably.
- **One authored moment.** Motion is one deliberate moment per surface, not scattered effects and not
  the same entrance animation on every section. Exponential ease-out from an already-visible default.
  Reach past `transform` and `opacity` — `filter: blur`, `backdrop-filter`, `clip-path`, `mask` and
  shadow belong to the palette when they stay smooth.
- **Secondary text on a coloured surface is tinted from that hue or from the foreground, never gray.**
- **Committed polish values** (jakubkrehel; each is a value, not a range to approximate): press
  feedback is `scale(0.96)` — below `0.95` feels exaggerated. An icon swapping in animates `opacity`,
  `scale` and `blur` together: scale `0.25→1`, opacity `0→1`, blur `4px→0`; with a motion library,
  `{type: "spring", duration: 0.3, bounce: 0}` — bounce is always `0`. Images get a `1px` outline of
  pure black in light mode (`oklch(0 0 0 / 0.1)`) or pure white in dark (`oklch(1 0 0 / 0.1)`) — never
  a tinted neutral, which picks up the surface underneath and reads as dirt on the image edge.
- **Suppress transitions on theme switch.** A theme flip changes colour on nearly every element at
  once; every transition fires together and the switch smears instead of snapping. Inject
  `*,*::before,*::after{transition:none !important}`, force a reflow, remove it next frame. (jakubkrehel.)
- **States.** Hover, disabled, loading, error, empty — with real content and working controls. Full
  treatment in `../states.md`.
- **Coverage.** Every requirement in the brief present and findable within seconds.

**Verify in bounded passes, not a loop.** Build fully, inspect once in a batched round (desktop and
mobile together, or the shipped device classes), fix everything that round shows in one batch, confirm
with at most one more round, and stop. The checks share one render — don't take a separate screenshot
trip per check. Open-ended self-QA burns the user's money doing worse what a real review pass does
better.
