# Dependency-debt lens

**Repo mode only.** If invoked outside repo mode (a diff review, a fixed-point review, or uncommitted
changes), output `Skipped — dependency-debt is repo-mode only.` and exit.

**This lens scores tool output — it does not infer from reading.** Phase 01r captures each language
tool's raw output once per slice and hands the same capture to both the matched label lens
(`ref-go/review.md`, `ref-python/review.md`, `ref-rust/review.md`, `ref-web/review.md`) and this lens
directly — `govulncheck`/`pip-audit`/`cargo audit`/`npm audit` for vulnerabilities,
`vulture`/`cargo udeps`/`cargo machete`/`knip`+`depcheck`/`go mod tidy -diff` for unused code and
dependencies. The label
lens reads that capture for its own correctness findings (a CVE that's actually called, a real dead
symbol); this lens reads the identical capture for the categories below, which the label lens does not
score. **Do not re-run those tools** — this lens's own job is only the three categories below, on the
evidence captured in Phase 01r, plus one direct check no label lens performs (undocumented env vars).

**What becomes a finding:**

- **An unused package** — a dependency `knip`/`depcheck`/`cargo udeps`/`cargo machete` reported as
  unused, after this lens's own corroboration check (cross-tool agreement where more than one tool
  covers the ecosystem). Cite the tool and the exact package it named. **Go's entry in this category
  is `go mod tidy -diff`** (`go mod why <module>` for corroboration on any module the diff flags) — run
  it against `go.mod`/`go.sum` and read the diff it prints. A require-block *move* — a module that
  moves from an `// indirect`-annotated block into the direct `require` block (or the reverse) with the
  `// indirect` comment stripped or added — is itself a finding: the annotation change means the
  module's real import status disagrees with what `go.mod` currently declares, not a cosmetic reorder.
  Only a line that is added or removed outright (not just relocated between blocks) with no annotation
  change is the "truly unused" case; a relocation with an annotation change is scored as
  unused/mislabelled dependency debt either way.
- **Two packages doing the same job** — `cargo machete`'s duplicate-purpose output, or (for
  ecosystems without an equivalent tool) two dependencies in the same manifest solving the same
  problem, found by reading the manifest itself rather than a tool (e.g. both `moment` and `date-fns`,
  both `requests` and `httpx`). Name both packages and what each is used for.
- **An undocumented environment variable.** `grep` the scope for `process.env.`, `os.environ`,
  `os.Getenv`, `std::env::var` (language-appropriate) and cross-check each name against the repo's
  `.env.example` / `README` / `docs/`. A variable the code reads that appears in none of those is a
  finding — the failure mode is a deploy that silently runs with an unset variable and a default
  nobody documented, or a new hire who can't find what to set. This is the one direct check in this
  lens; every other category above consumes captured tool output rather than reading source.

**Never re-run the language tools from this lens.** If a label lens didn't run (no matching label in
scope for this slice — e.g. a pure-docs slice), Phase 01r captured no tool output for that slice
either, so this lens has nothing to score for the first two categories and reports only the env-var
check for that slice; say so rather than inventing tool output.

Axis tag: `dependency-debt` (flat — name the sub-kind in the headline prose, e.g. "unused dependency",
"duplicate-purpose dependency", "undocumented env var").
