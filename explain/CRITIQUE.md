# Critique — the pass between building an explainer and handing it over

One pass. Build the whole thing, inspect it once in a batch, fix everything that round
shows in one batch, confirm with at most one more round, stop. An open-ended polish loop
costs more than it finds.

Narrowed to what a two-colour, panel-shaped, light-only explainer can actually get
wrong. There is no contrast widget and no theme to switch — light is the only mode, so
look, don't press a key.

## Screenshot first, then look

1. Serve the file — `file://` is unreliable for this tool's builds in this environment:

   ```bash
   ( cd <dir-containing-the-html> && nohup python3 -m http.server 8791 >/dev/null 2>&1 & )
   ```

2. Shoot it with headless Chrome, not Playwright's screenshot tool (Playwright times out
   on a freshly built page in this environment even though the page and console are
   clean):

   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --headless --disable-gpu --window-size=900,2200 \
     --screenshot=<abs-out>.png --virtual-time-budget=2500 \
     http://127.0.0.1:8791/<file>.html
   ```

   Make the window tall enough to catch the whole page in one shot — a panel-per-step
   explainer runs long. If it's still cut off, shoot again at a taller `--window-size`
   rather than scrolling and stitching.

3. **Crop each diagram and look at it at native scale or larger.** A 2400px-tall page
   gets downscaled to a thumbnail on the way into context, and at that size two
   overlapping labels read as one slightly-bold label. Overlap has been shipped this way
   while the build reported clean. One crop per `.scene`:

   ```bash
   cp <full>.png <crop>.png
   sips --cropToHeightWidth <h> <w> --cropOffset <top> <left> <crop>.png
   sips -Z 1400 <crop>.png
   ```

   The full-page shot answers "is the story there". Only the crops answer "is the
   drawing correct" — do not claim a clean diagram off the full-page shot alone.

## Then read the screenshot against these

Each is a fact you can check, not a matter of taste.

- **No overlapping SVG text.** This is the failure mode the reference files
  (`papercut-newstyle.html`, `dns-eli5.html`) were fixed for. A label sitting under
  another label, or a label crossing an arrow or a symbol, is a hand-laid-out SVG bug —
  move the `x`/`y`, don't shrink the font to hide it.
- **Reading only the `<h2>`s top to bottom tells the whole story.** If a panel's title
  doesn't stand on its own as a plain sentence, or two panels' titles do the same job,
  fix the titles, not the captions.
- **One action per panel, always.** If a panel's diagram shows two things happening,
  split it into two panels. Don't compress with a denser diagram.
- **A caption never restates its title in different words.** If the `.cap` text and the
  `.eyebrow`+`.panel h2` above it are saying the same thing twice, cut the caption or
  give it new information.
- **Red appears once per panel, on the one thing that panel is about.** If two elements
  in the same diagram are red, or nothing is, that's a miss — ink is the default, red is
  a pointer, not decoration.
- **A gotcha or a failure path is a dashed line/border plus a label, never a second
  colour.** `.arrow.no` and `.gotcha` exist so a failure never needs its own hue.
- **The title (`<h1>`) is the biggest thing on the page, by a lot**, and it and every
  `.panel h2` are Georgia — nothing else on the page uses that font.
- **Nothing wide is squeezed into the 780px reading column.** A table, a long code
  block, or an oversized diagram belongs in `.scroll-x` or needs its own width, not a
  shrink-to-fit inside `.panel`.
- **Real content, real code.** No lorem, no `foo`, no placeholder `file:line`. Every
  `.cite` names a file you actually opened.

## Refuse outright

These never survive a critique, whatever the brief:

- A theme toggle, a dark-mode block, or any CSS gated on `prefers-color-scheme` — this
  kind is light-only by design.
- A third colour used for meaning (only ink and red carry meaning; muted grey and the
  ground/band/well tints are structural, not semantic).
- A hand-drawn glyph duplicating something already in the symbol cast (`CONTRACT.md`).
- A webfont, a CDN, or any network request — a build error, but also a critique failure
  if one slips through hand-edited HTML after the build.
- Emoji standing in for an icon — use the symbol cast or a plain shape.

## Stop rule

When the screenshot shows no overlapping text, the titles alone tell the story, and the
list above has nothing left to fix, the pass is over. Print the `open` line and hand it
over. Further polishing without a new finding is spend without a result.
