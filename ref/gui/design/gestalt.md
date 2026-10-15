# The nine Gestalt principles

Part of [`grouping.md`](grouping.md), the lens that judges what the eye binds to what.

1. **Proximity** — objects close together read as a group regardless of shape, colour or size. The
   lever is the *ratio* of space, never the absolute amount. A form label belongs to its field when
   the gap to the field is visibly smaller than the gap to the next field; a label equidistant
   between two fields lands in "label limbo" and roughly half of users bind it to the wrong one.
   `layout.md` (Lens 7) states the exact ratio (inter-group gap ≥ 2× intra-group gap).
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
   boundary; never reach for one to decorate a block of text. `layout.md`'s "cards are the lazy
   answer" bullet and `../slop.md`'s card-grid tell name the symptom; a border being the single strongest
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
   single it out, damaging when you didn't. This is the mechanism behind `layout.md`'s cross-element
   alignment bullet. Edges that *almost* line up or *almost* touch are tangents —
   [`tangents.md`](tangents.md) names each kind and its fix.
6. **Common fate** — elements that move or change together read as related, and it's the only
   principle with no static form: it doesn't exist until the interface runs. The change doesn't have
   to be motion — rows that dim in unison imply a shared disabled state, cards that lift together
   imply a multi-item drag, controls that pulse in sync imply one loading process. **A dynamic
   interface's timing is part of its layout, not separate from it** — hover, selection, loading,
   streaming, expansion, reordering and drag each have to preserve the grouping the resting state set
   up. `../states.md` enumerates the states themselves; this principle asks whether the groups survive
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
