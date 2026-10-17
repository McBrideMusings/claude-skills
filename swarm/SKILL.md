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
| `epic:` / `label:` / bare-id / free-text scopes | [`../implement/SELECTORS.md`](../implement/SELECTORS.md) |
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
| Runtime | `skills/ref/<runtime>/swarm.md`, picked by marker files (`Cargo.toml` → rust, `go.mod` → go, `pyproject.toml` → python, `package.json` → web, `Package.swift` or an Xcode project → apple) | what is true of every project in that runtime, plus the defaults `swarm launch` sets — for rust, a `CARGO_TARGET_DIR` per worktree cloned from the main checkout's, and rust-analyzer off |
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

**Quota.** `check` and every `launch` read the repo's Claude profile's usage from the status
line's cache and refuse, exit 5, at 90% of the 5-hour window or of the week
(`SWARM_QUOTA_SESSION`, `SWARM_QUOTA_WEEKLY` override). An unreadable or stale reading refuses
too. `swarm quota` prints the reading. A refused launch is not a failed worker: let the running
workers finish, launch nothing more, and say in the report how far the run got and why it stopped.

**The run log.** Start every run with `swarm log run "" "focus=<focus> n=<n>"`. `launch` logs
`launched` and `finished` itself; the lead logs `landed`, `parked`, `failed` and `applied` as it
records each one in step 5. **A lead that starts without this run's context — after a
compaction, a relay or a restart — runs `swarm status` before anything else**: it prints the
current run's events and every bead launched but not finished, with its herdr agent state. Those
workers are still running; wait for them as step 4 says, and never launch their beads again.

A worker in a repo Claude has never been trusted in stops at the "trust this folder" dialog,
and its launch fails with `agent_not_ready`. A worktree inherits its main checkout's trust, so
the fix is one interactive `claude` in the main checkout, answered by the user.

## 2. Resolve the scope

A focus resolves through [`../implement/SELECTORS.md`](../implement/SELECTORS.md), the one table
for `epic:`, `label:`, bead ids and free text. Swarm adds only this:

| Focus | Scope |
| --- | --- |
| none | `issues next`, autonomous-caller mode: every ready group and singleton, ranked |
| any other focus | SELECTORS.md's resolution, intersected with `bd ready --limit 0 --json`. For `epic:<id>`, also run `bd swarm validate <epic>` and cap `<n>` at its maximum parallelism |

**A failed read is not an empty backlog.** A `bd` command that exits non-zero, prints an error,
or returns output that does not parse is an error: stop launching, keep the running workers, and
report the command and its output. Only a successful read that lists nothing ends the run.

Drop every bead whose notes carry `auto parked`, and every bead the run log shows `failed` this
run. A bead `launch` has claimed reads `in_progress`, so `bd ready` already leaves it out. Print the frozen queue in the first status
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

**Declare the run on the work board** (the work-board mod's `work_set` tool) before the first
launch and after every change: `goal` the epic or focus bead, `lanes` `<n>`, every bead in scope
as an item, each launched one with its `lane` (the slot number, 1 to `<n>`) and `model`, queued
ones with no lane, landed ones kept. Each worker declares its own stage; the board shows it in
its lane.

One Bash call per slot, **each with `run_in_background: true`**:

```bash
"$HOME/.claude/skills/swarm/swarm" launch <bead-id> <model> [--opus-reason "<text>"]
```

It checks the quota, claims the bead (`bd update --claim`, which sets it `in_progress` so no
other picker offers it; [`../implement/AUTO.md`](../implement/AUTO.md) § Swarm workers lets the
worker's gate accept that), creates `~/.worktrees/<repo>/<bead-id>` on branch `swarm/<bead-id>`, marks it
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
   is a failed worker: `swarm log failed <id> "<exit and last line>"`, release the claim with
   `bd update <id> --status open --assignee ""` and a `bd update <id> --append-notes "swarm failed:
   <reason>"`, and don't relaunch it this run.
2. Verify what it says: `bd show <id> --json` shows the bead closed, and
   `git -C <repo> log --oneline -1 <sha>` finds the landing commit on the default branch; then
   `swarm log landed <id> <sha>`. A parked bead has an `auto parked` note: `swarm log parked
   <id> "<reason>"`. A report that says landed but fails either check is a failed worker.
3. Apply its `## Shared-file changes`, if the report has any. Workers never edit a file under
   `.claude/` that is a symlink to the main checkout — `verify-project` and other untracked local
   skills — because every worker shares it. Make each change in the main checkout, where the
   path points, after checking it still fits what landed. Two workers' changes to one file are
   merged here, by hand, in landing order. `swarm log applied <id> "<path>"` for each.
4. Close its space: `herdr workspace list`, find the one whose cwd is the worker's worktree,
   `herdr worktree remove --workspace <id> --force` when it landed (git-sweep reaps any left),
   `herdr workspace close <id>` when it parked so the branch stays for the user.
5. Re-resolve the scope (step 2) — landings unblock beads — and launch the next one into the
   free slot.

The run ends when a successful read finds no ready bead in scope left unlaunched and every slot
is empty — or early, on a failed read or a quota refusal, which the report names.

## 6. Report

One section, in chat:

- **Landed** — bead, title, model, commit sha.
- **Parked** — bead, the reason from its note, the branch holding the work.
- **Decided without you** — every `auto decided` note the workers wrote, one line each.
- **Shared files updated** — each main-checkout file the lead changed from a worker's report.
- **Failed** — bead, exit code, the last lines of its output.
- **Left in scope** — beads still blocked, and what blocks each.

Close with `swarm: <landed> landed, <parked> parked, <failed> failed, focus <focus or none>`.
