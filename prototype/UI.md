# UI Prototype

Build **several genuinely different working versions** of one piece of UI in a single standalone HTML
file, flipped through with the picker, and let the user pick a winner.

If the question is logic/state → [LOGIC.md](LOGIC.md). If it's "which technical approach" →
[COMPARE.md](COMPARE.md). If there is one design and the open question is arrangement, this is too
expensive — that's `design` sketch mode (ASCII in chat).

Adapted from emilkowalski/skills `prototype` (MIT, © 2026 Emil Kowalski); the selection spec now lives
as real code in `../_handouts/harness/rail.css` and `rail.js`, and the tool wires it — you never
write it.

## When this is the right shape

- "What should this look like?" / "I want to see a few options before committing."
- "Try a different layout for the settings screen."
- Any time the user would otherwise spend a day picking between vague mockups in their head.

## The artifact — always one standalone HTML file

`<repo-root>/tmp/claude/prototypes/<slug>/<slug>.html`, where `<slug>` names what the prototype is for
— one canonical file for the topic's whole life, every round inside it behind the rail's round chips
(see SKILL.md "Naming and versions"). Self-contained, inline CSS and JS, opened directly
in a browser. No dev server, no route, no framework, and **no edit to any production file**. This holds
even when the project is React, Vue, or SwiftUI: hand-written HTML/CSS/JS is the fastest path to
something you can look at, and the winning direction gets rewritten in the project's stack at
promotion anyway.

You write a **body fragment** — one `<template data-variant>` per direction, plus a `<style>` block
carrying the project's tokens. `~/.claude/tools/handout` assembles the file. Read
`../_handouts/CONTRACT.md` for the fragment rules; the `prototype` kind ships **no palette of its own**
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

Two things this costs, both accepted: a variant cannot use the project's actual components, and
density can't be judged against genuinely live data. When the whole question is "does our real
`<DataGrid>` work here", that's a promotion-time question, not a prototype one.

## Process

### Phase 01 — Scope

One thing per run. If the description spans several components ("the dashboard"), narrow it: pick the
single highest-leverage piece, say which and why, offer the rest as later runs. Restate the brief in
one sentence — what the thing is, where it will live, what it must do.

Then fix the slug and the round. `ls <repo-root>/tmp/claude/prototypes/`: an existing directory for
this topic means this is its next round — reuse the slug, read the highest round already in the file
(`grep -o 'data-round="[0-9]*"' <slug>.html | sort -u`) and add 1, and read the previous round's
variants so this one diverges from them instead of repeating them. No directory means a new topic,
slug named for the thing being designed, round 1.

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

Write the fragment to `<repo-root>/tmp/claude/artifacts/<slug>-v<N>.body.html`: one
`<template data-variant="Name" data-caption="...">` per direction, plus the project's tokens in a
`<style>`, plus a `<nav data-axis>` for each state the design has to be judged in (which screen, which
error, which empty case) and a top-level `<script>` listening for `at:axis`. Then:

```bash
"$HOME/.claude/tools/handout" build \
  --kind prototype --picker switch --round <N> \
  --title "Wheelhouse Nav" --subtitle "<the question this round answers>" \
  --devices fit,phone \
  --fragment <repo-root>/tmp/claude/artifacts/<slug>-v<N>.body.html \
  --out <repo-root>/tmp/claude/prototypes/<slug>/<slug>.html
```

`--out` is the same path every round. The tool reads it before overwriting, keeps every round that
isn't `<N>`, and adds the round chips at the top of the rail. The title is the topic and nothing
else — no version, no adjective; the chips already say which round is showing.

The rail's markup, styles and URL persistence all come from the tool. It binds no keys: on a prototype the whole keyboard belongs to the design being shown, so every harness control is a button.
**Write none of it**, and never restyle it — it stays identical across every project so it reads as
harness chrome rather than part of the design being judged.

The same is true of the other harness widgets a prototype gets for free: the device frames in the rail
(each renders the page in a real viewport, so the fragment's media queries actually fire, and the
harness draws the status bar / window chrome), `a` to comment on any element, and `c` to flag text
that fails contrast. Tell the user those
exist when handing the prototype over — a comment pinned to an element comes back naming the fragment
line that produced it, which is the fastest revision loop available. See
`../_handouts/CONTRACT.md` for how the comments come back.

**Screen size is the frame's job, never a variant's.** `--devices` already renders the same fragment
at each named size in a real viewport. A "Phone" variant next to a "Desktop"
variant spends two of your three or four slots on something the harness supplies for free, and it
splits one design across two templates that then drift. Build **one** responsive variant and let the
switcher size it — if it looks wrong at desktop width, that is a media query to write, not a template
to add.

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
genuinely has nowhere to go this round, it does not go in this round.

### State axes, and why they are not variants

The states a screen has — logged out, empty, loading, server unreachable, mid-error — are **not**
variants. A variant is a *direction* being compared; a state is a *condition* the chosen direction has
to survive. Crossing them into one flat list is how five screens and two states become ten unusable
buttons.

Declare each state dimension as its own `<nav data-axis>`; the rail renders a group and dispatches
`at:axis`, and axis state survives a variant switch on purpose, so `←`/`→` compares the same screen in
the same state across two directions. Full syntax and the listener boilerplate:
[`../_handouts/CONTRACT.md`](../_handouts/CONTRACT.md).

### Devices — decide, don't default

`--devices` names the frames this design is judged in, and picking them is your call every time. Ask
what the thing actually is: a phone chat surface is `fit,phone`; a pane-tree editor is `fit,desktop`;
a marketing page is `fit,phone,tablet,web`; a thing that must work everywhere earns all of them.
Offering a frame the design was never drawn for invites a verdict on a layout nobody designed, and
omitting the one it ships on hides the only test that mattered. The status bar, notch, window title bar
and browser chrome are all drawn by the harness — never build your own.

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

Close with the full path to the file and the keys to flip: `1–N` and `←`/`→` for variants, `[` / `]`
for rounds (or the chips at the top of the rail), `R` to replay. From round 2 on, add one line on what this round changed and the same path
with `?r=1` appended — the earlier rounds live in the same file precisely so the user can flip back.

Sell each variant honestly — one line on when it wins, one on what it costs. Never pre-pick a favourite
in the table. If the user asks which you'd choose, answer with a reason rooted in the product's
personality and how often the piece is seen (`design` and `_domains/gui/design.md` are where that
judgement is licensed and how it must be anchored). If two variants converged while you built them, cut
one and say so: two truly distinct directions beat three padded ones.

The most useful feedback is usually **"the header from Editorial with the density of Dense"** — that's
the actual design. Treat it as a `riff`: run Phase 03 again around it and rebuild the same file with
`--round <N+1>`. The earlier rounds stay in it untouched.

### Phase 06 — Promote and delete

When a direction wins: capture the answer and why (commit message, ADR, issue), implement it properly
in the project's stack and conventions — a rewrite, never a copy of prototype markup — then delete
`<repo-root>/tmp/claude/prototypes/<slug>/`, every version in it. Record which version and variant won.
Keep the files only if the user asks.

## Anti-patterns

- **Variants that differ only in colour or copy.** That's a tweak, not a divergence.
- **A shared layout wrapper across variants.** Each variant must be free to throw out the layout;
  sharing one defeats the point.
- **Hand-writing or restyling the rail.** It is chrome, and it is supplied. The moment it uses
  project tokens, it starts competing with the design being judged.
- **Lorem ipsum, placeholder avatars, `$0.00`.** Fake content flatters every variant equally and
  therefore distinguishes none of them.
- **Judging variants side by side at small scale.** One at a time, full size.
- **A version or a word in the filename** — `nav-riff.html`, `nav-v2.html`, `nav-v2-final.html`, a
  title reading "Wheelhouse Nav Riff". One file per topic; the round lives inside it.
- **Building the next round to a new path.** That splits the topic across files again and is exactly
  what `--round` exists to stop.
- **Restyling or relocating the rail's groups.** They are harness chrome, ordered coarse to fine:
  rounds change once a session, variants a hundred times, and the order says so.
- **A "Phone" variant and a "Desktop" variant of the same design.** Screen size is the device frame's
  axis, not a variant's. One responsive template, sized by the harness.
- **Moving prototype markup into the codebase.** It was written with no tests, no error handling, and
  no accessibility pass beyond what the rail spec carries.
