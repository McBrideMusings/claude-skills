# Colour

Part of [`design.md`](../design.md) — its one rule holds here: every verdict carries its concrete reason.

## Lens 8 — colour strategy

- **Pick a strategy before colours**, on a commitment axis: **Restrained** (tinted neutrals + one accent
  ≤10%; product default) → **Committed** (one saturated colour 30–60% of surface) → **Full palette** (3–4
  named roles) → **Drenched** (surface *is* the colour). Register drives the pick.
- **OKLCH, not HSL** (perceptually uniform). Reduce chroma as lightness approaches black/white.
- **Tinted neutrals**: pure gray is dead — add 0.005–0.015 chroma toward *this brand's* hue. Don't
  default-tint warm/cool; that's the cross-project monoculture.
- **60-30-10 by visual weight** (not pixel count): 60 neutral/surface, 30 secondary, 10 accent. Accent
  works *because* it's rare.
- **Semantic-first in product**: accent = primary action / selection / state, never decoration; a colour
  means the same thing on every screen. WCAG: body ≥4.5:1, large/UI ≥3:1; never colour as the only signal.
- **The accent holds across the page.** Whatever the strategy, the accent is one colour in every
  section. A pricing band that turns its buttons teal on an orange page has two accents, and
  neither one means "act here" any more.
- **Dark mode ≠ inverted light**: depth from surface lightness (lighter = higher), not shadow; desaturate
  accents; drop body weight a notch. Redefine only the semantic token layer.
- **Alpha is a design smell** — heavy rgba/hsla usually means an incomplete palette; define explicit
  overlay colours. (Anti-slop colour tells — cream/sand bg, purple-blue gradients — live in `../slop.md`.)
- **A well-formed ramp has four properties** (jakubkrehel): steps step evenly in *perceived* lightness,
  not the format's lightness channel; hue stays constant end to end; vividness peaks mid-ramp and falls
  off at both ends; steps sit denser at the light end. Both ends stop short of pure black and white,
  which cannot carry hue. Build with a colour library, never by eye.
- **One colour, one meaning — and anything within 15° of hue is the same colour.** If the accent means
  interactive, that hue on static text tells users to click something that isn't clickable. (jakubkrehel.)
- **A gradient's interpolation space is a look, not a correctness setting** — `in oklab` is the best
  default (even brightness, no hue surprises); `in oklch` when a two-hue gradient goes gray in the
  middle; the sRGB default darkens and mutes the midpoint and is what you get without asking.
- **Never report a contrast value you did not measure.** Measure the foreground against the background
  it actually renders on, not the page background. Colour is one of the few interface concerns with an
  exact answer — produce the exact answer. (jakubkrehel.)
