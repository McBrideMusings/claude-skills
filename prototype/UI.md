# UI Prototype

Generate **several radically different UI variations** on a single route, switchable from a floating bottom bar. The user flips between variants, picks one (or steals bits from each), then throws the rest away.

If the question is logic/state rather than what something looks like — wrong branch. Use [LOGIC.md](LOGIC.md).

## When this is the right shape

- "What should this page look like?"
- "I want to see a few options for this dashboard before committing."
- "Try a different layout for the settings screen."
- Any time the user would otherwise spend a day picking between vague mockups in their head.

## Two sub-shapes — strongly prefer sub-shape A

UI prototypes are much easier to judge when butting up against the rest of the app — real header, real sidebar, real data, real density. A throwaway route on its own is a vacuum; every variant looks fine in isolation.

### Sub-shape A — adjust an existing page (preferred)

The route already exists. Variants render **on the same route**, gated by a `?variant=` URL search param. Existing data fetching, params, and auth stay; only rendering swaps. **Default to this.**

If the prototype is for something that doesn't have a page yet but *would naturally live inside one* (a new dashboard section, a new card on settings, a new step in an existing flow) — that's still sub-shape A. Mount the variants inside the host page.

### Sub-shape B — a new page (last resort)

Use only when the thing being prototyped has no existing page to live inside. Create a throwaway route following the project's existing routing convention. Name it so it's obviously a prototype (include `prototype` in the path or filename). Same `?variant=` pattern.

Sanity-check first: is there really no existing page this could be embedded in? An empty route hides design problems a populated one would expose.

## Process

### Phase 01 — State the Question and Pick N

Default to **3 variants.** More than 5 stops being radically different and starts being noise — cap there.

Write the plan in one line, top of the prototype:

> "Three variants of the settings page, switchable via `?variant=`, on the existing `/settings` route."

### Phase 02 — Generate Radically Different Variants

Each variant must be **structurally different** — different layout, different information hierarchy, different primary affordance. Not just different colours. Three slightly-tweaked card grids isn't a prototype, it's wallpaper.

Hold each one to:

- The page's purpose and the data it has access to.
- The project's component library / styling system.
- A clear exported component name — `VariantA`, `VariantB`, `VariantC`.

If two drafts come out too similar, redo one with explicit "do not use a card grid" guidance.

### Phase 03 — Wire Them Together

Single switcher component on the route:

```tsx
// pseudo-code — adapt to the project's framework
const variant = searchParams.get('variant') ?? 'A';
return (
  <>
    {variant === 'A' && <VariantA {...data} />}
    {variant === 'B' && <VariantB {...data} />}
    {variant === 'C' && <VariantC {...data} />}
    <PrototypeSwitcher variants={['A','B','C']} current={variant} />
  </>
);
```

Sub-shape A: existing data fetching stays above the switcher; only the rendered subtree changes per variant.

### Phase 04 — Build the Floating Switcher

Small fixed-position bar at bottom-centre with three pieces:

- **Left arrow** — previous variant (wraps).
- **Variant label** — current key plus the variant's name if exported, e.g. `B — Sidebar layout`.
- **Right arrow** — next variant (wraps).

Behaviour:

- Clicking an arrow updates the URL search param (use the framework's router) so the variant is shareable and reload-stable.
- Keyboard: `←` and `→` cycle. Don't intercept arrow keys when an `<input>`, `<textarea>`, or `[contenteditable]` is focused.
- Visually distinct (high-contrast pill, subtle shadow) so it's obviously not part of the design being evaluated.
- **Hidden in production** — gate on `process.env.NODE_ENV !== 'production'` or equivalent so a stray prototype merge can't ship the bar to users.

If the project's UI framework or platform makes a floating bottom bar awkward (native menu bar app, terminal UI, plain HTML form), pick the project-appropriate equivalent — keyboard shortcut, query param + reload, native segmented control — and note it inline.

### Phase 05 — Hand It Over

Surface the URL and the `?variant=` keys. The user will flip through. The interesting feedback is usually **"I want the header from B with the sidebar from C"** — that's the actual design they want.

### Phase 06 — Capture the Answer and Clean Up

Once a variant wins, write down which one and why (commit message, ADR in `docs/adr/`, issue, or `NOTES.md` if running AFK). Then:

- **Sub-shape A** — delete losing variants and the switcher; fold the winner into the existing page.
- **Sub-shape B** — promote the winning variant to a real route; delete the throwaway and the switcher.

Don't leave variants or the switcher rotting. They rot fast and confuse the next reader.

## Anti-patterns

- **Variants that differ only in colour or copy.** That's a tweak, not a prototype.
- **Sharing too much code between variants.** Shared `<Header>` fine; shared `<Layout>` defeats the point. Each variant should be free to throw out the layout.
- **Wiring variants to real mutations.** Read-only prototypes are fine. If a variant needs to mutate, point it at a stub.
- **Promoting the prototype directly to production.** Variant code was written under prototype constraints (no tests, minimal error handling). Rewrite it properly when folding in.
