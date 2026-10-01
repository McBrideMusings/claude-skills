---
name: spike
description: "Build a throwaway to settle a design or technical question — an ASCII layout sketch or greybox wireframe, an image comp, an HTML mockup screenshotted per variant and state, a throwaway interactive prototype, competing TUI designs, or competing approaches measured against one fixture. 'Artifact' means a prototype built here, never a hosted page. Use to sketch a layout, mock up, wireframe, prototype, spike, or 'let me see it working first'."
---

# spike — throwaway builds that settle a question

A prototype is **throwaway code that answers a question** — the question decides the shape.

## "Artifact" means a prototype

When the user says **artifact**, they are asking for a prototype: this skill, a local file — not Anthropic's hosted `Artifact` tool, not a hosted page. Build it, hand back the path; don't explain the distinction or offer hosting.

Explaining how something already works, not what it should look like, is `explain` — same substrate, no shared code.

## Load this whenever a prototype is being built — including mid-conversation

This skill owns every prototype, however the request arrives — *prototype, mockup, wireframe, "show me options", "which approach"* — including mid-conversation, where it's missed. `grill-me` ending with "make a prototype" invokes this skill.

Hand-writing one loses the slug scheme, the Tweaks panel and the screenshot step — invisibly. **If you can see what to write, that is when to load this.**

## Pick a shape

Identify the question being answered — from the prompt, the code, or by asking if the user is around:

- **"What should this look like?"** → the fidelity ladder below. Start at the lowest rung that answers the question; climb only when it doesn't.
- **"What should this terminal screen look like?"** → [TUI.md](TUI.md). Real toolkit (`spike tui`), never `--kind prototype`.
- **"Does this logic / state model hold up?"** → [LOGIC.md](LOGIC.md). A terminal app through hard cases.
- **"Which technical approach?"** → [COMPARE.md](COMPARE.md). Real implementations against one fixture.

## The fidelity ladder — UI questions

Four rungs. Nothing from any rung is committed to a project's tracked tree. Each rung shows its
result the way [CONTRACT.md](CONTRACT.md) rule 10 says.

| Rung | Answers | Start here when | Build |
| --- | --- | --- | --- |
| 1. ASCII sketch | Where the regions sit | Arrangement is the open question | In chat, per [`../ref/gui/sketch.md`](../ref/gui/sketch.md) — no build. When the answer depends on proportion, a greybox: `--kind wireframe` |
| 2. Image comp | What it looks like | A new screen whose look is open, with no CSS to build from. **The default for a UI question** | [COMP.md](COMP.md) |
| 3. HTML mockup | What it looks like in the project's real CSS, across variants and states | The project has tokens and components to render, or the answer needs exact type, spacing and every state side by side | [MOCKUP.md](MOCKUP.md) |
| 4. Interactive prototype | How it behaves | Behaviour only visible under interaction, or a mockup that settled nothing | [UI.md](UI.md) |

Climb when the lower rung cannot answer: a sketch or greybox that cannot settle the look goes to a comp or a mockup; a
mockup that cannot show a transition, a state reached by clicking or a real component's behaviour goes to a prototype.
Genuinely different takes on density, motion, personality or interaction model skip the sketch —
a sketch filters on the wrong information — and go straight to a comp set, a mockup or the prototype.

The winning comp or mockup screenshot is stored with `dsys refs add` and tickets cite that ref ([LIFECYCLE.md](LIFECYCLE.md)).
A prototype is never stored: its answer goes into `DESIGN.md` or an ADR, and the files are deleted.

Wrong shape wastes the prototype. Ambiguous and unreachable → default by subject, state the assumption.

## Layer the domain on top

The shape is the *mechanism*; the domain is the *mode of software*. Resolve per [`_detect.md`](../_detect.md), load the cell **in addition to** the shape file: `ui` → [`ref/gui/prototype.md`](../ref/gui/prototype.md); `game` → [`ref/game/prototype.md`](../ref/game/prototype.md); no marker → shape file only.

## Arguments

| Invocation | Behavior |
| --- | --- |
| `<description>` | Full run of whichever shape the question implies |
| `<description>` + a count | Same, capped at 5 variants (UI) or 3 implementations (compare) |
| `riff <name>` | Same slug, diverge *around* the named variant, rebuilt in place |

`riff` names what to build, never a filename. A follow-up on a prototype already on disk is a new version of the same slug. Picking a winner needs no verb — say it in chat.

## Not this skill

- Judging or improving an existing interface → `improve gui` for design quality ([`ref/gui/critique.md`](../ref/gui/critique.md)), `review` for code defects.
- Picking a library → [`ref/gui/libraries.md`](../ref/gui/libraries.md).

---

## Read on demand

| Open | When |
| --- | --- |
| [`COMP.md`](COMP.md) | Rung 2: generating, revising and storing an image comp. |
| [`MOCKUP.md`](MOCKUP.md) | Rung 3: writing the variant × state fragment, `spike build --kind mockup`, `spike shot`. |
| [`UI.md`](UI.md) | Rung 4: an interactive prototype and its Tweaks panel. |
| [`CONTRACT.md`](CONTRACT.md) | Build contract: kinds, fragments, naming, rules for every shape. |
| [`EXPORT.md`](EXPORT.md) | Handing a prototype to a phone or a person outside this repo. |
| [`LIFECYCLE.md`](LIFECYCLE.md) | Done, what gets stored, cutting tickets, old `docs/spikes/` directories. |
| [`CRITIQUE.md`](CRITIQUE.md) | The pass before handing a build over. |
