# Aspect brief: `product` (delegated → `gui`)

Axis tag: `product`. Applicability: always.

**Read:** `../../gui/ORIENT.md` — the whole file, and its **Findings-only invocation** section is your contract. Do not read `gui/SKILL.md`; ORIENT.md is the mode you are running.

Audit the layers beneath the visual surface — observed behaviour, domain vocabulary, user needs and job stories, product strategy, conceptual model, interaction structure — and name the bottleneck layer.

## Aspect-specific rules

- **Answer the framing and per-layer questions from repo artifacts**, never by asking: `README.md`, `docs/PRD.md`, `docs/CONTEXT.md`, `docs/adr/`, git history.
- **Mark a layer `Assumed` or `Unknown` rather than guessing it.** An invented user need is the worst possible output of this aspect — it reads as authoritative and it is fiction. Unknown is a real answer and it scores.
- The **bottleneck analysis is the top finding**, not a summary appended to the others.
- Skip ORIENT.md's closing offer; the hand-off is Phase 07's, not yours.
