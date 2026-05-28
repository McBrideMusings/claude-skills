---
name: improve-codebase-architecture
description: "Surface architectural friction and propose deepening opportunities — refactors that turn shallow modules into deep ones. Aim: testability and AI-navigability. Triggers: 'improve architecture', 'audit the architecture', 'find refactor opportunities', 'what's shallow here', 'do an arch review', 'where can we deepen', 'look for deep module opportunities'."
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

## Vocabulary

Use these terms exactly in every suggestion. Consistent language is the point — don't drift into "component", "service", "API", or "boundary."

These terms live in `docs/CONTEXT.md` under an "Architecture" subsection alongside the project's domain terms (see [../brainstorm/CONTEXT-FORMAT.md](../brainstorm/CONTEXT-FORMAT.md)). If `docs/CONTEXT.md` doesn't have them yet, seed them on first run.

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

### Phase 02 — Present Candidates

Write the full list of deepening opportunities to `<root>/tmp/claude/improve-codebase-architecture.md`. Resolve `<root>` via `git rev-parse --show-toplevel 2>/dev/null`; if empty (not in a git repo), fall back to `pwd`. Ensure `tmp/` is in `<root>/.gitignore` (Read it; Edit to add `tmp/` if absent). Run `mkdir -p <root>/tmp/claude` as a separate Bash call. Tell the user the exact path — on its own line with **no trailing punctuation** (so Ghostty ⌘-click stays clean).

For each candidate in the file:

- **Files** — which files/modules are involved
- **Problem** — why the current architecture is causing friction
- **Solution** — plain English description of what would change
- **Benefits** — in terms of locality, leverage, and how tests would improve

**Use `docs/CONTEXT.md` vocabulary for the domain** (e.g. "the Order intake module", not "the FooBarHandler" or "the Order service") **and the architecture terms above** consistently.

**ADR conflicts**: if a candidate contradicts an existing ADR, only surface when the friction is real enough to warrant revisiting. Mark clearly: *"contradicts ADR-0007 — but worth reopening because…"*. Don't list every theoretical refactor an ADR forbids.

After writing the file, present a brief inline summary (candidate number, title, one-sentence problem) so the user doesn't have to open the file to react. Then ask: "Which of these would you like to explore?"

### Phase 03 — Grilling Loop

Once the user picks a candidate, drop into a grilling conversation. Walk the design tree — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Side effects happen inline as decisions crystallize:

- **Naming a deepened module after a concept not in `docs/CONTEXT.md`?** Add the term right there. Format per [../brainstorm/CONTEXT-FORMAT.md](../brainstorm/CONTEXT-FORMAT.md).
- **Sharpening a fuzzy term?** Update `docs/CONTEXT.md` right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR: *"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"* Only offer when the reason would actually be needed by a future explorer — skip ephemeral reasons ("not worth it right now") and self-evident ones. See [../brainstorm/ADR-FORMAT.md](../brainstorm/ADR-FORMAT.md).
- **Want to explore alternative interfaces for the deepened module?** See [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md).
