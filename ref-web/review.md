# Web / CSS / React motion review lens

Platform lens for the `review` engine. Runs as one additional Sonnet sub-agent in Phase 04 when the
diff in scope contains CSS / JSX / animation code (transitions, keyframes, Framer Motion, WAAPI). Same
output contract as the other lenses: report only genuine problems, `file:line`, a full-sentence
headline, a **Why** (concrete cost), and a **Fix** with a before/after where it clarifies. Axis tag:
`web`. Do not nitpick style or invent issues.

This is the **implementation** half of motion review. The principle-level lens (`ref-gui/review.md`)
loads alongside this one when the `gui` label is in scope; this cell carries the exact curves,
durations, and properties to cite in fixes. Substantive bar from Emil Kowalski (animations.dev).

## Concrete values (cite these instead of approximating)

**Duration budget** — UI animations stay under 300ms:

| Element | Duration |
| --- | --- |
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–500ms |

**Easing** — entering/exiting → `ease-out`; on-screen movement → `ease-in-out`; hover/color → `ease`;
constant motion → `linear`. Built-in CSS easings are weak; expect strong custom curves:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

## What to flag

**Easing / duration**
- `transition: all` → name the exact properties (`transition: transform 200ms ease-out`); `all`
  animates unintended properties, often off-GPU.
- `ease-in` on a UI element → `ease-out` or a custom curve. `ease-in` delays movement to the end of the
  curve — the entry frames the user watches most.
- A built-in easing (`ease`, `linear`) on a deliberate UI animation where a strong custom curve belongs.
- UI duration > 300ms with no stated reason → reduce per the table above.

**Physicality**
- `transform: scale(0)` (or pure-fade entry with no initial transform) → `scale(0.95); opacity: 0`.
- `transform-origin: center` on a trigger-anchored popover/dropdown/tooltip →
  `var(--radix-popover-content-transform-origin)` (Radix) or `var(--transform-origin)` (Base UI).
  Modals are exempt — keep centered.
- Pressable element with no `:active` feedback → `transform: scale(0.97)` + `transition: transform
  160ms ease-out`.

**Interruptibility**
- `@keyframes` on toasts, toggles, or anything added/triggered rapidly → CSS transitions (retarget
  mid-flight; keyframes restart from zero).
- Prefer `@starting-style` for entry over a `useEffect(() => setMounted(true))` + `data-mounted` dance
  where browser support allows.

**Performance**
- Animating `width`/`height`/`margin`/`padding`/`top`/`left` → animate `transform`/`opacity` (they skip
  layout and paint; the others trigger all three).
- Framer Motion `x`/`y`/`scale` shorthand props on motion that runs while the page is busy → the full
  `transform: "translateX(100px)"` string (the shorthands run on the main thread via rAF and drop
  frames under load).
- Driving a child transform by setting a CSS variable on the parent → set `transform` directly on the
  element (a parent-var change recalcs styles for every child).
- Programmatic CSS animation hand-rolled on rAF where WAAPI (`element.animate([...], {...})`) gives
  hardware acceleration + interruptibility with no library.

**Timing & polish**
- Symmetric enter/exit on a press-and-hold or deliberate interaction → slow the deliberate phase, snap
  the response (e.g. press `clip-path 2s linear`, release `200ms ease-out`).
- Everything-at-once group entrance where a 30–80ms stagger belongs.
- A crossfade that shows two overlapping states after easing/duration tuning → subtle `filter:
  blur(2px)` during the transition to blend them (keep blur < 20px; heavy blur is costly in Safari).

**Accessibility**
- Missing `@media (prefers-reduced-motion: reduce)` on movement (keep opacity/color, drop
  transform-based motion — gentler, not zero).
- `:hover` motion not gated behind `@media (hover: hover) and (pointer: fine)` (touch fires false
  hovers on tap).

## Tooling (in repo mode, run before reading source)

Phase 01r's "gating is off" rule forwards each tool's raw output into this brief as evidence in repo
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
  fix is still a `web` finding — note the tracked-risk severity in the finding body rather than
  dropping it.
- **`knip`** and **`depcheck`** — both report unused code/dependencies; treat them as corroborating,
  not independent, since they overlap heavily. A dead *export* becomes a `web` finding — cross-check
  the other tool before reporting where both cover the same file, and drop anything either tool itself
  marks low-confidence (a dynamic `import()` path it can't resolve statically). An unused *package* is
  not this lens's finding at all — it belongs to `dependency-debt` alone (see
  [`axes/dependency-debt.md`](../review/axes/dependency-debt.md)); do not report it here even when
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

## Gestures & drag (when the diff has pointer handling)

- Momentum dismissal: compute velocity (`Math.abs(distance)/elapsedMs`), dismiss if `> ~0.11`, don't
  require crossing a fixed distance.
- `setPointerCapture` once dragging starts, so tracking continues past the element bounds.
- Multi-touch protection: ignore extra touch points after a drag begins (`if (isDragging) return`).
- Damping/friction past a boundary instead of a hard stop.

## Output

Group by file; skip clean files; end with a prioritized summary (highest-impact first). Findings flow
into the normal Phase 05 scoring and the ≥75 cutoff like any other axis.
