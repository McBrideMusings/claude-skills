# The worker brief

The prompt sent to each worker. A worker is a fresh session that knows nothing about the swarm — everything it must not do has to be said here, because the constraints come from the *worktree*, and nothing in `/implement` knows it is running in one.

**The brief does not redefine `/implement`.** It hands the worker one issue and states the four things a worktree changes. Everything about how the work gets done — the gate, the phases, the verify, the wrap-up — belongs to `/implement` and is not restated, overridden, or paraphrased here.

## Template

Substitute `<>` values. Keep every section — each one prevents a failure seen in practice. The subagent and workflow transports add one clause of their own (the worker does not start inside the worktree); see their files.

> You are in a git worktree at `<worktree-path>` on branch `<branch>`, working the `<repo>` repo. A submodule-bearing repo needs `git -c protocol.file.allow=always submodule update --init --recursive` before its first build — the plain form fails in a worktree with `transport file not allowed`.
>
> **Your task: `/implement <issue> continuous` — `<one-line issue title>`.**
>
> **Nobody is watching and nobody can answer you.** Run in `continuous` mode and behave exactly as it specifies: if the item hides a decision you would have to invent an answer to, file the `needs human input` follow-up and halt. Do not ask — there is no channel to a human and your question would strand you. Do not guess to keep moving.
>
> **Do not land.** Do not merge, and do not push to `<default-branch>`. Commit and push only `<branch>`. When `/implement` reaches wrap-up, pass that instruction through: wrap-up must stop after pushing your branch and must not run its landing step. Landing is serialized by the orchestrator, and `git checkout <default-branch>` fails in a worktree regardless.
>
> **Do not run a repo-wide formatter.** Format only files you touched. Reformatting the workspace makes every sibling worker's branch conflict on formatting alone.
>
> **Your verify phase is what reports you finished.** `/implement` Phase 1.5 must run and must write `<worktree-path>/tmp/claude/verify/<issue>.json`. That file is the only thing the orchestrator can read — your transcript is not recoverable. Write it for every verdict, `SKIP` included.
>
> Start by reading the issue: `gh issue view <issue> --repo <owner/repo>`.

## Why each clause is here

| Clause | Failure it prevents |
|---|---|
| worktree path + branch named | worker assumes it is in the primary checkout and pushes to the default branch |
| submodule init, with `protocol.file.allow=always` | first build fails with an unreadable-manifest error that never mentions submodules; and in a worktree the plain form fails outright with `transport file not allowed`, because the submodule's origin is a local path |
| `continuous`, and don't ask | a standalone pass is *allowed* to prompt, and a prompt in a swarm is a worker parked forever with nobody coming |
| don't guess to keep moving | worker treats "nobody can answer" as licence to invent the decision — the failure the gate exists to prevent, arriving one step later |
| do not land, pass it through wrap-up | `wrap-up` lands by default on an owned repo; `git checkout <default>` then fails in the worktree, or worse, N workers race the same branch |
| no repo-wide formatter | one reformat commit conflicts every sibling branch |
| verdict file, every verdict | orchestrator has nothing to read; a missing file is indistinguishable from a pass that never ran |

## Adding to the brief

Add a clause when a worker fails in a way the brief did not cover, and record the failure in the table above. A clause with no observed failure behind it is a **no-op** — the worker already behaves that way, and it costs tokens in every dispatch.

**A clause that restates something `/implement` already says is worse than a no-op**: it is a second copy that will drift from the original, and the worker will have to guess which one wins.
