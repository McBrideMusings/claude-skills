---
name: unblock
description: "Get a blocked branch to mergeable, doing the work rather than offering: resolve merge conflicts, diagnose and fix red CI, respond to unaddressed PR feedback. On the default branch it sweeps every blocked branch you own. Triggers: 'the PR is red', 'CI is failing', 'conflicts', 'resolve failing tests', 'address the review comments', 'unstick my PRs'."
---

# Unblock

**Something is standing between this branch and a merge. Remove it.**

Four things block a branch: the local checkout isn't at the branch head (checked every run), the branch **conflicts** with its base, its **checks are red**, or it carries **reviewer feedback nobody has answered**. Each fires only if actually true.

**Brief the worker with:** the repo root, the branch, the PR (if any), and whether the branch is mine — the diagnosis-and-repair procedure itself now lives in [`agents/unblock-worker.md`](../../agents/unblock-worker.md) (the `~/.claude` repo), sourced from [`WORKER-PROMPT.md`](WORKER-PROMPT.md) here.

**Presenting what it returns:** one line per gate that actually fired, then one slate — every outward action (push, reply, re-request) as numbered rows with your pick, closed with `CLAUDE.md`'s `go` escape hatch. Never split push from the reply/re-request it enables into separate rows.

On the default branch, this is a sweep across every blocked branch you own, not a single-target run.
