# Critique — the pass between building a spike and handing it over

One pass. Build the whole thing, inspect it once in a batch, fix everything that round shows in one
batch, confirm with at most one more round, stop. An open-ended polish loop costs more than it finds.

Adapted from `ref/gui/slop.md`, narrowed to what a hermetic single-file mockup, prototype or wireframe can actually
get wrong.

## Look first

1. **Screenshot every variant and state.** `spike shot <slug> --platform <phone|tablet|desktop> --theme both` (size rule: [MOCKUP.md](MOCKUP.md) step 5) prints one absolute PNG
   path per cell and theme (a wireframe is one page). A prototype: shoot each variant at the
   platform's size, driving variants and tweaks through `--query` (`v=2&conn=down`: `v` and one
   param per tweak) so each shot is one command with no clicking. One batched round, not a trip
   per surface. When the cells move, also run `spike video <slug> --theme both`: it prints a
   `.webp` (the animation) and a `-strip.png` (frames side by side) per cell and theme; open both.
2. **Open each image.** Contrast shows on the page: read any text that looks faint against its
   ground, in both themes, and fix the value.

## Then read the screenshot against these

Each is a fact you can check, not a matter of taste. The fix is named because "make it better" is not
a finding.

- **The title is the biggest thing on the page, by a lot**, on a spike that has one. `--f-3xl` on the
  title against `--f-md` body is a 2.75× step. A title only 1.3× the body is why a page reads as
  undesigned.
- **More space above a heading than below it.** A section that floats equidistant between two blocks
  belongs to neither.
- **No coloured `border-left` above 1px.** Anywhere. It is the clearest machine-made tell in the
  catalogue, and the tinted ground plus a coloured label already carry the role.
- **A table is not a ladder.** A rule under every row stops the header reading as a header. One rule
  under the header, one under the last row, zebra between if the rows are long.
- **Numbered markers only where order is information.** A real procedure or a dated sequence keeps
  them. "01 / 02 / 03" over three peers does not.
- **Real content, real controls.** No lorem, no `foo`, no dead button. A control that goes nowhere in
  this round does not go in this round — every control in a prototype is live.
- **Both themes got equal care**, on whatever themes. Mechanical inversion isn't care: check that
  nothing white sits on a light tint.

## Refuse outright

These never survive a critique, whatever the brief:

- Gradient text, glass-as-decoration, neon glows, custom cursors.
- A hard offset shadow (`4px 4px 0`) outside a world that actually chose neobrutalism.
- Emoji standing in for an icon system.
- Same-size icon+heading+text cards as the page's structure; cards inside cards.
- Fake-precise invented numbers. If it isn't real, don't print it.
- A webfont, a CDN, or any network request. The build is hermetic — this one is also a build error.
- **Colour on a wireframe.** The whole point is withheld colour; any hue that isn't the greybox
  palette is a build the tool should have refused.
- **A house palette on a prototype or mockup.** Neither kind supplies one; every colour comes from the
  fragment's own copied tokens or the project's CSS. A build that reaches for spike's own chrome colours instead of the
  host project's is answering the wrong question.

## Stop rule

When every image has been read in both themes and the list above has nothing left to fix, the pass
is over. Hand it over per CONTRACT.md rule 10. Further polishing without a new finding is spend
without a result.
