# Aspect: `architecture` (native)

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

## Vocabulary

Use these terms exactly in every suggestion. Consistent language is the point — don't drift into "component", "service", "API", or "boundary."

These terms live in `docs/CONTEXT.md` under an "Architecture" subsection alongside the project's domain terms (see [../docs/CONTEXT-FORMAT.md](../docs/CONTEXT-FORMAT.md)). If `docs/CONTEXT.md` doesn't have them yet, seed them on first run.

- **Module** — anything with an interface and an implementation (function, class, package, slice). Scale-agnostic.
  _Avoid_: unit, component, service, layer, wrapper.
- **Interface** — everything a caller must know to use the module correctly: type signature, invariants, ordering, error modes, required config, perf characteristics.
  _Avoid_: API, signature (those refer only to the type-level surface).
- **Implementation** — what's inside a module.
- **Depth** — leverage at the interface. A module is **deep** when a large amount of behaviour sits behind a small interface. **Shallow** when the interface is nearly as complex as the implementation.
- **Seam** _(Michael Feathers)_ — a place where you can alter behaviour without editing in that place. The *location* at which a module's interface lives.
  _Avoid_: boundary (overloaded with DDD's bounded context).
- **Adapter** — a concrete thing satisfying an interface at a seam. Describes *role* (what slot it fills), not substance.
- **Leverage** — what callers get from depth. More capability per unit of interface they have to learn.
- **Locality** — what maintainers get from depth. Change, bugs, knowledge concentrate at one place instead of spreading across callers.

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module can be internally composed of small swappable parts — they just aren't part of the interface.
- **Deletion test.** Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test *past* the interface, the module is probably the wrong shape.
- **One adapter = hypothetical seam. Two adapters = real seam.** Don't introduce a seam unless something actually varies across it.
- **Zero callers means delete, not improve.** Before preserving any compatibility path — a mode flag, a prop, a wrapper, a route alias, a fallback branch — grep for real callers. None means it goes; a compat path with no caller is not a constraint, it's residue. Making it tidier is work spent on code that should not exist. This is the checkable form of the design-from-the-end-state move below.

## Designing from the intended end state

When reworking an existing change, the reference point is the shape the code *should* have if it had been built that way from day one — not the smallest diff from the shape history happens to have produced. Adapted from jnsahaj/skills `zero-tech-debt`.

1. **State the intended end state** in one or two sentences before touching anything.
2. **Grep for real callers** of every compat path, per the rule above. Delete what has none.
3. **Reshape around the final surface.** One clear flow beats a flow plus mode flags. Split only where a real boundary appears — separate state, separate layout, separate controls, separate domain commands.
4. **Move shared rules to one owner.** Feature flags, permissions, route gating, URL state, command naming — these duplicate across pages and hide inside view components. One place each.
5. **Verify the intended flow**, including the assumptions the deletions invalidated — navigation, permissions, persisted state.

Bounds: don't invent a generic framework for one feature, keep the rework scoped to what makes the final shape coherent, and prefer names describing product intent over implementation history.

## Designing for testability

Good interfaces make testing natural — use this as a lens while exploring to recognise testable vs untestable shape, not as advice to emit unanchored (the grounding rule below binds every candidate):

1. **Accept dependencies, don't create them.**

   ```typescript
   // Testable
   function processOrder(order, paymentGateway) {}

   // Hard to test
   function processOrder(order) {
     const gateway = new StripeGateway();
   }
   ```

2. **Return results, don't produce side effects.**

   ```typescript
   // Testable
   function calculateDiscount(cart): Discount {}

   // Hard to test
   function applyDiscount(cart): void {
     cart.total -= discount;
   }
   ```

3. **Small surface area.** Fewer methods = fewer tests needed. Fewer params = simpler test setup.

## Rejected framings

- **Depth as ratio of implementation-lines to interface-lines** (Ousterhout): rewards padding the implementation. Depth-as-leverage is used instead.
- **"Interface" as the TypeScript `interface` keyword or a class's public methods**: too narrow — interface here includes every fact a caller must know.

## The explore pass

Read `docs/CONTEXT.md` (domain glossary + architecture vocabulary) and any ADRs in the area you're touching (`docs/adr/`).

Then use the Agent tool with `subagent_type=Explore` to walk the codebase (in a survey subagent, do the walk yourself). Don't follow rigid heuristics — explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow.

**Grounding rule — every candidate must cite evidence from this codebase.** A deepening you propose has to point at real modules, real friction you hit while exploring, real callers that bounce between small pieces — named files, named seams. A suggestion that could apply to *any* project in this language ("add a service layer", "introduce dependency injection", "split into smaller modules") with nothing anchoring it to code you actually read is slop — drop it, don't pad the card list with it. If you can't name the modules and the friction, you don't have a candidate yet.

**ADR conflicts**: if a candidate contradicts an existing ADR, only surface when the friction is real enough to warrant revisiting. Mark clearly: *"contradicts ADR-0007 — but worth reopening because…"*. Don't list every theoretical refactor an ADR forbids.

## Card fields (for the report)

Each candidate is one card (see [HTML-REPORT.md](HTML-REPORT.md)):

- **Title** — names the deepening (e.g. "Collapse the Order intake pipeline").
- **Recommendation strength** — a badge: `Strong` (happy/green), `Worth exploring` (caution/amber), `Speculative` (muted).
- **Files** — monospaced list of the modules involved.
- **Before / After diagram** — the centrepiece. Hand-authored inline SVG showing the shallowness and the deepening, side by side.
- **Problem** — one sentence: what hurts.
- **Solution** — one sentence: what changes.
- **Wins** — bullets in glossary terms (locality / leverage), ≤6 words each.
- **ADR callout** (if applicable) — one line in a `.callout--warn` box.

**Use `docs/CONTEXT.md` vocabulary for the domain** (e.g. "the Order intake module", not "the FooBarHandler" or "the Order service") **and the architecture terms above** consistently.

## Grilling loop (interactive follow-up)

Once the user picks a candidate, drop into a grilling conversation. Walk the design tree — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Side effects happen inline as decisions crystallize:

- **Naming a deepened module after a concept not in `docs/CONTEXT.md`?** Add the term as a slate row per the `docs` skill's vocabulary rule. Format per [../docs/CONTEXT-FORMAT.md](../docs/CONTEXT-FORMAT.md).
- **Sharpening a fuzzy term?** Same rule — a row, written on `go`.
- **User rejects the candidate with a load-bearing reason?** Apply the `docs` skill's any-session ADR rule: *"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"* Only offer when the reason would actually be needed by a future explorer — skip ephemeral reasons ("not worth it right now") and self-evident ones. See [../docs/ADR-FORMAT.md](../docs/ADR-FORMAT.md).
- **Want to explore alternative interfaces for the deepened module?** See [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md).
