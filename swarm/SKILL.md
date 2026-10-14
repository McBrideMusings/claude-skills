---
name: swarm
description: "Burn down a repo's beads with several unattended Claude workers at once, each an `implement <id> auto` pass in its own worktree and herdr space, refilling a slot whenever one finishes. Optional focus steers what it picks: `swarm the web browser feature`, `swarm epic:cc-12`, `swarm label:client 4`. Use for 'run a swarm', 'burn down the backlog in parallel', 'have agents work through the client issues'."
---

# Swarm

`swarm [<focus>] [<n>]` keeps `<n>` workers (default 3) running against the repo's ready
beads until the scope runs dry. This session is the **lead**: it picks, launches, verifies,
re-picks. Each **worker** is a whole Claude session running `implement <id> auto` in its own
worktree, which lands its own branch and closes the bead
([`../implement/AUTO.md`](../implement/AUTO.md)).

What `swarm` reuses rather than owns:

| Job | Owner |
| --- | --- |
| Ranking ready beads, grouping related ones, applying a focus | [`issues next`](../issues/next.md), autonomous-caller mode |
| `epic:` / `label:` / bare-id scopes | [`../implement/SELECTORS.md`](../implement/SELECTORS.md) |
| An epic's parallel waves | `bd swarm validate <epic>` |
| The worker's whole pass, its landing and its parking | `implement <id> auto` |
| The herdr space, the outfile, the wait | `dispatch exec`, via the `swarm launch` script |

A swarm is **report-back** ([`../dispatch/TARGETS.md`](../dispatch/TARGETS.md) § Who feeds the
result back): the lead waits for each worker, reads its outfile and verifies what it claims.

## Workers share one machine

Worktrees isolate source and nothing else. Several workers on one machine compete for CPU,
memory and disk, and collide on anything with a fixed name. Three rules, in every runtime:

- **Heavy work takes turns.** Every build, test run, lint and other CPU-heavy command runs
  through `swarm heavy -- <command>`: one lock per repo, shared by all its worktrees. One build
  using every core finishes sooner than three splitting them, and the user's machine stays usable.
  The kernel releases the lock when its holder dies.
- **Build once, share the output.** Caches that are safe to share are shared — compiled
  dependencies, package stores, downloads — so no worker starts cold.
- **Isolate what has a fixed name.** Ports, sockets, simulators, temp paths and databases get one
  per worker, derived from `$SWARM_WORKER` (the bead id), and are removed when the pass ends.

How each rule applies depends on the runtime and the project, in two layers that `swarm check`
names and every worker's brief points at:

| Layer | Where | Holds |
| --- | --- | --- |
| Runtime | `skills/ref/<runtime>/swarm.md`, picked by marker files (`Cargo.toml` → rust, `go.mod` → go, `pyproject.toml` → python, `package.json` → web, `Package.swift` or an Xcode project → apple) | what is true of every project in that runtime, plus the defaults `swarm launch` sets — for rust, one shared `CARGO_TARGET_DIR` and rust-analyzer off |
| Project | `<repo>/.claude/skills/swarm-worker/` | this project's heavy commands, cheap check, shared caches, per-worker resources, queues, slot cap. Wins over the runtime layer |

## Project support

Every project with a build or test step keeps a `swarm-worker` skill. `swarm check` exits 4
without one. Write it then, before any worker starts, from
[`PROJECT-SKILL.md`](PROJECT-SKILL.md): read the repo's build files, test setup, `admin.toml`
and verify skill, and answer each section with real commands. Commit it on a branch and land it
with the swarm's results; `swarm launch` reads it from the main checkout, so workers see it
before it lands.

## 1. Gate

From the repo's main checkout:

```bash
"$HOME/.claude/skills/swarm/swarm" check
```

It refuses outside herdr, on a repo `repo-tier` does not call `owned` (workers land themselves),
and when `bd` or the Claude login is broken. A refusal ends the run; report it. Exit 4 is the
one exception: write the project's `swarm-worker` skill (§ Project support) and check again.
It opens the repo's herdr space when none is open, so every worker nests under it as a child
space; `launch` refuses until that space exists. It prints the runtimes it found, their pages,
and the environment and settings every worker gets — put those in the first status line.

**Slots.** `<n>` defaults to 3. A `SWARM_MAX_WORKERS` in the project's `swarm-worker/env` caps
it; say so when it lowers the user's number.

A worker in a repo Claude has never been trusted in stops at the "trust this folder" dialog,
and its launch fails with `agent_not_ready`. A worktree inherits its main checkout's trust, so
the fix is one interactive `claude` in the main checkout, answered by the user.

## 2. Resolve the scope

| Focus | Scope |
| --- | --- |
| none | `issues next`, autonomous-caller mode: every ready group and singleton, ranked |
| `epic:<id>`, `label:<name>`, bead ids | SELECTORS.md, intersected with `bd ready --limit 0 --json`. For an epic, also run `bd swarm validate <epic>` and cap `<n>` at its maximum parallelism |
| free text — "the client", "the web browser feature" | `issues next focus="<text>"`, autonomous-caller mode |

Drop every bead whose notes carry `auto parked`. Print the frozen queue in the first status
line: mode (report-back), `<n>`, the focus, and the first `<n>` beads with titles. That line is
the user's chance to redirect a focus that resolved wrong.

**Related work first.** Take the top-ranked group's members before moving to the next group.
Never run two beads at once when one blocks the other, even transitively; the blocked one waits
for the blocker to land and turns up in a later re-pick.

## 3. Pick each worker's model

State it per bead in the status line.

- **haiku** — mechanical: a rename, a string, a bounds check, a config value.
- **sonnet** — the default. A bead whose body names the files and the change is Sonnet's.
- **opus** — only with an `Opus reason:` from the global list: the change's shape is unsettled
  and must be designed; the cause is still unlocated after a Sonnet pass looked; a
  cross-cutting refactor whose structure is open. Pass it as `--opus-reason "<text>"`. A
  Sonnet worker that parked with "cause not found" is the usual way a bead earns Opus on its
  next launch.

## 4. Launch

One Bash call per slot, **each with `run_in_background: true`**:

```bash
"$HOME/.claude/skills/swarm/swarm" launch <bead-id> <model> [--opus-reason "<text>"]
```

It creates `~/.worktrees/<repo>/<bead-id>` on branch `swarm/<bead-id>`, marks it
SELF-LAND, writes the brief to the worktree's git dir, and blocks on `dispatch exec` until the
worker is idle or done. The worker starts with `SWARM_WORKER=<bead-id>`, the runtime and project
environment, and the merged `--settings`. Its brief tells it to read the project's
`swarm-worker` skill and the runtime pages before its first build, and to run every heavy
command through `swarm heavy`. stdout is one line: bead, exit code, outfile, worktree.
`--dry-run` prints the environment, settings and brief and creates nothing.

The harness notifies you when a launch exits. Never poll with `ScheduleWakeup`. A worker stuck
on a permission prompt shows in herdr's sidebar as blocked and in its launch log; if the user
asks how the run is going, name blocked workers and their panes.

## 5. When a worker finishes

1. Read its outfile. A non-zero exit, or an outfile that is a pane dump rather than a report,
   is a failed worker: record it with the last lines of its output and don't relaunch that bead
   this run.
2. Verify its claim: `bd show <id> --json` shows the bead closed, and
   `git -C <repo> log --oneline -1 <sha>` finds the landing commit on the default branch. A
   parked bead has an `auto parked` note; record the reason.
3. Close its space: `herdr workspace list`, find the one whose cwd is the worker's worktree,
   `herdr worktree remove --workspace <id> --force` when it landed (git-sweep reaps any left),
   `herdr workspace close <id>` when it parked so the branch stays for the user.
4. Re-resolve the scope (step 2) — landings unblock beads — and launch the next one into the
   free slot.

The run ends when no ready bead in scope remains unlaunched and every slot is empty.

## 6. Report

One section, in chat:

- **Landed** — bead, title, model, commit sha.
- **Parked** — bead, the reason from its note, the branch holding the work.
- **Decided without you** — every `auto decided` note the workers wrote, one line each.
- **Failed** — bead, exit code, the last lines of its output.
- **Left in scope** — beads still blocked, and what blocks each.

Close with `swarm: <landed> landed, <parked> parked, <failed> failed, focus <focus or none>`.
