# UI slop catalog

Read by **planning** (`gui` critique/audit mode) and the **engines** (`review`, `verify`) when the
domain is `gui`. Objective banned-patterns and AI tells — the part that fixes "every AI frontend looks
the same." Harvested from Impeccable (`pbakaus/impeccable`, Apache-2.0) and Taste Skill
(`Leonxlnx/taste-skill`, MIT). Unlike the lenses, almost none
of this is a judgement call: it's match-and-refuse.

**The slop test.** If someone could look at the interface and say "AI made that" without doubt, it
failed. Report a hit as a fact ("this is the hero-metric template — big number, small label, gradient")
plus the rewrite, not as "feels generic".

## Absolute bans (match-and-refuse — rewrite with different structure)

- **Side-stripe borders.** `border-left`/`border-right` > 1px as a coloured accent on cards, list items,
  callouts, alerts. Never intentional. Rewrite: full hairline border, background tint, leading
  number/icon, or nothing.
- **Gradient text.** `background-clip: text` + gradient background. Decorative, never meaningful. Solid
  colour; emphasis via weight/size.
- **Glassmorphism as default.** Decorative blur / glass cards. Rare and purposeful, or nothing.
- **The hero-metric template.** Big number + small label + supporting stats + gradient accent. SaaS
  cliché. (A prominent metric is fine when it shows *real* data, not decorative numbers.)
- **Identical card grids.** Same-sized icon + heading + text cards repeated endlessly. Vary sizes, span
  columns, mix in non-card content — or drop the cards.
- **Eyebrow on every section.** Tiny uppercase tracked kicker ("ABOUT" / "PROCESS" / "PRICING") above
  each heading. One named kicker as a brand system is voice; one on every section is AI grammar.
- **Numbered section markers as scaffolding.** `01 · About / 02 · Process` above every section. Numbers
  earn their place only when the section genuinely *is* an ordered sequence carrying information.
- **Text that overflows its container.** Long heading words + large `clamp()` + narrow grid → overflow on
  tablet/mobile. Test heading copy at every breakpoint; reduce clamp max or rewrite. The viewport is part
  of the design.

## Costume & stand-in tells (Impeccable craft floor)

Reaching for one of these means the axis was never decided. Unlike the absolute bans, a brief's own
words can earn any of them back — but recognising one means **rewriting the element, not softening it**.

- **Unicode glyphs or emoji as an icon system.** `→ ✓ ⚡ 🚀` standing in for icons. Icons are drawn —
  a real library or authored SVG, one consistent stroke and weight throughout. Drawing them
  yourself has its own failure one step past this one, where the icon is authored properly and
  still reads as the wrong object — [icons.md](icons.md).
- **A system display face as the display voice.** Impact, Arial Black, or the platform sans carrying
  the headline of a page with its own visual world. Source and self-host a face whose character matches
  the lettering the direction committed to; the closest installed font is a failure, not a fallback.
- **Monospace as a costume for "technical".** Mono is for code, data, and measurement. A mono nav or
  mono body copy on a product page is a genre signal doing no work.
- **Geometric masks standing in for organic contours.** A circle, polygon, or radial-gradient cutout
  approximating a photographic subject's edge. It reads worse than omitting the effect. Derive an alpha
  matte from the actual image, or produce a real cut-out asset.
- **Hard offset shadows** (`box-shadow: 4px 4px 0`) outside a world that genuinely *is* neobrutalist.
  The zero-blur block shadow is a costume, not a depth system.
- **Sparklines, progress rings, and soft-shadowed rounded rectangles standing in for content.** Chart
  furniture where real data doesn't exist. (Cf. filled-track comparison bars below.)
- **A modal for a task that needs neither interruption nor protected focus.** Modal-as-first-thought is
  usually laziness; exhaust inline and progressive alternatives first.
- **Light or dark picked by category.** "Dev tool → dark", "wellness → light" is a training-data
  reflex. Pick it from the use scene: who is using this, where, under what ambient light.

## Structure & layout tells (Taste Skill)

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
  the third. Also: more than one marquee/ticker per page.
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
- **`<br>`-broken + italicized headlines** as a default "design move" — manual line breaks plus italics to
  fake editorial rhythm. Let type wrap; earn emphasis with weight.

## Copywriting / marketing-slop tells (Taste Skill)

The text *content* an AI reaches for. Match-and-rewrite the same way. Harvested from
`Leonxlnx/taste-skill` SKILL.md §4/§9.

- **Em-dash / en-dash as a visible separator.** `—` / `–` used as a decorative separator in UI copy,
  labels, or nav (Taste's "#1 stylistic tell"). Use real punctuation or a real divider element.
- **Middle-dot `·` overuse.** `foo · bar · baz` as the default separator everywhere. Ration to ~1 per
  line; prefer layout (spacing, columns) over inline dot-chains.
- **Version labels in the hero.** `V0.6`, `BETA`, `ALPHA`, `INVITE-ONLY PREVIEW` as an eyebrow/badge on a
  marketing hero. Fake maturity signalling.
- **"Quietly …" social proof.** "Quietly in use at", "Quietly trusted by" headers. Manufactured
  understatement.
- **Performative-craftsman labels.** "From the field", "Field notes", "Currently on the bench", "On our
  desks" — artisanal cosplay for a software product.
- **Locale / time / weather strips.** "Lisbon 14:23 · 18°C", "working with founders in three timezones" —
  decorative ambient data that says nothing.
- **Generic step labels.** "Stage 1 / 2 / 3", "Phase 01 / 02", "Pass One / Two / Three" on a process that
  isn't genuinely a numbered sequence. (Cf. numbered section markers in the absolute bans.)
- **Fake photo credits.** "Field study no. 12 · Ines Caetano", "Frame XII · 35mm" captioning stock or
  generated imagery to fake a photographer.
- **Version footers on marketing pages.** `v1.4.2`, `Build 0048`, "last sync 4s ago · main" in a footer
  of a *marketing* page (not an app). Fake liveness.
- **Scroll cues.** "Scroll", "↓ scroll", "Scroll to explore", a bouncing mouse-wheel icon. Users know how
  to scroll.
- **Duplicate CTA intent.** "Get in touch" + "Let's talk" + "Start a project" all on one page — three
  buttons, one action. One primary CTA, repeated verbatim if repeated at all.
- **Fake-precise invented specs.** `92%`, `4.1×`, `5.8 mm`, `13.4 lb` — oddly specific numbers faking
  engineering precision (distinct from the fake-round `99.99%`). If the number isn't real, don't print it.

## Colour & type tells (strong default-reflexes to refuse)

- **Cream / sand / beige body bg** — the warm-neutral band (OKLCH L 0.84–0.97, C < 0.06, hue 40–100).
  Token names `--paper` `--cream` `--sand` `--bone` `--linen` `--parchment` `--wheat` `--ivory` are tells
  in themselves. "Warm/editorial/coastal" brief does NOT mean a near-white warm bg. Pick a saturated
  brand body, a true off-white at chroma 0, or a brand-tinted mid-tone. Warmth rides accent + type +
  imagery, not the body.
- **Purple-blue gradients** (and blue hue ~250 / warm-orange hue ~60 by reflex) — the dominant AI
  defaults. The hue is a brand decision; don't reach for these.
- **Default-warm tinted neutrals** — always tinting toward warm-orange or cool-blue "because the brand
  feels that way" is the cross-project monoculture. Tint toward *this* brand's hue or stay chroma 0.
- **Muted gray body text on tinted near-white** — the single biggest "hard to read" cause; fails 4.5:1.
  Light gray "for elegance" is a tell. Bump toward ink.
- **The complete premium-consumer palette** (Taste Skill §4.2) — the cream/sand/beige bg tell above rarely
  travels alone; it pairs with brass/clay/oxblood/ochre accents (`#b08947` `#b6553a` `#9a2436`) and an
  espresso near-black text (`#1a1714`). The full set = "expensive artisanal brand" reflex. Refuse the
  combination, not just the background.
- **LLM-default display serifs** (Taste Skill §4.1) — `Fraunces` and `Instrument Serif` are the two
  reflex display serifs. Banned as *defaults*; pick a serif for a reason, not because it's the one that
  came to mind.
- **Custom mouse cursors and neon / outer glows** (Taste Skill §9.A) — a bespoke cursor or a `box-shadow`
  neon glow as decoration. Both read as amateur-flashy; the OS cursor and a defined shadow ≤8px.

## Model-specific defects (refuse-and-rewrite)

Carried per-model because each harness has its own giveaways:

- **Codex — ghost-card.** `border: 1px solid X` + `box-shadow` with blur ≥16px on the same element. Pick
  one (solid border OR a defined shadow ≤8px), never both as decoration.
- **Codex — over-rounding.** `border-radius: 24/28/32/40px+` on cards/sections/inputs. Cards top out at
  12–16px; full-pill only for tags/buttons.
- **Codex — sketchy SVG.** `loose-sketch`/`doodle`/`wavy` classes, `feTurbulence`/`feDisplacementMap`
  "paper grain", crude 5–30 path scenes. Reads amateurish. No real asset → ship no illustration.
- **Codex — stripe / decorative-grid backgrounds.** `repeating-linear-gradient(...)` stripes, or
  `linear-gradient(... 1px, transparent 1px)` two-axis grid overlays — unless the surface actually is a
  canvas/map/blueprint.
- **Gemini — image-on-hover.** Any `transform` on `:hover` of an `<img>`, incl. Tailwind
  `group-hover:scale/rotate/translate` on a child image. Animate the card's bg/border/shadow, never the
  image.

## Two-altitude category-reflex check

- **First-order:** if someone could guess the theme + palette from the category alone, it's the first
  training-data reflex. Rework the scene sentence + colour strategy until the answer isn't obvious from
  the domain.
- **Second-order:** if someone could guess the aesthetic from category-plus-anti-references ("AI tool
  that's not SaaS-cream → editorial-typographic"; "fintech that's not navy-gold → terminal-dark"), the
  first reflex was dodged but the second wasn't. Rework until neither answer is obvious.

## Writing into code (post-code / variant mode)

When a design pass *writes* variants or accepted changes into files, never write into a **generated**
file — the next build wipes it (silent data loss). Treat a file as generated if it's gitignored
(`git check-ignore`) or its first ~300 chars carry `@generated` / `DO NOT EDIT` / `AUTO-GENERATED` /
`GENERATED FILE`. Write into the source that produces it instead.
