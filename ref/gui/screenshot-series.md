# Screenshot series

A set of screenshots that compares one thing — before and after, one state per frame, one
size or theme per frame. The set is the evidence, so every frame shows the whole thing being
compared, and the frames differ only in the variable under test.

## Every frame shows the whole subject

- **Nothing covers it.** Host chrome — an app title bar, a status bar, an edge-to-edge inset,
  a browser toolbar, a debug overlay — must not overlap the subject. Find the subject's top
  and bottom edges in the image (sample the pixel rows, or read the element's bounding box
  from the page) and crop the frame to exactly that box.
- **It fits.** The subject is inside the frame at every size in the series, and so are the
  parts the comparison is about — a card, a wordmark, a button. If one size pushes a part off
  the bottom, that is a finding; record it, don't drop the frame.

## Every frame shows the same moment

- **Turn motion off with CSS, not a script.** Inject
  `*, *::before, *::after { animation: none !important; transition: none !important; }`, and
  pin each animated element the comparison needs to its resting pose with an `!important`
  rule (`opacity: 1`, its final `transform`). Pausing animations from script does not hold:
  frames still land mid-fade.
- **Wait for a render signal, not a timer.** Content in the DOM, `document.fonts.ready`,
  then two animation frames. A fixed sleep lands on a blank page, a launch screen or a
  half-loaded view.
- **Same fixture, viewport and crop in every frame.** Only the variable under test changes.

## Every frame is checked before it counts

- **Measure that the subject is there.** For the elements the comparison is about, read
  their bounding box and computed opacity from the page: on screen, opacity 1. A
  pixel-variance check catches blank and black frames, but not a faded or missing element.
- **Read every frame, then the assembled sheet, before showing either.** Name any frame
  where something besides the variable under test differs — cropped, faded, a different
  state, a different screen. Retake it. Never ship a set with a bad frame in it and explain
  it in a caption.
