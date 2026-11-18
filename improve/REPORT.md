# The survey report

What the report says. How it looks is not fixed: no template, stylesheet or build tool. Write it
where the session already shows results: a markdown post in Wheel, a markdown file or chat
elsewhere. Use a table, an image or a diagram where it carries a finding better than prose.

## What it holds, in order

1. **Coverage.** One row per aspect the survey was given, each with exactly one of: `n findings`,
   `no findings`, `not applicable — <reason>`, or `died`. An aspect that never ran is not an
   aspect that found nothing. Below it, one line for the `review-territory` defects: *"3 defects
   surfaced during the survey — run `/review` to develop them."* Defects are never findings here.
2. **Top recommendation.** The finding to do first, one sentence on why, and a link to it.
3. **Findings, in Phase 06b order.** One entry per surviving finding.

## A finding's fields

- **Title**: names the change.
- **Impact**: `P0`–`P3` (scale in [`../review/REVIEW-CORE.md`](../review/REVIEW-CORE.md) §Axis tags).
- **Lens**: the rule, craft lens, domain cell or lateral technique that produced it, as a path and
  section the reader can open (`ARCHITECTURE.md § deletion test`). Never just the aspect name.
- **Files**: the paths involved.
- **Problem**: one sentence, what hurts, with the evidence.
- **Solution**: the shape of the change (signature, call-stack diff, module layout), in text.
  Phase 08 copies it into a plain-text ticket body, so a diagram never stands in for it.
- **Wins**: what it buys, in the aspect's own vocabulary and real units.
- **ADR**: one line, when the finding argues against an existing ADR.

An aspect's own file may add a field (`architecture` adds each dependency's category).
