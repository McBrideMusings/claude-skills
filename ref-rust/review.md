# Rust review lens

Platform lens for the `review` engine. Runs as one additional Sonnet sub-agent in Phase 04 when the
`rust` label is in scope. Same output contract as the other lenses: report only genuine problems,
`file:line`, a full-sentence headline, a **Why** (concrete cost), and a **Fix** with a before/after
where it clarifies. Axis tag: `rust`. Do not nitpick style or invent issues.

**In repo mode, run these tools before reading any source** — Phase 01r's "gating is off" rule
forwards each tool's raw output into this brief as evidence, and this lens reads that output rather
than inferring a finding from source alone. In diff mode, run the same commands over the whole
workspace (Cargo's tools don't accept a path list the way `go vet`/`ruff` do) but only surface
findings whose file:line falls inside the diff. **A `cargo audit` advisory is exempt from that
diff-scope filter** — its evidence is `Cargo.lock`'s resolved dependency graph, not a source line, so
a real vulnerable transitive dependency is reported even when the diff never touches the crate that
pulls it in.

## Tools, in run order

| Tool | Command | Reads |
| --- | --- | --- |
| Vulnerability scan | `cargo audit` | Known CVEs in `Cargo.lock`'s resolved dependency versions (RustSec advisory database) |
| Unused dependencies | `cargo udeps` (needs a nightly toolchain: `cargo +nightly udeps`) | Declared `Cargo.toml` dependencies nothing in the crate actually imports |
| Duplicate-purpose dependencies | `cargo machete` | A lighter-weight unused-dependency pass; also flag its "duplicate crate providing the same functionality" output where two deps solve the same problem (e.g. both `reqwest` and `ureq` present) |
| Lint | `cargo clippy -- -W clippy::pedantic` | Correctness and idiom lint beyond what `rustc` itself catches |

## Reading each tool's output, and what becomes a finding

- **`cargo audit`** — every reported advisory is a scored `rust` finding: cite the RUSTSEC ID, the
  crate and version, and the patched version if one exists. An advisory marked "unmaintained" with no
  CVE and no known exploit is still a `rust` finding — note the lower severity (maintenance risk, not
  an active vulnerability) in the finding body rather than dropping it.
- **`cargo udeps` / `cargo machete`** — an unused dependency reported by either becomes a `rust`
  finding — cross-check both tools agree before reporting (they use different detection strategies and
  either can miss a macro-only or feature-gated usage); report only the intersection, and drop a
  dependency either tool alone flags if the other doesn't corroborate it.
- **`cargo clippy -- -W clippy::pedantic`** — clippy's own lint levels decide scored vs. dropped:
  `deny`/`warn`-by-default lints (the ones that fire without `pedantic` at all — `clippy::correctness`,
  `clippy::suspicious`) are real defects and become `rust` findings. `pedantic`-only lints are
  style/idiom preference by clippy's own classification — **drop these unless the specific lint names
  a real correctness cost** (e.g. `clippy::missing_panics_doc` is style; `clippy::unwrap_used` on a
  path reachable from untrusted input is a real finding — route that one to `bug`, since an unhandled
  panic on attacker-reachable input is a crash, not an idiom).

## Missing tool

A tool not on `PATH` (`cargo-audit`, `cargo-udeps`, and `cargo-machete` are all separately-installed
subcommands, not part of default `cargo`) is **noted in the report and skipped** — never a blocker,
and never installed without asking first. State which tool was missing in the coverage line this lens
returns, e.g. `rust: cargo-udeps not installed, skipped`.

## Output

Group by file; skip clean files; end with a prioritized summary (highest-impact first). Findings flow
into the normal Phase 05 scoring and the ≥75 cutoff like any other axis.
