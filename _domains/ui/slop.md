# UI slop catalog

Read by **planning** (`design` critique/audit mode) and the **engines** (`review`, `verify`) when the
domain is `ui`. Objective banned-patterns and AI tells — the part that fixes "every AI frontend looks
the same." Harvested from Impeccable (`pbakaus/impeccable`, Apache-2.0). Unlike the lenses, almost none
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
