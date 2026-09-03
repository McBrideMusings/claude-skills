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
generated=$(bash /Users/pierce/.claude/skills/implement/name-pass.sh "$issue" "$title")
Workflow({ scriptPath: generated, args: { issue, worktree, repo, branch, model } })
```

`implement.js` is the only file edited by hand. Never `Workflow({name: 'implement'})`; only this session calls `Workflow`. [`WORKTREES.md`](WORKTREES.md) has more.

---

## What a pass returns

```js
{ ok, item, title, verdict, verdict_path, commit, branch, worktree,
  recheck: [{cmd, expect}], blockers: [], review, files, followups, summary }
```

A halt returns `{ok: false, halted_on, detail, worktree}`. **Branch on `ok` first** — a halt carries no `blockers`. `followups` is work outside scope, never a diff defect — a defect is a Review finding, `major`+ also a blocker.

---

## The verify loop

**You re-run `recheck` yourself, in the worktree — your result decides if the branch lands.**

```text
check reachability of every named host:port/URL -> start whatever is down
r = Workflow(pass); round = 1
loop
  if !r.ok && r.halted_on == 'surface'  -> start the surface, relaunch on the SAME worktree
  if !r.ok  -> halt: report r.halted_on, r.detail
  run r.recheck[].cmd, compare against .expect; append a rechecks entry at r.verdict_path
  review r's diff against the pass's starting sha
  if clear and r.blockers empty  -> land
  if round == 5  -> halt: leave the worktree standing, report the path
  r = Workflow(pass, args: {...args, worktree: r.worktree, round, resolved}); round++
```

**Check reachability yourself, before the first launch. On exhaustion, halt** — leave the worktree standing. Context fills mid-run → `relay`, don't push on.

Round mechanics and the verdict-append discipline: [`VERDICTS.md`](VERDICTS.md).

---

## Pre-flight

On failure, print the reason and stop. **Refuse a dirty tree:** `git status --short -- . ':(exclude).beads' ':(exclude).claude'` — those two exempt, else halt ([`WORKTREES.md`](WORKTREES.md) has why). **No commit-count guard** — one commit per *pass*.

---

## Halt conditions

- Pre-flight failed; issue closed/missing; nothing actionable in triage
- AFK-ability gate failed — a decision the user owns; file `needs human input: <item> — <ambiguity>`
- Reachability gate failed — a path outside the confined repo ([`WORKTREES.md`](WORKTREES.md))
- No diff; build won't go green; verification `FAIL`/`BLOCKED`; five rounds exhausted; a blocking Review finding

Verify resolves doubt as `FAIL`.

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
