# Workflows — run one agent per tracker item

A `kind = "workflow"` action runs the same shell command once per target. Each target gets its own git worktree and branch. Targets are beads or GitHub issues. Worker concurrency is capped. A finished worker is removed when its work is safe to delete. The tool names no agent and sends no prompt; the manifest's `run` string is the whole launch.

Design records: ADR-0017 (the orchestrator never lands work), ADR-0018 (row key bindings), ADR-0020 (the launcher is configuration), ADR-0021 (a workflow launch is a manifest string). All under `docs/adr/` in the admin-project-tool repo.

## Declaring one

```toml
tracker = ["beads"]                 # which tracker(s) the project uses; "beads" and/or "github"

[actions.implement]
kind = "workflow"
over = "selection"                  # or: over = { query = "ready" }
run  = 'claude "/implement $ADMIN_TARGET afk"'
done = 'bd show "$ADMIN_TARGET" --json | jq -e ".[0].status == \"closed\""'
locale = "window"                   # where workers run; default window

[commands.implement]
desc  = "Dispatch an agent over the selected bead(s)"
steps = ["implement"]               # commands stay pure routing

[keys.bead]
enter = "implement"                 # optional: bind a row key to it
```

| Key | Rule |
| --- | --- |
| `run` | Required, non-empty. A shell string run in the target's worktree with `ADMIN_TARGET` set to the target id. |
| `over` | Required. `"selection"` or `{ query = "...", tracker = "..." }`. Anything else fails `admin check`. |
| `done` | Optional shell predicate, polled with `ADMIN_TARGET` set. Exit 0 means the worker finished. With no `done`, the worker finishes when its pane (or process) ends. |
| `locale` | `window` (default) or `hosted`. See Where workers run. |

`agent`, `mode` and `prompt` are rejected by name. Write the whole agent invocation, prompt included, in `run`.

## Where targets come from (`over`)

- **`over = "selection"`** is row-only. It never appears in the Commands tab. Run bare from a shell it exits with an error naming the dashboard gesture. In the dashboard: Beads, Issues or PRs tab, `space` to select rows, then `w` to pick the workflow. A `[keys.<row>]` binding to a single-step workflow command does the same, and over the cursor row alone when nothing is selected.
- **`over = { query = "..." }`** appears in the Commands tab and runs bare. Two query forms exist:
  - `ready` — every open bead with no open blocker (beads only; GitHub has no dependency edges, so `ready` on a github tracker is an error).
  - `label:<name>` — every open item carrying that label (beads or github).
- **`over.tracker`** picks the tracker a query resolves against. With one declared tracker it defaults to that one; with two it is required; with none it is `beads`. An undeclared name fails `admin check`.

A query never dispatches unseen. The CLI prints the query, the `run` string, the ceiling and the target list, then waits for a yes on the terminal. The dashboard shows the same in an overlay. A query matching nothing dispatches nothing and exits 0. A dispatch where any target fails exits non-zero, naming the first failure.

## What a dispatch does

For each target, `kinds.DispatchTargets` (`internal/kinds/workflowdispatch.go`) does the following. The CLI and the dashboard share this one path.

1. Creates a worktree and branch named for the target, seeded with the project's populate files (the same code as `admin worktree`).
2. Starts the worker, at most `ceiling` at a time. The rest queue and start as slots free.
3. Records the worker in the live-work registry, so it shows as a row on the Work tab.

The ceiling is `[workflow] ceiling` in the project config. Default 3. It is project-wide, not per workflow.

A worker that has finished but is not yet removed still holds its slot.

## Where workers run (`locale`)

- **`window`** needs a `[terminal]` table (spawn/attach/kill, optional status/read). The launcher opens one pane per worker, running `run`. Worker `spawn` also gets `ADMIN_GROUP` (one id per dispatch: action name plus start time) and `ADMIN_INDEX` (the target's position from 0). The tool only supplies them. Grouping workers into one workspace is the user's spawn script's job, and spawns run concurrently, so `ADMIN_INDEX=0` may not run first. The script must lock its find-or-create.
- **`hosted`** runs `run` under `/bin/sh -c` on a pty the dashboard owns, in the target's worktree. No `[terminal]` and no multiplexer needed. The slot frees when the process exits. From a plain shell, hosted workers run inline, one at a time.

A workflow action itself always runs on the dashboard's own surface, because its confirmation reads from that terminal. A `[terminal]` whose `spawn` fails degrades to the default surface with one warning line. The tool never blocks a dev loop because the launcher is broken.

Full `[terminal]` contract, with a herdr example: `docs/adr/0020-the-launcher-is-configuration-not-code.md` and the "Dispatch locale" section of the repo's `CLAUDE.md`.

## Finish and cleanup (reaping)

The dashboard tick runs `ReapWorker` (`internal/kinds/reap.go`) on each worker row.

- **Finished** means `done` exits 0 (5-second limit; a timeout or error is not finished). With no `done`, `[terminal].status` reporting the pane gone. A hosted worker finishes only through a passing `done`.
- **Safe to delete** is fixed in Go and not configurable. The worktree must be clean and `origin/main..<branch>` must be empty.
- On pass: `[terminal].kill` (or the pty kill for hosted), remove the worktree and branch, mark the row exited, free the ceiling slot.
- On fail: everything stays and the reason shows on the row.

The orchestrator never merges, pushes or opens a PR (ADR-0017). The worker lands its own work inside its own session. The reaper only cleans up after work that already landed.

## Work tab

Every live entry (a hosted command, a launcher-dispatched command, a worker) is a row in one list. Worker rows add a branch/pane badge and an activity line. With `[terminal].read` declared, the row under the cursor shows a live snapshot of the pane; without it, the band says to attach. Attaching runs `[terminal].attach`, which focuses the real pane. A worker waiting on a prompt past a threshold is marked Stuck, and a nudge sends it one canned continuation message. A nudge is never a keystroke and never a restart.

Row-bound keys: `[keys.command]`, `[keys.commandTarget]` and `[keys.worker]` bind keys on Work rows. The environment carries `ADMIN_ROW_KIND`, `ADMIN_ROW_ID` and `ADMIN_ROW_URL`.

## Checking and debugging

- `admin check` validates `over`, `run`, `done`, the removed keys, `over.tracker` against `tracker`, and query forms against the tracker.
- `admin <action>` from a shell runs a query workflow with the confirm prompt. A selection workflow errors by design.
- A fresh worktree has no `admin.toml` (it is untracked). A workflow's worker inherits whatever `populate` copies in.
- A worker not reaped: read the note on its Work row. The usual causes are a dirty worktree, or commits not on `origin/main`.
