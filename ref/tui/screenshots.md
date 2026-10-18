# Looking at a TUI screenshot

A headless Textual run (`app.run_test()` plus `app.save_screenshot(path)`) writes an SVG. Judge
the layout only from a raster that keeps the SVG's whitespace.

- **`rsvg-convert` drops leading spaces.** Textual writes each leading space as `&#160;`, and
  `rsvg-convert` draws every such line flush left, so nested text looks un-indented when it is
  not. Rasterize with `cairosvg` (`uv run --with cairosvg python -c "import cairosvg;
  cairosvg.svg2png(url='in.svg', write_to='out.png')"`) or open the SVG in a browser.
- **Check the raw form before calling it a bug.** Count the `&#160;` runs on the line in the SVG,
  or read `str(widget.render())`; if the spaces are there, the renderer is wrong, not the app.
