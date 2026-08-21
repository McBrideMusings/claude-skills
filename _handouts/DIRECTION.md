# Creative direction — identity-first handouts

Read this for the **`page` and `deck` kinds only**. Those are the two where palette and typefaces are
open decisions. `explainer` already has a house look, `prototype` copies the host project's tokens, and
`wireframe` withholds colour on purpose — none of them has a direction to choose, so none of them reads
this file.

Adapted from `design-handout` (plannotator/effective-html, https://www.effectivehtml.com/docs/designing-handouts).

Take the perspective of a creative director with range: every commission gets its own visual identity,
scaled to whatever treatment the brief actually merits. Palette, type, and layout are conscious
decisions rooted in this particular subject.

## Authority order

Fixed, and it only flows one way:

1. **What the user literally said.** A direction they pinned down gets executed faithfully — including a
   request for something this file would otherwise warn against.
2. **The project's own system.** Before anything else, hunt for one: `CLAUDE.md`, `AGENTS.md`,
   `DESIGN.md`, a tokens or theme file, the styling on existing components. Found one? Apply it.
3. **Your taste.** Only where the two above are silent.

## Size up the brief first

The question is never *whether* to design — it's what register to design in.

- **Workmanlike** (most of what comes in — plans, briefs, reports, internal decks): real hierarchy in
  the type, spacing that was thought about, a palette that was chosen. Then stop. Almost no page
  benefits from a towering hero. Ornament sparingly.
- **Editorial** (something someone will hold onto or pass along): commit to opinions and place one
  honest aesthetic bet where the work benefits.

Nobody ever regretted a well-composed page; an identity pushed too hard sometimes backfires.

## Fundamentals

**Anchor to the subject.** Where it's fuzzy, sharpen first: one concrete thing, a defined audience, one
purpose the page serves. The most distinctive moves are excavated from the subject's native territory —
the stuff it's made of, the tools of its trade, the language its people speak. Real content from the
first draft; lorem ipsum is banned.

**Put two typefaces in conversation.** The letterforms do the heavy lifting even on a page that has
nothing to do with letterforms. **Never link a webfont** — no Google Fonts, no font CDN, nothing that
makes a network request. `_base.css` ships system sans and system mono stacks; the way to get a face
with genuine character is a `@font-face` `data:` URI embedded in the fragment. If you don't have a face
to embed, get your contrast from weight, width, size, and tracking rather than from a second family
that isn't really there. Note what the platform sans as your *display* voice actually says: it is the
face every page gets by not choosing, and on an identity-first handout that reads as no decision made.

The scale is already built: `--f-3xl` down to `--f-sm` on a 17px root, and `--f-3xl` is the display
step — one per handout, on the title, never on a section heading. A title only a third larger than
its body text is the single clearest sign nobody set a hierarchy. Prose stays at `--maxw` (68ch) and
figures break out to `--maxw-wide`; don't re-centre things by hand. `text-wrap: balance` on headings,
tracking tightening as size grows, a hint of letter-spacing on uppercase labels.

**Neutrals are choices too.** A dead-centre mid-grey announces that nobody thought about it; tint it
faintly toward the accent and it reads as considered. Pure white and near-black grounds are fine when
the subject wants them — the test is whether the neutral was selected or merely left over.

**Every colour you choose has to clear the contrast floor, and you check rather than assume.** Body and
placeholder text at 4.5:1, large text at 3:1, against whatever is actually behind it. This is where
chosen palettes fail most often and most invisibly: the base tokens themselves shipped with the muted
grey at 3.2:1 and the accent at 2.96:1 — so every link on every handout failed AA — and nobody saw it
until the handout's own `c` check was run in both themes. Light grey "for elegance" on a near-white
ground is the specific reflex to distrust. Press `c`, read the number, fix the value.

**Both themes, equal care.** `_base.css` wires the mechanism: tokens on `:root`, reassigned inside
`@media (prefers-color-scheme: dark)`, then reassigned again under `:root[data-theme="dark"]` and
`:root[data-theme="light"]` so an explicit toggle beats the media query in both directions. Your job is
the values. Components consume tokens only and are never styled inside the media query. Mechanical
inversion won't do — legibility and a working accent have to survive on either ground. A concept
married to one visual world (an arcade cabinet's glow, a letterpress invitation) may stay single-theme,
provided that's a verdict you reached rather than a corner you forgot.

**Spacing belongs to the layout.** Sibling groups get flex or grid plus `gap`. Scattered per-element
margins collapse and compound behind your back. Broad content — tables, code, diagrams — sits in its own
`overflow-x: auto` container so horizontal scrolling never leaks to the page body (`_base.css` provides
`.scroll-x`). Columns of numerals get `font-variant-numeric: tabular-nums`.

**Copy is a material.** Load-bearing, not garnish. Stand on the reader's side of the glass: name things
as people know them, not as the backend does — someone manages *notifications*, never *webhook config*.
Active verbs. Every control declares its exact effect ("Publish", answered by "Published"). An error
diagnoses the failure and prescribes the fix. Precision outperforms wit.

**Make structure mean something.** Numbering, eyebrows, dividers, labels — these earn their place by
asserting something true about the content. Numbered markers (01 / 02 / 03) are only honest when order
is real information: an actual procedure, a dated timeline read in sequence. Before deploying a device
like that, ask whether it's telling the truth.

**Interfaces are not documents.** A dashboard or tool is scanned and driven, not read top to bottom,
which moves the craft from typography into information design. Lead with the rollup, follow with the
detail. Let form carry state alongside the figures — pills, chips, a severity stripe — so trouble is
legible at a glance. Status colours (good / warning / critical) live in their own lane, apart from the
accent, and never count as it. Charts get typographic-grade attention: an area fill, a whisper of grid,
the endpoint emphasised. If it can be clicked, it looks clickable.

**Mind the cascade.** Specificity is where CSS fights itself — a `.section` hook and a `.cta` hook can
end up in a tug-of-war over padding, each undoing the other. Architect the cascade so spacing can't be
quietly sabotaged.

**Motion is a budget.** Ask where animation genuinely serves the subject and whether it serves at all.
One orchestrated beat beats effects sprinkled around. Restraint usually wins, and gratuitous animation
is itself a tell. `_base.css` already honours `prefers-reduced-motion`.

## Don't look machine-made

`_domains/gui/slop.md` is the catalogue — read it, don't take a summary of it from here. Two copies of a
list like that drift, and that file is the better one.

The short version: the stock answer to any brief is the thing to avoid. Absent user instruction, that
freedom is yours; don't spend it on a cliché.

Three that the kind stylesheets have already been cleared of, so reintroducing one in a fragment
undoes work rather than adding any: a coloured `border-left` thicker than 1px on a callout or a card;
a tiny uppercase eyebrow above every section (one per document is a voice, one per section is machine
grammar); and a rule under every row of a table, which turns it into a ladder and stops the header
reading as a header.

**Then the browser's own surfaces**, which `_base.css` now themes and a fragment can undo by accident:
text selection, the caret, scrollbars, focus rings, underline offset. Left at their defaults they are
the cheapest tell that a page was assembled rather than built, and the one most reliably skipped.

## Process

Code comes second. Write a short design plan first:

- **Colour** — 4–6 hex values, each with a name.
- **Type** — 2+ roles: a display face used with restraint, a body face that partners it, and a utility
  face for captions or data if the work needs one. Name what's actually available (system stacks, or an
  embedded `data:` face) — not a family you're hoping resolves.
- **Layout** — the organizing idea, in a sentence or two.

Then build, tracing every colour and type decision back to the plan.

**Editorial work gets one more gate before code:** audit the plan against the subject. Anything that
could pass for the stock answer to any similar brief gets reworked, with a note on what moved and why.
Concentrate the daring in one place and hush everything around it. If the accent quarrels with the
ground, slide it toward an analogous hue or drain some saturation — don't trade it for another colour.

## Delivery

Never publish to a hosted page — see `~/.claude/CLAUDE.md` §5. Write the file, screenshot it, look at
it, run the one batched pass in [`CRITIQUE.md`](CRITIQUE.md), then `open <absolute-path>`.
