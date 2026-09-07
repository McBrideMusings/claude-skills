---
name: implement
description: "Autonomous work on tracked items, one workflow pass per item. `implement <issue>` works that issue; bare `implement` discovers one; `implement <selector>` walks a queue; `implement swarm <selector>` runs several at once."
---

# /implement — run passes, verify them, land them

One **pass** is one tracked item, worked end to end by `implement.js` in its own worktree, ending at a commit. This session is the orchestrator: runs it, re-checks it, lands it, closes it. **Arity is the only difference between these three** — a pass doesn't know which is happening.

| | What this session does |
|---|---|
| `implement <issue>` | one pass, land it, stop |
| `implement <selector>` | a pass, land, next — one at a time |
| `implement swarm <selector>` | N passes at once, landed as each returns |

## The unit is a slice

A pass takes **one slice child** — `myproj-25.1`, never `myproj-25`. A parent with no breakdown, or a Verify/Land child, is never handed to `implement.js`. **Verify is this session's**, via `verify-project`; `human` stops it until a person looks. **Land is a slate row**, `go`-taken — never inside a pass ([`ARITY.md`](ARITY.md) has why). Item → pass: [`HANDOFF.md`](HANDOFF.md).

---

## ⛔ The pass is a workflow, addressed by path

Every pass shares one `scriptPath`; `meta` stays a pure literal. Generate a per-pass copy first, pass *that* path:

```
generated=$(bash /Users/pierce/.claude/skills/implement/name-pass.sh "$id" "$title")
Workflow({ scriptPath: generated, args: { resolved, worktree, repo, branch, model } })
```

`args.resolved` is the item itself — `{id, title, body, acceptance?, branch?, files?}` — already cleared and gated in chat before this call ([`HANDOFF.md`](HANDOFF.md) §1); the pass never fetches or judges an item on its own, and a launch with no `resolved` (or an empty id) halts before anything else runs. `args.round` names which launch of this item this is — `1` runs every stage, `2`+ is a relaunch from this session's own verify loop, below.

`implement.js` is the only file edited by hand. Never `Workflow({name: 'implement'})`; only this session calls `Workflow`. [`WORKTREES.md`](WORKTREES.md) has more.

A pass runs five stages — **Plan, Implement, Review, Verify, Wrap** — and it owns its own fix loop: Implement, Review and Verify run together, up to three rounds, before Wrap ever runs. A round fails on a `blocking`/`major` Review finding or a Verify `FAIL`, and a failed round below the cap reruns Implement with the failures named, then Review and Verify again, on the same uncommitted tree. Only the final round's findings and verdict reach the object below; Wrap runs once, after the loop ends, whichever round that is.

---

## What a pass returns

```js
{ ok, item, title, round, rounds, verdict, verdict_path, commit, branch, worktree,
  recheck: [{cmd, expect}], blockers: [], review, files, followups, summary }
```

A halt returns `{ok: false, halted_on, detail, worktree}`. **Branch on `ok` first** — a halt carries no `blockers`. `rounds` is how many times the pass's own fix loop actually ran (1 when the first round was clean). `followups` is work outside scope, never a diff defect — a defect is a Review finding, `major`+ also a blocker.

---

## The verify loop

**You re-run `recheck` yourself, in the worktree — your result decides if the branch lands.** This is a *different* loop from the one the pass runs on itself: it exists for what your own recheck finds that the pass's own Verify stage could not see.

```text
check reachability of every named host:port/URL -> start whatever is down
r = Workflow(pass); round = 1
loop
  if !r.ok && r.halted_on == 'surface'  -> start the surface, relaunch on the SAME worktree
  if !r.ok  -> halt: report r.halted_on, r.detail
  run r.recheck[].cmd, compare against .expect; append a rechecks entry at r.verdict_path
  review r's diff against the pass's starting sha
  if clear and r.blockers empty  -> land
  if round == 2  -> halt: leave the worktree standing, report the path
  r = Workflow(pass, args: {...args, worktree: r.worktree, round, resolved: {...resolved, body: <the failures>, files: r.files}}); round++
```

**Check reachability yourself, before the first launch. On exhaustion, halt** — leave the worktree standing. Context fills mid-run → `relay`, don't push on.

Round mechanics and the verdict-append discipline: [`VERDICTS.md`](VERDICTS.md).

---

## Pre-flight

On failure, print the reason and stop. **Refuse a dirty tree:** `git status --short -- . ':(exclude).beads' ':(exclude).claude'` — those two exempt, else halt ([`WORKTREES.md`](WORKTREES.md) has why). **No commit-count guard** — one commit per *pass*.

---

## Halt conditions

- Pre-flight failed
- No diff; build won't go green; the in-pass loop exhausted three rounds without a clean round
- verification `BLOCKED`, or a closed surface (`halted_on: 'surface'`)
- This session's own verify loop exhausted two rounds

Verify treats doubt as `FAIL`. What "cleared" means before a pass is ever dispatched — including the plan, objectivity and reachability tests — is [`HANDOFF.md`](HANDOFF.md) §1's, run in chat, before a worktree exists.

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

---

## Read on demand

| Open | When |
| --- | --- |
| [`WORKTREES.md`](WORKTREES.md) | Where a pass runs, cross-repo items, retiring a worktree, `Workflow` mechanics. |
| [`VERDICTS.md`](VERDICTS.md) | Verification, verify-loop round mechanics, reading a verdict. |
| [`ARITY.md`](ARITY.md) | Model choice, sequential/swarm arity, arity reporting. |
