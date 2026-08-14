# Web / CSS / React motion review lens

Platform lens for the `review` engine. Runs as one additional Sonnet sub-agent in Phase 04 when the
diff in scope contains CSS / JSX / animation code (transitions, keyframes, Framer Motion, WAAPI). Same
output contract as the other lenses: report only genuine problems, `file:line`, a full-sentence
headline, a **Why** (concrete cost), and a **Fix** with a before/after where it clarifies. Axis tag:
`web`. Do not nitpick style or invent issues.

This is the **implementation** half of motion review. The principle-level lens (`_domains/gui/review.md`)
loads alongside this one when the `gui` label is in scope; this cell carries the exact curves,
durations, and properties to cite in fixes. Substantive bar from Emil Kowalski (animations.dev).

## Concrete values (cite these instead of approximating)

**Duration budget** — UI animations stay under 300ms:

| Element | Duration |
| --- | --- |
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–500ms |

**Easing** — entering/exiting → `ease-out`; on-screen movement → `ease-in-out`; hover/color → `ease`;
constant motion → `linear`. Built-in CSS easings are weak; expect strong custom curves:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

## What to flag

**Easing / duration**
- `transition: all` → name the exact properties (`transition: transform 200ms ease-out`); `all`
  animates unintended properties, often off-GPU.
- `ease-in` on a UI element → `ease-out` or a custom curve. `ease-in` delays movement to the end of the
  curve — the entry frames the user watches most.
- A built-in easing (`ease`, `linear`) on a deliberate UI animation where a strong custom curve belongs.
- UI duration > 300ms with no stated reason → reduce per the table above.

**Physicality**
- `transform: scale(0)` (or pure-fade entry with no initial transform) → `scale(0.95); opacity: 0`.
- `transform-origin: center` on a trigger-anchored popover/dropdown/tooltip →
  `var(--radix-popover-content-transform-origin)` (Radix) or `var(--transform-origin)` (Base UI).
  Modals are exempt — keep centered.
- Pressable element with no `:active` feedback → `transform: scale(0.97)` + `transition: transform
  160ms ease-out`.

**Interruptibility**
- `@keyframes` on toasts, toggles, or anything added/triggered rapidly → CSS transitions (retarget
  mid-flight; keyframes restart from zero).
- Prefer `@starting-style` for entry over a `useEffect(() => setMounted(true))` + `data-mounted` dance
  where browser support allows.

**Performance**
- Animating `width`/`height`/`margin`/`padding`/`top`/`left` → animate `transform`/`opacity` (they skip
  layout and paint; the others trigger all three).
- Framer Motion `x`/`y`/`scale` shorthand props on motion that runs while the page is busy → the full
  `transform: "translateX(100px)"` string (the shorthands run on the main thread via rAF and drop
  frames under load).
- Driving a child transform by setting a CSS variable on the parent → set `transform` directly on the
  element (a parent-var change recalcs styles for every child).
- Programmatic CSS animation hand-rolled on rAF where WAAPI (`element.animate([...], {...})`) gives
  hardware acceleration + interruptibility with no library.

**Timing & polish**
- Symmetric enter/exit on a press-and-hold or deliberate interaction → slow the deliberate phase, snap
  the response (e.g. press `clip-path 2s linear`, release `200ms ease-out`).
- Everything-at-once group entrance where a 30–80ms stagger belongs.
- A crossfade that shows two overlapping states after easing/duration tuning → subtle `filter:
  blur(2px)` during the transition to blend them (keep blur < 20px; heavy blur is costly in Safari).

**Accessibility**
- Missing `@media (prefers-reduced-motion: reduce)` on movement (keep opacity/color, drop
  transform-based motion — gentler, not zero).
- `:hover` motion not gated behind `@media (hover: hover) and (pointer: fine)` (touch fires false
  hovers on tap).

## Gestures & drag (when the diff has pointer handling)

- Momentum dismissal: compute velocity (`Math.abs(distance)/elapsedMs`), dismiss if `> ~0.11`, don't
  require crossing a fixed distance.
- `setPointerCapture` once dragging starts, so tracking continues past the element bounds.
- Multi-touch protection: ignore extra touch points after a drag begins (`if (isDragging) return`).
- Damping/friction past a boundary instead of a hard stop.

## Output

Group by file; skip clean files; end with a prioritized summary (highest-impact first). Findings flow
into the normal Phase 05 scoring and the ≥75 cutoff like any other axis.
