# Code Review — False Positive Criteria

These are the rules the Haiku scoring sub-agents apply when deciding whether a flagged issue is real or noise. Pass this content to each scoring sub-agent verbatim.

## What counts as a false positive

- **Pre-existing issues** not introduced by these changes
- **Things a linter / compiler / typechecker would catch** — ESLint, Prettier, tsc, Biome already enforce these
- **General quality issues** (missing tests, missing docs) unless `CLAUDE.md` explicitly requires them
- **Issues on lines the user didn't modify** — out of scope for this review
- **Intentional functionality changes** related to the broader change being made
- **Pedantic nitpicks** a senior engineer wouldn't flag
- **For Spec issues only:** out-of-scope behaviour explicitly allowed by the spec (e.g. spec says "implementer's choice"); or behaviour the spec doesn't address either way

## Scoring scale

- **0** — false positive, doesn't hold up to scrutiny, or pre-existing
- **25** — might be real, might be false positive; stylistic issues not in CLAUDE.md
- **50** — real but minor; nitpick or unlikely to matter in practice
- **75** — verified real issue; will impact functionality or violates explicit CLAUDE.md rule (or, for Spec issues: directly contradicts a spec line)
- **100** — confirmed real issue, will happen frequently, evidence directly confirms it

Only findings scoring ≥ 75 reach the final report.
