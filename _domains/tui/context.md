# tui — injected context

A terminal interface is keyboard-first with rough mouse support. There is no hover, no
drag-and-drop, no tooltip, no cursor affordance.

- **State must be visible, because nothing reveals itself on pointer-over.** What is
  focused, what is selected, what mode you are in, and what keys work here — all on screen
  or discoverable by one keypress.
- **Reflow to the terminal you get**, including 80 columns and a resize mid-render.
- **Colour is decoration, never the only carrier of meaning** — themes vary and some
  terminals have 16 colours.

Do not apply GUI motion, hover-state or pointer guidance here; that is [../gui/](../gui/),
and it is a sibling, not a parent. Depth: [design.md](design.md).
