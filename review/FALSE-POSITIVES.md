# Code Review — False Positive Criteria

These are the rules the Haiku scoring sub-agents apply when deciding whether a flagged issue is real or noise. Pass this content to each scoring sub-agent verbatim.

**Vet the citation first.** Lens sub-agents over-report and mis-cite. Before scoring any finding above **0**, open the cited `file:line` and confirm the code the finding describes is actually there. A finding you cannot confirm at its cited location is not scorable — see "Mis-attributed evidence" below.

## What counts as a false positive

- **Pre-existing issues** not introduced by these changes
- **Things a linter / compiler / typechecker would catch** — ESLint, Prettier, tsc, Biome already enforce these
- **General quality issues** (missing tests, missing docs) unless `CLAUDE.md` explicitly requires them
- **Issues on lines the user didn't modify** — out of scope for this review
- **Intentional functionality changes** related to the broader change being made
- **Deliberate trade-offs with no better alternative** — the flagged code is a conscious choice documented in-code or the PR body, *and* you cannot name a concretely superior option: every alternative you can think of is equal or worse on the very axis the finding raises (the "cheaper" fix adds I/O; the "safer" gate reintroduces the bug it removed). "It could be done differently" scores **0**. Only "it *should* be done differently — here is the strictly-better option and the concrete cost of the current one" scores. This binds hardest on efficiency / architecture / best-practice findings: if you cannot state a specific alternative that wins on a named axis, score **0**. The author documenting the choice is a signal you're looking at a trade-off, not a defect — read the doc before scoring.
- **Pedantic nitpicks** a senior engineer wouldn't flag
- **Mis-attributed evidence** — the cited `file:line` doesn't actually contain what the finding claims (wrong file, wrong line, or the quoted symbol isn't there). The finding may gesture at a real pattern, but a wrong citation makes it un-actionable and it re-surfaces mis-aimed next run. Score **0**.
- **For Spec issues only:** out-of-scope behaviour explicitly allowed by the spec (e.g. spec says "implementer's choice"); or behaviour the spec doesn't address either way
- **For Negative-space issues only:** the "missing tests / missing docs / missing validation" rule above is **suspended** — but *only* for obligations the diff **itself** creates (a caller the change left un-updated, an error path the change introduces but leaves unhandled, a new branch the diff adds with no test, input the diff newly accepts but doesn't validate). A generic "this module could use more tests" not tied to something the diff changed is still a false positive. A negative-space finding already covered by a quoted Spec line scores **0** (duplicate — it belongs to Spec).
- **For Best-practice issues only:** real **only if** Claude verified it against current official docs *with a citation* (Phase 04b) **and** the deviation carries a concrete cost (deprecation, security, perf, correctness). An unverified flag, an idiom/style difference, or a deviation current docs actually endorse scores **0**. A verified, costly, cited deviation scores ≥ 75.

## Scoring scale

- **0** — false positive, doesn't hold up to scrutiny, or pre-existing
- **25** — might be real, might be false positive; stylistic issues not in CLAUDE.md
- **50** — real but minor; nitpick or unlikely to matter in practice
- **75** — verified real issue; will impact functionality or violates explicit CLAUDE.md rule (or, for Spec issues: directly contradicts a spec line)
- **100** — confirmed real issue, will happen frequently, evidence directly confirms it

Only findings scoring ≥ 75 reach the final report.

**The gate binds the reviewer directly — not only the Haiku scorers.** When a diff is small enough to review inline (no Phase 05 fan-out), *you* apply this scale; there is no sub-agent to do it for you. The tell: if your own recommended disposition for a finding is "skip" / "FYI" / "not worth posting" / "non-blocking nit" / "recommend `skip`," you have already scored it <75 — so it does **not** reach the report. Do not write it down and then advise skipping it. Score it out and drop it silently.
