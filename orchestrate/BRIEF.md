# The worker brief

The prompt sent to each worker with `herdr agent prompt`. A worker is a fresh session that knows nothing about the swarm — everything it must not do has to be said here, because the constraints come from the *worktree*, and nothing in `/implement` knows it is running in one.

Send it, then send Enter separately (see SKILL.md step 3).

## Template

Substitute `<>` values. Keep every section — each one prevents a failure seen in practice.

`<how-to-ask>` is filled in by the transport, because asking is the one thing that works differently under each: [TRANSPORT-HERDR.md](TRANSPORT-HERDR.md) (ask in the pane, wait) or [TRANSPORT-SUBAGENT.md](TRANSPORT-SUBAGENT.md) (`SendMessage` to `main`, end the turn). The subagent transport adds one clause of its own — the worker does not start inside the worktree.

> You are in a git worktree at `<worktree-path>` on branch `<branch>`, working the `<repo>` repo. A submodule-bearing repo needs `git -c protocol.file.allow=always submodule update --init --recursive` before its first build — the plain form fails in a worktree with `transport file not allowed`.
>
> **Your task: `/implement <issue>` — `<one-line issue title>`.**
>
> Use **standalone** `/implement`, not `continuous`. If the item hides a design decision, do not invent an answer and do not file-and-skip — `<how-to-ask>`.
>
> Ask **once**, in full: the options with their concrete consequences and the `file:line` you are looking at. Do not re-ask, do not pick an option to keep moving, and do not treat silence as agreement — your question may be queued behind another worker's, and one human answers them one at a time.
>
> **Do not land.** Do not merge, and do not push to `<default-branch>`. Commit and push only `<branch>`. When `/implement` reaches wrap-up, pass that instruction through: wrap-up must stop after pushing your branch and must not run its landing step. Landing is serialized by the orchestrator, and `git checkout <default-branch>` fails in a worktree regardless.
>
> **Do not run a repo-wide formatter.** Format only files you touched. Reformatting the workspace makes every sibling worker's branch conflict on formatting alone.
>
> **Your verify phase is what reports you finished.** `/implement` Phase 1.5 must run and must write `<worktree-path>/tmp/claude/verify/<issue>.json`. That file is the only thing the orchestrator can read — this pane's transcript is not recoverable. Write it for every verdict, `SKIP` included.
>
> Start by reading the issue: `gh issue view <issue> --repo <owner/repo>`.

## Why each clause is here

| Clause | Failure it prevents |
|---|---|
| worktree path + branch named | worker assumes it is in the primary checkout and pushes to the default branch |
| submodule init, with `protocol.file.allow=always` | first build fails with an unreadable-manifest error that never mentions submodules; and in a worktree the plain form fails outright with `transport file not allowed`, because the submodule's origin is a local path |
| standalone, not continuous | continuous mode's AFK gate *skips* decision-laden items and files a follow-up — the work never happens |
| ask, don't invent, don't file-and-skip | worker invents a design decision the human owns |
| ask once, in full, and expect a queue | worker assumes someone is reading it live, asks a one-line question with no options ("which approach?"), gets no answer because the relay had nothing answerable to carry, then re-asks or guesses |
| do not land, pass it through wrap-up | `wrap-up` lands by default on an owned repo; `git checkout <default>` then fails in the worktree, or worse, N workers race the same branch |
| no repo-wide formatter | one reformat commit conflicts every sibling branch |
| verdict file, every verdict | orchestrator has nothing to read; a missing file is indistinguishable from a pass that never ran |

## Adding to the brief

Add a clause when a worker fails in a way the brief did not cover, and record the failure in the table above. A clause with no observed failure behind it is a **no-op** — the worker already behaves that way, and it costs tokens in every dispatch.
