# Typography

Part of [`design.md`](../design.md) — its one rule holds here: every verdict carries its concrete reason.

## Lens 5 — typography discipline

- **Tracking is size-specific.** Large display text wants negative tracking; small text wants slightly
  positive. A single `letter-spacing` for all sizes is wrong somewhere. Display floor: `≥ -0.04em`;
  tighter and letters touch. All-caps/eyebrows want `+0.05–0.12em`.
- **Leading tracks size inversely** — tight on headings (1.1–1.2), looser on body (1.5–1.7).
- **Hierarchy = weight + size + leading as a set**, not size alone. Few sizes, more contrast: a 5-step
  scale (caption/secondary/body/subhead/heading) on a committed ratio (1.25 / 1.333 / 1.5). Steps 14/15/16
  are muddy hierarchy.
- **Measure**: cap body at 45–75ch (`max-width: 65ch`). Body ≥16px, always `rem` not `px`.
- **Sizing strategy by register**: fixed `rem` scale for app/dense UI (spatial predictability); fluid
  `clamp()` for marketing/display headings only, bounded `max ≤ ~2.5×min`; hero ceiling ~6rem.
- **Pair on a contrast axis** (serif+sans, geometric+humanist) or one family in weights — never two
  near-identical sans. Don't reflex to Inter/Roboto/Open Sans when personality matters.
- **Scale layout *with* text** (relative units) so a larger user text-size doesn't break it. `text-wrap:
  balance` on h1–h3, `pretty` on long prose (also kills orphaned last words). Never `user-scalable=no`.
- **`font-variant-numeric: tabular-nums`** on any column of figures (tables, prices, metrics, timers) so
  digits align vertically and don't jitter as values change. (Taste Skill.)
- **Properties over raw tags** — `font-weight: 650`, not `font-variation-settings: "wght" 650`;
  `font-variant-numeric: tabular-nums`, not `font-feature-settings: "tnum" 1`. Properties keep working
  when a non-variable fallback renders; raw tags only for custom axes with no property. (jakubkrehel.)
- **Underlines from the font's own metrics** — `text-underline-position: from-font` and
  `text-decoration-thickness: from-font`, with `text-decoration-skip-ink: auto`. Colour is the only part
  of a real `text-decoration` that animates reliably; animating anything else means building the
  underline as a separate element. (jakubkrehel.)
- **Escape hatches for hostile content** — `overflow-wrap: break-word` where a long word, link or ID
  could escape its container; `white-space: nowrap` on labels and badges where a break looks broken.
- **Inputs at 16px on mobile** — iOS Safari zooms the page when a focused input's text is under `16px`.
  Two fixes hold 16px and look different, so it's a design question, not a default: size the input up on
  mobile (`text-base sm:text-sm`), or keep `font-size: 16px` and render the intended size with
  `transform: scale()` compensated. (jakubkrehel.)
- **Smart punctuation in rendered text** — curly quotes in prose, straight in code; en dash for ranges
  (`2010–2020`); the single ellipsis character, not three periods; `&nbsp;` to hold `16 px` together
  across a break; `&shy;` to say where a long word may break.
