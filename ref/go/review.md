# Go review lens

Platform lens for the `review` engine. Runs as one additional Sonnet sub-agent in Phase 04 when the
`go` label is in scope. Same output contract as the other lenses: report only genuine problems,
`file:line`, a full-sentence headline, a **Why** (concrete cost), and a **Fix** with a before/after
where it clarifies. Axis tag: `go`. Do not nitpick style or invent issues.

**In repo mode, run these tools before reading any source** — Phase 01r's "gating is off" rule
forwards each tool's raw output into this brief as evidence, and this lens reads that output rather
than inferring a finding from source alone. In diff mode, run the tools scoped to the changed
packages only (`go vet ./...` and friends accept a package list — pass the changed packages, not the
whole module) so a finding always cites something the diff actually touches. **A `govulncheck`
advisory is exempt from that diff-scope filter** — its evidence is the module's dependency graph, not
a changed line, so a "called" vulnerability is reported in diff mode even when the diff never touches
the vulnerable package.

## Tools, in run order

| Tool | Command | Reads |
| --- | --- | --- |
| Vulnerability scan | `govulncheck ./...` | Known CVEs in the module's dependency graph, reachable through the actual call graph |
| Static vet | `go vet ./...` | Compiler-adjacent correctness: unreachable code, wrong `Printf` verbs, struct tags, lock copies |
| Deeper static analysis | `staticcheck ./...` | Bugs vet doesn't catch: unused writes, deprecated stdlib calls, ineffective assignments |
| Style + lint aggregator | `golangci-lint run` | Whatever linters the repo's own `.golangci.yml` enables — this repo's own bar, not a default one |

Run in the order above and stop early only on a hard timeout; each tool's output feeds a different
part of the finding set below.

## Reading each tool's output, and what becomes a finding

- **`govulncheck`** — a vulnerability it reports as "called" (not merely "imported, not called") is a
  scored `go` finding: cite the CVE ID, the vulnerable package version, and the exact call site
  `govulncheck` names. **"imported, not called" entries are dropped** — `govulncheck`'s own model
  already means the vulnerable code path is unreachable; reporting it anyway is exactly the
  phantom-authority failure this lens exists to avoid.
- **`go vet`** — every line it prints is a real defect (vet has no style opinions and no false-positive
  mode by design); each becomes a `go` finding at the file:line vet names, unless the flagged pattern
  is inside a `_test.go` fixture deliberately constructing the bad case under test — check the
  surrounding test name before scoring one down.
- **`staticcheck`** — each finding's check ID (`SA4006`, `ST1005`, …) decides scored vs. dropped:
  `SA*` (staticcheck's own "definitely a bug" class) becomes a `go` finding; `ST*`/`U*` (style,
  unused) is dropped unless it names genuinely dead code (an unused exported symbol nothing in the
  module calls) — that case is still a `go` finding, not dropped, since it's a real defect this lens
  owns.
- **`golangci-lint run`** — only promote a finding when the underlying linter is one of `errcheck`
  (a discarded error — this codebase's single most common real defect class), `gosec` (an unsafe
  pattern like a hardcoded credential or command injection — this lens reports it as a `go` finding
  like any other), or `ineffassign`. Every other linter in the aggregator duplicates something
  `gofmt`/`go vet`/`staticcheck` already covers or is a pure style preference — drop those regardless
  of what the repo's `.golangci.yml` enables, since this lens's job is correctness, not the repo's
  house style (`standards` already owns CLAUDE.md compliance).

## Missing tool

A tool not on `PATH` is **noted in the report and skipped** — never a blocker, and never installed
(globally or into the module) without asking first. State which tool was missing in the coverage line
this lens returns, e.g. `go: staticcheck not installed, skipped`.

## Output

Group by file; skip clean files; end with a prioritized summary (highest-impact first). Findings flow
into the normal Phase 05 scoring and the ≥75 cutoff like any other axis.
