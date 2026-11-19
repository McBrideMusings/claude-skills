# Targets — where a dispatched or delegated worker goes

Control words (`go`, `park`, `dispatch`, `delegate`, `implement`, `verify` …) are defined in
[`../CONTEXT.md`](../CONTEXT.md).

> **Not this file: handing work *forward*.** Everything below is `dispatch <target>` or
> `delegate <target>` — another agent or process runs the work while you keep your seat. Handing the *next* body
> of work forward into a clean context in the **same** pane, so this session ends and the
> next one begins where it left off, is `relay`. It shares no mechanism with this ladder.
> The one seam: when relay's next work needs a different checkout, relay calls `delegate`,
> because a pane's cwd is fixed for its lifetime.

Every skill that hands work to another session, through `dispatch` or `delegate`, picks from the
**same three targets**. This file is the single owner of that order. `review dual`,
`implement dispatch codex`, `swarm` and `issues organize` link here rather than each inventing a
menu. The thing that runs the work is a **worker**; the session that hands it the brief is the
**caller**.

| | **`workspace`** | **`window`** | **vendor (`codex` / `reasonix`)** |
|---|---|---|---|
| What runs | a live interactive `claude` in its own herdr space | a one-shot piped into the vendor's non-interactive mode | a live interactive `codex`/`reasonix` in a herdr space, or a one-shot in Terminal.app when herdr can't host it |
| Costs a window | no — a space in the sidebar | yes, a real desktop window | no (herdr) / yes (Terminal.app) |
| Watchable | yes, live | yes, output tees to the window | yes, either surface |
| You can type at it | **yes** — switch to the space and take it over | no | yes on herdr, no on Terminal.app |
| Survives this session dying | **yes** | the window survives; the run does not | yes on herdr, no on Terminal.app |
| Cross-vendor | no — Claude only | yes, any vendor `dispatch` resolves | yes, that vendor |
| Stopped by | `herdr workspace close` | close the window | `herdr workspace close` on herdr; close the window on Terminal.app |
| Reached by | `dispatch exec` → `herdr-agent` (`herdr worktree open --workspace`, or `herdr workspace create`) | `dispatch exec` → `terminal run` | `dispatch exec` → `herdr-agent` or `terminal run` |

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
  `herdr workspace create --cwd <dir> --label <name> --no-focus`, a top-level space of its own.
  It never falls back to `herdr tab create` in the caller's space.

The one tab `herdr-agent` still adds is labelled with the dispatch's name, when the child space
was already open; otherwise the agent runs in the first tab of the space it started, and a child
space it opened is renamed to the name (`herdr workspace rename`). Its stderr names the space
(and whether it is a child) and the pane, and prints again each time the agent stops on a
permission prompt.

## Dispatch or delegate — who owns the result, stated at launch

**Applies to `workspace`, `window` and the vendor targets.** The caller picks one and names it in
its first status line, next to the target and the space:

- **`dispatch`** (`dispatch exec` with no mode flag) — the person owns the worker. The caller
  launches, says target, space and why in one line, and stops managing it: `exec` returns once the
  worker has the brief, and the caller does not poll it, read its pane, verify, land, or remove its
  worktree. The person, or the worker's `SELF-LAND` marker, owns the landing.
  See [SKILL.md](SKILL.md).
- **`delegate`** (`dispatch exec --report-back`) — the caller owns the result. It watches the
  worker as [`../delegate/SKILL.md`](../delegate/SKILL.md) says, reads `<outfile>`, verifies the
  result, folds it into its own work or lands it, and tells the person. An implementing worker
  still ends at a commit; the caller lands it and cleans up its worktree.

The person's words decide: "dispatch this", "run it in a separate session" is `dispatch`; a skill
that starts workers it then waits on (`swarm`, `review dual`, a `mergeable` sweep) is `delegate`.
When it is unclear, ask which.

The mode goes into the worker's brief, because it sets the worker's ending (see "Where the work
happens" below): a dispatched worker closes with the line the person reading its pane needs; a
delegated worker ends at a commit and writes its report to `<outfile>` for the caller.

A worker's "passed" closes nothing until the caller reads what its check actually drove and compares it, case by case, to the request's quoted words.

A brief for another session travels in the `herdr agent prompt` / `wheel pane start --message` text itself, or a file under `/private/tmp/claude/<repo-slug>/` — never a file in a checkout the worker was not asked to change.

**The brief carries the person's words.** When a brief relays the person's direction, quote each point verbatim, then the instruction you derive from it beneath it. A paraphrase alone drops whatever you misread, and the worker cannot see the original.

## The order

**1. The person names the place.** A dispatch goes to the space, pane, window or vendor the
person names, and nowhere else. When they named none, ask which, as one question with the
options, before launching. Dispatch never means an in-session subagent: the `Agent` tool is
a subagent, not a dispatch, and never answers "dispatch".

**2. A skill that dispatches on its own names its reason.** `review dual` goes cross-vendor
because a second opinion from the same model is not one; say the reason in the status line.

**Hitting a genuine open question is never itself a reason to dispatch.** A blocked decision
only the user can make gets asked in the calling session, in the pane the user is already
reading — never by spawning a `workspace` whose only job is to relay the question.

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
( cd ~/.worktrees/<repo-name>/<slug> && "$HOME/.admin/admin" populate )
( cd ~/.worktrees/<repo-name>/<slug> && "$HOME/.claude/skills/dispatch/dispatch" exec --job execute --name "<what the work is>" <brief> )
```

**Always pass `--name`**: two to five words saying what the worker does ("profile-first spike",
"fix login redirect"). It becomes the space's label in the sidebar, so the user can tell the
spaces apart; without it the label is the directory's name.

`herdr-agent` then opens the worktree's child space under the repo's
(`herdr worktree open --workspace <repo-workspace-id>`), and it starts the agent in that
space's first tab. **Never open the space yourself before `dispatch exec`**, whether with
`herdr worktree create` or `herdr worktree open`. `herdr-agent` finds the space already open,
adds a tab for the agent, and leaves the first tab as an empty shell. For the same reason, never
`herdr workspace create --cwd <worktree-path>`; the name goes through `--name`, never a
`--label` of your own.
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
> last message is your report, in chat: files changed, unchanged, follow-up needed, the
> manual testing steps with the exact commands you ran, and one closing row offering what
> lands and deploys the work (`wrap-up`, then the restart or deploy the diff needs) with the
> `go` hatch. Then stop and stay open.

**The mode line, one of these two, follows the contract:**

> Mode: dispatched. Your report is for the person reading this pane.

> Mode: delegated. Also write your report, the same text, to `<outfile>`; the session that delegated reads it.

This is the same contract an `implement` pass holds when it commits, written here for a
worker that is a whole session instead of an in-session step. It exists because the prompt is exactly the wrong place to
decide landing: a brief written before the work knows nothing about what the work found.
Landing and verification belong to whoever owns the
result: the user, or the `SELF-LAND` worker, for a dispatch; the caller, for a delegation.

**The `SELF-LAND` marker is for an `owned` repo only.** Run `~/.claude/tools/repo-tier <repo>`
before touching it. When it prints `collaborative` or `unlisted`, never create the marker and
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
dispatch, the caller for a delegation. Never the worker.**
Inside herdr that is `herdr worktree remove --workspace <id> --force` against the worker's
space; the herdr server performs the deletion, so nothing loses its footing. A worktree
that outlives its landing is collected anyway: `tools/git-sweep.sh`, run
detached after every `tools/land` push, collects branches proven merged (reachable from the
default branch, or a `gh`-confirmed squash-merge) along with any worktree still holding them.
A SELF-LAND dispatch lands from inside its own worktree and never merges in the primary
checkout: `~/.claude/tools/land <worktree>`, for any owned repo including `~/.claude` itself.
It fast-forward-pushes and refuses rather than forces; the full route is `wrap-up` Step C's
Route 2.

**A SELF-LAND worker's report ends with a closing line, after the manual testing steps**, so
the person reading from the bottom of the pane knows nothing is left. A delegated worker has
no such line: it ends at a commit and its report in `<outfile>` is what the caller reads. When the landing
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
`window`, in Terminal.app. That is herdr's limitation, not a preference. `dispatch transport` says so in as many words.

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

Name the target and the mode (dispatch or delegate) in the first status line, and the target in the final report. The failure this prevents
is not picking wrong; it is a run that quietly *became* a different one, leaving the user
looking for a space that was never made.

## Related

- The resolver, the vendors, the auth gate and `alive` → [LAUNCH.md](LAUNCH.md)
- Dispatching → [SKILL.md](SKILL.md); delegating → [../delegate/SKILL.md](../delegate/SKILL.md)
- The herdr live-agent transport → `herdr-agent` in this directory
- The Terminal.app transport → [TRANSPORT-TERMINAL.md](TRANSPORT-TERMINAL.md)
- Implementation passes, which do not use this ladder at all today — `implement` runs the session's own plan → edit → verify → gate steps directly, no dispatch → [../implement/SKILL.md](../implement/SKILL.md)
