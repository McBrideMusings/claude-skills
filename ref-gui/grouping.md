# Grouping and misbinding — the Gestalt principles

Read by `gui` critique/audit mode and by the engines (`review`, `verify`) when the domain is `gui`.
This is the lens that judges *what the eye binds to what*, before any question of whether the
spacing scale or the palette is right. Source: Jakob Nielsen, UX Tigers —
https://www.uxtigers.com/post/gestalt-principles.

## The frame

A screen gets scanned twice. The first pass runs before any conscious reading starts, lasts a
fraction of a second, and sorts the layout into clusters — it decides what belongs with what purely
from shape and position. Labels, prices and button copy only get processed on the second pass, after
the clustering is already locked in. When the visual grouping points one way and the content points
another, the first pass wins and the second pass can't undo it: the user has already paired the price
with the wrong item before reading either one. Name that failure **misbinding**: a piece of text — a
label, a price, a warning, a status flag, a source, an action — gets pinned to the wrong object on
screen. When usability testing turns up a misbinding, the fix is in the layout, never in the copy.

## The nine principles

1. **Proximity** — objects close together read as a group regardless of shape, colour or size. The
   lever is the *ratio* of space, never the absolute amount. A form label belongs to its field when
   the gap to the field is visibly smaller than the gap to the next field; a label equidistant
   between two fields lands in "label limbo" and roughly half of users bind it to the wrong one.
   `design.md` Lens 7 states the exact ratio (inter-group gap ≥ 2× intra-group gap).
2. **Similarity** — shared shape, colour, size or orientation reads as "same kind of thing". This is
   the principle that fails silently, because designers reach for colour as the only shared trait
   and red-green colour vision deficiency runs at about 8% of men, 1 in 12 (National Eye Institute —
   https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/color-blindness/causes-color-vision-deficiency).
   Pair colour with a second shared trait — shape, an icon, a consistent label position — or the
   grouping does not exist for those users. The reverse matters as much: two controls that do
   different things must not look alike.
3. **Common region (enclosure)** — a boundary groups whatever sits inside it, and this is the
   heaviest cue of the nine. In Stephen Palmer's 1992 perception experiments, a drawn boundary beat
   both proximity and similarity outright: dots enclosed together still read as one group even when
   some of them sat physically closer to dots outside the boundary
   (https://www.sciencedirect.com/science/article/abs/pii/001002859290014S). That weight is exactly
   what makes "card soup" so damaging — box every element on the screen and the boxes stop conveying
   anything, since a boundary that's everywhere marks nothing. Reserve a drawn border for an actual
   boundary; never reach for one to decorate a block of text. `design.md`'s "cards are the lazy
   answer" bullet and `slop.md`'s card-grid tell name the symptom; a border being the single strongest
   cue on the screen is the mechanism underneath it, and why misusing one is so costly.
4. **Connectedness** — an explicit connector (a line, a stroke) welds elements into a group and
   beats proximity when the two compete: a thin line from a data point to its label reads as "these
   belong together" even across a wide gap. Steppers, wizard progress bars, node-and-edge diagrams
   and transit maps run on it. The caution: a stray connecting line implies a relationship that
   isn't there, so never draw one you don't mean.
5. **Continuation** — the eye follows a smooth path and prefers extending it over veering off at an
   angle. The operational form in everyday interface work is **alignment**: line up the left edges
   of a column of fields and the eye reads them as one list tracking down a shared invisible line.
   Knock one out of alignment and it visually defects from the group — useful when you meant to
   single it out, damaging when you didn't. This is the mechanism behind `design.md`'s cross-element
   alignment bullet.
6. **Common fate** — elements that move or change together read as related, and it's the only
   principle with no static form: it doesn't exist until the interface runs. The change doesn't have
   to be motion — rows that dim in unison imply a shared disabled state, cards that lift together
   imply a multi-item drag, controls that pulse in sync imply one loading process. **A dynamic
   interface's timing is part of its layout, not separate from it** — hover, selection, loading,
   streaming, expansion, reordering and drag each have to preserve the grouping the resting state set
   up. `states.md` enumerates the states themselves; this principle asks whether the groups survive
   each one.
7. **Closure** — the viewer mentally completes a partly-drawn form, which is what lets minimal marks
   read as a whole object (the hamburger icon is three disconnected lines). Distinguish it explicitly
   from common region: enclosure draws a shared boundary *around* items to group them; closure lets
   the viewer finish a boundary that is only partly drawn.
8. **Figure-ground** — the visual system splits the screen into a foreground object and everything
   behind it. Six techniques promote something to figure: sharp focus against blur/fade/tint,
   enclosure, a closed or recognizable shape, sitting on top at an overlap, distinct texture, and
   more detail. Ambiguous figure-ground is a usability hazard; in a product UI the active layer must
   be unambiguous (relevant to modals, sheets, popovers, dropdowns).
9. **Prägnanz (good figure)** — when a layout could be read more than one way, perception settles on
   whichever reading is the most stable, regular and internally consistent. This does NOT argue for
   minimalism. The target is the single reading that's easiest to hold onto, regardless of how many
   marks that takes — a familiar label, a redundant icon or an extra divider can add pixels and still
   cut ambiguity, while a screen with almost nothing on it can leave users guessing what belongs to
   what. Cut the number of plausible readings to one; don't confuse that with cutting the pixel count.

## Cue congruence — the operational rule

Elements that belong together must AGREE across spacing, appearance, enclosure, alignment and
behaviour; elements that serve different functions must DIVERGE on the cues users notice first.
None of the nine principles is an on/off switch — they compete, and whichever set of cues lines up
and reinforces each other wins the reading. If spacing implies two groups while colour implies one,
the screen is showing two conflicting structures at once and forces the user to guess which cue to
trust. Piling on a redundant cue is worth it where the grouping genuinely matters; piling on every
cue regardless just adds noise. Spend the strongest cues — border, then spacing — on the
relationships that matter most.

## The six audit questions

These become the review checklist and the critique gate:

1. Is the gap inside each group unmistakably smaller than the gap between groups?
2. Do the strongest cues — spacing, border, colour, alignment, motion — all describe the same
   structure?
3. Does each perceived object match its behaviour: one apparent action means one coherent hit area;
   several actions mean visibly separate controls?
4. Does the hierarchy survive mobile reflow, text enlargement, localization, loading, validation,
   expansion and disabled states?
5. Do visual structure, DOM/source order, accessible names and keyboard sequence tell the same
   story?
6. In a one-second first-read test, does a viewer identify the intended groups, the primary action
   and the label-to-object bindings before reading any copy?

## How to run question 6 without a user

`design.md` Lens 7 already runs a squint test for hierarchy; use the same move here without a real
user in the room: blur or squint at a screenshot and name the groups out loud before reading any
copy. Write down what you bound to what, then check that against what the code actually associates.
Every mismatch is a finding.
