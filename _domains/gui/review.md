# UI motion defect lens

Platform-agnostic lens for the `review` engine. Runs as one additional Sonnet sub-agent in Phase 04
when the `gui` label is in scope. Same output contract as the other lenses: report only genuine
problems, `file:line`, a full-sentence headline, a **Why** (the concrete cost), and a **Fix**. Axis
tag: `gui`. Do not nitpick style or invent issues.

**Scope — defects only.** `review` judges whether the code is correct: does it drop frames, does it
break for a user with reduced motion, does it strand state under real input. Craft questions — should
this animate at all, is the easing the right *choice*, is there a spatial story, does the motion match
the product's personality — are **not** defects and do not belong in a review. Those live in
[`opportunities.md`](opportunities.md), which `improve`'s `gui` aspect runs through `gui` critique
mode. If a finding here is really "this would be nicer as X", it is out of scope; drop it.

This lens flags the **principle**; the exact curve/duration/GPU-property values and the
framework-specific fixes come from the platform cell — `_domains/web/review.md` (CSS/React) or
`_domains/apple/review.md` (SwiftUI) — which the engine loads alongside this one.

Also load **`slop.md`** in the same pass and run its catalog against the changed surface: the absolute
bans, the colour/type tells, and the model-specific defects are objective match-and-refuse checks (a
side-stripe border, gradient text, an over-rounded card, an image-on-hover). Report a hit like any
other finding — `file:line`, the named tell, the **Why**, the **Fix** — never as "looks generic".

Substantive bar from Emil Kowalski (animations.dev) and Apple's *Designing Fluid Interfaces*.

## What to flag (each carries a measurable cost, not a taste call)

**Performance**
- Animating layout- or paint-triggering properties (`width`, `height`, `top`, `left`, `margin`,
  `box-shadow` on a large surface) where `transform`/`opacity` would do the same job — this drops
  frames on real hardware. Exact property list and fixes: platform cell.
- `transition: all` — animates properties nobody chose, including expensive ones, and retargets
  unpredictably when a class changes.
- Animation running on an element that is offscreen, hidden, or unmounted-but-alive — burns frames for
  nothing.

**Interruptibility and state**
- Rapidly-triggered or gesture-driven motion (toasts, toggles, drags) built on restart-from-zero
  keyframes instead of interruptible transitions or springs — a second trigger mid-flight jumps.
- Motion whose completion callback owns a state change (`onAnimationEnd` sets the real state) — if the
  animation is interrupted, cancelled, or never fires because the tab was backgrounded, the state is
  stranded. This is a bug, not a polish item.
- Enter/exit driven by a timer that can desynchronise from the animation it's pretending to track.

**Accessibility**
- No reduced-motion handling on movement/position animation. Reduced motion means *gentler*, not zero —
  keep opacity and colour, drop transform-based motion. Vestibular triggers (large-surface parallax,
  full-screen zoom, spinning) are the severe case.
- Hover-triggered motion not gated on pointer type — touch fires false hovers on tap, so the animation
  runs and sticks.
- Motion that is the *only* signal a state changed, with no text/ARIA equivalent.
- Infinite or auto-playing motion with no way to stop it.

**Physical correctness with a functional cost**
- Entry from `scale(0)` or equivalent — the element materialises from nothing, and at small scales the
  intermediate frames are unreadable. Exact starting scale: platform cell.
- Enter and exit taking different *paths* on a dismissable surface, so the element's return target is
  no longer predictable.
- Overshoot/bounce on motion that carried no momentum (a menu that just faded in) — reserve overshoot
  for gesture-driven motion (a flick, a drag release); anything else should be critically damped.
- A drag or dismissable element that snaps to the nearest target from the *release position* instead of
  projecting its resting point forward from the release *velocity* — ignores the motion the user's
  gesture already had.

## The remedial order (prefer earlier moves)

1. Move it to GPU-friendly properties (platform cell has the specifics).
2. Make it interruptible; take state changes off animation callbacks.
3. Add reduced-motion and pointer-type gating.
4. Fix the origin/physicality (`scale(0)`, mismatched enter/exit paths).
5. Reduce it — shorter, smaller, fewer animated properties.

Deleting motion outright is a legitimate outcome, but "this shouldn't animate at all because it's seen
100+ times a day" is an `opportunities.md` finding, not a review finding — note it and route it there
rather than reporting it here.

## Interface-change severity floor (any UI diff, not just motion)

Adapted from `jakubkrehel/skills` `better-interface` (MIT). Once confirmed present, each of these is
severe on sight — never averaged down because the surface is minor:

- An interactive control with no accessible name, or keyboard-reachable with no visible focus indicator.
- A control or path reachable by pointer but not by keyboard.
- Motion or auto-playing content that ignores `prefers-reduced-motion`.
- Content or a control clipped, overlapped, or unreachable at 320px width or 200% zoom.
- A rendered contrast pair failing its required ratio; state or meaning carried by colour alone.
- A destructive action with no confirmation, undo, or distinct treatment.
- Truncated content with no way to reach the full value; hidden content with no visible cue.
- An error that names no way to recover; a semantic colour used against its meaning.
- A state change carried by motion alone — no colour, icon, or label when the animation doesn't run.

These set severity, not new rules — the owning cell (`a11y.md`, `design.md`, `states.md`) decides
whether the symptom is present; this list decides what it costs.

**Prefer the cheaper fix.** When more than one fix would work, propose the earliest that does:
**1. Delete** (a separator space would carry, an ARIA attribute a native element makes redundant) →
**2. Use the platform** (the native element, the browser's own focus ring — `native-first.md`) →
**3. Reuse what the project has** (an existing token, spacing step, motion curve) →
**4. Correct the value** → **5. Add** (a new token, wrapper, attribute). A fix written at step 5
where step 1 was available is its own finding — report the deletion instead.

## Read the removed lines (change reviews)

Regressions are invisible in the post-change state; read the `-` side of every hunk. Signals worth
routing (adapted from `jakubkrehel/skills` `interface-review`, MIT): removed `aria-*`/`role=`/`alt=`/
`<label`; a native element (`<button>`, `<a>`, `<nav>`) replaced by `div`/`span`; removed
`:focus-visible`/`outline`/`tabindex`; removed `prefers-reduced-motion` guards; logical properties
swapped for `left`/`right`; removed `lang=`/`dir=`/`text-wrap`/`line-clamp`/`tabular-nums`; a colour
token swapped for a literal or a lighter token; a user-facing string deleted or shortened.

A signal is a lead, never a finding — check for equivalent replacements first (`aria-label` →
`aria-labelledby` at visible text, `role="button"` dropped as the `div` became a `<button>`,
`outline` → a passing `box-shadow` ring, a physical property → its logical counterpart). Restrict
the search to deleted lines so additions don't mask a removal:

```bash
git diff -U0 "$BASE"...HEAD -- '*.tsx' '*.css' | grep -E '^-[^-]' | grep -E 'aria-|role=|alt=|focus|tabindex|prefers-'
```

## Output

Group by file; skip clean files; end with a prioritized summary (highest-impact first). Findings flow
into the normal Phase 05 scoring and the ≥75 cutoff like any other axis. When a finding needs an exact
value (a curve, a duration, a spring config), pull it from the platform cell rather than approximating.
