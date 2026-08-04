# UI Prototype

Build **several genuinely different working versions** of one piece of UI in a single standalone HTML
file, flipped through with the picker, and let the user pick a winner.

If the question is logic/state → [LOGIC.md](LOGIC.md). If it's "which technical approach" →
[COMPARE.md](COMPARE.md). If there is one design and the open question is arrangement, this is too
expensive — that's `ui-design` sketch mode (ASCII in chat).

Adapted from emilkowalski/skills `prototype` (MIT, © 2026 Emil Kowalski); the picker spec now lives as
real code in `../_artifacts/harness/picker.css` and `picker.js`, and the tool wires it — you never
write it.

## When this is the right shape

- "What should this look like?" / "I want to see a few options before committing."
- "Try a different layout for the settings screen."
- Any time the user would otherwise spend a day picking between vague mockups in their head.

## The artifact — always one standalone HTML file

`<repo-root>/tmp/claude/prototypes/<slug>.html` — self-contained, inline CSS and JS, opened directly
in a browser. No dev server, no route, no framework, and **no edit to any production file**. This holds
even when the project is React, Vue, or SwiftUI: hand-written HTML/CSS/JS is the fastest path to
something you can look at, and the winning direction gets rewritten in the project's stack at
promotion anyway.

You write a **body fragment** — one `<template data-variant>` per direction, plus a `<style>` block
carrying the project's tokens. `~/.claude/tools/artifact` assembles the file. Read
`../_artifacts/CONTRACT.md` for the fragment rules; the `prototype` kind ships **no palette of its own**
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

### Phase 02 — Recon

Before designing anything, map the ground the variants stand on:

- **Tokens** — colours, radii, spacing, fonts, easing/duration variables, to copy into `:root`.
- **Personality** — playful consumer app or crisp dashboard? This bounds how far the boldest variant
  may go.
- **Context** — what the piece renders against: background, neighbours, sizes.
- **Frequency** — how often a user hits this. It decides how much motion is allowed at all
  (`_domains/ui/design.md` Lens 1).

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

**Done when:** every variant has a name and a stated axis, and no two sit at the same axis position.

### Phase 04 — Build

Write the fragment to `<repo-root>/tmp/claude/artifacts/<slug>.body.html`: one
`<template data-variant="Name" data-axis="...">` per direction, plus the project's tokens in a
`<style>`. Then:

```bash
"$HOME/.claude/tools/artifact" build \
  --kind prototype --picker switch \
  --title "<what's being judged>" \
  --fragment <repo-root>/tmp/claude/artifacts/<slug>.body.html \
  --out <repo-root>/tmp/claude/prototypes/<slug>.html
```

The picker's markup, styles, keyboard wiring, URL persistence, and placement all come from the tool.
**Write none of it**, and never restyle it — it stays identical across every project so it reads as
harness chrome rather than part of the design being judged.

`--picker switch` renders **one variant at a time, full size, in realistic surrounding context** — a
toast needs a page behind it, a card needs siblings, a button needs a form. `--picker list` stacks each
variant full size, one per screenful, when the user wants to scroll rather than flip. Neither mode ever
shows thumbnails: side-by-side at small scale distorts spacing, and judging UI at postage-stamp size is
the failure the harness exists to prevent.

Every variant fully works: real interactions, real motion, real content. A dead button teaches nothing
about the direction it was standing in for.

The variant swap itself is **instant** — flipping is a 100+/session action, so by the frequency rule it
gets no animation. (The picker's own highlight slides; that's in `../_artifacts/harness/picker.css` and
is not yours to change.) Set `data-motion` on a template if any variant has an entrance animation worth
re-triggering, and the tool adds the replay button.

### Phase 05 — Verify and hand off

**Screenshot every variant and look at them** — not just the first. Each renders, each interaction
responds, the console is clean. A path is delivery, not verification.

Then present the set and **stop — the choice is the user's**:

| # | Variant | Axis | When it's the right choice | Its cost |
| --- | --- | --- | --- | --- |
| 1 | Quiet | Minimal motion, borders over shadows | A daily-use tool | Least memorable |
| 2 | Editorial | Large type, generous whitespace | The moment deserves weight | Eats vertical space |

Close with the full path to the file and the keys to flip (`1–N`, `←`/`→`, `R` to replay).

Sell each variant honestly — one line on when it wins, one on what it costs. Never pre-pick a favourite
in the table. If the user asks which you'd choose, answer with a reason rooted in the product's
personality and how often the piece is seen (`ui-design` and `_domains/ui/design.md` are where that
judgement is licensed and how it must be anchored). If two variants converged while you built them, cut
one and say so: two truly distinct directions beat three padded ones.

The most useful feedback is usually **"the header from Editorial with the density of Dense"** — that's
the actual design. Treat it as a `riff` and run Phase 03 again around it.

### Phase 06 — Promote and delete

When a direction wins: capture the answer and why (commit message, ADR, issue), implement it properly
in the project's stack and conventions — a rewrite, never a copy of prototype markup — then delete
`<repo-root>/tmp/claude/prototypes/<slug>.html`. Keep the file only if the user asks.

## Anti-patterns

- **Variants that differ only in colour or copy.** That's a tweak, not a divergence.
- **A shared layout wrapper across variants.** Each variant must be free to throw out the layout;
  sharing one defeats the point.
- **Hand-writing or restyling the picker.** It is chrome, and it is supplied. The moment it uses
  project tokens, it starts competing with the design being judged.
- **Lorem ipsum, placeholder avatars, `$0.00`.** Fake content flatters every variant equally and
  therefore distinguishes none of them.
- **Judging variants side by side at small scale.** One at a time, full size.
- **Moving prototype markup into the codebase.** It was written with no tests, no error handling, and
  no accessibility pass beyond what the picker spec carries.
