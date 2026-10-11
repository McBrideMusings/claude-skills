# Web review tooling

Part of the [`review.md`](review.md) lens. In repo mode, read this before reading source.

Phase 01r forwards each tool's raw output into this lens's brief as evidence in repo
mode; this lens reads that output rather than inferring a finding from source alone. In diff mode,
prefer each tool's incremental/changed-files mode where one exists so a finding always cites something
the diff actually touches. **An `npm audit` advisory is exempt from that diff-scope filter** — its
evidence is the resolved dependency tree, not a changed line, so a reported CVE is still surfaced in
diff mode even when the diff never touches the affected package.

| Tool | Command | Reads |
| --- | --- | --- |
| Vulnerability scan | `npm audit --omit=dev` (or the lockfile-matched equivalent — `pnpm audit`, `yarn audit`) | Known CVEs in the resolved dependency tree |
| Dead exports | `npx knip` | Unused files, exports, and dependencies nothing in the tree imports |
| Import cycles | `npx madge --circular <entry>` | Circular imports — `madge` prints the exact cycle (`a.ts → b.ts → a.ts`), which a lens reading files can only infer and Phase 05b's reproduction gate can't confirm (a cycle has no input to feed it) |
| Unused packages | `npx depcheck` | Declared `package.json` dependencies nothing in the tree imports, and imports with no matching dependency declared |
| Type check | `tsc --noEmit` | Type errors across the whole program, including ones outside the diff that a changed type surfaces |

**Reading each tool's output:**

- **`npm audit`** — every reported advisory is a scored `web` finding: cite the advisory ID, the
  package/version, and the patched version if one exists. A `low`/`moderate` advisory with no available
  fix is still a `web` finding — rate it `P2` (a tracked risk) rather than
  dropping it.
- **`knip`** and **`depcheck`** — both report unused code/dependencies; treat them as corroborating,
  not independent, since they overlap heavily. A dead *export* becomes a `web` finding — cross-check
  the other tool before reporting where both cover the same file, and drop anything either tool itself
  marks low-confidence (a dynamic `import()` path it can't resolve statically). An unused *package* is
  not this lens's finding at all — it belongs to `dependency-debt` alone (see
  [`axes/dependency-debt.md`](../../review/axes/dependency-debt.md)); do not report it here even when
  `knip`/`depcheck` surface it alongside a dead export.
- **`madge --circular`** — every printed cycle is a `web` finding, unconditionally — a cycle is never
  routed to `architecture` regardless of whether it crosses a package/module boundary. Quote the exact
  cycle chain `madge` prints as the **Bites** evidence, deduped against ones already known. **Drop a
  cycle whose every edge is a TypeScript `import type`** (or an equivalent type-only re-export) —
  those erase at compile time, so no runtime cycle exists and it cannot bite at module init; report it
  only when at least one edge in the printed chain is a value import.
- **`tsc --noEmit`** — every reported error becomes a `web` finding, unconditionally — a type error is
  never routed to `bug`, even one that reveals a real runtime defect (an `any`-typed value that's
  actually `null`, say); it stays `web` at the file:line `tsc` names. Drop a "possibly undefined" error
  the surrounding code already narrows in a way `tsc`'s control-flow analysis can't follow (rare, but
  check the guard clause before scoring).

**Missing tool** — not on `PATH` / not resolvable via the project's package manager is **noted in the
report and skipped** — never a blocker, and never installed without asking first. State which tool was
missing in the coverage line this lens returns, e.g. `web: knip not installed, skipped`.

**Missing dependency tree** — when `node_modules` (or the project's equivalent installed-tree
directory) is absent, `tsc --noEmit` and `npx knip` are **not evidence**: an uninstalled tree makes
every module-resolution error (`Cannot find module 'react'`, and everything that cascades from it)
indistinguishable from a real type or dead-code finding, so both tools are skipped, the same shape as
a missing binary. Note it in the coverage line, e.g. `web: tsc, knip skipped — no node_modules`.
`npm audit`, `madge --circular`, and `depcheck` read manifests and the source tree directly and stay
valid with no installed tree. When `node_modules` is present, run `tsc` as
`npx --yes -p typescript@<version> tsc --noEmit` — the package is `typescript` but the binary is
`tsc`, so `npx --yes typescript@<version> tsc --noEmit` fails with `could not determine executable to
run`; the `-p` form names the package explicitly and resolves.
