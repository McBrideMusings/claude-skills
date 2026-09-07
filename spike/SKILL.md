---
name: spike
description: "Build a throwaway prototype to settle a design or technical question — UI variations behind a picker, a greybox wireframe, competing TUI designs, or competing approaches measured against one fixture. 'Artifact' means a prototype built here, never a hosted page. Use to prototype, mock up, wireframe, spike, or 'let me see it working first'."
---

# spike — throwaway builds that settle a question

A prototype is **throwaway code that answers a question** — the question decides the shape.

## "Artifact" means a prototype

When the user says **artifact**, they are asking for a prototype: this skill, a local file — not Anthropic's hosted `Artifact` tool, not a hosted page. Build it, hand back the path; don't explain the distinction or offer hosting.

Explaining how something already works, not what it should look like, is `explain` — same substrate, no shared code.

## Load this whenever a prototype is being built — including mid-conversation

This skill owns every prototype, however the request arrives — *prototype, mockup, wireframe, "show me options", "which approach"* — including mid-conversation, where it's missed. `grill-me` ending with "make a prototype" invokes this skill.

Hand-writing one loses the slug scheme, the Tweaks panel, the device frames — invisibly. **If you can see what to write, that is when to load this.**

## Pick a shape

Identify the question being answered — from the prompt, the code, or by asking if the user is around:

- **"What should this look like?"** → [UI.md](UI.md). UI versions in one HTML file, picker-flipped (`spike --kind prototype`).
- **"Where do the regions sit?"** → `--kind wireframe`, a greybox — fidelity *below* a prototype. `gui` sketch mode routes here when ASCII can't carry it ([`../gui/SKETCH.md`](../gui/SKETCH.md)).
- **"What should this terminal screen look like?"** → [TUI.md](TUI.md). Real toolkit (`spike tui`), never `--kind prototype`.
- **"Does this logic / state model hold up?"** → [LOGIC.md](LOGIC.md). A terminal app through hard cases.
- **"Which technical approach?"** → [COMPARE.md](COMPARE.md). Real implementations against one fixture.

Wrong shape wastes the prototype. Ambiguous and unreachable → default by subject, state the assumption.

## Layer the domain on top

The shape is the *mechanism*; the domain is the *mode of software*. Resolve per [`_detect.md`](../_detect.md), load the cell **in addition to** the shape file: `ui` → [`ref-gui/prototype.md`](../ref-gui/prototype.md); `game` → [`ref-game-dev/prototype.md`](../ref-game-dev/prototype.md); no marker → shape file only.

## Arguments

| Invocation | Behavior |
| --- | --- |
| `<description>` | Full run of whichever shape the question implies |
| `<description>` + a count | Same, capped at 5 variants (UI) or 3 implementations (compare) |
| `riff <name>` | Same harness and slug, diverge *around* the named variant, rebuilt in place |

`riff` names what to build, never a filename. A follow-up on a prototype already on disk is a new version of the same slug. Picking a winner needs no verb — say it in chat.

## Not this skill

- Judging or improving an existing interface → `gui` critique mode.
- One design, arrangement question → `gui` sketch mode (ASCII). Come here only for *which direction* — density, motion, personality, interaction model.
- Picking a library → `ref-gui/libraries.md` via `gui`.

---

## Read on demand

| Open | When |
| --- | --- |
| [`CONTRACT.md`](CONTRACT.md) | Build contract: kinds, fragments, one-device rule, naming, rules for every shape. |
| [`EXPORT.md`](EXPORT.md) | Handing a prototype to a phone or a person outside this repo. |
| [`LIFECYCLE.md`](LIFECYCLE.md) | Done, kept, updated-not-duplicated, cutting tickets. |
| [`CRITIQUE.md`](CRITIQUE.md) | The pass before handing a build over. |
| [`ADMIN.md`](ADMIN.md) | Wiring `admin prototype`. |
