# Structure and layout tells

Part of [`slop.md`](../slop.md) — the slop test and how to report a hit are there.

Structural giveaways beyond the absolute bans. Harvested from `Leonxlnx/taste-skill` SKILL.md.

- **Left-text / right-image hero.** The single most overused AI landing-page pattern (headline + copy +
  CTA on the left, product shot/illustration on the right). Rework: full-bleed type, centred, asymmetric
  offset, or lead with the artifact — anything but the 50/50 split.
- **Anti-nested-box.** Cards inside cards inside cards; a giant rounded wrapper section around everything.
  Depth via space and hairlines, not concentric containers. (Related: "cards are the lazy answer" in the
  layout lens.)
- **Div-based fake product UI.** Fake task lists, terminals, dashboards, chat threads built from styled
  `<div>`s to look like a real app screenshot. The general form of the Codex ghost-card. Ship a real
  screenshot or nothing.
- **Bento dead cells.** A bento/masonry grid with empty middle or trailing cells because N items ≠ N grid
  slots. Size the grid to the content; `grid-flow-dense` only when it genuinely fills.
- **Zigzag fatigue.** A third consecutive image+text split alternating side to side. Break the rhythm by
  the third.
- **Logo-wall with category labels.** A trusted-by logo strip with a caption under each ("Stripe ·
  payments", "Vercel · hosting"). The labels are filler; logos alone, or drop the wall.
- **Full row borders on spec tables.** `border-t` + `border-b` on *every* row of a long comparison/spec
  table. One divider style, sparingly; zebra or nothing.
- **Split-header.** A big left headline paired with a small floating top-right explainer paragraph in a
  section header. Reads as template scaffolding.
- **Decorative image furniture.** Pills/tags overlaid on images (`Plate · Brand`); `01 / 4` pagination on
  bento tiles; vertical 90°-rotated agency text; crosshair / hairline decoration grids over a photo. None
  carries information.
- **Filled-track comparison bars.** Progress/score bars used as decorative comparison visuals on a landing
  page (not real data). A prominent bar is fine only when it shows real data.
- **Decorative status dots.** Small coloured dots on nav items, list rows or badges that stand for no
  real state. A dot marks live state only (online, unread, failing), and at most one dot style per
  section.
- **`<br>`-broken + italicized headlines** as a default "design move" — manual line breaks plus italics to
  fake editorial rhythm. Let type wrap; earn emphasis with weight.

## Caps on a Persuade page

Numbers that turn the bans above into a count. Each applies to Persuade surfaces (landing,
marketing, pricing); Operate and Read surfaces follow `../design.md` Lens 0 instead.

- **Eyebrow labels: at most ceil(sections ÷ 3)**, the hero counting as one section. A 7-section page
  gets 3. More than that and the kicker is grammar, not voice. `../scripts/preflight.mjs` warns
  `EYEBROW_COUNT` per file: it counts every uppercase-and-tracked element against `<section>` tags,
  buttons and table headers included, and on any page — confirm the hits are eyebrows on a Persuade
  page before reporting.
- **One marquee or ticker per page.** A second one competes with the first for the moving-thing
  attention the eye gives first.
- **A CTA label never wraps.** A two-line button reads as broken and its hit area grows unevenly;
  shorten the label or widen the button.
- **A list of more than 5 items is not bullets.** Past five, a bulleted list is a wall the eye stops
  scanning; group it in two columns, tabs, or scroll-snap pills, or split featured from the rest.
