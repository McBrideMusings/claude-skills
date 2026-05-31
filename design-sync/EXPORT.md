# Export — app is canonical, seed a new Claude Design project from it

No prototype was provided. The existing app is the source of truth. Your job is to produce a package the user can feed into a **new Claude Design project** so it bootstraps from the current app instead of from a blank canvas. Claude Design imports via a **linked code repository** (scoped to a subdirectory — not a whole monorepo), **screenshots**, and a written brief. You prepare those; the user does the upload/link in the browser (there is no API).

## Phase 0 — Run the app and prove it

1. Launch the existing app with the project's own run path (prefer a project `run`/`dev` skill or task runner; otherwise the standard command for the stack).
2. Drive it with Playwright and enumerate every screen / route.
3. Write `tmp/claude/design/INGESTION.md` — each screen → real screenshot path + route + viewport.
4. **GATE.** If you can't actually run and render the app, STOP and say exactly what's blocking (build error, missing env, etc.). Don't describe screens you haven't seen — the same anti-phantom rule applies to the source side.

## Phase 1 — Build the Manifest

From the **running app**, populate `tmp/claude/design/manifest.md` with the same structure IMPORT uses, so the two directions share one baseline:

- **Design tokens** — exact color / type / spacing / radii / shadow / breakpoint values, read from `getComputedStyle` and from source (Tailwind config, CSS variables, theme files).
- **IA / route map** — every screen, its route, its purpose.
- **Per-screen layout spec** — structure, components, spacing, alignment.
- **Functionality** — interactions, states, data shown.

## Phase 2 — Scope for Claude Design's import

- Identify the **specific subdirectory(ies)** to link — the UI/component/route code only. Claude Design lags on whole monorepos; name the exact path(s) for the user to link, not the repo root.
- Capture a clean screenshot per screen at the key viewport(s) into `tmp/claude/design/screenshots/`.

## Phase 3 — Write the seed brief

Write `tmp/claude/design/seed-brief.md` **as the opening prompt for the Claude Design chat**, containing:

- **Goal & audience** — what the app is, who it's for.
- **IA** — the screen/route map.
- **Per-screen spec** — layout + functionality for each screen.
- **Design tokens** — the palette / type / spacing summary, so the prototype starts on the app's real values (note: Claude Design will also apply the org design system automatically — flag any conflicts for the user to reconcile).
- **Attach checklist** — which subdirectory to link, which screenshots to upload.

## Phase 4 — Baseline for future sync

There is no automatic sync between the app and Claude Design. The Manifest you just wrote is the **baseline**: after the user designs in Claude Design and exports, a later IMPORT run diffs the new prototype against this baseline to show exactly what changed. Note in the Manifest the app's git SHA / date so the baseline is anchored.

## Phase 5 — Reconcile report (back-sync)

Write `tmp/claude/design/reconcile.md` — the back-sync delta — following [RECONCILE.md](RECONCILE.md). Direction is EXPORT, so the reconcile target is the **code**. The brief and screenshots are the source the new design will be built from; where they intentionally can't capture the live app (a state you omitted, a behaviour a screenshot can't show, a simplification you made for clarity), **raise it with the user, get agreement, and log it here** so the seeded design knows what to honour and a later IMPORT diff stays clean.

- Body = the agreed simplifications, each with live-app behaviour → how it was packaged → why agreed → how to reconcile.
- "Open (unresolved) differences" must read **none**.
- Include the standalone paste-back block. If brief and screenshots capture the app faithfully, the report is still written — "fully in sync," empty deviations.

## Done

Point the user at the deliverables and the manual steps:

- `tmp/claude/design/seed-brief.md` — paste as the first Claude Design message
- `tmp/claude/design/screenshots/` — upload these
- the subdirectory path(s) to link as the code repository
- `tmp/claude/design/reconcile.md` — the back-sync delta to keep alongside the seed; do not paste it anywhere yourself

Be explicit that you can't create the Claude Design project yourself — these are the inputs they paste/link at `claude.ai/design`.
