# UI design axis

Read by **planning** skills (`gui`, `grill-me`, `iron-out`) when the domain is `gui`. Design-time
critique lenses for interactive interfaces — not a code engine. Loaded on top of whatever the planning
skill already does, the same way the engines layer platform + domain.

Sources: **Emil Kowalski's design engineering** (animations.dev) — Sonner/Vaul author. **Apple —
*Designing Fluid Interfaces*** (WWDC 2018), ***The Details of UI Typography*** (WWDC 2020),
***Principles of Great Design***. These are platform-agnostic design ideas; the CSS/SwiftUI that
*implements* them lives in `_domains/web/` and `_domains/apple/`, not here.

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
Read; a docs index is Read, not Persuade. (Impeccable, Apache-2.0.)

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

## Lens 4 — Apple's eight design principles (reasoning vocabulary)

Names to reason with, not a scoreboard: **Purpose** (decide what *not* to build), **Agency** (choices +
easy undo), **Responsibility** (privacy/safety, anticipate misuse), **Familiarity** (honor known
metaphors and their physics), **Flexibility** (adapt to device/ability/context), **Simplicity** (strip
to the core; not minimalism), **Craft** (every spacing/timing value is deliberate and defensible),
**Delight** (the result of the other seven, not confetti). Use them to name *which* principle a
decision serves or violates — structurally, never as a quality verdict.

## Lens 5 — typography discipline

- **Tracking is size-specific.** Large display text wants negative tracking; small text wants slightly
  positive. A single `letter-spacing` for all sizes is wrong somewhere. Display floor: `≥ -0.04em`;
  tighter and letters touch. All-caps/eyebrows want `+0.05–0.12em`.
- **Leading tracks size inversely** — tight on headings (1.1–1.2), looser on body (1.5–1.7).
- **Hierarchy = weight + size + leading as a set**, not size alone. Few sizes, more contrast: a 5-step
  scale (caption/secondary/body/subhead/heading) on a committed ratio (1.25 / 1.333 / 1.5). Steps 14/15/16
  are muddy hierarchy.
- **Measure**: cap body at 45–75ch (`max-width: 65ch`). Body ≥16px, always `rem` not `px`.
- **Sizing strategy by register**: fixed `rem` scale for app/dense UI (spatial predictability); fluid
  `clamp()` for marketing/display headings only, bounded `max ≤ ~2.5×min`; hero ceiling ~6rem.
- **Pair on a contrast axis** (serif+sans, geometric+humanist) or one family in weights — never two
  near-identical sans. Don't reflex to Inter/Roboto/Open Sans when personality matters.
- **Scale layout *with* text** (relative units) so a larger user text-size doesn't break it. `text-wrap:
  balance` on h1–h3, `pretty` on long prose (also kills orphaned last words). Never `user-scalable=no`.
- **`font-variant-numeric: tabular-nums`** on any column of figures (tables, prices, metrics, timers) so
  digits align vertically and don't jitter as values change. (Taste Skill.)
- **Properties over raw tags** — `font-weight: 650`, not `font-variation-settings: "wght" 650`;
  `font-variant-numeric: tabular-nums`, not `font-feature-settings: "tnum" 1`. Properties keep working
  when a non-variable fallback renders; raw tags only for custom axes with no property. (jakubkrehel.)
- **Underlines from the font's own metrics** — `text-underline-position: from-font` and
  `text-decoration-thickness: from-font`, with `text-decoration-skip-ink: auto`. Colour is the only part
  of a real `text-decoration` that animates reliably; animating anything else means building the
  underline as a separate element. (jakubkrehel.)
- **Escape hatches for hostile content** — `overflow-wrap: break-word` where a long word, link or ID
  could escape its container; `white-space: nowrap` on labels and badges where a break looks broken.
- **Inputs at 16px on mobile** — iOS Safari zooms the page when a focused input's text is under `16px`.
  Two fixes hold 16px and look different, so it's a design question, not a default: size the input up on
  mobile (`text-base sm:text-sm`), or keep `font-size: 16px` and render the intended size with
  `transform: scale()` compensated. (jakubkrehel.)
- **Smart punctuation in rendered text** — curly quotes in prose, straight in code; en dash for ranges
  (`2010–2020`); the single ellipsis character, not three periods; `&nbsp;` to hold `16 px` together
  across a break; `&shy;` to say where a long word may break.

## Lens 7 — layout & space (space is the primary tool)

- **Spacing comes from a scale, never arbitrary.** Prefer a 4pt base (4/8/12/16/24/32/48/64/96); 8pt is
  too coarse. Arbitrary padding/margins are the tell.
- **Rhythm = contrast**: tight grouping between siblings (8–12px), generous separation between sections
  (48–96px). Equal spacing everywhere = no hierarchy. Vary it.
- **Adjacent-group floor: inter-group gap ≥ 2× intra-group gap** (`8px` inside → `16px`+ between), or
  the grouping reads as noise. Space first, background shapes second, separator lines last and only
  where space alone can't carry the structure. (jakubkrehel.)
- **Logical properties for direction-dependent layout** — `padding-inline-start`, `margin-inline-end`;
  think in leading and trailing, not left and right. Physical `left`/`right` only for genuinely
  physical geometry. (Implementation detail also in `states.md` § Internationalization.)
- **A one-word button label is the riskiest thing on the screen** — translated strings grow, short ones
  proportionally more. No fixed width or height on a text container; test with pseudo-localization and
  one representative locale rather than budgeting a width percentage. (jakubkrehel.)
- **Squint test**: blurred, can you still name primary / secondary / groupings? If not, hierarchy is weak.
- **Hierarchy dimensions** (combine 2–3, don't lean on one):

  | Tool | Strong | Weak |
  | --- | --- | --- |
  | Size | ≥3:1 | <2:1 |
  | Weight | Bold vs Regular | Medium vs Regular |
  | Colour | High contrast | Similar tones |
  | Space | Surrounded by whitespace | Crowded |

- **Flex for 1D, Grid for 2D** — don't default to Grid where `flex-wrap` fits. Container queries for
  components, viewport queries for pages. Semantic z-index scale (dropdown→sticky→modal→toast→tooltip),
  never 999/9999.
- **Cards are the lazy answer** — use only when content is truly distinct/actionable; never nest cards.
  Identical icon+heading+text card grids repeated are slop (see `slop.md`).
- **Touch targets ≥44×44px** even when the glyph is smaller (expand hit area with padding/pseudo-element).
- **Concentric radii** (Taste Skill) — a rounded element nested in another rounded element must have
  `inner radius = outer radius − padding` or the corners aren't truly concentric and read as sloppy:
  `border-radius: calc(2rem - 0.375rem)` on the inner when the outer is `2rem` and the gap is `0.375rem`.
- **Hairline dividers** — a 1px separator is cleaner as `display: grid; gap: 1px` over a contrasting
  background than as per-child borders (which double up and misalign at corners). (Taste Skill.)
- **Cross-element alignment is an audit axis** (Taste Skill redesign checks): across a row of cards, CTAs
  must share a baseline (bottom-align them, don't let copy length float them); in pricing columns,
  feature lists must start at the same Y; where the maths looks aligned but the eye disagrees, nudge 1–2px
  **optically**, not mathematically.

## Lens 8 — colour strategy

- **Pick a strategy before colours**, on a commitment axis: **Restrained** (tinted neutrals + one accent
  ≤10%; product default) → **Committed** (one saturated colour 30–60% of surface) → **Full palette** (3–4
  named roles) → **Drenched** (surface *is* the colour). Register drives the pick.
- **OKLCH, not HSL** (perceptually uniform). Reduce chroma as lightness approaches black/white.
- **Tinted neutrals**: pure gray is dead — add 0.005–0.015 chroma toward *this brand's* hue. Don't
  default-tint warm/cool; that's the cross-project monoculture.
- **60-30-10 by visual weight** (not pixel count): 60 neutral/surface, 30 secondary, 10 accent. Accent
  works *because* it's rare.
- **Semantic-first in product**: accent = primary action / selection / state, never decoration; a colour
  means the same thing on every screen. WCAG: body ≥4.5:1, large/UI ≥3:1; never colour as the only signal.
- **Dark mode ≠ inverted light**: depth from surface lightness (lighter = higher), not shadow; desaturate
  accents; drop body weight a notch. Redefine only the semantic token layer.
- **Alpha is a design smell** — heavy rgba/hsla usually means an incomplete palette; define explicit
  overlay colours. (Anti-slop colour tells — cream/sand bg, purple-blue gradients — live in `slop.md`.)
- **A well-formed ramp has four properties** (jakubkrehel): steps step evenly in *perceived* lightness,
  not the format's lightness channel; hue stays constant end to end; vividness peaks mid-ramp and falls
  off at both ends; steps sit denser at the light end. Both ends stop short of pure black and white,
  which cannot carry hue. Build with a colour library, never by eye.
- **One colour, one meaning — and anything within 15° of hue is the same colour.** If the accent means
  interactive, that hue on static text tells users to click something that isn't clickable. (jakubkrehel.)
- **A gradient's interpolation space is a look, not a correctness setting** — `in oklab` is the best
  default (even brightness, no hue surprises); `in oklch` when a two-hue gradient goes gray in the
  middle; the sRGB default darkens and mutes the midpoint and is what you get without asking.
- **Never report a contrast value you did not measure.** Measure the foreground against the background
  it actually renders on, not the page background. Colour is one of the few interface concerns with an
  exact answer — produce the exact answer. (jakubkrehel.)

## Lens 6 — cohesion

Motion and craft values should be consistent with the component's stated personality and the rest of
the product (a dashboard's motion is crisp and fast; a playful surface can be bouncier). Report a
mismatch as a fact ("this crossfade is 500ms while every other transition here is <200ms"), never as
"this feels off". When motion has no purpose (Lens 2) and is frequently seen (Lens 1), deleting it is
a legitimate option to put on the table.

## The craft floor — checks on the built result

Load these when UI is actually being *edited*, not during planning. Each is a check on what shipped,
not on an intention. (Impeccable, Apache-2.0.) Most are already stated as lenses above; these are the
ones that get skipped:

- **Depth.** A shadow carries an offset **and** a soft blur. A zero-offset coloured halo is decoration,
  not depth. Pick a border or a defined shadow, never both as decoration (cf. the Codex ghost-card in
  `slop.md`).
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
  treatment in `states.md`.
- **Coverage.** Every requirement in the brief present and findable within seconds.

**Verify in bounded passes, not a loop.** Build fully, inspect once in a batched round (desktop and
mobile together, or the shipped device classes), fix everything that round shows in one batch, confirm
with at most one more round, and stop. The checks share one render — don't take a separate screenshot
trip per check. Open-ended self-QA burns the user's money doing worse what a real review pass does
better.

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
live in `_domains/web/review.md` and `_domains/apple/review.md`, loaded by the `review` engine.
The reverse glossary of motion terms is `vocabulary.md` in this directory.

## The rest of this directory

- `opportunities.md` — where motion is **missing or weak**: the four-question gate, the hunt-seam
  sweep, the required rejected-candidates section. Run by `gui` critique, which is `improve`'s
  `gui` aspect.
- `review.md` — where motion is **broken**: jank, interruptibility and stranded state, accessibility.
  Run by the `review` engine. Craft calls never go here.
- `prototype.md` — the craft bar and divergence axes for building UI variants (`spike`).
- `native-first.md` — use the platform's and the library's own components before writing one;
  when an incidental design detail is what forces a custom build, propose the redesign instead.
- `libraries.md` — curated web/React library picks, so a solved component doesn't get hand-rolled.
- `direction.md` — choosing the visual world, and the external-dice mechanism that stops every project
  in a category shipping the same design. Also the comp discipline and the one path to image generation.
- `amplitude.md` — turning a shipped surface up or down: bolder, quieter, distill, overdrive.
- `states.md` — the states only real data reveals: empty, error, loading, permission, i18n, overflow,
  onboarding, and the interface copy that carries them.
- `copy.md` — how interface words are written: voice, tone by stakes, verb-first buttons, error wording.
- `a11y.md` — the accessibility procedure and exact values: the two walks, hit-area floors, the
  announce-mechanism table.
- `slop.md`, `fidelity.md`, `vocabulary.md` — AI-tell catalog, structural surface audit, motion glossary.

## Room for more lenses

Add cells as they earn their place. Same rule on every lens added: a verdict is fine, but it always
carries its concrete reason — a named principle, a slop tell, or a measured value.
