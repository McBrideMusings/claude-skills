---
name: improve-codebase-architecture
description: "Surface architectural friction and propose deepening opportunities — refactors that turn shallow modules into deep ones. Aim: testability and AI-navigability. Triggers: 'improve architecture', 'audit the architecture', 'find refactor opportunities', 'what's shallow here', 'do an arch review', 'where can we deepen', 'look for deep module opportunities'."
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

## Vocabulary

Use these terms exactly in every suggestion. Consistent language is the point — don't drift into "component", "service", "API", or "boundary."

These terms live in `docs/CONTEXT.md` under an "Architecture" subsection alongside the project's domain terms (see [../grill-me/CONTEXT-FORMAT.md](../grill-me/CONTEXT-FORMAT.md)). If `docs/CONTEXT.md` doesn't have them yet, seed them on first run.

- **Module** — anything with an interface and an implementation (function, class, package, slice). Scale-agnostic.
  _Avoid_: unit, component, service.
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

## Relationships

A **Module** has exactly one **Interface** — the surface it presents to callers and tests. **Depth** is a property of a Module, measured against its Interface. A **Seam** is where a Module's Interface lives. An **Adapter** sits at a Seam and satisfies the Interface. Depth produces **Leverage** for callers and **Locality** for maintainers.

## Designing for testability

Good interfaces make testing natural:

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
- **"Boundary"**: overloaded with DDD's bounded context. Say **seam** or **interface**.

## Phases

### Phase 01 — Explore

Read `docs/CONTEXT.md` (domain glossary + architecture vocabulary) and any ADRs in the area you're touching (`docs/adr/`).

Then use the Agent tool with `subagent_type=Explore` to walk the codebase. Don't follow rigid heuristics — explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow.

**Grounding rule — every candidate must cite evidence from this codebase.** A deepening you propose has to point at real modules, real friction you hit while exploring, real callers that bounce between small pieces — named files, named seams. A suggestion that could apply to *any* project in this language ("add a service layer", "introduce dependency injection", "split into smaller modules") with nothing anchoring it to code you actually read is slop — drop it, don't pad the card list with it. If you can't name the modules and the friction, you don't have a candidate yet.

### Phase 02 — Present Candidates as a Hermetic HTML Report

Render the candidates as a single self-contained HTML file — **the diagrams carry the weight, the prose is sparse.** Same hermetic rules as the `explain` skill: zero network, no CDN, inline CSS + hand-authored inline SVG, system fonts, light/dark via `prefers-color-scheme`. **Reuse `explain`'s design system** ([../explain/DESIGN-SYSTEM.md](../explain/DESIGN-SYSTEM.md)) — semantic-color tokens and the `.diagram` / `.compare` / `.callout` / `.legend` component vocabulary — so the report is a member of the same visual family. Do **not** reach for Tailwind, Mermaid, or any CDN; a stray report must render offline, forever.

Write to `<root>/tmp/claude/architecture-review-<slug>.html`. **Resolve `<root>` to an ABSOLUTE path — never write to a cwd-relative `tmp/…`.** The Bash working directory is NOT guaranteed to be the repo root (an earlier `cd` may have left it in a subdirectory), so a bare `tmp/claude/…` would land the file under whatever subdir the shell is in and the `open <path>` you print won't match. Run `git rev-parse --show-toplevel` in its own Bash call and capture the absolute result as `<root>`; if it errors/empty (not a git repo), use the absolute output of `pwd`. Every `mkdir`/`Write`/`open`/path MUST be the absolute `<root>/tmp/claude/…`; if it doesn't start with `/`, it's the bug. Ensure `tmp/` is in `<root>/.gitignore` (Read it; Edit to add `tmp/` if absent). Run `mkdir -p <root>/tmp/claude` as a separate Bash call. Open it (`open <path>` on macOS) and emit the path on its own line with **no trailing punctuation** (so Ghostty ⌘-click stays clean).

See [HTML-REPORT.md](HTML-REPORT.md) for the scaffold, the before/after diagram patterns, and the card layout. Each candidate is one card:

- **Title** — names the deepening (e.g. "Collapse the Order intake pipeline").
- **Recommendation strength** — a badge: `Strong` (happy/green), `Worth exploring` (caution/amber), `Speculative` (muted).
- **Files** — monospaced list of the modules involved.
- **Before / After diagram** — the centrepiece. Hand-authored inline SVG showing the shallowness and the deepening, side by side.
- **Problem** — one sentence: what hurts.
- **Solution** — one sentence: what changes.
- **Wins** — bullets in glossary terms (locality / leverage), ≤6 words each.
- **ADR callout** (if applicable) — one line in a `.callout--warn` box.

**Use `docs/CONTEXT.md` vocabulary for the domain** (e.g. "the Order intake module", not "the FooBarHandler" or "the Order service") **and the architecture terms above** consistently.

**ADR conflicts**: if a candidate contradicts an existing ADR, only surface when the friction is real enough to warrant revisiting. Mark clearly: *"contradicts ADR-0007 — but worth reopening because…"*. Don't list every theoretical refactor an ADR forbids.

End the report with a **Top recommendation** section — which candidate to tackle first and why, anchor-linked to its card.

`tmp/claude/` is age-pruned with the rest of the account-wide tmp policy; don't keep the report unless the user asks.

After writing the file, present a brief inline summary (candidate number, title, recommendation strength, one-sentence problem) so the user doesn't have to open the file to react. Then ask: "Which of these would you like to explore?"

### Phase 03 — Grilling Loop

Once the user picks a candidate, drop into a grilling conversation. Walk the design tree — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Side effects happen inline as decisions crystallize:

- **Naming a deepened module after a concept not in `docs/CONTEXT.md`?** Add the term right there. Format per [../grill-me/CONTEXT-FORMAT.md](../grill-me/CONTEXT-FORMAT.md).
- **Sharpening a fuzzy term?** Update `docs/CONTEXT.md` right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR: *"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"* Only offer when the reason would actually be needed by a future explorer — skip ephemeral reasons ("not worth it right now") and self-evident ones. See [../grill-me/ADR-FORMAT.md](../grill-me/ADR-FORMAT.md).
- **Want to explore alternative interfaces for the deepened module?** See [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md).
