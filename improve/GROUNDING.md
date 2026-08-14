# Improve — Grounding criteria

These are the rules a scoring sub-agent applies to decide whether an opportunity is real or slop. Pass this content to each scoring sub-agent **verbatim**. It is improve's counterpart to review's [FALSE-POSITIVES.md](../review/FALSE-POSITIVES.md), and it judges a different thing: review asks *is this defect real*, improve asks *is this opportunity grounded in this repo and does it buy something nameable*.

**Vet the citation first.** Aspect sub-agents over-report. Before scoring any finding above **0**, open every path the finding cites and confirm the module, seam, rule, or config it describes is actually there. A finding you cannot confirm at its cited location is not scorable — score **0**. Do not repair the citation yourself; a lens that could not point at the code did not read it.

**Then check the boundary.** Improve finds opportunities where nothing is broken. If the finding describes something that is wrong *today* — a wrong value, a crash, an unhandled path, an exploitable weakness — it belongs to `review`, not here. Score **0** and tag it `review-territory` so Phase 07 can name it as a pointer instead of a card.

## What scores 0

- **Ungrounded advice.** The finding could be pasted into any repo in this language — "add a service layer", "introduce dependency injection", "split into smaller modules", "you have no CSP", "add more tests" — with nothing naming modules, files, or friction the lens actually hit. This is the single largest failure mode in a survey and the reason the aspect briefs all carry a grounding rule.
- **Mis-attributed evidence.** The cited path doesn't contain what the finding claims — wrong file, wrong symbol, a module that doesn't exist. The finding may gesture at a real pattern; a wrong citation makes it un-actionable and it re-surfaces mis-aimed next run.
- **A defect wearing an opportunity's clothes.** See the boundary rule above.
- **Already decided.** The finding contradicts an ADR in `docs/adr/` and offers no argument for reopening it. An ADR that a finding argues against *on the merits, naming what changed since* is not this — that scores normally and carries the ADR callout.
- **Already true.** The improvement is already implemented in the code the finding cites. Read before scoring.
- **Inapplicable aspect.** The lens ran somewhere its applicability condition is false and produced findings anyway (a UI critique on a repo with no UI surface, a profiling finding with no launchable entry point). The correct return there was `not applicable — <reason>`.
- **Restating a rule as a finding.** "The project should follow its CLAUDE.md" with no line quoted and no drift shown.

## What caps at 50 — real but unverifiable, so it does not reach the report

- **Named but unconfirmable evidence.** The finding names a real file, but the claim about it can't be settled from the repo (a runtime behaviour nobody measured, a caller count that couldn't be enumerated). The lens should have marked it `Unknown`; treat it as such.
- **A proposed fix with no shape.** The finding names an outcome ("make the intake module deep", "centralize validation") without saying what physically changes — which file, what signature, what moves where. A name for a change is not a change. See [../_plan-format.md](../_plan-format.md) for the shape a proposal has to reach.
- **Leverage asserted, not stated.** The finding says the change is better without naming what it buys in the aspect's own terms (locality, leverage, coverage, a removed footgun, a removed duplicate rule, a measured cost).

## The scale

| Score | Means |
|---|---|
| **0** | Any bullet above fires. Drop it. |
| **50** | Real but unverifiable or shapeless. Does not reach the report. |
| **75–89** | Citation confirmed, friction named in this repo, fix has shape, leverage stated. Reaches the report. |
| **90–100** | All of the above **and** the finding names the callers, the duplicate sites, or the measurement that makes the size of the win checkable. |

Keep **≥ 75**. Everything else is dropped before it reaches the report — not surfaced with a "skip" recommendation attached. If your own disposition for a finding is "FYI" or "not worth it", it scored below 75.

## Two things that are never a reason to score down

1. **How much work the fix is.** Size, file count, difficulty, and any hours figure are banned as scoring input — RULE 1 in [SKILL.md](SKILL.md). A large grounded improvement outscores a small ungrounded one every time.
2. **That the code works today.** Everything improve finds works today. That is the premise, not a demerit.
