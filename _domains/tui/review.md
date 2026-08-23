# tui — review lens

Added by the `review` engine when `tui` is in scope. Reasoning in [design.md](design.md).

1. **An action reachable only by mouse.** Click-to-select with no keyboard equivalent
   strands anyone over SSH or in a terminal without mouse reporting.
2. **Focus that is not drawn, or drawn by colour alone.** With 16-colour terminals and
   user themes, colour-only focus disappears. Needs reverse video, a border, or a marker.
3. **A mode with no on-screen indicator.** If the same key does different things depending
   on state, the state must be visible at a fixed spot.
4. **A keybinding that works but is never shown.** Undiscoverable — either surface it in
   the context footer or in a `?` overlay.
5. **Layout that assumes width.** Hardcoded column counts, no wrap, or no handler for
   `SIGWINCH`. Check the 80-column case specifically.
6. **Escape codes written when stdout is not a TTY.** Spinners and cursor moves belong
   behind an `isatty` check, or CI logs fill with control characters.
7. **Non-ASCII glyphs with no fallback** — box-drawing, Nerd Font icons, emoji width
   assumptions. East Asian wide characters break column math too.
8. **Full-frame redraw doing real work per frame.** Both `bubbletea` and `ratatui` redraw
   everything; a query or an allocation inside the render path is a per-frame cost.

Not findings here: hover states, drag targets, tooltips, pointer affordance, motion and
easing. Those belong to `gui` and do not apply — flagging them is the mistake this label
exists to prevent.
