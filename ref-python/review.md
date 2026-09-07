# Python review lens

Platform lens for the `review` engine. Runs as one additional Sonnet sub-agent in Phase 04 when the
`python` label is in scope. Same output contract as the other lenses: report only genuine problems,
`file:line`, a full-sentence headline, a **Why** (concrete cost), and a **Fix** with a before/after
where it clarifies. Axis tag: `python`. Do not nitpick style or invent issues.

**In repo mode, run these tools before reading any source** — Phase 01r's "gating is off" rule
forwards each tool's raw output into this brief as evidence, and this lens reads that output rather
than inferring a finding from source alone. In diff mode, scope each tool to the changed files where
the tool supports it (`ruff check <paths>`, `mypy <paths>` against a project actually configured for
per-file runs) so a finding always cites something the diff actually touches. **A `pip-audit` advisory
is exempt from that diff-scope filter** — its evidence is the resolved dependency set, not a changed
line, so a reported CVE is still surfaced in diff mode even when the diff never touches the affected
package.

## Tools, in run order

| Tool | Command | Reads |
| --- | --- | --- |
| Vulnerability scan | `pip-audit` (or `pip-audit -r requirements.txt` / against the resolved lockfile the project uses) | Known CVEs in installed/pinned dependency versions |
| Lint | `ruff check .` | Correctness-adjacent lint: unused imports/names, undefined names, mutable default args, bare `except` |
| Dead code | `vulture .` | Unused functions, classes, variables, and imports nothing in the tree references |
| Type check | `mypy --strict .` | Type errors, `Any` leakage, missing annotations on public surface |

## Reading each tool's output, and what becomes a finding

- **`pip-audit`** — every reported CVE is a scored `python` finding: cite the CVE ID, the package and
  pinned version, and whether a fixed version is available. `pip-audit` has no reachability model like
  `govulncheck`'s, so **do not drop one for looking unreachable** — note reachability as a caveat in
  the finding body instead of silently dropping it.
- **`ruff check`** — an error-severity rule (`E`, `F` codes — undefined name, unused import actually
  shadowing a real bug, mutable default argument) becomes a `python` finding. A style-only rule (`W`,
  most `I`/import-sort codes) is dropped — `ruff`'s own default rule set already separates these by
  code prefix, so read the prefix rather than re-deriving severity from the message text.
- **`vulture`** — every reported dead symbol is a `python` finding. **Drop anything below `vulture`'s
  own 60% confidence threshold** (`--min-confidence 60` is the default; don't lower it) — under that
  threshold `vulture` itself is guessing at dynamic dispatch it can't trace (a plugin registry,
  `getattr`-based lookup), and reporting a guess as a finding is exactly what the confidence score
  exists to prevent.
- **`mypy --strict`** — a genuine type error (an incompatible assignment, a call with the wrong arg
  types, a return type that doesn't match the signature) becomes a `python` finding. A bare `# missing
  library stubs` note for a third-party package with no stubs is dropped — it's a tooling gap in the
  ecosystem, not a defect in this code.

## Missing tool

A tool not on `PATH` (or not resolvable in the project's venv — see `ref-python/context.md` for how
this repo expects Python tooling to be invoked, never a bare global interpreter) is **noted in the
report and skipped** — never a blocker, and never installed without asking first. State which tool was
missing in the coverage line this lens returns, e.g. `python: mypy not installed in .venv, skipped`.

## Output

Group by file; skip clean files; end with a prioritized summary (highest-impact first). Findings flow
into the normal Phase 05 scoring and the ≥75 cutoff like any other axis.
