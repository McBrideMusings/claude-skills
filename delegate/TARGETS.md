# Delegation targets — the ladder

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
| Cross-vendor | no — Claude only | yes, any kind in herdr's `--kind` enum | yes, any vendor `delegate` resolves |
| Reached by | the `Agent` tool | `delegate exec` → `herdr-agent` | `delegate exec` → `terminal run` |

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

Nobody implements step 3 by hand. `delegate exec` does it, and `delegate transport` prints
the answer with its reason. Both surfaces take the same contract — prompt in a file, answer
in `<outfile>` — so a skill never branches on which one ran.

## What blocks the herdr tab

`herdr agent start --kind` takes a fixed enum (`pi, claude, codex, gemini, cursor, devin,
agy, cline, omp, mastracode, opencode, copilot, kimi, kiro, droid, amp, grok, hermes, kilo,
qodercli, maki`). **`reasonix` is not in it**, so a reasonix delegate can only ever run in
Terminal.app. That is herdr's limitation, not a preference — and on the personal profile,
where `CLAUDE_DELEGATE_AGENT=reasonix`, it is the common case. `delegate transport` says so
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
- The Terminal.app transport → [../terminal/SKILL.md](../terminal/SKILL.md)
- Swarms, which layer worktrees and a `workflow` target on top of this → [../orchestrate/SKILL.md](../orchestrate/SKILL.md)
