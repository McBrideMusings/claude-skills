# Aspect brief: `product`

Axis tag: `product`. Applicability: always.

**Passes.** Rate each of eight layers Strong, Partial, Assumed, Weak, Not started or N/A: observed behaviour, the domain, user needs, product and service strategy, conceptual model, implemented model, interaction structure, surface. Produce an audit table (layer, state, notes), then a bottleneck analysis naming the lowest layer that is Weak, Assumed or Not started and the risk it creates above it, flagging Assumed layers separately. Recommend the one layer to work next. When the bottleneck is Surface, the next step is a layout sketch or a gui critique, not a deeper layer.

*Knowledge base: search it for "gui orient design layers". If you have none, skip this line and don't mention it.*

This aspect runs that audit findings-only: no file writes, no commits, no questions.

Audit the layers beneath the visual surface — observed behaviour, domain vocabulary, user needs and job stories, product strategy, conceptual model, interaction structure — and name the bottleneck layer.

## Aspect-specific rules

- **Answer the framing and per-layer questions from repo artifacts**, never by asking: `README.md`, `docs/PRD.md`, `docs/CONTEXT.md`, `docs/adr/`, git history.
- **Mark a layer `Assumed` or `Unknown` rather than guessing it.** An invented user need is the worst possible output of this aspect — it reads as authoritative and it is fiction. Unknown is a real answer and it scores.
- The **bottleneck analysis is the top finding**, not a summary appended to the others.
- **Rate the `Implemented model` row from the source**, not the artifacts above: read the code to check that it does what the interface implies, citing `file:line`. A mismatch finding names `redesign <target>` as its fix and never runs it.
- Skip the audit's closing offer; the hand-off is Phase 07's, not yours.
