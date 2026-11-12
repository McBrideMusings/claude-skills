# Phase 07 — Design

A repo with a UI surface keeps every design decision in one hand-edited file, `DESIGN.md` at
its root (Google's DESIGN.md format), and the procedure for working against it in its
`project-design` skill. This phase writes `DESIGN.md` when it is missing, audits it when it is
present, and turns what is still wrong into follow-up rows for the Phase 08 slate. How to write
both: [`../project-skills/design.md`](../project-skills/design.md).

## Gate

This gate is the only place that decides whether the phase runs; Phase 01 runs it too, to fill
its row.

1. **UI surface.** Any of: a `package.json` outside `node_modules/`, `docs/` and `.vitepress/`
   whose folder holds a `components.json`, a `tailwind.config.*`, a `tailwindcss` dependency,
   or a `.css`/`.scss` file under `src/`, `app/` or `styles/`; SwiftUI or AppKit/UIKit views
   (`import SwiftUI`, `NSView`, `UIView` under the source tree); a native UI crate (`gpui`,
   `egui`, `iced`, `ratatui`) in `Cargo.toml`; a game engine project with a HUD or menus. None →
   row `n/a — no UI surface`, phase ends. A docs site's theme CSS does not count.
2. **Ownership.** `~/.claude/tools/repo-tier <repo>`. Anything but `owned` → write nothing:
   `DESIGN.md` belongs to the repo's owners. Row `<tier>`, plus whether a `DESIGN.md` exists.

## Owned repo, no `DESIGN.md` — write it

1. Write `DESIGN.md` per [`../project-skills/design.md`](../project-skills/design.md)
   §Writing it: values from the code, Layout and Components from the running app, the Overview
   drafted from screenshots.
2. Point the stack's token file at the same values where the stack has one (CSS custom
   properties or a Tailwind v4 `@theme` block, an asset catalog, a theme struct). Hand-written,
   in the same commit; there is no generated file.
3. `npx --yes @google/design.md@0.4.0 lint DESIGN.md`. An `error` finding is fixed now.
4. When the repo has project skills but no `project-design`, write it per the same page.

## Owned repo, `DESIGN.md` present — audit

Run [`../project-skills/design.md`](../project-skills/design.md) §Audit and report what it
finds. A `DESIGN.md` written for dsys (front matter with `appRoot:` or `implementations:`,
an imported `design.generated.css`, an `eslint.dsys.config.mjs`) keeps its tokens and prose;
the dsys-only keys, the generated file and the fragment become one follow-up row.

## Follow-up rows for Phase 08

Each becomes a row on Phase 08's slate, never a file and never a fix made here. Rows use the
slate's three words; `[file]` files the row through `issues file` on the Phase 05 backend.

- **One row per competing design source** — a spec, a hand-kept token file, a handoff or
  prototype folder whose values `DESIGN.md` does not hold — default `[skip]`. `fix` merges its
  values into `DESIGN.md` now; `file` files "merge or retire <path>". Deleting it is the user's
  call, never a default.
- **One row per token group the code does not use yet** (the code writes raw values where
  `DESIGN.md` has tokens), default `[file]`: "move the `<group>` group onto tokens", naming a
  file that still writes one of its values.
- **One row per lint `error`**, default `[file]`.
- **dsys leftovers**, one row, default `[fix]`: remove the dsys-only front-matter keys, the
  generated export and its import, and the ESLint fragment, after copying the tokens into the
  stack's own token file.

## Row in the result table

```
| Design | missing | DESIGN.md from 3 stylesheets and the running app; tokens in src/theme.css; lint clean |
```

Then proceed to [PHASE-08-SUMMARY-AND-BACKFILL.md](PHASE-08-SUMMARY-AND-BACKFILL.md).
