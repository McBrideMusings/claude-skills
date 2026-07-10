# UI motion / craft review lens

Platform-agnostic lens for the `review` engine. Runs as one additional Sonnet sub-agent in Phase 04
when the `ui` domain is in scope. Same output contract as the other lenses: report only genuine
problems, `file:line`, a full-sentence headline, a **Why** (the concrete cost), and a **Fix**. Axis
tag: `ui`. Do not nitpick style or invent issues.

This lens flags **principle-level** motion problems. The exact curve/duration/GPU-property values and
the framework-specific fixes come from the platform cell — `_platforms/web/review.md` (CSS/React) or
`_platforms/apple/review.md` (SwiftUI) — which the engine loads alongside this one. Flag the principle
here; cite the concrete value from the platform cell.

Substantive bar from Emil Kowalski (animations.dev) and Apple's *Designing Fluid Interfaces*.

## What to flag (each carries a concrete cost, not a taste call)

**Purpose & frequency**
- Animation on a keyboard shortcut, command-palette toggle, or any 100+/day action — adds latency to a
  repeated action. → remove.
- Motion whose only purpose is decoration on a frequently-seen element (no spatial/state/feedback/
  explanation function). → remove or justify.

**Physical correctness**
- Entry from nothing (`scale(0)` or equivalent) — an element appearing from zero size reads as
  materializing from nowhere. → start from ~`0.95` + fade.
- A trigger-anchored popover/dropdown/tooltip that scales from its center instead of its trigger — the
  spatial link to what opened it is lost. (Modals are exempt — they're viewport-centered.)
- Enter and exit taking different *paths* (in-from-right, out-the-bottom) — breaks spatial consistency.

**Timing**
- A UI transition whose duration exceeds the platform budget with no stated reason.
- Symmetric timing on a press-and-hold or deliberate/destructive interaction — the deliberate phase
  should be slower than the system's response (asymmetric).

**Interruptibility**
- Rapidly-triggered or gesture-driven motion (toasts, toggles, drags) built on restart-from-zero
  keyframes instead of interruptible transitions/springs — a second trigger mid-flight jumps.

**Responsiveness**
- Feedback that fires only at gesture *end* instead of continuously during it; feedback deferred to
  release instead of pointer-down.

**Accessibility**
- No reduced-motion handling on movement/position animation (reduced motion means *gentler*, not zero —
  keep opacity/color, drop transform-based motion).
- Hover-triggered motion not gated for pointer type (touch fires false hovers on tap).

## The remedial order (prefer earlier moves)

1. Delete it (high-frequency / no purpose / keyboard-triggered).
2. Reduce it (shorter, smaller, fewer animated properties).
3. Fix the easing/origin/physicality.
4. Make it interruptible.
5. Move it to GPU-friendly properties (platform cell has the specifics).
6. Make deliberate/response timing asymmetric.
7. Add reduced-motion + pointer gating.

## Output

Group by file; skip clean files; end with a prioritized summary (highest-impact first). Findings flow
into the normal Phase 05 scoring and the ≥75 cutoff like any other axis. When a finding needs an exact
value (a curve, a duration, a spring config), pull it from the platform cell rather than approximating.
