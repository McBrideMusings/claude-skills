---
name: swarm
description: "Burn down a repo's beads with several unattended Claude workers at once, each an `implement <id> auto` pass in its own worktree and its own herdr space or Wheel pane, refilling a slot whenever one finishes. Optional focus steers what it picks: `swarm the web browser feature`, `swarm epic:cc-12`, `swarm label:client 4`. `swarm feedback` grills the user's feedback one item at a time, files each as a bead and swarms it while intake continues. Use for 'run a swarm', 'burn down the backlog in parallel', 'have agents work through the client issues', 'a feedback session'."
---

# Swarm

`swarm [<focus>] [<n>]` keeps `<n>` workers (default 3) running against the repo's ready
beads until the scope runs dry. This session is the **lead**: it picks, launches, verifies,
re-picks. Each **worker** is a whole Claude session running `implement <id> auto` in its own
worktree, which lands its own branch and closes the bead on a repo you own, or stops at a
commit for your sign-off on a collaborative one ([`../implement/AUTO.md`](../implement/AUTO.md),
§ 1's landing mode).

What `swarm` reuses rather than owns:

| Job | Owner |
| --- | --- |
| Ranking ready beads, grouping related ones, applying a focus | [`issues next`](../issues/next.md), autonomous-caller mode |
| `epic:` / `label:` / bare-id / free-text scopes | [`../implement/SELECTORS.md`](../implement/SELECTORS.md) |
| An epic's parallel waves | `bd swarm validate <epic>` |
| The worker's whole pass, its landing and its parking | `implement <id> auto` |
| The herdr space or Wheel pane, the outfile, the wait | `dispatch exec`, via the `swarm launch` script |

A swarm is **report-back** ([`../dispatch/TARGETS.md`](../dispatch/TARGETS.md) § Who feeds the
result back): the lead waits for each worker, reads its outfile and verifies what it claims.

`swarm feedback [<n>]` is the one focus this table does not resolve: the scope starts empty and
the user fills it while workers run (§ Feedback session).

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
| Runtime | `skills/ref-cells/<runtime>/swarm.md`, picked by marker files (`Cargo.toml` → rust, `go.mod` → go, `pyproject.toml` → python, `package.json` → web, `Package.swift` or an Xcode project → apple) | what is true of every project in that runtime, plus the defaults `swarm launch` sets — for rust, a `CARGO_TARGET_DIR` per worktree cloned from the main checkout's, and rust-analyzer off |
| Project | `<repo>/.claude/skills/project/swarm.md` | this project's heavy commands, cheap check, shared caches, per-worker resources, queues, slot cap. Wins over the runtime layer |

## Project support

Every project with a build or test step keeps a project skill, and its `swarm.md` is this
layer. `swarm check` exits 4 without one. Write it then, before any worker starts, with the
[`project-skills`](../project-skills/SKILL.md) skill ([`swarm.md`](../project-skills/swarm.md)
says what the section answers). Commit it on a branch and land it with the swarm's results;
`swarm launch` reads it from the main checkout, so workers see it before it lands.

## 1. Gate

From the repo's main checkout. A session in a linked worktree cannot run a swarm: in an auto run it
continues as `implement <id> auto` for the top bead `next-work` ranked and says why; attended, it refuses.

```bash
"$HOME/.claude/skills/swarm/swarm" check
```

It refuses outside herdr and Wheel, on a repo `repo-tier` calls `unlisted`, and when `bd` or
the Claude login is broken. A refusal ends the run; report it. Exit 4 is the one exception:
write the project skill's `swarm.md` (§ Project support) and check again. It prints the
runtimes it found, their pages, the environment and settings every worker gets, and the
landing mode — put those in the first status line.

The repo's tier sets the landing mode:

| `repo-tier` | Landing mode | A worker ends by |
| --- | --- | --- |
| `owned` | self-land | landing its branch on the default branch and closing the bead |
| `collaborative` | sign-off | committing on its local branch and writing a sign-off package; it pushes nothing, opens no PR and files no follow-up. The lead brings each package to the user (§ Sign-off inbox) |

Where workers run depends on the multiplexer the lead is in (herdr wins when both are set):

| Lead in | Each worker | Set up by `check` |
| --- | --- | --- |
| herdr | a child space nested under the repo's space | opens the repo's space when none is open; `launch` refuses until it exists |
| Wheel | a terminal pane in the background space `<repo> swarm`, rooted at the main checkout, which runs with no window, so the lead's screen never moves: the first launch makes it (`wheel space new --background`) and its first worker fills it, the second goes to its right, later ones stack under the newest. The Mac app closes the space when its last worker pane closes, and the next launch makes it again. Bring it forward from the menu bar's Background card to watch the workers | nothing; Wheel tracks no terminal agent's state, so `dispatch/wheel-agent` merges hooks into the worker's `--settings` that write `working`, `blocked` or `idle` to `<worktree git dir>/wheel-agent/state` |

**Slots.** `<n>` defaults to 3. A `SWARM_MAX_WORKERS` in the project skill's `swarm.env` caps
it; say so when it lowers the user's number.

**Quota.** `check` and every `launch` read the usage of the Claude profile a worker will run
under — the shell's `CLAUDE_CONFIG_DIR` in the main checkout, else Wheel's
`agent.claude.home` under Wheel, else `~/.claude` — from the status line's cache and refuse, exit 5, at 90% of the 5-hour window or of the week
(`SWARM_QUOTA_SESSION`, `SWARM_QUOTA_WEEKLY` override). An unreadable or stale reading refuses
too. `swarm quota` prints the reading. When the user tells you to skip the quota check, set
`SWARM_SKIP_QUOTA=1` on `check` and every `launch` for the rest of the run, without asking. A refused launch is not a failed worker: let the running
workers finish, launch nothing more, and say in the report how far the run got and why it stopped.

**Memory.** Every `launch` reads the machine's free memory (`memory_pressure -Q`) and refuses,
exit 6, under 25% free (`SWARM_MEMORY_FLOOR` overrides), because every worker is a whole Claude
session with its MCP servers and builds, beside every other session on the machine. Unlike a
quota refusal, this one holds the queue rather than ending the run: launch nothing until a
running worker finishes, then try that slot's launch again.

**The run log.** Start every run with `swarm log run "" "focus=<focus> n=<n>"`. `log run`
adds the lead's pid and the repo's name to the line. `launch` logs
`launched` and `finished` itself; the lead logs `landed`, `parked`, `failed`, `ready` and `applied` as it
records each one in step 5, `signed` and `declined` as the user answers each package (§ Sign-off
inbox), and `end` when the run is over (§6). **A lead that starts without this run's context — after a
compaction, a relay or a restart — runs `swarm status` before anything else**: it prints the
current run's events, every bead launched but not finished, with its agent state, and the
sign-off inbox — every `ready` bead with no `signed` or `declined` yet. Those
workers are still running; wait for them as step 4 says, and never launch their beads again.
After a reboot their agents read `no space` (herdr) or `no pane` (Wheel) and are gone, but their worktrees keep the work:
relaunch each with `swarm launch <id> <model> --resume`, which reuses the worktree and the
claim and tells the new worker to carry on from what is there.

A worker in a repo Claude has never been trusted in stops at the "trust this folder" dialog,
and its launch fails with `agent_not_ready`. A worktree inherits its main checkout's trust, so
the fix is one interactive `claude` in the main checkout, answered by the user.

## Run budget

A swarm relayed from an `implement … auto` run starts with a run-state block at the top of its
brief ([`../implement/AUTO.md`](../implement/AUTO.md) §Run state). Read `Limit` and `Used` from it
before step 1; a swarm started by hand has no block and no budget.

- Every bead a worker lands or parks adds one to `Used` (step 5, when the lead logs `landed` or
  `parked`). A failed worker adds nothing.
- Before every launch, compare `Used` plus the beads currently running with `Limit`. `Used +
  running >= Limit` means launch nothing more: let the running workers finish, count them, and end
  the run. `all` never runs out. A block whose `Used` is already at or past `Limit` launches
  nothing.
- At the end (§6) the lead writes the block back: every landed, parked and failed bead added to
  `Landed`, `Parked` and `Needs you`, `Used` raised by the landed and parked count, and each
  worker's `Needs you` and `decided:` lines folded in. That updated block is what the next hop
  receives.

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

**Show the run** under Wheel before the first launch, unless a pane in the lead's space already
shows it: the machine artifact `swarm` is the one page for every run. Opened in a space, it reads
that space's repo's run (`swarm status`, the work-board declarations, each worker's Claude
transcript) every 15 seconds, logs each worker's latest actions with times, and flags a worker
whose transcript has not been written for 10 minutes as stuck, whatever its agent state says. There is nothing to post, push or end.

```bash
p=$(wheel pane split "$WHEEL_PANE" right --background) && wheel pane kind "$p" web --artifact swarm --scope machine
```

One Bash call per slot, **each with `run_in_background: true`**:

```bash
"$HOME/.claude/skills/swarm/swarm" launch <bead-id> <model> [--opus-reason "<text>"]
```

It checks the quota, claims the bead (`bd update --claim`, which sets it `in_progress` so no
other picker offers it; [`../implement/AUTO.md`](../implement/AUTO.md) § Swarm workers lets the
worker's gate accept that), creates `~/.worktrees/<repo>/<bead-id>` on branch `swarm/<bead-id>`, marks it
SELF-LAND in self-land mode (sign-off mode sets `SWARM_SIGNOFF=1` in the worker's environment
instead), writes the brief to the worktree's git dir, and blocks on `dispatch exec` until the
worker is idle or done (under Wheel, until it is idle with its outfile written: a worker waiting
on its own subagent reads idle too). The worker starts with `SWARM_WORKER=<bead-id>`, the runtime and project
environment, and the merged `--settings`. Its brief tells it to read the project
skill's `swarm.md` and the runtime pages before its first build, and to run every heavy
command through `swarm heavy`. stdout is one line: bead, exit code, outfile, worktree.
`--dry-run` prints the environment, settings and brief and creates nothing.

The harness notifies you when a launch exits. Never poll with `ScheduleWakeup`. A worker stuck
on a permission prompt shows as blocked in herdr's sidebar, or as `blocked (pane <id>)` in
`swarm status` under Wheel, and in its launch log; if the user asks how the run is going, name
blocked workers and their panes.

**A question for the user gets its own message.** When the lead needs a decision — an ADR slate
row, a worker's open question, a design choice — it posts the status update first and the
question after it, alone, in the option template, never as the last lines of a status update.
Status updates arrive every few minutes during a run, and a question at the end of one scrolls
away unread.

## 5. When a worker finishes

1. Read its outfile. A non-zero exit, or an outfile that is a pane dump rather than a report,
   is a failed worker: `swarm log failed <id> "<exit and last line>"`, release the claim with
   `bd update <id> --status open --assignee ""` and a `bd update <id> --append-notes "swarm failed:
   <reason>"`, and don't relaunch it this run.
2. Verify what it says, against the bead and not the report: read the bead's quoted request and its
   case list, then read what the worker's check drove (its outfile's gate and the check script). A
   listed case the check did not drive means the bead is not done: reopen it with `bd update <id>
   --status open --append-notes "not verified: <cases>"` and log it `failed`, even when the
   worker says landed. Then: `bd show <id> --json` shows the bead closed, and
   `git -C <repo> log --oneline -1 <sha>` finds the landing commit on the default branch; then
   `swarm log landed <id> <sha>`. A parked bead has an `auto parked` note: `swarm log parked
   <id> "<reason>"`. A report that says landed but fails either check is a failed worker.
   **In sign-off mode** the checks are: `git -C <worktree> log --oneline <base>..swarm/<id>`
   lists the worker's commits, `git -C <worktree> status --short` is empty, and the outfile has a
   `## Sign-off package`; then `swarm log ready <id> "<first commit subject>"`. The bead stays
   `in_progress`. A report missing any of the three is a failed worker. Leave its space or pane
   open until the user answers its package; skip steps 4 and 5 for it.
3. Apply its `## Shared-file changes`, if the report has any. Workers never edit a file under
   `.claude/` that is a symlink to the main checkout — the `project` skill and other untracked local
   skills — because every worker shares it. Make each change in the main checkout, where the
   path points, after checking it still fits what landed. Two workers' changes to one file are
   merged here, by hand, in landing order. `swarm log applied <id> "<path>"` for each.
4. Measure what landed. When the repo's project skill has a `perf.md`, run each scenario it
   names for the landed diff (`git -C <repo> show --stat <sha>`), in the main checkout, and
   print its table. A limit over, after `perf.md`'s one rerun, is a P1 bug filed with
   `issues file` naming `<sha>`, the bead and the table, in scope so the next pick takes it. A
   cost note the worker's report left unfixed (work per redraw, keystroke, frame or request; a
   retry or poll; work that grows with rows, spaces or accounts) is filed the same way at P2,
   never relayed as minor.
5. Close its space or pane: `swarm close <id> landed` also removes the worktree (git-sweep
   reaps any left); `swarm close <id> parked` keeps the worktree and branch for the user.
6. Re-resolve the scope (step 2) — landings unblock beads — and launch the next one into the
   free slot.

The run ends when a successful read finds no ready bead in scope left unlaunched, every slot
is empty and the sign-off inbox is empty — or early, on a failed read or a quota refusal, which
the report names.

**The lead hands off to a fresh context past 300k tokens.** A run lasts hours, and every
worker's notification is re-read on each turn after it. At a launch boundary — right after a
slot's launch went out — once the lead's context is past 300k tokens, it hands itself on through
[`relay`](../relay/SKILL.md) with a prompt naming the focus, `<n>`, the user's open questions and
any accepted picks still to run. The fresh lead starts with `swarm status`, as after a compaction,
which lists every running worker; it waits on those, never relaunching them.

## Sign-off inbox

In sign-off mode nothing a worker produced reaches the remote, the tracker's follow-ups or the
reviewers until the user says so. The inbox is the run log: every `ready` bead with no `signed`
or `declined` after it, oldest first, as `swarm status` lists them. The package itself is the
`## Sign-off package` section of the bead's outfile.

**One package per message, never two.** Between the user's messages — after they answer the
current question, before the next one is asked — the lead presents the oldest package alone:

- the bead and its title, and `git diff --stat <base>..swarm/<id>` from the worktree;
- the branch name it will push as, `<type>/<descriptive-name>`, carrying no bead id;
- the PR title and body, as the PR will read, in [`../wrap-up/SKILL.md`](../wrap-up/SKILL.md)'s
  PR body format;
- the follow-up candidates as [`../CHAT-FORMAT.md`](../CHAT-FORMAT.md) §Slate rows, each with
  its default `[fix]`, `[file]` or `[skip]`.

It ends with the hatch: `go` takes the package as shown, a reply naming changes gets them
made and the package shown again, `park` declines it. A counter (`2 of 4 waiting`) goes on the
first line when more than one is queued.

| Answer | What the lead does |
| --- | --- |
| `go` | Applies each `[fix]` follow-up in the worktree and commits it; `git -C <worktree> push -u origin HEAD:<branch name>`; opens the PR with `wrap-up` Step C's collaborative call (the repo's own PR rules: assignee, reviewers, an existing label); `bead-pr link <id> <pr#>`; files each `[file]` follow-up through `issues file`; `swarm log signed <id> <pr#>`; `swarm close <id> landed` |
| changes | Edits the title, body, branch name or dispositions it was told to, and presents the same package again |
| `park` | `swarm log declined <id> "<reason>"`; `swarm close <id> parked`, keeping the worktree and branch; adds an `auto parked: declined at sign-off` note to the bead and releases nothing |

A lead whose user has gone quiet keeps the queue; the packages wait in the log and are
presented in order whenever the user next answers.

## Feedback session

`swarm feedback [<n>]` runs the gate and the run log as usual (`focus=feedback`), then takes the
user's feedback one item at a time instead of resolving a scope:

1. **Take one item.** A bug, a UX problem, a missing feature, anything. Ask for the first one;
   never ask for a list.
2. **Grill it** one question per message ([`grill-me`](../grill-me/SKILL.md) rules): what they
   did, what happened, what should have happened, where (pane, screen, command), how often.
   Settle a question the code, the logs or the running app can answer by checking it instead of
   asking. Stop once a worker could implement it without asking anything: a type, a reproduction
   or a location, and an acceptance line. Feedback that already says what to do is filed at
   once: ask only about what it leaves open, never to confirm what it said.
3. **File the bead** through [`issues`](../issues/SKILL.md) — type, priority, labels from the
   repo's vocabulary — and `swarm log filed <id> "<title>"`. Print its id and title
   in one line; don't wait for approval. A decision only the user can make becomes its own
   `human` bead and is grilled right then, not launched.
4. **Queue it.** The scope is every bead `filed` this run. Launch it into a free slot (§3, §4)
   when `bd ready` lists it; otherwise it waits for its blocker, as in § 2. Then ask for the next
   item.
5. **Workers finishing mid-grill** are handled per § 5 between the user's answers, in one status
   line, and the grilling continues where it was. In sign-off mode the oldest waiting package
   (§ Sign-off inbox) comes before the next grill question, one per message.

The user ends intake by saying so ("that's all", "done"). From then the run is a normal swarm
over the filed beads: refill slots until none is left unlaunched, report (§6), then run
`wrap-up` in the main checkout instead of § 6's relay ending. A lead restarted mid-session
rebuilds its scope from the `filed` lines `swarm status` prints.

## 6. Report

First `swarm log end "" "<landed> landed, <parked> parked, <failed> failed"`: `next-work` counts
the run live until that line exists, so it comes before anything routes onward. Then print the
report below, and end the run.

**An attended swarm** (no run-state block) ends through `relay` §Ending
([`../relay/SKILL.md`](../relay/SKILL.md)), which runs `next-work` for the focus, prints the verdict
and waits at its hatch.

**A swarm inside an auto run** (it has a run-state block) never prints §Ending's hatch. It
writes the block back (§Run budget), runs `next-work --auto` for the block's `Focus:`, and follows
the `Next:` line the way [`../implement/AUTO.md`](../implement/AUTO.md) §Routing each hop says,
through `relay` §Auto. It prints [`../implement/AUTO.md`](../implement/AUTO.md) §The report instead
of the report below, with its failed workers and left-in-scope beads under **Needs you**, and the
`Next:` line last.

The attended report is one section, in chat:

- **Landed** — bead, title, model, commit sha.
- **Signed off** — bead, title, model, PR number (sign-off mode); **Declined** — bead and reason.
- **Parked** — bead, the reason from its note, the branch holding the work.
- **Decided without you** — every `auto decided` note the workers wrote, one line each.
- **Shared files updated** — each main-checkout file the lead changed from a worker's report.
- **Failed** — bead, exit code, the last lines of its output.
- **Left in scope** — beads still blocked, and what blocks each.

Close with `swarm: <landed> landed, <parked> parked, <failed> failed, focus <focus or none>`.
