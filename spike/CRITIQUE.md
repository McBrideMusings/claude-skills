# Critique — the pass between building a spike and handing it over

One pass. Build the whole thing, inspect it once in a batch, fix everything that round shows in one
batch, confirm with at most one more round, stop. An open-ended polish loop costs more than it finds.

Adapted from Impeccable's craft floor (`pbakaus/impeccable`, Apache-2.0) and
`_domains/gui/slop.md`, narrowed to what a hermetic single-file prototype or wireframe can actually
get wrong.

## Measure first, then look

The spike carries its own instruments. Use them before your eyes.

1. **Contrast, both themes** (a wireframe themes; a prototype's colours come from the host project's
   tokens, so check both there if the fragment themes them). Press `c`, read the toast, switch theme,
   press `c` again. The target is "All N text elements pass WCAG AA" twice. Any failure names its own
   ratio; fix the value, don't argue with the number.
2. **Screenshot every variant, in the device frame it was built for.** A picker gets every variant;
   anything themed gets both themes. This is one batched round, not a trip per surface.

   **Use headless Chrome, not Playwright's screenshot tool.** Two separate failures make Playwright
   the wrong instrument here: it refuses `file://` outright, and on a freshly built spike served over
   http its `browser_take_screenshot` times out at 5000ms — every attempt, always after logging
   "fonts loaded", with the page rendering fine and the console clean. Chrome takes the same shot in
   one call and needs no server:

   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
     --screenshot="<abs-out>.png" --window-size=1280,900 --hide-scrollbars "<abs-url-or-file-path>"
   ```

   It prints two `task_policy_set` errors to stderr on macOS and writes the file anyway; the line to
   check for is `N bytes written to file`. Drive a prototype's variants and state axes through the
   URL (`?v=`, and one param per axis) so each shot is one command with no clicking.

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
- **A house palette on a prototype.** `prototype.css` supplies none; every colour comes from the
  fragment's own copied tokens. A prototype that reaches for spike's own chrome colours instead of the
  host project's is answering the wrong question.

## Stop rule

When the contrast toast is clean in both themes and the list above has nothing left to fix, the pass
is over. Print the `open` line and hand it over. Further polishing without a new finding is spend
without a result.
