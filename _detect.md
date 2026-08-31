# Domain detection

Every engine that reads domain cells (`ref-<label>/`) decides which labels are in scope the same way. A
label is a directory of engine cells — `apple`, `web`, `react`, `threejs`, `gui`, `tui`,
`api`, `game`, and any other name in the vocabulary below. There is no split between
"stack" labels and "mode" labels: both kinds stack the same way, in the same store.

## Where labels come from

**One map, outside the project.** A private file keyed by main-checkout absolute path, with
path-scoped label rules per repo. Nothing is written into a project repo.

Resolve in this order, stop at the first that answers:

1. **Explicit argument.** The invocation named a label (e.g. `review game`) → use it.
2. **The map.** Look up the repo's main-checkout path; resolve labels for the paths in
   scope using the grammar below. This is the steady state.
3. **Repo absent from the map, or you disagree with its line** → classify the repo, propose
   the line in plain chat, and add it once the user confirms. Do not silently re-classify a
   repo the map already answers for.
4. **No `ref-<label>/` fits** a label you want → offer to author a stub, then add the
   label. This is how new labels are born; don't fall back to generic-only without offering.
5. **A repo whose line has an empty label set** is *classified, nothing applies* — not
   unclassified. Generic-only, no overlay, and step 3 does not re-run for it.

**A per-repo `.claude/domain` marker is no longer used.** Five existed, four were committed
into their project repos, and one disagreed with the code it described. They were removed on
2026-08-23. Two reasons the central map replaces them: a marker naming a private label
discloses that label to anyone who clones the repo, and a worktree needs its parent's labels
rather than a copy that drifts.

## Map grammar

One block per repo. Absolute main-checkout path, then indented rules — first-token glob,
colon, comma-separated labels. `**` is the repo-wide rule.

```
/Users/pierce/Projects/wedding:
  tui/**: go, tui
  **: cloudflare, node, tui, web
```

Resolution:

```
labels(scope_paths) =
  ⋃ { rule.labels | rule ∈ block, any(p matches rule.glob for p in scope_paths) }
```

`scope_paths` is the diff / target dir / file under discussion, never the whole repo. A repo
with several targets (a mac app + an iOS app + a web dashboard) resolves to the labels of the
code actually being worked on. **The `**` rule always applies**, so a scope rule adds to it
rather than replacing it.

A **worktree resolves to its main checkout** — `git rev-parse --absolute-git-dir`, strip
`/.git/worktrees/<name>`. Labels describe a project, not a checkout of it.

## Two roots

A label's cells may live in either of two stores, and both are loaded:

- **Public** — the store this file is in. Generic, shareable, names no person, host, service
  or account.
- **Private** — a second root outside this repo, holding labels and cell halves that must
  not be published.

The public store does not name which private labels exist, or describe the private root.
Naming one would disclose the thing the split exists to prevent. The resolver that reads both
lives with the private store, not here.

## Stacking, not layering

Load `ref-<label>/<engine>.md` for **every** matched label — there is no "platform
first, domain on top" order. A missing cell for a matched label is a no-op.

## No precedence

If two matched labels' cells disagree, there is no tiebreak. The engine emits a finding
naming both files — ranking them would guard a duplication that should be removed instead.

Two deliberate exceptions where cells overlap and that is correct, not a finding:

- `gui` and `tui` both state interface fundamentals (hierarchy, feedback, error states).
  They are siblings; `tui` explicitly does not inherit `gui`'s pointer, hover and motion
  guidance, which is wrong in a terminal.
- `desktop` always implies `gui`. A desktop application necessarily has a graphical
  interface; a server that happens to run on a Mac is `backend` and nothing else.

## `context.md` — the injected cell

Every label may carry a `context.md`, and it has **two tiers**, both enforced by
`hooks/domain-context-size-check.sh`:

- The **headline** — the first `> ` line under the H1, **12 words**. This is the only part
  injected at session start, and it is injected for every label the repo carries. State the
  one fact whose absence would cause a wrong action.
- The **body** — everything below it, **120 words**, measured with the headline excluded. A
  routing table, not a knowledge store: read on demand by whichever engine resolved this
  label into its scope, with links to the sibling files that hold the depth.

Only the headline is charged to every session, so injection cost scales with how many labels
a repo carries, not with how much each cell has to say. A per-cell cap alone bounded nothing
about the sum, and the sum is what a session pays.

A label with nothing worth injecting simply has no `context.md`. A cell with a body but no
headline is a *broken* cell, and session start says so rather than dropping it silently.

A label that is the default for its axis deliberately has no cell — `tracker:github` is the
example. A cell there would fire in most repos and say only what was already assumed.

## Vocabulary

`admin, api, app-store, apple, backend, cli, cloudflare, container, desktop, docs-site,
game, go, gui, mobile, node, python, react, rust, threejs, tui, tvos, web`

Plus private labels, which are not listed here.

## Adding a label

Create `ref-<name>/` with the engine cells that apply, add a `context.md` if something
must be known up front, then add the label to the repos it applies to. No code change — the
engines already read `ref-<resolved>/<engine>.md` and no-op when absent.

## Classifier heuristic

Used only when classifying a repo that the map does not answer for (step 3), never as a
runtime step. **Read a declaration, not free text.** Every generation of this table that
grepped prose produced false positives — a lockfile mentioning `react`, the word `Expo` in a
comment, archetype templates describing other projects, and the word *electron* in a Unity
audio file all produced wrong labels.

| Signal | Label |
| --- | --- |
| `*.xcodeproj` / `*.xcworkspace` / `Package.swift` / `project.yml`, depth ≤ 2 | `apple` |
| `IPHONEOS_DEPLOYMENT_TARGET` in `*.yml` / `*.pbxproj` / `*.xcconfig` | `mobile` |
| `TVOS_DEPLOYMENT_TARGET`, `appletvos`, `import TVUIKit` | `tvos` |
| `import SwiftUI` / `AppKit` / `UIKit` in `*.swift` | `gui` |
| `import AppKit` / `NSApplication` in `*.swift`; `electron` / `tauri` as an npm dep | `desktop` (implies `gui`) |
| `bubbletea` / `tview` / `lipgloss` in `go.mod`; `ratatui` / `crossterm` in `Cargo.toml` | `tui` |
| `react` as a direct npm dep | `react` |
| `three` as a direct npm dep | `threejs` |
| `react` / `vue` / `svelte` / `next` / `vite` / `astro` npm dep, or `index.html` | `web` |
| `wrangler.*` | `cloudflare` (implies `web`) |
| `.vitepress/` or `vitepress` npm dep | `docs-site` (does **not** imply `web`) |
| `go.mod` / `Cargo.toml` / `pyproject.toml` / `package.json` | `go` / `rust` / `python` / `node` |
| `cobra` / `clap` / `commander` / `typer` in the manifest | `cli` |
| `gin` / `axum` / `express` / `fastapi` in the manifest | `backend` |
| `Dockerfile` / `docker-compose.y*ml` | `container` |
| `admin.toml` | `admin` |
| `.beads/` present / absent | `tracker:beads` / `tracker:github` |

Exclude from every content search: lockfiles, `go.sum`, `vendor/`, `node_modules/`, `Pods/`,
`dist/`, `build/`, `tmp/`, `docs/`, `scripts/`, `archetypes/`, `templates/`, `examples/`,
`fixtures/`, `testdata/`, `tests/`, `test/`, `spec/`, `__tests__/`, and all markdown.

**The heuristic cannot see intent.** A renderer that draws over a video stream declares no
GUI toolkit and is not a GUI; a repo full of templates is not the things it describes. When
the signals are ambiguous, ask rather than guess.
