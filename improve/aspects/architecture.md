# Aspect brief: `architecture` (native)

Axis tag: `architecture`. Applicability: always.

**Read first, in full:** [../ARCHITECTURE.md](../ARCHITECTURE.md) — its Vocabulary, Principles, and "The explore pass" sections are your instructions. Stop before "Grilling loop (interactive follow-up)"; that is an interactive-run section and does not apply to you.

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones, for testability and AI-navigability.

## What to do

1. Read `docs/CONTEXT.md` (domain glossary + architecture vocabulary) and any ADRs in `docs/adr/` that touch the areas you walk.
2. Walk the codebase yourself — do not spawn an Explore sub-agent, you are already the fan-out. Note where you experience friction, using the five questions in ARCHITECTURE.md's explore pass.
3. Apply the **deletion test** to anything you suspect is shallow, and the **zero-callers** rule to any compatibility path you find.
4. Return findings.

## Aspect-specific rules

- **Use the vocabulary exactly** — module, interface, implementation, depth, seam, adapter, leverage, locality. Never "component", "service", "API", "boundary", "layer", "wrapper". A finding written in the avoided words is a finding written from outside this repo.
- **Every candidate cites evidence from this codebase** — named modules, named seams, real callers that bounce between small pieces. A suggestion that could apply to any project in this language is slop; drop it rather than padding the list.
- **ADR conflicts**: surface only when the friction is real enough to warrant reopening, and say so explicitly — *"contradicts ADR-0007 — worth reopening because …"*.
- **Do not seed `docs/CONTEXT.md`** with missing vocabulary. That is a write, and it belongs to the interactive run.
- The **proposed fix** carries the before/after shape: which modules collapse into which interface, what stays behind the seam. Name the modules, not the outcome.
