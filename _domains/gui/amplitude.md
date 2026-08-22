# Amplitude — turning a surface up or down

Read by `design` when the request is a **volume** change on a surface that already ships: *bolder*,
*quieter*, *distill*, *overdrive*. Harvested from Impeccable (`pbakaus/impeccable`, Apache-2.0).

Amplitude is not direction. The world is settled; the question is how loudly it speaks. If the world
itself is wrong, that's `direction.md`, not this cell.

**Scope is sovereign.** "Everything else stays" is literal. Touch only the named target. Do not add a
colour, font, radius, shadow, or system primitive the surface does not already own. If the existing
system genuinely cannot express the direction, stop and name the exact addition and the job it would
do — don't expand the system unasked.

## Bolder — raise one part to the conviction the rest implies

**Reject the reflex first: reaching for more effects is the opposite of bold.** A section reads flat
because it quietly opted out of the system's own strongest moves — the display type at full strength,
the structural devices that carry meaning, the signature motif, the density and pacing. Look at what
its neighbours do that it doesn't.

- **Amplify what the system already owns.** The bolder version looks *more* like the same brand, not
  less. Its motif and type scale at full strength, turned up for this section, not invented for it.
- **Commit, then clarify.** One decisive move made completely, then everything around it quieted so
  the move is legible. **If every element got louder, the section got flatter.**
- **Give it its own rhythm** — a peak in the scroll, a shift in density or pace, not simply more.

**The skeleton test.** Strip the copy out and study the bare structure. Does it still say what this
section is and why it matters, through hierarchy and the system's devices alone? If it only works once
the words return, the boldness is in the text size, not the design.

## Quieter — restraint is harder than volume

Subtlety needs precision. **Quiet without intent collapses to generic** — the failure mode is
"luxury" becoming "unfinished". Register decides what quieter means (see the register modes in
`design.md`): on Persuade/Experience it's a more restrained palette and more typographic air, drama
reduced but the POV intact; on Operate/Read it's less visual noise so the tool disappears into the task.

- **Colour** — desaturate rather than delete (quiet ≠ grayscale). Let neutrals carry more, accent stays
  at ~10%. High contrast only where it matters most. **Never gray text on a coloured background** — use
  a darker shade of that hue or transparency.
- **Weight** — 900→600, 700→500. Hierarchy moves to weight, size and space instead of colour and bold.
- **Motion** — shorter travel (10–20px, not 40px), gentler easing. `ease-out-quart` for understated;
  never bounce or elastic. Delete flourishes, keep functional motion.
- **Composition** — smaller scale jumps read calmer; bring rogue elements back onto the grid.

Do not flatten everything to one size and weight, and do not remove every anchor — some element still
has to be loudest.

## Distill — remove obstacles, not features

**Simplicity is removing obstacles between users and their goals**, not shipping less product. Every
element justifies its existence or goes.

- **One primary action** per surface, few secondary, everything else tertiary or hidden.
- **Progressive disclosure** over deletion when the thing is genuinely needed sometimes.
- **Say it once.** If the heading already explains the state, the intro adds new information or
  disappears. No headers restating intros.
- **Combine before removing** — merge similar buttons, group related content, drop a step from a flow.
- **Match complexity to the task.** Oversimplifying a genuinely complex domain is the mirror failure;
  mystery is not minimalism.

Palette down to 1–2 colours plus neutrals; one family, 3–4 sizes, 2–3 weights; cards removed where
spacing and alignment already do the job.

## Overdrive — technical ambition, not decoration

Push past what users expect a browser to do. **Context decides what extraordinary means**: a particle
system on a portfolio is impressive and on a settings page is embarrassing — but a settings page with
instant optimistic saves and animated state transitions is extraordinary too.

**Propose before building.** This is the highest-misfire request in the set. Put 2–3 directions in
front of the user with each one's trade-offs (browser support, performance cost, complexity) inside
the option, and build only the one they pick.

Where the "wow" lives, by surface kind:

| Surface | The wow |
| --- | --- |
| Marketing / portfolio | Sensory — scroll-driven reveal, shader background, cinematic transition |
| Functional UI | Feel — a dialog morphing from its trigger, 100k rows at 60fps, streaming validation |
| Performance-critical | Invisible — 50k items filtered without a flicker; the interface never hesitates |
| Data-heavy | Fluidity — GPU rendering, animated transitions between data states |

Techniques, by intent: **View Transitions API** (same-document everywhere; cross-document not Firefox)
for shared-element morphing; **`@starting-style`** for CSS-only entry from `display: none`; **spring
physics** over cubic-bezier; **`animation-timeline: scroll()`** (Firefox flag only — always ship a
static fallback); **WebGL/WebGPU/Canvas/OffscreenCanvas** for what CSS can't express; **virtual
scrolling** for tens of thousands of rows; **`@property`** to animate gradients and other
non-interpolable values; **Web Workers/WASM** to keep the main thread free.

Discipline: progressive enhancement is non-negotiable (`@supports`, feature detection, a CSS-only
fallback that still looks good). Target 60fps, drop below 50 and simplify. Lazy-init heavy resources
near viewport; pause off-screen rendering. Test on a real mid-range device.

**Two tests.** *Removal:* take it away — is the experience diminished, or does nobody notice?
*Context:* does this make sense for this brand and audience? And never layer competing extraordinary
moments — focus creates impact, excess creates noise. Technical ambition never masks weak fundamentals;
fix those first.

## Where amplitude ends

All four hand back to an ordinary critique pass (`design.md` lenses + `slop.md`) before shipping. A
volume change that introduced a slop tell is not done.
