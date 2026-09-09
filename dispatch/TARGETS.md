# Dispatch targets — the ladder

Control words (`go`, `park`, `dispatch`, `implement`, `verify` …) are defined in
[`../CONTEXT.md`](../CONTEXT.md).

> **Not this file: handing work *forward*.** Everything below is `dispatch <target>` —
> another agent or process runs the work while you keep your seat. Handing the *next* body
> of work forward into a clean context in the **same** pane, so this session ends and the
> next one begins where it left off, is `relay`. It shares no mechanism with this ladder.
> The one seam: when relay's next work needs a different checkout, relay calls `dispatch`,
> because a pane's cwd is fixed for its lifetime.

Every skill that hands work to another agent picks from the **same five targets**, in the
same order. This file is the single owner of that order. `review dual`,
`implement dispatch codex`, and `backlog shape` link here rather than each inventing a menu.

| | **`agent`** | **`split`** | **`workspace`** | **`window`** | **vendor (`codex` / `reasonix`)** |
|---|---|---|---|---|---|
| What runs | an `Agent` tool call in this session | a live interactive `claude` in a new tab of the current herdr workspace | a live interactive `claude` in its own herdr workspace | a one-shot piped into the vendor's non-interactive mode | a live interactive `codex`/`reasonix` in a herdr tab, or a one-shot in Terminal.app when herdr can't host it |
| Costs a window | no | no — a tab beside yours | no — a workspace beside yours | yes, a real desktop window | no (herdr) / yes (Terminal.app) |
| Watchable | no | yes, live | yes, live | yes, output tees to the window | yes, either surface |
| You can type at it | no | **yes** — switch to the tab and take it over | **yes** — switch to the workspace and take it over | no | yes on herdr, no on Terminal.app |
| Survives this session dying | no | **yes** | **yes** | the window survives; the run does not | yes on herdr, no on Terminal.app |
| Cross-vendor | no — Claude only | no — Claude only | no — Claude only | yes, any vendor `dispatch` resolves | yes, that vendor |
| Stopped by | `TaskStop` on its task id — a `completed` status is not a reason to skip it; the row then reads `killed` rather than leaving `ListAgents` | `herdr tab close` | `herdr workspace close` | close the window | `herdr tab close` on herdr; close the window on Terminal.app |
| Reached by | the `Agent` tool | `dispatch exec` → `herdr-agent` (`herdr tab create`) | `dispatch exec` → `herdr-agent` targeting a fresh `herdr worktree create --workspace` | `dispatch exec` → `terminal run` | `dispatch exec` → `herdr-agent` or `terminal run` |

`split` and `workspace` are the two shapes a herdr-hosted target can take, and both stop short
of touching the caller's own pane — neither ever runs `herdr pane split`, which would squeeze the
pane the user is reading. `split` opens a new **tab** in the workspace you're already in
(`herdr tab create --workspace <current-id>`, what `herdr-agent` does today); `workspace` opens
an entirely new herdr **workspace**, nested under the repo in the sidebar
(`herdr worktree create --workspace <repo-workspace-id>`, the pattern in "Where the work happens"
below). Use `split` for something you expect to check on without leaving your seat; use
`workspace` for something long-lived enough to want its own place in the sidebar — typically
because it also needs its own worktree.

## The order

**1. Default to `agent`, always.** It is built into the harness: no window to
open, no process to supervise, no automation grant, no second auth. It is the cheapest
and the tightest plan-follower, and it is the one that behaves best inside a Claude Code
pass. Take this unless a reason below actually applies to the work in hand.

**2. Escalate to `split`, `workspace`, `window`, or a vendor target only for one of these
three reasons** — and say which one in the status line, so a run that escalated for no
reason is visible:

- **Cross-vendor** — a non-Claude model has to do the work. This is the whole point of
  `review dual`: a second opinion from the same model is not a second opinion.
- **The user has to watch it or take it over** — a long unattended run they want to
  follow live, or one they expect to interrupt and steer.
- **It has to outlive this session** — the work continues after this Claude session ends,
  is compacted away, or is killed.

**3. Once `split`, `workspace`, `window`, or a vendor target is warranted, the surface is
resolved, never asked:**

- **Inside herdr** (`HERDR_ENV=1`) **and herdr can start the vendor** → **`split`/`workspace`,
  a herdr pane or workspace**.
- **Otherwise** → **`window`, a Terminal.app window**.

Nobody implements step 3 by hand. `dispatch exec` does it, and `dispatch transport` prints
the answer with its reason. Both surfaces take the same contract — prompt in a file, answer
in `<outfile>` — so a skill never branches on which one ran.

## Where the work happens — a second axis, not part of the ladder

The ladder above answers *which surface*. It does not answer *which checkout*, and those are
independent questions. Answer both before dispatching.

**If the dispatched agent will write code, it works in a git worktree.** Not the main checkout, no
matter which rung of the ladder it landed on, and no matter how small the change is. A
one-file edit dispatched onto `main` is the same hazard as a twenty-file one: the user is
usually still working in that checkout, and an agent committing underneath them is a
collision they did not agree to.

Inside herdr that is `herdr worktree create --workspace <repo-workspace-id> --branch <name>`,
then start the agent in the pane that comes back. Targeting `--workspace` is what keeps the
worktree grouped under the repo in the sidebar instead of detaching to top level; never
`herdr workspace create --cwd <worktree-path>`, and never a custom `--label`. Checkouts land
under `~/.worktrees/<repo>/<branch>` — `[worktrees] directory` in
`~/.config/herdr/config.toml` — so no `--path` is needed.

Herdr reaches the same topology on its own: a pane whose cwd is a linked worktree of a repo
gets **promoted** into a worktree-backed child workspace under that repo, and its pane ID
changes when it moves. So `pane split --cwd <worktree-path>` is not a way to keep a worker
in the current workspace; it is a slower way to arrive at the same place. Read the new ID
from `herdr agent list` rather than the one `pane split` returned.

**Carry `CLAUDE.local.md` into the new worktree if the main checkout has one.** It's
untracked, so `git worktree add` never brings it along on its own — copy the file, and any
directory it points at (a local doc cache under `.claude/reference/`), from the main checkout
into the new worktree right after creating it. Skipped once already: a neutrino worktree
carried an `Explain until removed` section that six sibling worktrees of the same repo never
saw, because nothing copied it forward.

**The dispatch decides where the work happens, and where it stops.** What the work *is* —
a feature, a bug, a log read — belongs to the prompt. Where it ends does not: every worker
that writes code ends at the same place an `implement` pass does, and the prompt may not
move it. Put this in the prompt verbatim, whatever the work is:

> Your work ends at a commit on this branch. You do not push, merge, rebase, open a PR,
> close or comment on any tracker item, or remove this worktree. A linked worktree shares
> the primary checkout's object store, so the caller already has every commit you make. Your
> last message is your report, in chat: files changed, unchanged, follow-up needed, and the
> manual testing steps with the exact commands you ran. Then stop and stay open.

This is the same contract an `implementer` pass holds when it commits, written here for a
worker that is a whole session instead of a background agent. It exists because the prompt is exactly the wrong place to
decide landing: a brief written before the work knows nothing about what the work found. A
worker that carried `push the branch, open the PR` and `retire yourself` did both, with four
unanswered product questions pasted into the PR body, and the person who owed those answers
first learned of the PR from `gh pr list`. Landing is the dispatching session's slate row,
answered with `go`; verification against the project's `verify-project` skill happens there
too, with the worktree still standing to be looked at.

**Never `git worktree remove <path>` or `rm -rf` on its own checkout.** That is the shape
`no-self-delete-guard.py` blocks, and the reason is real: delete the directory a session is
running in and every shell hook afterwards fails to spawn with `ENOENT` on `posix_spawn`
before reaching its first line, so the PreToolUse, PostToolUse and Stop guards are silently
skipped for the rest of that session — non-blocking failures, so nothing stops.

**The worktree and the branch are the dispatching session's to remove, after landing, from
the main checkout.** Inside herdr that is `herdr worktree remove --workspace <id> --force`
against the worker's workspace; the herdr server performs the deletion, so nothing loses its
footing. A worktree that outlives its landing is collected anyway: `tools/git-sweep.sh`, run
daily from `hooks/daily-git-sweep.sh`, collects branches proven merged (reachable from the
default branch, or a `gh`-confirmed squash-merge) along with any worktree still holding them.
A SELF-LAND dispatch lands from inside its own worktree and never merges in the primary
checkout: `~/.claude/tools/land <worktree>` on any owned repo, and `~/.claude/tools/claude-land
<worktree>` for `~/.claude` itself. Both fast-forward-push and refuse rather than force; the
full route is `wrap-up` Step C's Route 2.

**The exception is work that only reads.** A build, a test run, a log tail, a probe, a
review that reports findings — those belong in a pane on the main checkout, because
isolating them buys nothing and a fresh worktree costs a checkout.

## What blocks `split`/`workspace`

`herdr agent start --kind` takes a fixed enum (`pi, claude, codex, gemini, cursor, devin,
agy, cline, omp, mastracode, opencode, copilot, kimi, kiro, droid, amp, grok, hermes, kilo,
qodercli, maki`). **`reasonix` is not in it**, so `dispatch reasonix` can only ever run as
`window`, in Terminal.app. That is herdr's limitation, not a preference — and on the personal
profile, where `CLAUDE_DELEGATE_AGENT=reasonix`, it is the common case. `dispatch transport`
says so in as many words.

`--headless` skips step 3 entirely and always runs a plain subprocess: cron, SSH, and
scheduled agents have no GUI session and no herdr session to put anything in.

## An explicit token always wins

A target named in the user's arguments beats the whole ladder, and no menu is printed.
`implement dispatch codex`, `review dual herdr`. Naming a target that is not
available — `herdr` outside herdr — is an error to state and stop on, never a silent
fallback to something else.

## Say which one ran

Name the target in the first status line and in the final report. The failure this prevents
is not picking wrong; it is a run that quietly *became* a different one, leaving the user
tabbing over to watch a target that was only ever an in-session agent.

## Related

- The resolver, the vendors, and the auth gate → [SKILL.md](SKILL.md)
- The herdr live-agent transport → `herdr-agent` in this directory
- The Terminal.app transport → [TRANSPORT-TERMINAL.md](TRANSPORT-TERMINAL.md)
- Implementation passes, which do not use this ladder at all — they are `implementer` agents dispatched by the main session, one worktree each → [../implement/SKILL.md](../implement/SKILL.md)
