# Critique — the pass between building an handout and handing it over

One pass. Build the whole thing, inspect it once in a batch, fix everything that round shows in one
batch, confirm with at most one more round, stop. An open-ended polish loop costs more than it finds.

Adapted from Impeccable's craft floor (`pbakaus/impeccable`, Apache-2.0) and
`_domains/gui/slop.md`, narrowed to what a hermetic single-file handout can actually get wrong.
Everything the kind stylesheets already handle is left out — this is only what a fragment decides.

## Measure first, then look

The handout carries its own instruments. Use them before your eyes.

1. **Contrast, both themes.** Press `c`, read the toast, switch theme, press `c` again. The target is
   "All N text elements pass WCAG AA" twice. Any failure names its own ratio; fix the value, don't
   argue with the number.
2. **Screenshot at 1280 wide, and at 390 if the handout is meant to respond.** A deck gets every
   slide; a picker gets every variant; anything themed gets both themes. This is one batched round,
   not a trip per surface.

## Then read the screenshot against these

Each is a fact you can check, not a matter of taste. The fix is named because "make it better" is not
a finding.

- **Nothing is squeezed into the reading measure that isn't prose.** Tables, diagrams, code and
  side-by-side comparisons break out to the wide track automatically; if one is still 68ch wide it is
  nested inside something that isn't passing the grid through. Fix the wrapper, not the figure.
- **The title is the biggest thing on the page, by a lot.** `--f-3xl` on the title against `--f-md`
  body is a 2.75× step. A title only 1.3× the body is why a page reads as undesigned.
- **A slide is not a document.** Deck type scales with the viewport. If a slide's content occupies
  less than half its height, the type is document-sized and the deck will look empty in a room.
- **More space above a heading than below it.** A section that floats equidistant between two blocks
  belongs to neither.
- **One accent, one job.** A semantic hue (data, flow, happy, danger, warn) spent on decoration —
  a step marker, a divider, a badge — breaks the promise that hue means something. Neutral it.
- **No coloured `border-left` above 1px.** Anywhere. It is the clearest machine-made tell in the
  catalogue, and the tinted ground plus a coloured label already carry the role.
- **Three encodings of one fact is noise.** Tint + stripe + uppercase coloured label + icon, all
  saying "warning", is one signal wearing four costumes. Keep two.
- **A table is not a ladder.** A rule under every row stops the header reading as a header. One rule
  under the header, one under the last row, zebra between if the rows are long.
- **Every eyebrow earns its place.** One archetype label per document is the handout's voice. One
  above every section is machine grammar — delete them.
- **Numbered markers only where order is information.** A real procedure or a dated sequence keeps
  them. "01 / 02 / 03" over three peers does not.
- **Real content, real controls.** No lorem, no `foo`, no dead button. A control that goes nowhere in
  this round does not go in this round.
- **Both themes got equal care.** Mechanical inversion isn't care: check that the accent still works
  and that nothing white sits on a light tint.

## Refuse outright

These never survive a critique, whatever the brief:

- Gradient text, glass-as-decoration, neon glows, custom cursors.
- A hard offset shadow (`4px 4px 0`) outside a world that actually chose neobrutalism.
- Emoji standing in for an icon system.
- Same-size icon+heading+text cards as the page's structure; cards inside cards.
- Fake-precise invented numbers. If it isn't real, don't print it.
- A webfont, a CDN, or any network request. The handout is hermetic — this one is also a build error.

## Stop rule

When the contrast toast is clean in both themes and the list above has nothing left to fix, the pass
is over. Print the `open` line and hand it over. Further polishing without a new finding is spend
without a result.
