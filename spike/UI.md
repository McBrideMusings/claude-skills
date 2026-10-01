# UI Prototype

Build **several genuinely different working versions** of one piece of UI in a single standalone HTML
file, flipped through with the Tweaks panel, and let the user pick a winner.

This is rung 4 of the fidelity ladder ([SKILL.md](SKILL.md)). If the open question is arrangement,
sketch it in ASCII ([`../ref/gui/sketch.md`](../ref/gui/sketch.md)); if it is how the screen looks,
make an image comp ([COMP.md](COMP.md)) or an HTML mockup ([MOCKUP.md](MOCKUP.md)). Come here for
behaviour only visible under interaction, or a mockup that settled nothing.

If the question is logic/state → [LOGIC.md](LOGIC.md). If it's "which technical approach" →
[COMPARE.md](COMPARE.md).

Adapted from emilkowalski/skills `prototype` (MIT, © 2026 Emil Kowalski); the panel lives as real
code in `tool/harness/tweaks.css` and `tweaks.js`, and the tool wires it — you never write it.

## When this is the right shape

- The look is settled or a mockup showed it, and what is open is behaviour: transitions that need input, states reached by clicking, how a real component responds. A CSS animation that runs on load is a mockup question: `spike film` ([MOCKUP.md](MOCKUP.md)).
- A mockup or comp that could not answer the question.
- "I want to see a few options working before committing", where working means clickable. Options judged by look alone are comps or mockups.

## The artifact — always one standalone HTML file

`/private/tmp/claude/<repo-slug>/spikes/<slug>/<slug>.html`, where `<slug>` names what the prototype is for
**and which platform it targets** — one file per platform, rebuilt in place (see CONTRACT.md "Naming").
Self-contained, inline CSS and JS, opened directly in a browser. (A route is the exception below.) No
dev server, no route, no framework, and **no edit to any production file** (the throwaway route below is
the one exception, and lives in a discarded worktree). This holds even when the project is React, Vue,
or SwiftUI: hand-written HTML/CSS/JS is the fastest path to something you can look at, and the winning
direction gets rewritten in the project's stack at promotion anyway.

You write a **body fragment** — one `<template data-variant>` per direction, plus a `<style>` block
carrying the project's tokens. `~/.claude/skills/spike/tool/spike` assembles the file. Read
[`CONTRACT.md`](CONTRACT.md) for the fragment rules; the `prototype` kind ships **no palette of its own**
precisely so nothing competes with the design being judged.

Make it look native to the product without importing anything from it:

- **Load the exported token file.** `dsys export` writes the project's Tailwind v4 `@theme` file
  from `DESIGN.md`; paste its declarations into the fragment's `<style>` with the `@theme` at-rule
  renamed `:root` (browsers ignore `@theme`, and everything inside it is a plain custom property).
  The tool rejects any network request, so the file is inlined, not linked. Re-run `dsys export`
  and re-paste rather than editing a token by hand. `dsys export` runs in owned repos only; a repo with no `DESIGN.md`, or one that is not owned, has
  no export: use the restrained default in Phase 02.
- **Tailwind projects** — the browser build is a CDN `<script>`, and the tool rejects any network
  request, because a prototype that only renders online isn't self-contained. Use the exported
  tokens as custom properties in plain classes, or copy the handful of utilities a variant actually
  uses into the fragment's `<style>` as real CSS.
- **Type realistic content by hand** — real product copy, plausible names and numbers, a row count
  close to the real one.

**Show the result** per [CONTRACT.md](CONTRACT.md) rule 10: screenshots of each variant, and the
HTML's absolute path for the user to open, since the prototype needs interaction.

Two things this costs, both accepted: a variant cannot use the project's actual components, and
density can't be judged against genuinely live data. When the whole question is "does our real
`<DataGrid>` work here", build the route below instead.

## When the question is a real component's behaviour — a throwaway route

Build it inside the project, in a linked worktree made for the spike, as a route at
`/__spike/<slug>` that renders the real components. The worktree is never merged, pushed or
committed to a shared branch, and is discarded when the question is settled, so nothing reaches the
project's main branch. Everything else in this file (scope, directions, live controls, the
critique pass) applies unchanged; the differences are:

- There is no `spike build` and no Tweaks panel: the project's dev server runs the route and the
  project's own dev tooling drives it.
- Screenshot each direction from the running route and show the screenshots per
  [CONTRACT.md](CONTRACT.md) rule 10.
- Stop the dev server you started when you hand over.

## Process

### Phase 01 — Scope

One thing per run. If the description spans several components ("the dashboard"), narrow it: pick the
single highest-leverage piece, say which and why, offer the rest as later runs. Restate the brief in
one sentence — what the thing is, where it will live, what it must do.

Then fix the platform and the slug. **One prototype targets one platform** — decide which, and name
the slug for it (`settings-phone`, `settings-desktop`). `ls /private/tmp/claude/<repo-slug>/spikes/`: an
existing directory for this slug means this is a rebuild — read the fragment beside it so the new set
diverges from what is already there instead of repeating it, and build over the same `--out`.

### Phase 02 — Recon

Before designing anything, map the ground the variants stand on:

- **Tokens** — colours, radii, spacing, fonts, easing/duration variables: the `dsys export` file, inlined as `:root`.
- **Personality** — playful consumer app or crisp dashboard? This bounds how far the boldest variant
  may go.
- **Context** — what the piece renders against: background, neighbours, sizes.
- **Frequency** — how often a user hits this. It decides how much motion is allowed at all
  (`ref/gui/design.md` Lens 1).

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
wrote is the same idea again — the problem is that every direction came from the same place. Invoke
`lateral <technique>` with the one that matches, and run its workflow to generate the missing
directions. **Name the technique** — that skips `lateral`'s own diagnosis, which would otherwise
re-decide something you have already worked out here. Run one, not both:

- `lateral scamper` — there is one direction you like and the others are
  weak imitations of it. Systematic variation over that one: substitute the interaction model,
  eliminate an element, reverse the order, combine two states into one screen.
- `lateral random-stimulus` — every direction is a variation of
  the screen as it already exists, or of the obvious pattern for this component. Force-fit an
  unrelated object onto it to break the default arrangement.

**A technique's output is not a variant.** It produces raw material; a direction still needs a name, a
stated axis, and a version that could ship in this product tomorrow. Anything that fails that bar
gets dropped, same as a hand-written direction would.

**Challenge the default before locking the set.** One direction in any set is usually the obvious pattern for this component — the layout an unprompted model always builds. That direction may stay, but only named as the default and justified in one line by what the alternatives lose; and at least one direction in the set must be a genuinely second-line take, not a variation on the obvious skeleton. A set of three flavours of the default passes the axis test and still teaches nothing. (The in-model tier of **default-challenge** — `improve/SKILL-GLOSSARY.md`.)

**Done when:** every variant has a name and a stated axis, no two sit at the same axis position, and the default-bearing variant is named and justified.

### Phase 04 — Build

Write the fragment to `/private/tmp/claude/<repo-slug>/spikes/<slug>/<slug>.body.html`: one
`<template data-variant="Name">` per direction, plus the project's tokens in a
`<style>`, plus a top-level `<script>` that registers one tweak per thing worth changing while
looking at it — a dimension, a density, a token, a content volume, and any state the UI gives no
route to (an error, an empty case, a missing permission). **Navigation and app state are not
tweaks**: which screen, which record, which mode, which settings group are all reachable by
clicking, so they are built into the prototype and clicked. See CONTRACT.md § Tweaks. Then:

```bash
"$HOME/.claude/skills/spike/tool/spike" build \
  --kind prototype \
  --title "Wheelhouse Phone" --subtitle "<the question this answers>" \
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

**Screen size is the browser window's job, never a variant's**, and a different *platform* is a
different prototype. A "Phone" variant next to a "Desktop" variant spends two slots on something that
is not a design direction at all. Within one prototype's platform, build one responsive variant and
resize the window to see it — if it looks wrong narrow, that is a media query to write, not a
template to add. Across platforms, build separate files (CONTRACT.md "Naming").

The panel renders **one variant at a time, full size, in realistic surrounding context** — a toast
needs a page behind it, a card needs siblings, a button needs a form. It never shows thumbnails:
side-by-side at small scale distorts spacing, and judging UI at postage-stamp size is the failure the
harness exists to prevent.

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
[`CONTRACT.md`](CONTRACT.md). When the states are the question and nothing needs clicking, a
mockup ([MOCKUP.md](MOCKUP.md)) shows every variant in every state as screenshots.

### Phase 05 — Verify and hand off

Hand off per [`CONTRACT.md`](CONTRACT.md) "Before handing it over".

Then present the set and **stop — the choice is the user's**:

| # | Variant | Axis | When it's the right choice | Its cost |
| --- | --- | --- | --- | --- |
| 1 | Quiet | Minimal motion, borders over shadows | A daily-use tool | Least memorable |
| 2 | Editorial | Large type, generous whitespace | The moment deserves weight | Eats vertical space |

Close with the full path to the file and how to drive it: every control is a button in the Tweaks
panel, which closes to a pill — no keys, because the design under judgement owns the keyboard. On a
rebuild, add one line naming what changed since they last looked.

Sell each variant honestly — one line on when it wins, one on what it costs. Never pre-pick a favourite
in the table. If the user asks which you'd choose, answer with a reason rooted in the product's
personality and how often the piece is seen (`ref/gui/design.md` is where that
judgement is licensed and how it must be anchored). If two variants converged while you built them, cut
one and say so: two truly distinct directions beat three padded ones.

The most useful feedback is usually **"the header from Editorial with the density of Dense"** — that's
the actual design. Treat it as a `riff`: run Phase 03 again around it and rebuild the same file over
the top.

### Phase 06 — Promote and delete

When a direction wins: record the answer and why in `DESIGN.md` (a token or component rule), an ADR,
or the ticket; implement it properly in the project's stack and conventions — a rewrite, never a
copy of prototype markup — then delete `/private/tmp/claude/<repo-slug>/spikes/<slug>/`, or the
worktree for a route. Record which variant won. A prototype is not kept ([LIFECYCLE.md](LIFECYCLE.md)).

To hand a prototype to a phone or a person outside this repo, see [EXPORT.md](EXPORT.md).

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
- **One file covering several platforms.** A platform is an interaction model, not a width: phone,
  desktop and TV are three prototypes. See CONTRACT.md.
- **A "Phone" variant and a "Desktop" variant of the same design.** Screen size is the window's
  question, not a variant's. One responsive template.
- **Moving prototype markup into the codebase.** It was written with no tests, no error handling, and
  no accessibility pass.
