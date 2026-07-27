# UI Prototype

Build **several genuinely different working versions** of one piece of UI in a single standalone HTML
file, flipped through with the picker, and let the user pick a winner.

If the question is logic/state → [LOGIC.md](LOGIC.md). If it's "which technical approach" →
[COMPARE.md](COMPARE.md). If there is one design and the open question is arrangement, this is too
expensive — that's `ui-design` sketch mode (ASCII in chat).

Adapted from emilkowalski/skills `prototype` (MIT, © 2026 Emil Kowalski); the picker spec is copied
verbatim in [PICKER.md](PICKER.md).

## When this is the right shape

- "What should this look like?" / "I want to see a few options before committing."
- "Try a different layout for the settings screen."
- Any time the user would otherwise spend a day picking between vague mockups in their head.

## The artifact — always one standalone HTML file

`<repo-root>/tmp/claude/prototypes/<slug>.html` — self-contained, inline CSS and JS, opened directly
in a browser. No dev server, no build step, no route, no framework, and **no edit to any production
file**. This holds even when the project is React, Vue, or SwiftUI: hand-written HTML/CSS/JS is the
fastest path to something you can look at, and the winning direction gets rewritten in the project's
stack at promotion anyway.

Make it look native to the product without importing anything from it:

- **Copy the design tokens into `:root`** — the colours, radii, spacing scale, font stack, easing and
  duration variables read off the project's CSS/theme file during recon. Copied values, not imports.
- **Tailwind projects** — add `<script src="https://unpkg.com/@tailwindcss/browser@4"></script>` and
  paste the project's `@theme` block. The browser build compiles utilities on the page, so the
  project's own class names work in the file (https://www.npmjs.com/package/@tailwindcss/browser).
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

One HTML file. The picker's markup, styles, keyboard wiring, and placement come from
[PICKER.md](PICKER.md) — **verbatim**, never restyled with the project's tokens, so it always reads as
harness chrome rather than part of the design being judged.

Beyond the picker, the harness renders **one variant at a time, full size, in realistic surrounding
context** — a toast needs a page behind it, a card needs siblings, a button needs a form. Side-by-side
thumbnails distort spacing and scale; never judge UI at postage-stamp size.

Every variant fully works: real interactions, real motion, real content. A dead button teaches nothing
about the direction it was standing in for.

The variant swap itself is **instant** — flipping is a 100+/session action, so by the frequency rule it
gets no animation. (The picker's own highlight slides; that's specified in PICKER.md.)

### Phase 05 — Verify and hand off

Open the file and flip through every variant yourself: each renders, each interaction responds, the
console is clean. Screenshot each one if browser tooling is available.

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
- **Restyling the picker.** It is chrome. The moment it uses project tokens, it starts competing with
  the design being judged.
- **Lorem ipsum, placeholder avatars, `$0.00`.** Fake content flatters every variant equally and
  therefore distinguishes none of them.
- **Judging variants side by side at small scale.** One at a time, full size.
- **Moving prototype markup into the codebase.** It was written with no tests, no error handling, and
  no accessibility pass beyond what the picker spec carries.
