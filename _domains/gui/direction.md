# Direction — choosing the visual world, and why the model can't

Read by `design` when the question is **which world this surface lives in**, not how loud it is
(`amplitude.md`) or whether it's well made (`design.md` + `slop.md`). Runs on a new surface, a
replacement look, or any greenfield build. Harvested from Impeccable (`pbakaus/impeccable`, Apache-2.0).

## The finding this cell exists for

**A model's resonance ranking is deterministic. Measured: 30 of 35 runs produced identical concepts
across 16 different prompt framings.**

Left alone, the model derives a shortlist of directions and then always builds its own #1 — so every
project in a category ships the same one or two designs, no matter how the prompt is worded. Prompting
harder does not fix it; *"be more original"* moves the argmax, it doesn't remove it.

The fix is structural: **roll the dice outside the model.**

## The mechanism

1. **Ground first.** Retrieve real cultural material for this product and derive a shortlist of 5–7
   *complete* candidate directions from it — each with a thesis, palette, materials, first viewport,
   and an honest risk. Order them however they land; the ordering is about to be ignored.
2. **Assign from outside.** Get an index from a source that is not the model:
   `python3 -c "import secrets;print(secrets.randbelow(N))"` or `shuf -i 0-$((N-1)) -n 1`. That entry
   is the direction to build. **The assignment never invents an ungrounded ingredient — it only
   refuses the argmax rut.**
3. **Present one hand, not a menu.** Show the assigned direction with a re-roll, never a ranked lineup.
   A lineup hands selection back to a taste function, and taste functions — the model's or the user's —
   pick the safest card. That is the rut arriving through the back door.
4. **Deal challengers.** Bring in outside forms from three tiers — **graphic system** (a poster
   tradition, a signage system, an editorial grid), **instrument language** (a physical control
   surface, an instrument panel, a tool), **atmosphere world** (a place, a film's colour, a material
   condition). Two from each.
5. **Fuse before judging.** The challenger supplies the form and its system grammar; the product
   supplies every fact; clarity wins conflicts. Judging an unfused challenger is judging a mood board.
6. **Verdict on exactly two axes** — audience identification and product clarity:
   - **Wins** — beats the assigned direction on both. It becomes the build candidate.
   - **Competitive** — holds one. Stays a full alternate.
   - **Declined** — loses both.
7. **A declined challenger is not spent.** Name the one discipline of its system the assigned direction
   lacks — a palette's total commitment, a grid's density courage, a form's structural honesty — and
   raise the assigned direction to match. **A donation transfers ambition and system discipline, never
   the challenger's clothes.** A lifted motif is a costume note, not a raise. Write each raise into the
   presented direction as its own line, named for its donor; a raise nobody can read did not happen.

Losing to strong grounded material is a valid outcome. Beating a thin list is the point.

## The standing exit

Every direction round offers one quiet, permanent alternative: **the category standard, played
straight.** It is the user's door, never yours — never recommend it, never weigh it against the roll,
never let it soften the dealt directions.

When the user takes it, convention becomes the commitment: ask once which two or three products this
should sit alongside, make their craft level the bar, and execute the canon at full fidelity, without
irony or smuggled quirk. Record a standing preference as a brand commitment in the project's
`CLAUDE.local.md`.

## Re-roll

Re-roll eliminates every direction already shown, grounded and challenger alike. After two consecutive
re-rolls, ask what quality is missing rather than dealing a third time.

The user may re-roll freely. A user-pinned or brief-pinned direction beats the roll, always. **Re-roll
on your own initiative only on named factual grounds** — the assigned direction cannot carry the
product's truth or its task. Taste is never grounds.

## The brief wins

Honour pinned aesthetics, eras, materials, fonts and palettes even when they conflict with a
saturated-pattern warning in `slop.md`. **Redirecting a clear brief toward your own taste is failure.**

**Refinement preserves; redesign replaces.** Refinement keeps the incumbent identity, behaviour, copy
and everything outside the named scope. Redesign keeps product truth, content, function and
constraints, but treats the old look as evidence and *anti-reference*. Never split the difference into
polish on a look that's being discarded.

A missing design doc does not make a project greenfield. The incumbent code is the visual authority
until someone decides to replace it.

## Comps — when the direction should be seen before it's built

Rendering the direction as an image before writing code produces bolder, less expected layouts than
going straight to HTML. Going straight to code is cheaper and translates less, but converges harder.
Offer both; don't decide it silently.

When comping:

- **Three comps, not one.** One invites rubber-stamping; the spread between three is what surfaces the
  composition worth building.
- **Comp at the surface's own viewport** — portrait at device size for a phone surface, desktop
  landscape otherwise. A phone screen comped landscape misstates the composition before anything is
  built against it.
- **On an established world, anchor on the real identity.** Screenshot a representative existing page
  and pass it as a reference image. The prompt leads with the *new* surface's structure; the reference
  carries palette, type and component character. Prose paraphrases of a design system drift; pixel
  references don't. Name what the reference contributes (chrome, palette, type, component character)
  and what it must not (its own content — a hero or card lifted verbatim is the reference leaking).
- **Comps are the build thread's own work.** The thread that writes the prompts holds the direction's
  full context. If a subagent generates assets instead, every asset carries its prompt and the builder
  reads them before composing.
- **A comp is a direction, not a spec.** Say which parts must not be literalised before building.

## Image generation goes through `generate`

`design` has exactly one path to an image: the **`generate`** skill, which health-gates backends in
`generate/backends.toml` and reads the image asset-type axis at `_generate/image.md`. Today that
resolves to local ComfyUI.

**`design` must never learn a second path.** Adding a cloud image backend later is a `backends.toml`
change and nothing else — no branch in this cell, no API key read here, no direct HTTP call. If
`generate` reports no working image backend, comps are unavailable: say so and build code-led. Don't
improvise a fallback.
