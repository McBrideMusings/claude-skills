# Layout and space

Part of [`design.md`](../design.md) — its one rule holds here: every verdict carries its concrete reason.

## Lens 7 — layout & space (space is the job of grouping)

Space is the primary tool for one reason: grouping. The full set of Gestalt grouping principles
(proximity, similarity, common region, connectedness, continuation, common fate, closure,
figure-ground, Prägnanz), the misbinding failure mode, and the six-question audit live in
`grouping.md`. This lens keeps the spacing scale, the hierarchy table, flex/grid, radii, dividers and
touch targets.

- **Spacing comes from a scale, never arbitrary.** Prefer a 4pt base (4/8/12/16/24/32/48/64/96); 8pt is
  too coarse. Arbitrary padding/margins are the tell.
- **Rhythm = contrast**: tight grouping between siblings (8–12px), generous separation between sections
  (48–96px). Equal spacing everywhere = no hierarchy. Vary it.
- **Adjacent-group floor (proximity): inter-group gap ≥ 2× intra-group gap** (`8px` inside → `16px`+
  between), or the grouping reads as noise — undershoot it and a label lands in "label limbo",
  equidistant between two fields, and about half of users bind it to the wrong one. Space first,
  background shapes second, separator lines last and only where space alone can't carry the
  structure. (jakubkrehel.) See `grouping.md` for the full principle.
- **Cue congruence**: when spacing, border and colour disagree about the structure, the screen carries
  two competing information architectures — the fix is to make the cues agree, never to add a fourth
  cue on top of the disagreement. Full treatment in `grouping.md`.
- **Logical properties for direction-dependent layout** — `padding-inline-start`, `margin-inline-end`;
  think in leading and trailing, not left and right. Physical `left`/`right` only for genuinely
  physical geometry. (Implementation detail also in `../states.md` § Internationalization.)
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
  Identical icon+heading+text card grids repeated are slop (see `../slop.md`). A border is the strongest
  grouping cue on the screen (common region overrides both proximity and similarity), which is exactly
  why wrapping everything in its own card is expensive — see `grouping.md`.
- **Touch targets ≥44×44px** even when the glyph is smaller (expand hit area with padding/pseudo-element).
- **Concentric radii** (Taste Skill) — a rounded element nested in another rounded element must have
  `inner radius = outer radius − padding` or the corners aren't truly concentric and read as sloppy:
  `border-radius: calc(2rem - 0.375rem)` on the inner when the outer is `2rem` and the gap is `0.375rem`.
- **Hairline dividers** — a 1px separator is cleaner as `display: grid; gap: 1px` over a contrasting
  background than as per-child borders (which double up and misalign at corners). (Taste Skill.)
- **Cross-element alignment is an audit axis** (Taste Skill redesign checks) — this is good continuation
  (`grouping.md`): across a row of cards, CTAs must share a baseline (bottom-align them, don't let copy
  length float them); in pricing columns, feature lists must start at the same Y; where the maths looks
  aligned but the eye disagrees, nudge 1–2px **optically**, not mathematically.
