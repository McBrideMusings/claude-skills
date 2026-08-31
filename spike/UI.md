# UI Prototype

Build **several genuinely different working versions** of one piece of UI in a single standalone HTML
file, flipped through with the picker, and let the user pick a winner.

If the question is logic/state → [LOGIC.md](LOGIC.md). If it's "which technical approach" →
[COMPARE.md](COMPARE.md). If there is one design and the open question is arrangement, this is too
expensive — that's `gui` sketch mode (ASCII in chat).

Adapted from emilkowalski/skills `prototype` (MIT, © 2026 Emil Kowalski); the selection spec now lives
as real code in `tool/harness/tweaks.css` and `tweaks.js`, and the tool wires it — you never
write it.

## When this is the right shape

- "What should this look like?" / "I want to see a few options before committing."
- "Try a different layout for the settings screen."
- Any time the user would otherwise spend a day picking between vague mockups in their head.

## The artifact — always one standalone HTML file

`/private/tmp/claude/<repo-slug>/spikes/<slug>/<slug>.html`, where `<slug>` names what the prototype is for
**and which device it targets** — one file per device type, rebuilt in place (see SKILL.md
"One prototype, one device type"). Self-contained, inline CSS and JS, opened directly
in a browser. No dev server, no route, no framework, and **no edit to any production file**. This holds
even when the project is React, Vue, or SwiftUI: hand-written HTML/CSS/JS is the fastest path to
something you can look at, and the winning direction gets rewritten in the project's stack at
promotion anyway.

You write a **body fragment** — one `<template data-variant>` per direction, plus a `<style>` block
carrying the project's tokens. `~/.claude/skills/spike/tool/spike` assembles the file. Read
[`CONTRACT.md`](CONTRACT.md) for the fragment rules; the `prototype` kind ships **no palette of its own**
precisely so nothing competes with the design being judged.

Make it look native to the product without importing anything from it:

- **Copy the design tokens into the fragment's `<style>`** — the colours, radii, spacing scale, font
  stack, easing and duration variables read off the project's CSS/theme file during recon. Copied
  values, not imports.
- **Tailwind projects** — the browser build is a CDN `<script>`, and the tool rejects any network
  request, because a prototype that only renders online isn't self-contained. Copy the handful of
  utilities a variant actually uses into the fragment's `<style>` as real CSS, or write plain classes.
- **Type realistic content by hand** — real product copy, plausible names and numbers, a row count
  close to the real one.

**Wire `admin prototype <slug>` in the same pass** so the file is one command away rather than a
path to retype: [ADMIN.md](ADMIN.md).

Two things this costs, both accepted: a variant cannot use the project's actual components, and
density can't be judged against genuinely live data. When the whole question is "does our real
`<DataGrid>` work here", that's a promotion-time question, not a prototype one.

## Process

### Phase 01 — Scope

One thing per run. If the description spans several components ("the dashboard"), narrow it: pick the
single highest-leverage piece, say which and why, offer the rest as later runs. Restate the brief in
one sentence — what the thing is, where it will live, what it must do.

Then fix the device and the slug. **One prototype targets one device type** — decide which, and name
the slug for it (`settings-phone`, `settings-desktop`). `ls /private/tmp/claude/<repo-slug>/spikes/`: an
existing directory for this slug means this is a rebuild — read the fragment beside it so the new set
diverges from what is already there instead of repeating it, and build over the same `--out`.

### Phase 02 — Recon

Before designing anything, map the ground the variants stand on:

- **Tokens** — colours, radii, spacing, fonts, easing/duration variables, to copy into `:root`.
- **Personality** — playful consumer app or crisp dashboard? This bounds how far the boldest variant
  may go.
- **Context** — what the piece renders against: background, neighbours, sizes.
- **Frequency** — how often a user hits this. It decides how much motion is allowed at all
  (`_domains/gui/design.md` Lens 1).

No project at all (empty directory, pure exploration)? Skip to Phase 03 with a restrained default look:
neutral greys, one accent, system font stack.

### Phase 03 — Choose directions

Default **3 variants**, up to 5 when the design space is genuinely wide. More than 5 stops being
divergence and starts being noise.

Before writing any code, list the set: **a name and an axis for each**. Names describe the direction —
"Quiet", "Editorial", "Playful", "Dense" — never "Variant A/B/C", which hides whether two variants are
actually the same idea. The axis is layout, density, personality, motion, or interaction model.

If two proposed directions differ only in accent colour, copy, or corner radius, they are one
direction — replace one with a real alternative (different layout, different interaction model,
different motion story). Sharing the project's tokens is *not* convergence; every variant should look
like it could ship in this product tomorrow.

**When the set collapses** — you cannot fill three real axis positions, or the replacement you just
wrote is the same idea again — the problem is that every direction came from the same place. Read one
file from [`../lateral/techniques/`](../lateral/techniques/) and run it inline to generate the missing
directions. Don't invoke `lateral` as a skill, and run one technique, not both:

- [`scamper`](../lateral/techniques/scamper.md) — there is one direction you like and the others are
  weak imitations of it. Systematic variation over that one: substitute the interaction model,
  eliminate an element, reverse the order, combine two states into one screen.
- [`random-stimulus`](../lateral/techniques/random-stimulus.md) — every direction is a variation of
  the screen as it already exists, or of the obvious pattern for this component. Force-fit an
  unrelated object onto it to break the default arrangement.

**A technique's output is not a variant.** It produces raw material; a direction still needs a name, a
stated axis, and a version that could ship in this product tomorrow. Anything that fails that bar
gets dropped, same as a hand-written direction would.

**Done when:** every variant has a name and a stated axis, and no two sit at the same axis position.

### Phase 04 — Build

Write the fragment to `/private/tmp/claude/<repo-slug>/spikes/<slug>/<slug>.body.html`: one
`<template data-variant="Name" data-caption="...">` per direction, plus the project's tokens in a
`<style>`, plus a top-level `<script>` that registers one tweak per thing worth changing while
looking at it — which screen, which error, which empty case, and any value the design turns on. Then:

```bash
"$HOME/.claude/skills/spike/tool/spike" build \
  --kind prototype --picker switch \
  --title "Wheelhouse Phone" --subtitle "<the question this answers>" \
  --device phone \
  --fragment /private/tmp/claude/<repo-slug>/spikes/<slug>/<slug>.body.html \
  --out /private/tmp/claude/<repo-slug>/spikes/<slug>/<slug>.html
```

A build **replaces** `--out` entirely. There is no merge and no history inside the file: refining is
editing the fragment and building again over the top. The title is the topic and nothing else.

The Tweaks panel's markup, its widgets and its URL persistence all come from the tool: you declare a
value and it renders the control the value's type calls for. It binds no keys — on a prototype the
whole keyboard belongs to the design being shown, so every harness control is a button.
**Write none of it**, and never restyle it — it stays identical across every project so it reads as
harness chrome rather than part of the design being judged.

The same is true of the other harness widgets a prototype gets for free: the device frame (a real
viewport, so the fragment's media queries actually fire, with the status bar / window chrome drawn by
the harness), the comment button, and the panel's Checks tab, whose Contrast row reveals any text
failing WCAG AA. Tell the user the comment button exists when handing the prototype over — a comment
pinned to an element comes back naming the fragment line that produced it, which is the fastest
revision loop available. See [`CONTRACT.md`](CONTRACT.md) for how the comments come back.

**Screen size is the frame's job, never a variant's**, and a different *platform* is a different
prototype. A "Phone" variant next to a "Desktop" variant spends two slots on something that is not a
design direction at all. Within one prototype's single device type, build one responsive variant and
let the frame size it — if it looks wrong rotated, that is a media query to write, not a template to
add. Across device types, build separate files (SKILL.md, "One prototype, one device type").

`--picker switch` renders **one variant at a time, full size, in realistic surrounding context** — a
toast needs a page behind it, a card needs siblings, a button needs a form. `--picker list` stacks each
variant full size, one per screenful, when the user wants to scroll rather than flip. Neither mode ever
shows thumbnails: side-by-side at small scale distorts spacing, and judging UI at postage-stamp size is
the failure the harness exists to prevent.

**Every control is live — this is not a stretch goal, it is the deliverable.** Every tab switches,
every toggle toggles, every row opens something, every destructive button shows what it would do.
Not the happy path only: the reject button works as well as the approve button. A dead control reads
as a bug, and the user stops judging the design to tell you it's broken — which is the one thing a
prototype cannot afford, since its whole job is to hold a conversation about the design. If a control
genuinely has nowhere to go, it does not go in.

### State axes, and why they are not variants

The states a screen has — logged out, empty, loading, server unreachable, mid-error — are **not**
variants. A variant is a *direction* being compared; a state is a *condition* the chosen direction has
to survive. Crossing them into one flat list is how five screens and two states become ten unusable
buttons.

Register each state dimension as its own tweak — `atTweaks.add('conn', [...], {onChange})`. The panel
renders the control, and tweak state survives a variant switch on purpose, so flipping direction
compares the same screen in the same state. Full syntax and the handler boilerplate:
[`CONTRACT.md`](CONTRACT.md).

### The device — decide it here, once

`--device` names the one frame this design is judged in, and it is **required**. A phone chat surface
is `phone`; a pane-tree editor is `desktop`; a TV guide is `tv`. There is no list and no switcher: the
choice is made now, in the build command, and the file is named for it. The status bar, notch, window
title bar and browser chrome are all drawn by the harness — never build your own.

The variant swap itself is **instant** — flipping is a 100+/session action, so by the frequency rule it
gets no animation. Set `data-motion` on a template if any variant has an entrance animation worth
re-triggering, and the tool adds the replay button.

### Phase 05 — Verify and hand off

**Screenshot every variant and look at them** — not just the first. Each renders, each interaction
responds, the console is clean. A path is delivery, not verification.

Then present the set and **stop — the choice is the user's**:

| # | Variant | Axis | When it's the right choice | Its cost |
| --- | --- | --- | --- | --- |
| 1 | Quiet | Minimal motion, borders over shadows | A daily-use tool | Least memorable |
| 2 | Editorial | Large type, generous whitespace | The moment deserves weight | Eats vertical space |

Close with the full path to the file and how to drive it: every control is a button in the Tweaks
panel, which drags by its header and closes to a pill — no keys, because the design under judgement
owns the keyboard. On a rebuild, add one line naming what
changed since they last looked.

Sell each variant honestly — one line on when it wins, one on what it costs. Never pre-pick a favourite
in the table. If the user asks which you'd choose, answer with a reason rooted in the product's
personality and how often the piece is seen (`gui` and `_domains/gui/design.md` are where that
judgement is licensed and how it must be anchored). If two variants converged while you built them, cut
one and say so: two truly distinct directions beat three padded ones.

The most useful feedback is usually **"the header from Editorial with the density of Dense"** — that's
the actual design. Treat it as a `riff`: run Phase 03 again around it and rebuild the same file over
the top.

### Phase 06 — Promote and delete

When a direction wins: capture the answer and why (commit message, ADR, issue), implement it properly
in the project's stack and conventions — a rewrite, never a copy of prototype markup — then delete
`/private/tmp/claude/<repo-slug>/spikes/<slug>/`. Record which variant won.
Keep the files only if the user asks.

## Anti-patterns

- **Variants that differ only in colour or copy.** That's a tweak, not a divergence.
- **A shared layout wrapper across variants.** Each variant must be free to throw out the layout;
  sharing one defeats the point.
- **Hand-writing or restyling the Tweaks panel, or hand-drawing a control it would render.** It is
  chrome, and it is supplied. The moment it uses project tokens, it starts competing with the design
  being judged.
- **Lorem ipsum, placeholder avatars, `$0.00`.** Fake content flatters every variant equally and
  therefore distinguishes none of them.
- **Judging variants side by side at small scale.** One at a time, full size.
- **A version or a word in the filename** — `nav-riff.html`, `nav-v2.html`, `nav-v2-final.html`, a
  title reading "Wheelhouse Nav Riff". One file per prototype, rebuilt in place.
- **One file covering several device types.** A platform is an interaction model, not a width: phone,
  desktop and TV are three prototypes. See SKILL.md.
- **Restyling or relocating the panel's groups.** They are harness chrome, ordered coarse to fine:
  variants change constantly and tweaks change with them, and the order says so.
- **A "Phone" variant and a "Desktop" variant of the same design.** Screen size is the device frame's
  question, not a variant's. One responsive template, sized by the harness.
- **Moving prototype markup into the codebase.** It was written with no tests, no error handling, and
  no accessibility pass beyond what the panel spec carries.
