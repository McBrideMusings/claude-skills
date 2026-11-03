# Domain detection

Every engine that reads label pages (the knowledge base's `~/Knowledge/ref/<label>/`) decides which labels are in scope the same way. A
label is a directory of engine pages — `apple`, `web`, `react`, `threejs`, `gui`, `tui`,
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
4. **No label directory in the knowledge base fits** a label you want → offer to author a stub, then add the
   label. This is how new labels are born; don't fall back to generic-only without offering.
5. **A repo whose line has an empty label set** is *classified, nothing applies* — not
   unclassified. Generic-only, no overlay, and step 3 does not re-run for it.

**No per-repo marker file holds labels.** A marker naming a private label discloses that label
to anyone who clones the repo, and a worktree needs its parent's labels rather than a copy that
drifts.

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

## Where the pages live

A label's pages live in the knowledge base: `~/Knowledge/ref/<label>/` for a shared label and
`~/Knowledge/ref/local/<label>/` for a private one. The label index is `~/Knowledge/ref/INDEX.md`.
A reader with no knowledge base has no label pages and every engine runs its generic process.

This file names no private label.

## Stacking, not layering

Use the `<label>/<engine>.md` page for **every** matched label — there is no "platform
first, domain on top" order. An engine reaches a label's page by searching the knowledge base for
"<label> <engine>" (for example "apple diagnose"), and skips the search when it has no knowledge
base; `review` is the exception, because `review/tool/lens-gate` reads each label's `review.md`
directly. A missing page for a matched label is a no-op.

## No precedence

If two matched labels' pages disagree, there is no tiebreak. The engine emits a finding
naming both pages — ranking them would guard a duplication that should be removed instead.

Two deliberate exceptions where pages overlap and that is correct, not a finding:

- `gui` and `tui` both state interface fundamentals (hierarchy, feedback, error states).
  They are siblings; `tui` explicitly does not inherit `gui`'s pointer, hover and motion
  guidance, which is wrong in a terminal.
- `desktop` always implies `gui`. A desktop application necessarily has a graphical
  interface; a server that happens to run on a Mac is `backend` and nothing else.

## `context.md` — the label's root page

Every label may carry a `context.md` in the knowledge base:

- The **headline**: the first `> ` line under the H1, 12 words, stating the one fact whose
  absence would cause a wrong action.
- The **body**: everything below it, 120 words, a routing table with links to the sibling
  pages that hold the depth.

`~/.claude/hooks/knowledge-inject.sh` finds these pages through a qmd search when a prompt is
sent or a skill loads and injects the ones a model judges apply; otherwise an engine reads the
page on demand once it has resolved the label into scope. A label with nothing worth saying
has no `context.md`.

A label that is the default for its axis deliberately has no page — `tracker:github` is the
example. A page there would fire in most repos and say only what was already assumed.

## Vocabulary

`admin, api, app-store, apple, audio, backend, cli, cloudflare, container, desktop, docs-site,
game, go, gui, mobile, node, python, react, rust, threejs, tui, tvos, web`

Plus private labels, which are not listed here.

## Adding a label

Create `~/Knowledge/ref/<name>/context.md` (headline, body, Files map) and the engine pages that
apply (a `review.md` opens with the `run:`/`when:` frontmatter `review/tool/lens-gate` reads),
add the label's row to `~/Knowledge/ref/INDEX.md` (a private label goes under
`~/Knowledge/ref/local/<name>/` and gets no row), then add the label to the repos it applies to. No
code change — the engines search the knowledge base for the resolved label's page and no-op when
it is absent.

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
| `import AVFoundation` / `AVAudioEngine` in `*.swift`; `howler` / `tone` / `wavesurfer.js` npm dep; `cpal` / `rodio` in `Cargo.toml` | `audio` |
| `Dockerfile` / `docker-compose.y*ml` | `container` |
| `admin.toml` | `admin` |
| `.beads/` present / absent | `tracker:beads` / `tracker:github` |

Exclude from every content search: lockfiles, `go.sum`, `vendor/`, `node_modules/`, `Pods/`,
`dist/`, `build/`, `tmp/`, `docs/`, `scripts/`, `archetypes/`, `templates/`, `examples/`,
`fixtures/`, `testdata/`, `tests/`, `test/`, `spec/`, `__tests__/`, and all markdown.

**The heuristic cannot see intent.** A renderer that draws over a video stream declares no
GUI toolkit and is not a GUI; a repo full of templates is not the things it describes. When
the signals are ambiguous, ask rather than guess.
