# Delegation targets — the ladder

> **Not this file: handing work *forward*.** Everything below is a **sideways** handoff —
> another agent or process runs the work while you keep your seat. Handing the *next* body
> of work forward into a clean context in the **same** pane, so this session ends and the
> next one begins where it left off, is `relay`. It shares no mechanism with this ladder.
> The one seam: when relay's next work needs a different checkout, relay calls `dispatch`,
> because a pane's cwd is fixed for its lifetime.

Every skill that hands work to another agent picks from the **same three targets**, in the
same order. This file is the single owner of that order. `review dual`, `implement delegate`,
`orchestrate`, and `iron-out` link here rather than each inventing a menu.

| | **Claude agent** | **herdr tab** | **Terminal.app window** |
|---|---|---|---|
| What runs | an `Agent` tool call in this session | a live interactive `claude`/`codex` in its own herdr tab | a one-shot piped into the vendor's non-interactive mode |
| Costs a window | no | no — a tab beside yours | yes, a real desktop window |
| Watchable | no | yes, live | yes, output tees to the window |
| You can type at it | no | **yes** — switch to the tab and take it over | no |
| Survives this session dying | no | **yes** | the window survives; the run does not |
| Cross-vendor | no — Claude only | yes, any kind in herdr's `--kind` enum | yes, any vendor `dispatch` resolves |
| Reached by | the `Agent` tool | `dispatch exec` → `herdr-agent` | `dispatch exec` → `terminal run` |

## The order

**1. Default to the Claude agent, always.** It is built into the harness: no window to
open, no process to supervise, no automation grant, no second auth. It is the cheapest
and the tightest plan-follower, and it is the one that behaves best inside a Claude Code
pass. Take this unless a reason below actually applies to the work in hand.

**2. Escalate to a separate process only for one of these three reasons** — and say which
one in the status line, so a run that escalated for no reason is visible:

- **Cross-vendor** — a non-Claude model has to do the work. This is the whole point of
  `review dual`: a second opinion from the same model is not a second opinion.
- **The user has to watch it or take it over** — a long unattended run they want to
  follow live, or one they expect to interrupt and steer.
- **It has to outlive this session** — the work continues after this Claude session ends,
  is compacted away, or is killed.

**3. Once a separate process is warranted, the surface is resolved, never asked:**

- **Inside herdr** (`HERDR_ENV=1`) **and herdr can start the vendor** → **a herdr tab**.
- **Otherwise** → **a Terminal.app window**.

Nobody implements step 3 by hand. `dispatch exec` does it, and `dispatch transport` prints
the answer with its reason. Both surfaces take the same contract — prompt in a file, answer
in `<outfile>` — so a skill never branches on which one ran.

## Where the work happens — a second axis, not part of the ladder

The ladder above answers *which surface*. It does not answer *which checkout*, and those are
independent questions. Answer both before dispatching.

**If the delegate will write code, it works in a git worktree.** Not the main checkout, no
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

**The dispatch decides where the work happens, never what the work is.** Verifying, building,
merging, opening a PR — those belong to the prompt, because only the prompt knows whether this
delegate is implementing a feature, chasing a bug, or reading logs. What dispatch owes the
worker is the *capacity* to finish and clear out.

**Give every worktree worker the retire line.** Put this in the prompt verbatim, whatever the
work is:

> When your work is done, retire yourself: `herdr worktree remove --workspace "$HERDR_WORKSPACE_ID" --force`.

The herdr **server** performs the deletion, not the pane's shell, so nothing loses its footing
when the directory goes. Removal is asynchronous — a check that runs immediately afterwards
will still see the checkout, so never make the worker confirm it.

**Never `git worktree remove <path>` or `rm -rf` on its own checkout.** That is the shape
`no-self-delete-guard.py` blocks, and the reason is real: delete the directory a session is
running in and every shell hook afterwards fails to spawn with `ENOENT` on `posix_spawn`
before reaching its first line, so the PreToolUse, PostToolUse and Stop guards are silently
skipped for the rest of that session — non-blocking failures, so nothing stops. The
`--workspace` form carries no path argument and is not affected.

**The branch is not the worker's to delete, and not yours either.** At the moment a worktree
finishes, its PR has not merged; the branch has to outlive every session involved. A hook
cannot know *done* — that is a judgment only the agent holds — but it can know *merged*, which
is a fact that arrives later. `tools/git-sweep.sh`, run daily from `hooks/daily-git-sweep.sh`,
collects branches proven merged (reachable from the default branch, or a `gh`-confirmed
squash-merge) along with any worktree still holding them. So a worker that never retires itself
is collected anyway once its PR lands; the retire line is the fast path, not the mechanism.

**The exception is work that only reads.** A build, a test run, a log tail, a probe, a
review that reports findings — those belong in a pane on the main checkout, because
isolating them buys nothing and a fresh worktree costs a checkout.

## What blocks the herdr tab

`herdr agent start --kind` takes a fixed enum (`pi, claude, codex, gemini, cursor, devin,
agy, cline, omp, mastracode, opencode, copilot, kimi, kiro, droid, amp, grok, hermes, kilo,
qodercli, maki`). **`reasonix` is not in it**, so a reasonix delegate can only ever run in
Terminal.app. That is herdr's limitation, not a preference — and on the personal profile,
where `CLAUDE_DELEGATE_AGENT=reasonix`, it is the common case. `dispatch transport` says so
in as many words.

`--headless` skips step 3 entirely and always runs a plain subprocess: cron, SSH, and
scheduled agents have no GUI session and no herdr session to put anything in.

## An explicit token always wins

A target named in the user's arguments beats the whole ladder, and no menu is printed.
`orchestrate herdr`, `implement delegate`, `iterate workflow`. Naming a target that is not
available — `herdr` outside herdr — is an error to state and stop on, never a silent
fallback to something else.

## Say which one ran

Name the target in the first status line and in the final report. The failure this prevents
is not picking wrong; it is a run that quietly *became* a different one, leaving the user
tabbing over to watch a delegate that was only ever an in-session agent.

## Related

- The resolver, the vendors, and the auth gate → [SKILL.md](SKILL.md)
- The herdr live-agent transport → `herdr-agent` in this directory
- The Terminal.app transport → [TRANSPORT-TERMINAL.md](TRANSPORT-TERMINAL.md)
- Swarms, which layer a `workflow` target and many parallel worktrees on top of this → [../orchestrate/SKILL.md](../orchestrate/SKILL.md)
