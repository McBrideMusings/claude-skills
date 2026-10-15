# Tangents — edges that almost line up

Part of [`gestalt.md`](gestalt.md). Read when two shapes, edges or gaps sit a few pixels from
lining up, touching or overlapping, or when a critique says "this looks slightly off" and nobody can
say why.

**A tangent** is a spot where two things in an image nearly touch or barely touch, and the eye reads
the spot as a mistake (Soulburn Studios — https://artofsoulburn.com/art_lessons/composition_tangents/composition_tangents.htm).
Painters also call two edges barely touching **kissing** (The Painter's Keys —
https://painterskeys.com/control-kissing/). The trouble is ambiguity: the viewer can't tell
whether the two elements are meant to align, overlap or stay apart, so the spot pulls attention
away from what matters.

**The rule:** make every edge relationship legible as a decision. Two elements either line up
exactly, overlap clearly, or sit clearly apart. Never *almost*. Instructor Marion Boddy-Evans puts it
as elements being "either definitely apart or definitely overlapped" (quoted in The Painter's Keys,
above). This is a convention, not a law: a tangent placed on purpose, and repeated so it reads as a
system, is fine.

## The kinds, named

| Name | What it looks like in a UI | Fix |
| --- | --- | --- |
| **Kissing tangent** | Two shapes whose edges barely touch: a badge grazing a card's corner, a tooltip's arrow just touching its target. | Overlap them clearly or open a real gap. |
| **Near-miss alignment** | Two edges a few pixels off from a shared line: chart bars, columns, or card bottoms off by 1–3px. | Give both edges one shared value; snap to the grid. |
| **Edge continuation** | One element's edge happens to continue another's, so two unrelated things read as one line. | Move one off the line by a clear amount, or align them on purpose and repeat that alignment. |
| **Sliver** | A thin strip of negative space between two near-touching elements, which the eye reads as its own shape (a figure-ground problem, see `gestalt.md` §8). | Close the gap to zero, or widen it to the layout's standard gap. |
| **Frame tangent** | An element touching or nearly touching its container's edge: an icon 1px from a button's border, text grazing a panel's edge. | Put it inside the padding, or bleed it past the edge on purpose. |

The COMPOSE blog lists the painting versions of the same cases: shapes touching, a shape touching
the picture's edge, and one shape's edge continuing another's
(http://visualcomposing.blogspot.com/2008/07/avoiding-tangents.html).

## How a UI produces them

- **Fractional pixel coordinates.** A width like `33.333%` or a value scaled by a non-integer
  device pixel ratio lands edges on sub-pixel positions. The browser anti-aliases each one
  differently, so two edges with the same nominal value can render a pixel apart. Round once, at
  layout, not per element.
- **Edges computed twice.** A bar's top and its label's top come from two calculations that each
  round on their own. Compute the edge once and let both elements read that value.
- **Borders and outlines outside the box.** A 1px border on one card and none on its neighbour
  pushes their content 1px apart. Use `box-sizing: border-box`, or give every sibling the same
  border, transparent where it shouldn't show.
- **Optical vs mathematical alignment.** Shapes can share an exact edge value and still look off: a
  circle or a triangle looks smaller than a square of the same box. `layout.md` covers the 1–2px
  optical nudge. A deliberate optical offset is not a tangent; an accidental mathematical one is.

## How to check

Take a screenshot and zoom to 400% on every place two edges meet or nearly meet: bar tops and
baselines in a chart, the bottoms of a row of cards, icon-to-text baselines, a badge on its parent.
For each spot, write down which of the three it is meant to be (aligned, overlapping, apart). Any
spot where the answer is "almost" is a finding. In code, look for each shared edge being computed in
more than one place.

## Words to use in critique

- "These two edges have a tangent" or "these are kissing": they nearly touch.
- "Near-miss alignment" or "these are off by 2px": they nearly line up.
- "This sliver reads as its own shape": the gap between them has become a figure.
- "Not optically aligned": the numbers match but the eye disagrees.

The intentional versions have their own names: **flush** or **butted** (edges meet exactly),
**overlap**, **bleed** (runs past the container's edge), and **gutter** (a defined, repeated gap).
