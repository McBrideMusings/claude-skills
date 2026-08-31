# TUI Prototype

Build **several genuinely different working versions of one terminal screen**, in the real toolkit,
flipped through with a key. Scaffolded by `~/.claude/skills/spike/tool/spike tui`.

If the question is a state model rather than a look → [LOGIC.md](LOGIC.md). If the surface is a page
or an app window → [UI.md](UI.md).

## Why this is not `--kind prototype`

A terminal prototype in a browser is a fake of the thing being judged. Everything a TUI design has to
survive is a terminal property, and none of it exists in HTML:

- **80 columns**, and a resize mid-render. A `<div>` cannot tell you whether a two-pane split reflows.
- **16 colours from a theme you did not choose.** An HTML mock picks its own hexes and always looks
  right. The real question is whether meaning survives when the user's theme reassigns every slot.
- **The keyboard is the interface**, and the design owns all of it. A harness that claims keys is a
  harness that cannot prototype a keyboard-driven app.
- **Unicode degrades.** Box-drawing and Nerd Font glyphs are not universal; only a real terminal shows
  you the mojibake.

So the output is a Go program, which is why `spike tui` is a subcommand and not a `--kind`: the HTML
assembler has nothing to assemble. Judging an HTML fake teaches you about the fake.

## The artifact

A directory holding **three files, of which you write one**:

```
/private/tmp/claude/<repo-slug>/spikes/<slug>/
  harness.go    supplied — variant picker, state axes, footer bar, geometry assertion, frame dump
  variants.go   YOURS — the directions and the state axes
  go.mod        written only when the directory is not already inside a Go module
```

```bash
"$HOME/.claude/skills/spike/tool/spike" tui \
  --out /private/tmp/claude/<repo-slug>/spikes/<slug> \
  --title "Admin Dashboard"
```

Inside an existing module no `go.mod` is written, so the prototype uses the project's own bubbletea
and lipgloss rather than shadowing them.

**Wire `admin prototype <slug>` in the same pass** — and a TUI target has two extra requirements
that fail silently if missed. [ADMIN.md](ADMIN.md).

## What the harness gives you

Never write these by hand — that is the whole reason the subcommand exists.

| You get | How it behaves |
| --- | --- |
| Variant picker | `[` and `]` cycle directions. Named in the bar, never "Variant A" |
| State axes | `F1`–`F9`, one per `Axis`. Orthogonal to variant on purpose: flipping direction keeps the state |
| Key delivery | Every key the harness does not claim reaches `Variant.Key` |
| Harness bar | Bottom row, reverse video, outside the design's frame — chrome, never part of what is judged |
| Geometry assertion | Every dumped row must be exactly `DumpWidth`, every frame exactly `DumpHeight`. Non-zero exit, naming the row |
| Frame dump | `-dump` writes the full variant × state cross product as `.txt`, ANSI stripped |
| `Pad` / `VW` / `Strip` | Rune-aware width helpers. Byte length is always wrong on a grid with box-drawing characters |

**The harness claims only `[`, `]`, `F1`–`F9`, `q` and `⇧Q`.** Every other key belongs to the design,
so a prototype of a keyboard-driven app is still driveable.

## Interactivity is the deliverable, not a stretch goal

SKILL.md rule 7 — *every control is live* — is the easiest rule to fail here, because a variant that
only implements `Render` looks finished and is a slideshow: the tab bar draws, and pressing Tab does
nothing. **Implement `Key` unless the design genuinely has no navigation.**

```go
var Variants = []Variant{{
	Name:   "Settled",
	Render: render,
	Key:    onKey,
	Reset:  func() { cursor = 0 },
}}

func onKey(key string, s State, set func(axis, value string)) bool {
	switch key {
	case "tab":
		set("screen", next(s.Get("screen"))) // drive the axis the dump enumerates
		return true
	case "down", "j":
		cursor++
		return true
	}
	return false // unhandled — the harness ignores it
}
```

- **Navigation should drive an axis via `set`**, not a private copy of the same state. Then what you
  drive by hand and what gets dumped cannot diverge — the tab bar and the frame list stay one thing.
- **Live state that is not an axis** — a cursor offset, a scroll position — is package-level, so it
  **must** be cleared by `Reset`. The harness calls it at startup and before every dumped frame.
  Without it the dump is deterministic only by luck, and a test leaks state into the next test.
- **A key you handle returns `true`.** Returning `false` leaves it unclaimed, which is correct for
  keys the design does not bind.

## `variants.go`

```go
const (
	DumpWidth  = 96
	DumpHeight = 30
)

// Axes are conditions the chosen direction must survive — not directions.
var Axes = []Axis{
	{Key: "state", Label: "State", Values: []string{"idle", "running", "no-manifest"}},
}

var Variants = []Variant{
	{
		Name:    "Incumbent",
		Caption: "bordered panes, dense single-line rows",
		Render: func(s State) string { /* exactly DumpHeight lines of DumpWidth columns */ },
	},
}
```

`Render` returns the design's own frame. The harness pads the terminal around it and draws its bar
below; in a dump the bar is absent, so a `.txt` is the design alone.

## Process

Phases 01–03 and 05–06 are [UI.md](UI.md)'s, unchanged — scope to one screen, recon the tokens
(here: which ANSI slots the project already uses), name each direction and its axis, verify every
variant, present the set and let the user choose. Two things differ:

**Recon reads the tests, not a stylesheet.** A Go TUI's design rules are usually pinned as assertions
rather than written down. Find them before designing: a parity or layout test naming a palette, a
width, or a collapse rule is the incumbent design speaking.

**Verification is the dump plus your own eyes.** `-dump` proves geometry and nothing else. Run the
program and look at it for anything the assertion cannot see — colour that vanishes on a light theme,
a column rule that stops mid-frame, a selection marker that shifts its row off its neighbours. All
three of those shipped past a green dump.

## Frames as committed reference

`-dump` is what lets tickets cite a design. A frame is a fixed target an agent can compare against and
you can read without launching anything, and it is checked into `docs/spikes/<slug>/` beside the build
per SKILL.md's "Tickets from a prototype" — including its step 3, the delete-me issue.

**The frames are dumps of the running program, never hand-written strings.** Hand-written frames drift
from the prototype they claim to depict, silently, and nothing catches it.

## Anti-patterns

- **Prototyping a TUI in HTML.** The reason this file exists.
- **A harness key the design needed.** If a direction wants `[`, say so and change the harness; do not
  quietly drop the binding from the design.
- **Colour carrying meaning alone.** A theme can reassign every slot — pair it with a glyph, a label,
  or position. `_domains/tui/design.md` is the standing cell.
- **Hand-written `.txt` frames.** Dump them.
- **Measuring width with `len()`.** Box-drawing characters are three bytes each. Use `VW`.
- **Judging at a width you never ship.** If it must survive 80 columns, dump at 80.
