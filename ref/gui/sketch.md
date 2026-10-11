# Sketch — an ASCII layout in chat

The default medium for UI design discussions in this account. Use ASCII art in chat to communicate
layout decisions; emit a sibling empty Monodraw stub on disk so the user can draw an alternative
visually if the ASCII proposal isn't quite right.

This is the lowest rung of `spike`'s fidelity ladder ([`../../spike/SKILL.md`](../../spike/SKILL.md)):
ASCII here (a greybox `wireframe` when proportion matters), then an image comp, then an interactive prototype.

## When to reach for sketch

- The user describes a UI change, layout, modal, panel, dialog, form, or component.
- A plan file is being written and design decisions came up in conversation.
- The user says "sketch this", "design this", "lay this out".
- A code change is touching layout-relevant code (CSS grid, flexbox, modal markup, dialog components).

## What to produce

Every sketch produces the ASCII below. The second output, a blank Monodraw canvas on disk, is
opt-in and lives in [`sketch/canvas.md`](sketch/canvas.md).

### Output 01 — ASCII Sketch in Chat

Render the proposed layout using box-drawing characters and a consistent vocabulary:

- **Boxes**: `┌─┐ │ └─┘` for borders, `┏━┓ ┃ ┗━┛` for emphasis, `╭─╮ │ ╰─╯` for rounded
- **Dividers**: `├─┤` for horizontal, `┬─┴` for T-junctions
- **Form controls**: `◯` empty radio, `⦿` selected radio, `☐` empty checkbox, `☑` checked
- **Buttons**: `[ Label ]` for buttons, `[[ Primary ]]` for primary action
- **Region labels**: caps inside the box (e.g. `SOURCE`, `TARGET`, `ACTION`)
- **Annotations**: lowercase descriptions outside the box, with arrows `←` `→` `↑` `↓` if pointing at something

When `mcp-monodraw` is configured, use its `mcp__monodraw__create_ascii_art` tool for typed shapes (box, flowchart, sequence, architecture, table, tree). For freeform layouts, hand-author the ASCII — it's usually faster and more precise.

Render the *part being decided*, not the whole app. A modal redesign shows the modal, not the surrounding page. A sidebar tweak shows the sidebar with brief context, not the entire layout.

### Stay on layout — don't drift into implementation

A sketch is for layout decisions. It is NOT for implementation planning. After the sketch:

- Do NOT explain how the change would be wired up (data flow, state machines, which function produces which value, what `Re-detect` should now do, etc.).
- Do NOT enumerate visual-vocabulary tables, design-token catalogs, or row-priority lists *unless the user asked for that artifact specifically*. A sketch that needs a legend to be understood is a sketch that's trying to decide too much at once.
- Do NOT tee up the next step ("I'll start implementing X to match this sketch"). End the message after the sketch + stub path. The user decides what comes next.

If implementation questions came up while sketching, note them in one line ("flag: this implies a new `audioSuggestedTitles` slot — separate conversation") and stop. Do not expand them inline.

### One decision per sketch — states vs alternatives

A sketch presents *one* layout decision. When multiple frames are needed, be explicit about which kind:

- **State variants** ("here's how the same layout looks in five different data states"): label as `State: clean`, `State: 1 pending edit`, `State: dropped`, etc. Make clear these are renderings of one design across data, not options to pick from.
- **Alternative options** ("here are three layouts to choose between"): label as `Option A`, `Option B`, with a one-line summary of what each is trading off. Cap at 3 — more than that is a brainstorm, not a decision.
- **Mixed** (alternatives × states) is almost always a sign the sketch is trying to do too much. Pick the highest-leverage state, sketch alternatives for *just that state*, and defer the rest.

Default to the smallest sketch that lets the user say yes/no. Six labelled frames is rarely the smallest sketch.

**Challenge the default layout before rendering it.** The first arrangement that comes to mind is the generic one for the component — header + sidebar + card grid, a modal with two stacked buttons, a settings list — and left alone you will sketch it every time. When the layout you are about to draw is that obvious arrangement, either say in one line what a real alternative arrangement would lose (then sketch the default with that justification stated), or sketch the alternative as `Option B` beside it. A default that survives the challenge is fine; a default that was never challenged is the failure. (This is the in-model tier of **default-challenge** — `improve/SKILL-GLOSSARY.md`.)

## Inline-in-plan rule

When writing or editing a plan file (under `/private/tmp/claude/<repo-slug>/plans/` or a project's `docs/`) and the conversation included design decisions, embed the ASCII sketch directly in the plan under a `## Design` or `### Layout` heading. Plan files for design work must visually communicate what was decided, not just describe it.

The `.monojson` stub does NOT go into the plan — only the ASCII rendering. Reference the stub path in a "Working files" or "Artifacts" section if relevant.

## Past the ASCII

| When | Page |
| --- | --- |
| The answer depends on real proportions, so the sketch becomes a rendered greybox | [`sketch/greybox.md`](sketch/greybox.md) |
| The user asks for a canvas to redraw in, or says they drew in it | [`sketch/canvas.md`](sketch/canvas.md) |
