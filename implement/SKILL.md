---
name: implement
description: "Autonomous work on tracked items, one background agent per item. `implement <issue>` works that issue; bare `implement` discovers one; `implement <selector>` walks a queue; `implement swarm <selector>` runs several at once."
---

# /implement — run passes, verify them, land them

Control words (`go`, `park`, `dispatch`, `implement`, `verify` …) are defined in
[`../CONTEXT.md`](../CONTEXT.md).

One **pass** is one tracked item, worked end to end by a single `implementer` agent in its own worktree, ending at a commit. This session is the orchestrator: dispatches it, re-checks it, lands it, closes it. **Arity is the only difference between these three** — a pass doesn't know which is happening.

| | What this session does |
|---|---|
| `implement <issue>` | one pass, land it, stop |
| `implement <selector> queue` | a pass, land, next — one at a time |
| `implement swarm <selector>` | N passes at once, landed as each returns |

**`implement <issue> inline`** is the one escape hatch, and it is not a pass at all — it never dispatches an agent. The session works the four steps itself, directly, in whatever checkout it already sits in: this session, this checkout, no worktree. Every other arity above dispatches an `implementer` agent as a pass, and a pass always runs in a worktree, no exceptions ([`WORKTREES.md`](WORKTREES.md)) — `inline` sidesteps that rule by not being a pass, not by carving an exception into it. Reach for it only when the user says otherwise.

## The unit is a slice

A pass takes **one slice child** — `myproj-25.1`, never `myproj-25`. A parent with no breakdown, or a Verify/Land child, is never dispatched. **Verify is this session's**, via `verify-project`; `human` stops it until a person looks. **Land is a slate row**, `go`-taken — never inside a pass ([`ARITY.md`](ARITY.md) has why). Item → pass: [`HANDOFF.md`](HANDOFF.md).

---

## ⛔ The pass is one background agent

```
Agent({
  subagent_type: 'implementer',
  description: '<id> <short title>',
  prompt: <the brief — see HANDOFF.md §2>,
})
```

It runs in the background and notifies this session when it lands. **One agent per item.** Never several agents split across stages of the same item, and never an agent that dispatches its own implementer — one item, one context, start to finish.

The agent spawns exactly one subagent of its own: `code-reviewer`, blind, once the build is green.

`args.resolved`-equivalents go in the prompt: the item is `{id, title, body, acceptance?, branch?, files?}`, already cleared and gated in chat before dispatch ([`HANDOFF.md`](HANDOFF.md) §1). The pass never fetches or judges an item on its own. The agent definition lives at `~/.claude/agents/implementer.md`; [`WORKTREES.md`](WORKTREES.md) has where it runs.

---

## What a pass returns

Its final message is one fenced JSON block:

```js
{ ok, item, verdict, verdict_path, commit, branch, worktree,
  recheck: [{cmd, expect}], blockers: [], review, files, followups, mutation, summary }
```

A halt returns `{ok: false, halted_on, detail, worktree}`. **Branch on `ok` first** — a halt carries no `blockers`. `followups` is work outside scope, never a diff defect. Parse the block; if the agent returned prose instead, treat the pass as halted on `report` and read the worktree yourself rather than guessing what it meant.

---

## The verify loop — at most two launches

**You re-run every `recheck` command yourself, in the worktree. Your result decides whether the branch lands, not the agent's account of it.** A pass that reports a command passed, without that command being run again here, has not been verified.

```text
check reachability of every named host:port/URL -> start whatever is down
r = Agent(implementer); round = 1
loop
  if !r.ok && r.halted_on == 'surface'  -> start the surface, relaunch on the SAME worktree
  if !r.ok  -> halt: report r.halted_on, r.detail
  run r.recheck[].cmd, compare against .expect; append a rechecks entry at r.verdict_path
  review r's diff against the pass's starting sha
  if clear and r.blockers empty  -> land
  if round == 2  -> halt: leave the worktree standing, report the path
  if the fix would revert a hunk round 1 wrote  -> halt: the criteria contradict each other
  r = Agent(implementer, <same worktree, failures as the brief>); round++
```

**Two launches, then stop.** A second round that still fails means the brief is wrong, and that is a judgment you hold.

**Halt on oscillation before relaunching.** If the failures you are about to hand back would undo a hunk the previous round wrote, the item's own criteria contradict each other — stop and put the contradiction to the user.

**Check reachability yourself, before the first dispatch. On exhaustion, halt** — leave the worktree standing. Context fills mid-run → `relay`, don't push on.

Round mechanics and the verdict-append discipline: [`VERDICTS.md`](VERDICTS.md).

---

## Pre-flight

On failure, print the reason and stop. **Refuse a dirty tree:** `git status --short -- . ':(exclude).beads' ':(exclude).claude'` — those two exempt, else halt ([`WORKTREES.md`](WORKTREES.md) has why). **No commit-count guard** — one commit per *pass*.

---

## Halt conditions

- Pre-flight failed
- No diff; build won't go green
- verification `BLOCKED` — a closed surface (`halted_on: 'surface'`), or a fixture that contradicts the item's own model (`halted_on: 'fixture'`)
- The criteria contradict each other (oscillation, above)
- This session's own verify loop exhausted two launches

**A `BLOCKED` on a fixture is not a code problem and never becomes one.** The environment's data cannot express what the criterion asks — a seed row outside the domain the item defines, a database filled from a constant the item is changing. Fix the data or fix the criterion; never let a pass edit product code to satisfy data the item's own model says should not exist.

Verify treats doubt as `FAIL`. What "cleared" means before a pass is ever dispatched — the plan, objectivity and reachability tests — is [`HANDOFF.md`](HANDOFF.md) §1's, run in chat, before a worktree exists.

---

## Output

Additive to `CLAUDE.md` §Finishing work, once for the run:

```
Implement complete: <one-sentence summary>. Halt: <reason | none>.
Backlog: X open issues (closed Y), Z ready.
```

Sequential/swarm additions and the backlog snapshot: [`ARITY.md`](ARITY.md).

---

## Notes

- One pass works **one** item; never bundle two; never invokes itself.
- A pass never writes to the tracker — this session closes it after landing, only on `PASS` plus a commit.
- A pass never removes its own worktree; this session does, from the main checkout.

---

## Read on demand

| Open | When |
| --- | --- |
| [`WORKTREES.md`](WORKTREES.md) | Where a pass runs, cross-repo items, retiring a worktree. |
| [`VERDICTS.md`](VERDICTS.md) | Verification, verify-loop round mechanics, reading a verdict. |
| [`ARITY.md`](ARITY.md) | Model choice, sequential/swarm arity, arity reporting. |
| [`HANDOFF.md`](HANDOFF.md) | Clearing an item, and what goes in the agent's brief. |
