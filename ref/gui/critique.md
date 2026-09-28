# Design critique — is this interface good?

An interface already exists and the question is "is this good?" / "what's weak?". This judges
*design quality*. Code correctness, a11y testing and performance are `review` and `verify`, which
read [`review.md`](review.md) and the platform cells; `improve`'s `gui` aspect is the pass that
runs this file ([`../../improve/aspects/gui.md`](../../improve/aspects/gui.md)).

## The one rule — always name the reason

Every verdict is anchored to a concrete reason: a named principle, a specific slop tell from
[`slop.md`](slop.md), or a measured value (contrast ratio, tracking, duration, spacing off the
scale) — never a bare "feels right". Beneath the surface it means stating a bad decision as a fact
("the model treats `Order` and `Cart` as one object but the surface shows them as two — that's a
Shapeshifter"), never "this feels off". Ranking layouts, palettes and motion is the job; ranking
them *without* the reason is not. This covers design quality, not whether a game is fun.

## The passes

Run every pass **against a screenshot of the running surface, not against the source**.

1. **Lenses** — apply the [`design.md`](design.md) lenses.
2. **Slop** — run the [`slop.md`](slop.md) catalog.
3. **Motion opportunities** — when motion is in scope, run [`opportunities.md`](opportunities.md):
   the four-question gate, the hunt-seam sweep, and its **required** rejected-candidates section.
4. **Fidelity** — run the [`fidelity.md`](fidelity.md) structural pass: does the surface honour
   the decisions in the layers below — vocabulary, object consistency, breadboard completeness,
   error recovery, accessibility.
5. **Grouping** — run [`grouping.md`](grouping.md)'s six audit questions as a **required** pass.
   Every critique states the six answers explicitly; "looks fine" is not an answer to any of them.
   If no screenshot exists, say the grouping pass is unrun rather than claiming it passed.
6. **States and copy** — on any Operate surface, run [`states.md`](states.md). A happy path at full
   craft with browser-default everything else is the most reliable sign nobody used the thing.
7. **Launch readiness** — when the scope is a whole site or app rather than one component, run
   [`launch-readiness.md`](launch-readiness.md) as a **required** pass: the one-liner,
   one-CTA-per-page, title/meta/favicon and no-placeholder-text checks, plus its
   parallel-checker-then-single-fixer procedure for running the whole audit at that scale.

## Output

Ranked findings, each with its concrete reason and a proposed fix. Tag each finding
**surface-fix** or **deeper-layer**; a deeper-layer finding routes into the matching
[`layers/`](layers/) cell, worked per [`working-layers.md`](working-layers.md). Close with the
standard escape hatch: `go` to apply every pick as tagged (deeper ones routed into their `layers/`
cell), or `park` to apply them and stop.

## Findings-only invocation

When another skill (e.g. `improve`'s survey) runs this non-interactively: run the passes exactly as
above with no file writes, no commits, no questions, and skip the escape hatch. Structure each
finding as (finding, evidence/reason, strength, proposed fix, surface-fix vs deeper-layer tag).
