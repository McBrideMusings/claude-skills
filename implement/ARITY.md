# Arity — model choice, sequential, swarm

## Reporting arity

In sequential or swarm arity, name in the Output: every item and its outcome, the `slug → model` split, every worktree still standing and why, the verdict files now in the primary checkout, and the run's token total read from `/workflows`. A run that lands six items should leave six verdicts behind; anything less means evidence went out with a worktree.

Computing the backlog snapshot: on beads, `bd count --status open` plus `bd ready --json | jq length` for the unblocked figure; on GitHub, `gh issue list --state open --json number --limit 1000` and count. If the backend errors, omit the line rather than halting.

**The tracker is the only source for this line.** There is no roadmap file to consult — the dependency graph is the roadmap, and `backlog shape` is what reads it. Never probe for `ROADMAP.md` or report its absence; a repo that keeps everything in beads is the normal case, not a gap worth a line of output.

## Picking the model

**Sonnet by default; Haiku for mechanical work** — a rename, a string, a bounds check. Pass `model` explicitly on every call: omitting it makes the pass inherit this session's model, which is frequently Opus, and that is exactly the path a wrong tier takes into a run.

**Never Opus for a pass, and never Fable at all.** A pass follows a brief that already survived the readiness gate, in an isolated worktree, with its result re-checked before it lands. That is Sonnet's job. Opus is for deciding what to execute — which is what this session is doing. Fable is only ever chosen by the user, explicitly.

**A swarm round drawn from a well-defined, low-risk selector defaults to Haiku for the whole round**, not just per-item mechanical edits — `label:papercut`, `label:mechanical`, or any selector whose items already passed the scope gate on uniformly small, low-risk changes. Reach for Sonnet per-item only where an individual item's brief is heavier than the selector implies.

In swarm arity, say the split in the report: `slug → sonnet|haiku`, or a count per tier when it is large.

---

## Sequential arity

Resolve the selector into a frozen queue first — issue numbers, `#range`, `label:X`, `milestone:X`, `epic:X`, `followups`, `papercuts`. Then work it one at a time: pass, verify loop, land, next. Re-resolving the selector between items gets a different queue, because the backlog moved while you were landing branches.

Before freezing the queue, apply HANDOFF § 2's mount-file test to any items that would otherwise be sequenced only because they share a file: when that shared file is a mount file, the items leave the sequential queue and go out as a swarm instead. Also size and merge the queue per HANDOFF § 1 and § 2 before freezing it, and name every merge made in the report.

- **Start from the default branch.** A continuous run branches from the head of the canonical line, never from a half-finished feature branch.
- **Land each before starting the next.** Each pass branches from the *current* head, so two in flight would race into the default branch. This is why sequential is sequential and not a `pipeline()`.
- **Cap the run at 20 items.** The cap is a safety valve, not a target.
- **An item-level failure skips to the next; an environment failure ends the run.** A tree that will not come back clean, or a pull that no longer fast-forwards, is the second kind — do not attempt the next item.
- **A halted pass stops the queue** (see the verify loop). Report which items never ran.

---

## Swarm arity

Every pass gets its own worktree and they run at once. The human is involved at exactly two moments: the gate before anything is dispatched, and the report after. In between there is no channel from a pass back to a person, and no way for one to exist. An item that turns out to be ambiguous costs its whole dispatch and waits for a `backlog shape` pass.

**The scope gate, before anything is dispatched.** Read every in-scope issue and confirm each one is actually ready — a concrete plan, named files, an objective acceptance check. Exclude automatically and without asking: anything unlabelled or untriaged, anything whose body is a question, anything touching migrations, auth, payments, or deletion paths, and anything naming paths in two repos (see [`WORKTREES.md`](WORKTREES.md) Cross-repo items) — split it into one item per repo before it is dispatched. Size and merge the round per HANDOFF § 1 and § 2 here too: an under-floor item is merged into its in-scope neighbour before the round is dispatched, never dispatched alone. State what you excluded and merged, and why.

**No pass ever lands its own work.** `implement.js` ends at a commit and has no push in it at all — a stage that runs no `git push` has nothing to route around. `hooks/landing-guard.sh` makes that structural rather than remembered: one of its two predicates is that the caller is a subagent (the other is a worktree marked SELF-LAND), and on that one it denies `git push`, `git merge` into the default branch, `gh pr`/`gh issue` writes and `bd` writes from any implementation subagent. Prose instructions not to push have not held on their own; agents merged into `main` and closed their own issues against explicit clauses repeated four times.

The Land bead exists for the same reason: it is a slate row, taken with `go`, never inside a pass or a brief. The one run that carried "push and open the PR" into the worker did exactly that, with four unanswered product questions pasted into the PR body, and the only reason the questions existed was that nobody had been asked. `implement.js` cannot open a PR because it runs no `git push`; the orchestrator does not either until the row is accepted.

**You land each pass as it returns**, from the primary checkout, after re-verifying against a base that may have moved. A linked worktree shares the object store, so every commit is already visible there — no fetch needed.

**Copy each verdict into the repo's own directory before removing a worktree.** `$(~/.claude/tools/repo-slug --path <worktree>)/verify/<item>.json` is keyed to a directory that is about to stop existing. The repo's copy is the one a later reader can find; without it, the outside view is indistinguishable from a swarm that skipped verification. Take the copy *after* the last `rechecks` append — a copy taken before a later round leaves the repo's copy reading stale for a branch that was actually re-verified. If you append a `rechecks` entry after already copying, re-copy before `worktree remove --force`.

**Never edit files that every change appends a row to** — a changelog, a file map, a component registry. Every sibling branch collides on them by construction. Passes return the rows in `followups` instead and you write them after landing. A mount file is the same shape — a root component, router table, barrel `index.*`, or plugin list that briefs only ever append a line or a block to — and HANDOFF § 2 says how the brief gets rewritten so the pass returns the mount lines in `followups` instead of editing the file directly.

**Keep rounds small enough that a bad brief does not burn the frontier.** A round of N items is N passes at once; watch the running total in `/workflows`.

**A selector matching more than 8 items pilots first.** Dispatch a batch of at most 5, land those, and check the cost and failure rate in `/workflows` before dispatching the rest. Sequential arity already caps a whole run at 20 items; swarm arity has no run-level cap, so an oversized selector dispatches its entire count at once unless this step catches it first.

---

