# Code Review — False Positive Criteria

These are the rules the Haiku scoring sub-agents apply when deciding whether a flagged issue is real or noise. Pass this content to each scoring sub-agent verbatim.

**Vet the citation first.** Lens sub-agents over-report and mis-cite. Before scoring any finding above **0**, open the cited `file:line` and confirm the code the finding describes is actually there. A finding you cannot confirm at its cited location is not scorable — see "Mis-attributed evidence" below.

**Then check the execution verdict.** Phase 05b feeds the input named in the finding's **Bites** line to the running code and attaches a verdict — `reproduced`, `not-reproduced`, or `not-executable`. That verdict outranks your reading of the code in both directions. Read "The execution verdict" below before applying the scale; it is not a tiebreaker, it is the first gate.

## What counts as a false positive

- **Pre-existing issues** not introduced by these changes
- **Things a linter / compiler / typechecker would catch** — ESLint, Prettier, tsc, Biome already enforce these
- **General quality issues** (missing tests, missing docs) unless `CLAUDE.md` explicitly requires them
- **Issues on lines the user didn't modify** — out of scope for this review
- **Intentional functionality changes** related to the broader change being made
- **Deliberate trade-offs with no better alternative** — the flagged code is a conscious choice documented in-code or the PR body, *and* you cannot name a concretely superior option: every alternative you can think of is equal or worse on the very axis the finding raises (the "cheaper" fix adds I/O; the "safer" gate reintroduces the bug it removed). "It could be done differently" scores **0**. Only "it *should* be done differently — here is the strictly-better option and the concrete cost of the current one" scores. This binds hardest on efficiency / architecture / best-practice findings: if you cannot state a specific alternative that wins on a named axis, score **0**. The author documenting the choice is a signal you're looking at a trade-off, not a defect — read the doc before scoring.
- **Pedantic nitpicks** a senior engineer wouldn't flag
- **Mis-attributed evidence** — the cited `file:line` doesn't actually contain what the finding claims (wrong file, wrong line, or the quoted symbol isn't there). The finding may gesture at a real pattern, but a wrong citation makes it un-actionable and it re-surfaces mis-aimed next run. Score **0**.
- **Category-only input** — the **Bites** line names a class of inputs ("edge cases", "malformed input", "under concurrency", "certain timezones") where it should name values. On every axis that requires the input clause, a missing or category-shaped left side caps the score at **50** — real-but-unverifiable — so it does not reach the report. Do not repair the finding by inventing values yourself: the lens either traced an input to a failure or it pattern-matched a shape, and only the first is scorable. Score **0** when the values given are contradicted by the cited code (a null input on a non-nullable field, an empty-list input on a call site that cannot receive one). **`negative-space` and `architecture` are exempt** — they write impact-only Bites lines by design.
- **Unreproducible behavior claims** — the finding asserts a wrong value, crash, or missed branch, the gate fed it the named input, and the code produced the correct answer. Score **0**. See "The execution verdict".
- **For Spec issues only:** out-of-scope behaviour explicitly allowed by the spec (e.g. spec says "implementer's choice"); or behaviour the spec doesn't address either way
- **For Negative-space issues only:** the "missing tests / missing docs / missing validation" rule above is **suspended** — but *only* for obligations the diff **itself** creates (a caller the change left un-updated, an error path the change introduces but leaves unhandled, a new branch the diff adds with no test, input the diff newly accepts but doesn't validate). A generic "this module could use more tests" not tied to something the diff changed is still a false positive. A negative-space finding already covered by a quoted Spec line scores **0** (duplicate — it belongs to Spec).
- **For Best-practice issues only:** real **only if** it was verified against current official docs *with a citation* (Phase 04b) **and** the deviation carries a concrete cost (deprecation, security, perf, correctness). An unverified flag, an idiom/style difference, or a deviation current docs actually endorse scores **0**. A verified, costly, cited deviation scores ≥ 75.

## The execution verdict

Findings on the executable axes (`bug`, `spec/wrong-impl`, `security`, correctness `standards`) arrive from Phase 05b carrying a verdict. Apply it **before** the scale, not after:

- **`reproduced`** — the code was run with the named input and the claimed failure happened. **Floor 90.** Nothing in your reading lowers this; if the code looks fine to you and the run says otherwise, the run is right.
- **`not-reproduced`** — the code was run with the exact input the finding named and produced the correct answer. **Score 0. Hard.** This holds no matter how well-argued the **Why** is, how senior the prose sounds, or how plausible the race/overflow/null story reads. That plausibility is the measured failure mode this gate exists to catch: given a diff and told to justify and repair, models reject correct code most of the time (arXiv 2603.00539 §5). **A `not-reproduced` finding can never reach 75, and you may not re-argue it up.**
- **`not-executable`** — nothing was run, and that is expected. Either the axis has no behavior to execute (`architecture`, `contracts`, `slop`, `negative-space`, `history`, `best-practice`, `spec/missing-partial`, platform/domain idiom), or a gate-qualifying finding could not be run (input not constructible, toolchain missing, budget exhausted). **Score it on the reading-based scale below, exactly as before** — the absence of a run is not evidence against it. One cap: a gate-**qualifying** finding that was not executed tops out at **85**, so an unrun bug claim reaches the report but never as `high`. Non-executable *axes* have no cap.

**Never invert this.** "The tests pass, so the architecture finding is wrong" is not an inference — a passing suite says nothing about a layering violation or a stale contract comment. The verdict speaks only to behavior claims.

Phase 06c adds a second verdict on the *fix* — `fix-confirmed`, `fix-inert`, `fix-regresses`. **It never changes a score.** By the time it runs the failure is already reproduced, so the finding is real; that verdict only decides whether the proposed remedy is trustworthy enough to paste.

## Tier — the noise classifier

Every surviving finding also gets a tier. The tier is what the posting cap ranks on ([SKILL.md](SKILL.md) — Comment budget), and it is a second, independent filter: a finding can be technically correct and still be Tier 3, and Tier 3 does not ship.

- **Tier 1 — critical signal.** Would cause an observable failure: a runtime error (crash, exception, undefined behavior), a breaking change to an interface something outside this diff depends on, or an *exploitable* security vulnerability. Wrong output for a real input counts; theoretical exposure does not. **A `bug` or `security` finding claiming Tier 1 that came back `not-reproduced` is not Tier 1 — it is nothing.**
- **Tier 2 — important signal.** Violates an established pattern: architectural inconsistency, a *measurable* performance degradation, a maintainability risk with a named future cost, a broken contract, an explicit `CLAUDE.md` rule breach, a verified best-practice deviation with a concrete cost. Most `architecture`, `contracts`, `negative-space`, and `standards` findings live here.
- **Tier 3 — noise.** Style suggestions, naming preferences, subjective "this could be refactored", micro-optimizations with no measured impact, and most `slop`. **Tier 3 is a scoring outcome, not a severity label: if you classify a finding Tier 3, you have scored it ≤ 50 and it is dropped.** There is no such thing as a Tier 3 finding in a report or on a PR.

**Target signal ratio = (Tier 1 + Tier 2) / total findings surfaced ≥ 0.80.** Anything above 0.60 is acceptable; see [POSTING.md](POSTING.md) — Comment budget for the failure mode this is correcting. Because Tier 3 never survives, a correctly-run pass has a ratio of 1.0 by construction, so the number is a **self-check**, not a quota. If you are keeping a finding you cannot honestly place in Tier 1 or Tier 2, you have found the noise — drop it. **Never invert the ratio into a floor:** "we need more findings to look thorough" is the exact bias this file exists to suppress, and a zero-finding report is a perfectly good report.

## Scoring scale

For `not-executable` findings, and as the input the verdict then overrides for the rest:

- **0** — false positive, doesn't hold up to scrutiny, pre-existing, or `not-reproduced`
- **25** — might be real, might be false positive; stylistic issues not in CLAUDE.md
- **50** — real but minor; nitpick, unlikely to matter in practice, or category-only input (this is the Tier 3 ceiling)
- **75** — verified real issue; will impact functionality or violates explicit CLAUDE.md rule (or, for Spec issues: directly contradicts a spec line)
- **90** — floor for `reproduced`: the code was run and the claimed failure happened
- **100** — confirmed real issue, will happen frequently, evidence directly confirms it

Only findings scoring ≥ 75 **and** classified Tier 1 or Tier 2 reach the final report.

**The gate binds the reviewer directly — not only the Haiku scorers.** When a diff is small enough to review inline (no Phase 05 fan-out), *you* apply this scale, *you* assign the tier, and *you* run the execution gate — the input is constructible or it isn't, and "I read it carefully" is not a substitute. The tell: if your own recommended disposition for a finding is "skip" / "FYI" / "not worth posting" / "non-blocking nit" / "recommend `skip`," you have already scored it <75 — so it does **not** reach the report. Do not write it down and then advise skipping it. Score it out and drop it silently.
