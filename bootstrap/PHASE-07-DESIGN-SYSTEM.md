# Phase 07 — Design System

A web app's design lives in one hand-edited file, `DESIGN.md`, which `dsys` exports to a
Tailwind v4 `@theme` file and checks. This phase reconstructs `DESIGN.md` from the app's own
CSS when it is missing, wires the export and the ESLint fragment, and turns everything still
wrong into follow-up rows for the Phase 08 slate. Reference for every command:
`<dsys checkout>/docs/README.md`.

Run every `dsys` command from the repo root. dsys picks the app folder from the current
directory, so running it from a subfolder changes which `components.json` it uses.

## Gate

This gate is the only place that decides whether the phase runs; Phase 01 runs it too, to fill
its row.

1. **Web UI.** A `package.json` outside `node_modules/`, `docs/` and `.vitepress/` whose folder
   holds a `components.json`, a `tailwind.config.*`, a `tailwindcss` dependency, or a
   `.css`/`.scss` file under `src/`, `app/` or `styles/`. None → row `n/a — no web UI`, phase
   ends. A docs site's theme CSS does not count.
2. **dsys.** `command -v dsys` fails → row `dsys not installed`, phase ends.
3. **State.** `dsys status --json`. Its `mode`, `designMd`, `export.freshness` and `lintWired`
   fields pick the branch below.

## Non-owned repo (`mode: non-owned`)

Write nothing: `DESIGN.md` belongs to the repo's owners, and `dsys export` and
`dsys lint-config` refuse there. Row `non-owned`, plus whatever `status` reported.

## Owned repo, no `DESIGN.md` — reconstruct

1. `dsys init --from-code --json`. It writes `DESIGN.md` from the colours, fonts, radii and
   spacing in the repo's CSS and `tailwind.config.*`, folding near-duplicate colours together.
   Keep its JSON: `sources` (what it read), `competing` (spec files, hand-kept token files and
   handoff or prototype folders it did **not** read), `unread` (Sass/Less it cannot parse) and
   `appRoot` (the app folder it chose, `null` for the repo root).
   - Exit 1 naming two or more `components.json` folders is a judgement call: ask which folder
     is the app, as an options question, then rerun with `--app-root <folder>`.
2. `dsys export` — writes `<appRoot>/src/design.generated.css`.
3. **Wire the export.** In the stylesheet that imports Tailwind v4 (`@import "tailwindcss"` or
   `@import "tailwindcss/theme.css"`), add an `@import` of the generated file on the line after
   that import. Compute its path relative to that stylesheet: `./design.generated.css` from
   `src/index.css`, `../src/design.generated.css` from `app/globals.css`. No such stylesheet
   means the app is not on Tailwind v4 and nothing reads the export: write no import and carry
   a follow-up row saying so.
4. **ESLint fragment** — only when `components.json` names a ui folder and the app folder has
   an `eslint.config.*`:
   - `dsys lint-config` writes `<appRoot>/eslint.dsys.config.mjs`. When it names packages the
     repo has not installed, run the `npm install --save-dev …` command it prints, in the app
     folder.
   - Import the fragment in that `eslint.config.*` and spread it into the exported array, then
     confirm `dsys status --json` reads `"lintWired": true`.
   - `npx eslint --suppress-all` in the app folder records the violations the code already
     has, so the gate starts at zero.

   No `components.json` ui folder or no ESLint config: skip the fragment and say which in the row.
5. `dsys check --json`. A reconstruction normally leaves `theme-unused` errors: the tokens
   carry the app's values, but the code still writes the raw values (`#1a1c1e`, not
   `bg-primary`), so no group is read yet. That is the expected starting state, not a failure of
   this phase. `implement` fails a pass only on records its diff adds
   ([`../implement/VERDICTS.md`](../implement/VERDICTS.md) §Design-system checks), so these do
   not block unrelated work.

## Owned repo, `DESIGN.md` present — audit

Regenerate what dsys generates; report the rest.

- `export.freshness` `missing` or `stale`, or an `export-stale`/`export-missing` record →
  `dsys export` (the file is generated; rewriting it loses nothing), then wire it as in step 3
  when no stylesheet imports it. `unknown` means `DESIGN.md` has a lint error; `check` reports
  it, and it becomes a row.
- A `lint-config-stale` record → `dsys lint-config`.
- `lintWired: false` with a `components.json` ui folder and an `eslint.config.*` → step 4.
- Rerun `dsys check --json`; the records left become follow-up rows.

## Follow-up rows for Phase 08

Each becomes a row on Phase 08's slate, never a file and never a fix made here. Rows use the
slate's three words; `[file]` files the row through `issues file` on the Phase 05 backend.

- **One row per `competing` path**, default `[skip]` (keep it as it is): the path and what it
  holds (a spec, a token file, a prototype folder). `fix` merges its values into `DESIGN.md`
  by hand now, then `dsys export`; `file` files "merge or retire <path>". Its values are not
  in `DESIGN.md` until one of those happens. Deleting it is the user's call, never a default.
- **One row per `theme-unused` group**, default `[file]`: "move the `<group>` group onto
  tokens", naming a file that still writes one of that group's values (grep the app folder for
  a value from the group in `DESIGN.md`; dsys does not report which file).
- **One row per other `error` record**, default `[file]`, with its `kind`, `file` and message.
- **`warning` records**, one row listing them, default `[skip]`: they leave `check` at exit 0.
- **`unread` stylesheets**, one row, default `[file]`: their values are not in `DESIGN.md`.
- **No Tailwind v4 entry stylesheet**, one row, default `[file]`: the export is unread until
  the app moves to Tailwind v4.

## Row in the result table

```
| Design system | missing | DESIGN.md from 3 stylesheets; export wired in src/index.css; lint wired; 4 theme-unused, 2 competing |
```

Then proceed to [PHASE-08-SUMMARY-AND-BACKFILL.md](PHASE-08-SUMMARY-AND-BACKFILL.md).
