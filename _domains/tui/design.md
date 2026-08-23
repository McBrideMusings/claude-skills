# tui — design

Terminal interfaces, as distinct from graphical ones. This label is a **sibling** of `gui`,
not a child: a repo is one or the other, and a repo with both surfaces carries both labels
scoped to the directories that own them.

## What the terminal takes away

Four affordances a GUI leans on do not exist, and designs that assume them fail silently:

| GUI affordance | Terminal reality |
| --- | --- |
| Hover reveals | No pointer position. Anything hover would have shown must be on screen, or one keypress away |
| Drag and drop | Reordering, resizing and moving are keyboard verbs — `J`/`K` to move an item, not a grab handle |
| Tooltip / title text | No layer to put it on. Help is a panel, a footer, or a `?` overlay |
| Cursor shape as affordance | Nothing signals "this is clickable". Focus must be drawn |

Mouse support exists in most terminals and is worth wiring, but it is a convenience for
people who reach for it — never the only path to an action.

## Consequences

- **Draw focus explicitly and unambiguously.** Exactly one thing is focused. Reverse video,
  a border, or a caret — not colour alone.
- **Modality is normal here, and must be announced.** Vim-style modes work well in a
  terminal, but the current mode belongs in a fixed position on screen at all times.
- **Keybindings are the interface.** Show the active ones in a footer that changes with
  context. A key that works but is never displayed does not exist.
- **80 columns is a real target**, and so is a resize mid-session. Layout reflows or it
  breaks; test the narrow case deliberately.
- **Colour degrades.** Assume 16 colours and a user theme you did not choose. Meaning that
  rides on colour alone is lost — pair it with a glyph, a label, or position.
- **Unicode degrades too.** Box-drawing and Nerd Font glyphs are not universal; have an
  ASCII fallback or accept the mojibake you will get in someone's SSH session.
- **No spinner survives a non-TTY.** Progress that writes escape codes must detect a pipe
  and fall back to plain lines, or CI logs fill with garbage.

## What still carries over from `gui`

Hierarchy, alignment, consistent spacing, meaningful empty states, and error messages that
say what to do next are interface fundamentals, not pointer-specific ones. Where the two
cells agree, that is intentional duplication and not a contradiction to resolve.

## Libraries in use here

Go: `bubbletea` + `lipgloss` (`cnav`, `power-hour-generator`, `repo-dash`, `wedding/tui`).
Rust: `ratatui` + `crossterm` (`herdr`). Both are immediate-mode-ish render loops where the
whole frame is redrawn — so per-frame cost matters and partial-update tricks usually do not.
