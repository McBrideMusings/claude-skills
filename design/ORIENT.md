# `orient` mode procedure

Ask three framing questions, then audit each layer:

1. What product or feature are you working on?
2. What design challenge are you facing right now?
3. How far along — early exploration, active design, or fixing an existing product?

Rate each layer **Strong / Partial / Assumed / Weak / Not started / N/A** with one or two targeted
questions each (observed behaviour: what research exists? domain: how well is the space understood?
user needs: can the underlying job be articulated, not features? strategy: which need, which outcome,
is the link explicit? conceptual model: clear shared object model? interaction structure: clear key
journeys — breadboard/flow/code? surface: existing design system to fit?).

Produce a short audit table:

```
Layer                      | State       | Notes
---------------------------|-------------|----------------------------------------
Observed behaviour         |             |
The domain                 |             |
User needs                 |             |
Product & service strategy |             |
Conceptual model           |             |
Interaction structure      |             |
Surface                    |             |
```

**Bottleneck analysis:** name the lowest layer with Weak/Assumed/Not-started state — what decisions are
missing, what risk that creates above. Flag **assumed** layers separately (treated as decided but
unverified — the most dangerous). If a deadline changes the calculus, say so; sometimes the right move
isn't the most foundational one — name that tradeoff.

**Recommendation:** one specific layer cell to work next, and why. If the bottleneck is **Surface**, the
next step is this skill's `sketch` or `critique` mode over `_domains/gui/`, not a `layers/` cell. Close
with a genuine offer to run it or push back first.

## Findings-only invocation

When another skill (e.g. `improve`'s survey) invokes `orient` non-interactively: don't ask the framing or per-layer questions — answer them from repo artifacts (`README.md`, `docs/PRD.md`, `docs/CONTEXT.md`, `docs/adr/`, git history) and rate each layer from that evidence, marking layers the artifacts can't answer **Assumed** or **Unknown** rather than guessing. Return the audit table + bottleneck analysis as structured findings (finding, evidence, strength, proposed fix); skip the closing offer. No file writes, no commits, no questions.
