# Aspect brief: `complexity` (native)

Axis tag: `complexity`. Applicability: a complexity tool exists for the repo's language. Check this before anything else — name the check from the tool table in `../../review/axes/standards.md`; if none applies and no manual fallback is practical at repo scale, return `not measurable — no complexity tool for <language>` and stop.

**Read:** [../../review/axes/standards.md](../../review/axes/standards.md) — "Complexity is measured, not asserted" for the tool per language, the threshold rule, and the manual-count fallback. Do not restate any of it here.

## Aspect-specific rules

- **This aspect's job is a search strategy, not a report.** Run the tool across the whole codebase, rank functions by count descending, and use that ranking to choose what to walk — start at the top of the ranking, not wherever you'd normally look.
- **Every finding is still a Fowler-smell or bug finding carrying the number as evidence, never a bare-number finding.** A high count is the reason to look at `parseOrder`, not the finding itself — file what the count exposed (Repeated Switches, Mysterious Name, a real bug) with the number attached as evidence, exactly as `standards.md` requires.
- **No threshold of our own.** The repo's own config (eslintrc, radon, sonar) sets what counts as high; where it's silent, use the ranking itself — the top of the list, not a fixed number — to decide what's worth a look.
- Do not install a complexity tool or add config for one. Both are writes.
