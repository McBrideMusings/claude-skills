# Interface-change floor

Part of the [`review.md`](review.md) lens, read in the same pass for every UI diff. Same output contract.

## Interface-change P1 floor (any UI diff, not just motion)

Adapted from `jakubkrehel/skills` `better-interface` (MIT). Once confirmed present, each of these is
`P1` or worse on sight — never averaged down because the surface is minor:

- An interactive control with no accessible name, or keyboard-reachable with no visible focus indicator.
- A control or path reachable by pointer but not by keyboard.
- Motion or auto-playing content that ignores `prefers-reduced-motion`.
- Content or a control clipped, overlapped, or unreachable at 320px width or 200% zoom.
- A rendered contrast pair failing its required ratio; state or meaning carried by colour alone.
- A destructive action with no confirmation, undo, or distinct treatment.
- Truncated content with no way to reach the full value; hidden content with no visible cue.
- An error that names no way to recover; a semantic colour used against its meaning.
- A state change carried by motion alone — no colour, icon, or label when the animation doesn't run.
- A misbinding — a label, price, status or warning that the layout binds to the wrong object.

These set the P-level, not new rules — the owning cell (`a11y.md`, `design.md`, `design/grouping.md`,
`states.md`) decides
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
