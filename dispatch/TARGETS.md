# Dispatch targets — the ladder

Control words (`go`, `park`, `dispatch`, `implement`, `verify` …) are defined in
[`../CONTEXT.md`](../CONTEXT.md).

> **Not this file: handing work *forward*.** Everything below is `dispatch <target>` —
> another agent or process runs the work while you keep your seat. Handing the *next* body
> of work forward into a clean context in the **same** pane, so this session ends and the
> next one begins where it left off, is `relay`. It shares no mechanism with this ladder.
> The one seam: when relay's next work needs a different checkout, relay calls `dispatch`,
> because a pane's cwd is fixed for its lifetime.

Every skill that hands work to another agent picks from the **same four targets**, in the
same order. This file is the single owner of that order. `review dual`,
`implement dispatch codex`, and `issues shape` link here rather than each inventing a menu.
The thing that runs the work is a **worker**; the session that hands it the brief is the
**dispatcher**.

| | **`agent`** | **`workspace`** | **`window`** | **vendor (`codex` / `reasonix`)** |
|---|---|---|---|---|
| What runs | an `Agent` tool call in this session | a live interactive `claude` in its own herdr space | a one-shot piped into the vendor's non-interactive mode | a live interactive `codex`/`reasonix` in a herdr space, or a one-shot in Terminal.app when herdr can't host it |
| Costs a window | no | no — a space in the sidebar | yes, a real desktop window | no (herdr) / yes (Terminal.app) |
| Watchable | no | yes, live | yes, output tees to the window | yes, either surface |
| You can type at it | no | **yes** — switch to the space and take it over | no | yes on herdr, no on Terminal.app |
| Survives this session dying | no | **yes** | the window survives; the run does not | yes on herdr, no on Terminal.app |
| Cross-vendor | no — Claude only | no — Claude only | yes, any vendor `dispatch` resolves | yes, that vendor |
| Stopped by | `TaskStop` on its task id — a `completed` status is not a reason to skip it; the row then reads `killed` rather than leaving `ListAgents` | `herdr workspace close` | close the window | `herdr workspace close` on herdr; close the window on Terminal.app |
| Reached by | the `Agent` tool | `dispatch exec` → `herdr-agent` (`herdr worktree open --workspace`, or `herdr workspace create`) | `dispatch exec` → `terminal run` | `dispatch exec` → `herdr-agent` or `terminal run` |

A herdr-hosted worker always gets a **space** (herdr's name is workspace) of its own, never a
tab of the caller's, and `herdr-agent` never runs `herdr pane split`, which would squeeze the
pane the user is reading. The sidebar shape depends on the directory `dispatch exec` runs in:

- **Child space.** Run from a linked worktree of a repo herdr tracks, it opens that worktree's
  space nested under the repo's space
  (`herdr worktree open --workspace <repo-workspace-id> --path <worktree>`) and starts the agent
  in its first tab. herdr's CLI nests a space only through a git worktree: `herdr workspace
  create` takes `--cwd`, `--label`, `--env` and `--focus`/`--no-focus`, and has no parent option.
- **Standalone space.** Run from anywhere else — read-only work in the main checkout, a worktree
  herdr refuses to open (one of the skills submodule), a directory that is not a repo — it runs
  `herdr workspace create --cwd <dir> --label <slug> --no-focus`, a top-level space of its own.
  It never falls back to `herdr tab create` in the caller's space.

The one tab `herdr-agent` still adds is `dispatch-<pid>`, when the child space was already open;
otherwise the agent runs in the first tab of the space it started. Its stderr names the space
(and whether it is a child) and the pane, and prints again each time the agent stops on a
permission prompt.

## Who feeds the result back — the dispatcher's call, stated at launch

**Applies to `workspace`, `window` and the vendor targets.** The dispatcher picks one of two
modes and names it in its first status line, next to the target and the space:

- **report-back** — the agent dispatched on its own initiative, for parallel work the user did not
  ask for. The dispatcher keeps ownership: it waits for the worker to finish, reads `<outfile>`,
  verifies or reviews the result, folds it into its own work, and tells the user. An implementing
  worker still ends at a commit; the dispatcher lands it and cleans up its worktree.
- **fire-and-forget** — the user told it to dispatch (`dispatch workspace …`, "run this in a
  separate session"). The dispatcher launches, says target, space and why in one line, and stops
  managing the worker: it does not poll it, read its pane or `<outfile>`, verify, land, or remove
  its worktree. A completion notification from the launch command is not a prompt to look. The
  user, or the worker's `SELF-LAND` marker, owns the landing.

Who started it decides. When it is unclear, the mode is fire-and-forget. `agent` always returns
its result to the dispatcher, because it runs inside the session. Never poll a worker with
`ScheduleWakeup`: the launch command's own completion notification is the wake-up.

The mode goes into the worker's brief, because it sets the worker's ending (see "Where the work
happens" below): a fire-and-forget worker closes with the line the person reading its pane needs;
a report-back worker ends at a commit and writes its report to `<outfile>` for the dispatcher.

## The order

**1. Default to `agent`, always.** It is built into the harness: no window to
open, no process to supervise, no automation grant, no second auth. It is the cheapest
and the tightest plan-follower, and it is the one that behaves best inside a Claude Code
pass. Take this unless a reason below actually applies to the work in hand.

**2. Escalate to `workspace`, `window`, or a vendor target only for one of these
three reasons** — and say which one in the status line, so a run that escalated for no
reason is visible:

- **Cross-vendor** — a non-Claude model has to do the work. This is the whole point of
  `review dual`: a second opinion from the same model is not a second opinion.
- **The user has to watch it or take it over** — a long unattended run they want to
  follow live, or one they expect to interrupt and steer.
- **It has to outlive this session** — the work continues after this Claude session ends,
  is compacted away, or is killed.

**Hitting a genuine open question is never itself a reason to escalate.** A blocked
decision only the user can make gets asked with `AskUserQuestion` in the calling session,
in the pane the user is already reading — never by spawning a `workspace` whose
only job is to relay the question. That trades one pane the user is watching for two, and
leaves the answer sitting in a space they have to go find. A report-back dispatcher never
spawns such a space. Dispatch a worker only once the three reasons above independently call
for one; a question that would block an in-session `agent` blocks a worker exactly the same
way, so escalating does not remove the block.

**3. Once `workspace`, `window`, or a vendor target is warranted, the surface is
resolved, never asked:**

- **Inside herdr** (`HERDR_ENV=1`) **and herdr can start the vendor** → **`workspace`, a herdr
  space** (child where a worktree allows it, standalone otherwise).
- **Otherwise** → **`window`, a Terminal.app window**.

Nobody implements step 3 by hand. `dispatch exec` does it, and `dispatch transport` prints
the answer with its reason, naming the space and whether it is a child. Both surfaces take the same contract — prompt in a file, answer
in `<outfile>` — so a skill never branches on which one ran.

## Where the work happens — a second axis, not part of the ladder

The ladder above answers *which surface*. It does not answer *which checkout*, and those are
independent questions. Answer both before dispatching.

**If the worker will write code, it works in a git worktree.** Not the main checkout, no
matter which rung of the ladder it landed on, and no matter how small the change is. A
one-file edit dispatched onto `main` is the same hazard as a twenty-file one: the user is
usually still working in that checkout, and an agent committing underneath them is a
collision they did not agree to.

For `workspace`, make the worktree with plain git, link its local files, and run
`dispatch exec` from inside it:

```
git -C <repo> worktree add -b <branch> ~/.worktrees/<repo-name>/<slug> <default-branch>
CLAUDE_PROJECT_DIR=~/.worktrees/<repo-name>/<slug> bash ~/.claude/hooks/worktree-link-locals.sh
( cd ~/.worktrees/<repo-name>/<slug> && "$HOME/.claude/skills/dispatch/dispatch" exec <brief> <outfile> )
```

`herdr-agent` then opens the worktree's child space under the repo's
(`herdr worktree open --workspace <repo-workspace-id>`), and it starts the agent in that
space's first tab. **Never open the space yourself before `dispatch exec`**, whether with
`herdr worktree create` or `herdr worktree open`. `herdr-agent` finds the space already open,
adds a `dispatch-<pid>` tab for the agent, and leaves the first tab as an empty shell. For the
same reason, never `herdr workspace create --cwd <worktree-path>` and never a custom `--label`.
Worktrees go under `~/.worktrees/<repo>/<branch>`, the `[worktrees] directory` in
`~/.config/herdr/config.toml`.

`herdr worktree create --workspace <repo-workspace-id> --branch <name>` is only for a
space that no `dispatch exec` will run in, such as one the user works in by hand.

**A worker's brief lives in its worktree's git dir, never only under `/private/tmp`.** Author
the brief and any shared preamble under `/private/tmp/claude/<repo-slug>/dispatch/`, then copy
the brief as soon as the worktree exists to
`"$(git -C <worktree> rev-parse --absolute-git-dir)/DISPATCH-BRIEF.md"`, beside the
`SELF-LAND` marker. `/usr/libexec/tmp_cleaner` deletes a `/private/tmp` file once its access,
modification and change times are all more than three days old, at 00:00 daily, so a dispatch
that outlives that window loses a brief kept only there. A linked worktree's git dir is
removed with the worktree, so the copy lasts exactly as long as the dispatch. A launch script
reads the brief from the git dir after the copy, never from the tmp path.

**Check that `CLAUDE.local.md` reached the new worktree before starting the agent.** It's
untracked, so git never carries it. In a repo with `admin.toml`, the admin tool's populate step
usually already has: the base archetype (`~/.admin/archetypes/base/archetype.toml`) symlinks
`CLAUDE.local.md` and `.claude/CLAUDE.local.md` back to the main checkout. Run `ls -la` on the
worktree's copy; a symlink to the main checkout means there is nothing to do, and a `cp` onto it
writes the file through the link onto itself. Only when the file is missing, copy it, and any
directory it points at (a local doc cache under `.claude/reference/`), from the main checkout.

**The dispatch decides where the work happens, and where it stops.** What the work *is* —
a feature, a bug, a log read — belongs to the prompt. Where it ends does not: every worker
that writes code ends at the same place an `implement` pass does, and the prompt may not
move it. Put this in the prompt verbatim, whatever the work is, and add the mode line below it:

> Your work ends at a commit on this branch. You do not push, merge, rebase, open a PR,
> close or comment on any tracker item, or remove this worktree. A linked worktree shares
> the primary checkout's object store, so the caller already has every commit you make. Your
> last message is your report, in chat: files changed, unchanged, follow-up needed, and the
> manual testing steps with the exact commands you ran. Then stop and stay open.

**The mode line, one of these two, follows the contract:**

> Mode: fire-and-forget. Your report is for the person reading this pane.

> Mode: report-back. Also write your report, the same text, to `<outfile>`; the dispatcher reads it.

This is the same contract an `implement` pass holds when it commits, written here for a
worker that is a whole session instead of an in-session step. It exists because the prompt is exactly the wrong place to
decide landing: a brief written before the work knows nothing about what the work found. A
worker that carried `push the branch, open the PR` and `retire yourself` did both, with four
unanswered product questions pasted into the PR body, and the person who owed those answers
first learned of the PR from `gh pr list`. Landing and verification belong to whoever owns the
result: the user, or the `SELF-LAND` worker, for a fire-and-forget dispatch; the dispatcher, for
a report-back one.

**The `SELF-LAND` marker is for repos where work lands on the default branch without review**
— the user's own repos and local-only repos. Check `git -C <repo> remote get-url origin` before
touching it. On a repo that takes PR review (any other owner), never create the marker and
never write "SELF-LAND" into the brief: nothing there lands itself. The worker's outward
actions are the ones the brief names on its own PR branch — an ordinary push, or
`git push --force-with-lease=<branch>:<old-sha> origin HEAD:<branch>` after a rebase, and
`gh pr merge --auto --merge` to arm auto-merge — and the PR then waits for its reviewers.
`landing-guard` denies every force-push from a marked worktree, so a marked worktree cannot
finish a rebase of a PR branch.

**Never `git worktree remove <path>` or `rm -rf` on its own checkout.** That is the shape
`no-self-delete-guard.py` blocks, and the reason is real: delete the directory a session is
running in and every shell hook afterwards fails to spawn with `ENOENT` on `posix_spawn`
before reaching its first line, so the PreToolUse, PostToolUse and Stop guards are silently
skipped for the rest of that session — non-blocking failures, so nothing stops.

**The worktree and the branch are removed by whoever owns the result: the user for a
fire-and-forget dispatch, the dispatcher for a report-back one. Never the worker.**
Inside herdr that is `herdr worktree remove --workspace <id> --force` against the worker's
space; the herdr server performs the deletion, so nothing loses its footing. A worktree
that outlives its landing is collected anyway: `tools/git-sweep.sh`, run
daily from `hooks/daily-git-sweep.sh`, collects branches proven merged (reachable from the
default branch, or a `gh`-confirmed squash-merge) along with any worktree still holding them.
A SELF-LAND dispatch lands from inside its own worktree and never merges in the primary
checkout: `~/.claude/tools/land <worktree>`, for any owned repo including `~/.claude` itself.
It fast-forward-pushes and refuses rather than forces; the full route is `wrap-up` Step C's
Route 2.

**A SELF-LAND worker's report ends with a closing line, after the manual testing steps**, so
the person reading from the bottom of the pane knows nothing is left. A report-back worker has
no such line: it ends at a commit and its report in `<outfile>` is what the dispatcher reads. When the landing
succeeded and the report has no follow-up: `Done — landed on main (<sha>). Nothing left to
do; you can close this session.` When the landing did not happen, or follow-up is needed,
the last line says that instead, and names the one thing the user must do.
Say it from the landing command's own output, not from intent.

**The exception is work that only reads.** A build, a test run, a log tail, a probe, a
review that reports findings — those belong in a pane on the main checkout, because
isolating them buys nothing and a fresh worktree costs a checkout. Such a worker gets a
standalone space.

## What blocks `workspace`

`herdr agent start --kind` takes a fixed enum (`pi, claude, codex, gemini, cursor, devin,
agy, cline, omp, mastracode, opencode, copilot, kimi, kiro, droid, amp, grok, hermes, kilo,
qodercli, maki`). **`reasonix` is not in it**, so `dispatch reasonix` can only ever run as
`window`, in Terminal.app. That is herdr's limitation, not a preference — and on the personal
profile, where `CLAUDE_DISPATCH_AGENT=reasonix`, it is the common case. `dispatch transport`
says so in as many words.

herdr also refuses to open a space for a worktree of a repo it does not track, such as the
skills submodule. `herdr-agent` then starts a standalone space with the worktree as its
directory, and says so on stderr.

`--headless` skips step 3 entirely and always runs a plain subprocess: cron, SSH, and
scheduled agents have no GUI session and no herdr session to put anything in.

## An explicit token always wins

A target named in the user's arguments beats the whole ladder, and no menu is printed.
`implement dispatch codex`, `review dual herdr`. Naming a target that is not
available — `herdr` outside herdr — is an error to state and stop on, never a silent
fallback to something else.

## Say which one ran

Name the target and the mode (report-back or fire-and-forget) in the first status line, and the target in the final report. The failure this prevents
is not picking wrong; it is a run that quietly *became* a different one, leaving the user
looking for a space that was only ever an in-session agent.

## Related

- The resolver, the vendors, and the auth gate → [SKILL.md](SKILL.md)
- The herdr live-agent transport → `herdr-agent` in this directory
- The Terminal.app transport → [TRANSPORT-TERMINAL.md](TRANSPORT-TERMINAL.md)
- Implementation passes, which do not use this ladder at all today — `implement` runs the session's own plan → edit → verify → gate steps directly, no dispatch → [../implement/SKILL.md](../implement/SKILL.md)
