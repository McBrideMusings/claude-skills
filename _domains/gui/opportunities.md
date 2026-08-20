# UI motion opportunities

Read by **planning** — `design` critique mode, which is what `improve`'s `ui` aspect loads. This is
the *opportunity* half of UI motion: where motion is missing and would earn its place, and where
existing motion is craft-weak (wrong easing, no spatial story, incoherent with the rest of the
product). Defects — jank, missing reduced-motion, animations that strand state — are not here; they're
`review.md` and the platform cells.

The split, stated once: **`review.md` finds motion that is broken. This cell finds motion that is
absent or weak.** Both read `design.md` for the lenses.

Harvested from emilkowalski/skills `find-animation-opportunities` and `improve-animations` (MIT,
© 2026 Emil Kowalski).

## The premise — most candidates get rejected

The starting position is Emil Kowalski's "You Don't Need Animations"
(https://emilkowal.ski/ui/you-dont-need-animations): often the best animation is none. An opportunity
pass that suggests motion everywhere produces exactly the sluggish, over-animated interface this store
exists to prevent. Expect to reject most candidates. A short list of high-conviction opportunities
beats a long wishlist, and "the motion here is already right" is a legitimate result to report.

Cap the output: at most 5–7 suggestions for a whole app, fewer for a single view, ordered by leverage.

## The gate — every candidate survives all four, in order

Record each answer; they go in the report.

### 1. Frequency — how often is this seen?

Straight from `design.md` Lens 1, applied as a filter:

| Frequency | Verdict |
| --- | --- |
| 100+/day (keyboard shortcuts, command palette, core nav) | **Reject. No animation.** |
| Tens/day (hover, list nav, frequent toggles) | Reject, or near-imperceptible only |
| Occasional (modals, drawers, toasts, settings) | Eligible — standard motion |
| Rare / first-run (onboarding, empty, success, celebration) | Eligible — the delight budget lives here |

Keyboard-initiated actions are a disqualifier, not a judgement call.

### 2. Purpose — why does it animate?

Must be one of `design.md` Lens 2's five, named explicitly: feedback, spatial consistency, state
indication, preventing a jarring change, explanation. Plus **delight** — allowed *only* at the
rare/first-run tier. "It looks cool" is not on the list; if the purpose can't be named in one of those
words, reject.

### 3. Speed — does it fit the budget?

| Element | Duration |
| --- | --- |
| Press feedback | 100–160 ms |
| Tooltips, small popovers | 125–200 ms |
| Dropdowns, selects | 150–250 ms |
| Modals, drawers | 200–500 ms |
| Marketing / explanatory | Can run longer |

If the moment only works as a slow showy animation, it fails.

### 4. Function — does motion help or hinder here?

Decoration on functional, information-dense UI hinders. A mouse-tracking effect is fine on a marketing
page; on a banking app's balance graph, no animation is better. Data the user is trying to *read* or
*act on* does not move for style.

## Where to hunt

Each seam is a known class of genuine opportunity. The pass is done when every class has either
produced candidates with `file:line` evidence or been explicitly cleared.

**Feedback gaps**
- Pressable elements with no `:active` state → `transform: scale(0.97)`, `transition: transform 160ms
  ease-out` (subtle range 0.95–0.98).
- Destructive actions confirmed by a plain click, where a slip is costly → hold-to-confirm fill:
  `clip-path: inset(0 100% 0 0)` overlay, ~2 s linear on press, 200 ms ease-out snap-back on release.

**Teleporting state**
- Content that swaps, appears, or vanishes instantly (conditional renders, route content, expanding
  sections) → fade + scale from `0.95–0.97` with `opacity: 0`, `ease-out`, never `scale(0)`;
  `@starting-style` for entry without JS.
- Accordions and collapses that snap open → height + opacity transition.
- List items added or removed with no bridge, on a list that isn't high-frequency → enter/exit
  transitions built from CSS *transitions*, not keyframes, so rapid triggers retarget smoothly.

**Missing spatial story**
- Panels, popovers, menus appearing with no connection to their trigger → scale in with
  `transform-origin` at the trigger (Base UI exposes `var(--transform-origin)`). Modals are exempt —
  they stay viewport-centred.
- Dismissable surfaces that exit by a different path than they entered → make the paths symmetric; use
  `translateY(100%)` percentages, not hardcoded pixels.

**Group entrances**
- A grid or list on a page seen occasionally that pops in all at once → 30–80 ms stagger. Decorative,
  so it must never block interaction.

**Gesture seams**
- Draggable or swipeable elements that snap with no physics → springs (`{ type: "spring", duration:
  0.5, bounce: 0.2 }`, bounce 0.1–0.3), velocity-based dismissal (`Math.abs(distance)/elapsedMs >
  ~0.11`), rubber-banding at boundaries instead of hard stops.

**The delight budget**
- Rare, high-emotion moments rendered flat — first run, empty states, success, completion. The only
  places bounce, generous stagger, or a longer beat are welcome.

**Weak existing motion** (craft, not defect)
- `ease-in` or `ease` on an entrance → `ease-out`; entry is the moment the user watches most.
- Motion incoherent with the product's personality or with its neighbours — a 500 ms crossfade where
  every sibling transition is under 200 ms.
- Parallel one-off values where the project has easing/duration tokens → consolidate onto the tokens.

Useful sweeps: `{isOpen &&` and `display: none` toggles with no transition, `onClick` on elements with
no `:active` or transition styles, `details`/accordion markup, drag handlers, `.map(` renders of
entering lists, empty-state and success components, `transition: all`, `scale(0)`.

## Output

**Part 1 — opportunities**, ordered by leverage:

| # | Location | Today | Purpose | Frequency | Suggested motion |
| --- | --- | --- | --- | --- | --- |
| 1 | `Toast.tsx:41` | Appears instantly | Preventing a jarring change | Occasional | `@starting-style` entry `opacity: 0; translateY(100%)` → settled, 400 ms ease, exit the same edge |

Every "suggested motion" cell carries **exact values** — curve, duration, properties — taken from
`_domains/web/review.md`'s tokens (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out:
cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`) or from the
project's own tokens, never approximated. `transform` and `opacity` only; include reduced-motion
handling (gentler, not zero) and `@media (hover: hover) and (pointer: fine)` gating on anything
hover-triggered.

**Part 2 — rejected candidates (required).** 2–5 places considered and deliberately not suggested,
each with the gate question that killed it:

- `CommandMenu.tsx:12` — palette open/close. **Rejected: keyboard-initiated, 100+/day.**
- `Chart.tsx:88` — line-drawing animation on the analytics graph. **Rejected: functional data the user
  is reading; decoration hinders.**

This section is what separates an opportunity pass from an animation wishlist. Omitting it invalidates
the pass.

**Part 3 — verdict.** One short paragraph: how much motion this interface actually needs, whether it's
already close to right, and which single suggestion has the highest leverage.

## Honesty

When feel can't be judged from code alone — a crossfade, a spring's bounce, a gesture — say so rather
than guessing, and make the suggestion carry a feel-check step (watch it slowed down, on a real
device for gestures). Daily use argues for less motion, not more.
