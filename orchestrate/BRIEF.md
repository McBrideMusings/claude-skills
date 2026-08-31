# The worker brief

The prompt sent to each worker. A worker is a fresh session that knows nothing about the swarm — everything it must not do has to be said here, because the constraints come from the *worktree*, and nothing in `/implement` knows it is running in one.

**The brief does not redefine `/implement`.** It hands the worker one issue and states the four things a worktree changes. Everything about how the work gets done — the gate, the phases, the verify, the wrap-up — belongs to `/implement` and is not restated, overridden, or paraphrased here.

**The task line names the tool, not a slash command, and that is not a style choice.** Slash expansion is an interactive-input feature: this brief is delivered programmatically, so `/implement` arrives as plain text and nothing loads. A raw slash command reaching a worker is disproportionately `/implement` specifically — every other skill's raw case is typically a stray leading space, not a systematically unexpanded invocation. A worker whose skill never loads improvises the phases that skill owned, and that improvisation has run `git worktree remove --force` on its own working directory, killing every shell hook the pass depended on.

## Template

Substitute `<>` values. Keep every section — each one prevents a failure seen in practice. Exactly one clause is conditional, and it is marked: the device clause, which is dropped whole on a project whose verification touches no device. The subagent and workflow transports add one clause of their own (the worker does not start inside the worktree); see their files.

> You are in a git worktree at `<worktree-path>` on branch `<branch>`, working the `<repo>` repo. A submodule-bearing repo needs `git -c protocol.file.allow=always submodule update --init --recursive` before its first build — the plain form fails in a worktree with `transport file not allowed`.
>
> **Your task: call `Skill(implement)`, then work `<issue>` in `continuous` mode — `<one-line issue title>`.** Call the tool. Writing `/implement` will not load anything.
>
> **Nobody is watching and nobody can answer you.** Run in `continuous` mode and behave exactly as it specifies: if the item hides a decision you would have to invent an answer to, file the `needs human input` follow-up and halt. Do not ask — there is no channel to a human and your question would strand you. Do not guess to keep moving.
>
> **You do not push, at all.** Commit to `<branch>` and stop there. This worktree shares the primary checkout's object store, so the orchestrator reads your commits directly with no push involved — it lands them itself after re-verifying against a base that may have moved. `git push`, `git merge`, and `git checkout <default-branch>` have no place in your pass, here or via `git -C` against any other checkout.
>
> **If `<worktree-path>` is missing, halt — do not recreate it.** No `git worktree add`, under any circumstance. The orchestrator created that tree at a base it chose; a worktree you create picks a base you chose, and the round then forks from the wrong commit with nothing announcing it. Do no work. Report exactly two things: that `<worktree-path>` does not exist, and that you halted without recreating it.
>
> **Do not run a repo-wide formatter.** Format only files you touched. Reformatting the workspace makes every sibling worker's branch conflict on formatting alone.
>
> **Only if step 3 gave this worker a device — drop the clause otherwise.** Your device is `<device-id>`. Every command that builds to, installs on, or reads from a device names that id explicitly; never a device name and never "the default one". Your siblings are running the same app on their own devices, and a name resolves to whichever of them answers to it. Platform commands: `<the two or three pinned invocations from ../ref-<platform>/orchestrate.md>`.
>
> **Your verify phase is what reports you finished.** `/implement` Phase 1.5 must run and must write `$(~/.claude/tools/repo-slug --path <worktree>)/verify/<issue>.json`. That file is the only thing the orchestrator can read — your transcript is not recoverable. Write it for every verdict, `SKIP` included.
>
> **Commit your branch BEFORE any optional quality pass** — before a review agent, a simplification pass, a docs tidy, a second look at anything. Those are worth doing and they go after, on top of a commit that exists; anything they change gets its own commit. The reason is not tidiness: an uncommitted worktree is the only state nobody but you can land or recover, and the optional passes are exactly where workers die.
>
> **The verdict's sha field is `verified_parent`, never `commit`** — the sha your verified tree sits on top of, which is the parent of the commit your work becomes. Read it with `git -C <worktree-path> rev-parse HEAD` at the moment you verify, then make your commit. The orchestrator checks `verified_parent` against `git -C <worktree-path> rev-parse <branch>^`: on an honest pass they match, and when they don't, something was committed after you verified and is shipping unverified. Do not write `commit` and do not go back and correct the file afterwards — an evidence record a later step has to edit is not evidence.
>
> **`item` in the verdict is the tracker id, and so is the filename** — `<issue>.json`, matching the id you were dispatched with. Never the issue title. The orchestrator matches on the id, the title is already on the issue, and a verdict carrying only the title has no id in either place, so nothing can match it back to your work.
>
> **Never end your turn while any work you started is still running.** That covers a background Bash command AND any subagent you spawned — a review, a simplification, a search. You have no way to be woken: ending your turn to wait for a notification ends *you*, and everything you have not committed is stranded in the worktree for someone else to recover. If you want a subagent, spawn it with `run_in_background: false` so it returns into your own turn.
>
> **So run slow commands in the foreground with an explicit timeout.** The Bash tool's default timeout is 120 seconds and a real build or test suite routinely exceeds it; when it does, the tempting fix is to re-run in the background, which is the trap above. Pass `timeout` explicitly instead — up to `600000` (10 minutes), e.g. `timeout: 600000` on the build call — so the command simply finishes in front of you. If a command genuinely needs longer than the maximum, split it (build, then test) rather than backgrounding it.
>
> Start by reading the issue: `bd show <issue> --json` on a beads repo, `gh issue view <issue> --repo <owner/repo>` on GitHub.
>
> **Read the tracker; never write to it.** No `bd update`, no `bd close`, no `gh issue close`, no comments. On beads the embedded database takes one writer at a time and your sibling workers are competing for it; on either backend the orchestrator records the outcome from the primary checkout once your verdict file lands. Your verdict file is how you report — that is the whole channel.
>
> **Do not edit `<shared-index-files>`.** Every worker appends to the same lines of those files, so every branch after the first conflicts on them and none of it is about the code. Instead, **return** the exact text you would have written in your Wrap stage's `index_entries` field, as `{"file": "<path>", "entry": "<the full replacement line or row>"}`. The orchestrator writes them from the primary checkout after your branch lands.
>
> **`index_entries` is a returned field, never a file you write.** Do not put it in your verdict file: that file is the Verify stage's, it already exists by the time you have index rows to report, and writing yours into it replaces the verdict with a file holding nothing else — a majority of workers across a multi-round run have destroyed their own verdict exactly this way, and orchestrate's rule is that a `PASS` with no verdict file on disk is not a pass.
>
> **What needs an entry is not "files I created" — it is every line of those indexes your change made untrue.** Before writing the list, open each index and read the entries for every file in your diff, including ones you only edited. If an entry describes behaviour you changed, a count you changed, or a rule you added a condition to, it needs a replacement line even though the file already existed. Return `[]` only after looking, never by assuming an edit-only change cannot have stranded a description — a worker that changes a behavior described elsewhere and returns `[]` anyway leaves stale entries behind with nothing to announce it, since nothing conflicted.

## Why each clause is here

| Clause | Failure it prevents |
|---|---|
| worktree path + branch named | worker assumes it is in the primary checkout and commits onto the default branch |
| submodule init, with `protocol.file.allow=always` | first build fails with an unreadable-manifest error that never mentions submodules; and in a worktree the plain form fails outright with `transport file not allowed`, because the submodule's origin is a local path |
| `continuous`, and don't ask | a standalone pass is *allowed* to prompt, and a prompt in a swarm is a worker parked forever with nobody coming |
| don't guess to keep moving | worker treats "nobody can answer" as licence to invent the decision — the failure the gate exists to prevent, arriving one step later |
| no push at all, rather than "do not push to `<default>`" | the older clause was a subtraction from wrap-up's default behaviour, and subtractions do not hold. Workers have merged branches into `main` and pushed to `origin/main` from inside their worktrees, against a clause repeated in the brief and again in `implement.js`. `git checkout main` does fail in a worktree — but that is not the route they took; they ran `git -C <primary-checkout>`, which bypasses it entirely. A worker with no push step in its pass has nothing to route around |
| halt on a missing worktree, never recreate it | `~/.claude/tools/git-sweep.sh`, running from the orchestrator's own Stop hook, can remove a freshly-created worktree mid-round as "merged into main" before its worker ever starts. A worker that runs `git worktree add` and carries on forks the round from a base nobody chose, silently; only a worker that halts instead makes the failure visible. `swarm-worker-push-guard.sh` now denies `git worktree add/remove/prune/move` for a worker, and this clause is what tells it what to do instead (`term-bvlt`) |
| no repo-wide formatter | one reformat commit conflicts every sibling branch |
| device pinned by id, when there is a device | a worktree isolates source and nothing else, so two workers on one device each verify against the other's build — and it reads as the change being broken, not as a collision ([SKILL.md](SKILL.md) → A worktree isolates source and nothing else). Filled in from `../ref-<platform>/orchestrate.md`, and omitted entirely on a project with no device |
| verdict file, every verdict | orchestrator has nothing to read; a missing file is indistinguishable from a pass that never ran |
| foreground + explicit `timeout`, not background | the clause above alone does **not** hold: a recovery worker has died the same way *after being told not to*, because the reason to background was still there. The Bash tool defaults to a 120-second timeout, an `xcodebuild test` on a real project runs several minutes, and backgrounding is the obvious workaround once the default kills it. Naming the timeout removes the reason rather than forbidding the symptom |
| never end your turn on a background command | **workers have died this way, identically, more than once, including after being warned.** Each launched its test build in the background and ended its turn "waiting for the completion notification" — but a subagent has no wake signal, so ending the turn ended the worker. Each left substantial uncommitted work and a new file, no commits, and no verdict, which is the one state that forbids teardown and forces a recovery dispatch. The pull is strong because backgrounding a slow build is correct behaviour *in a session with a human*; in a worker it is fatal |
| "any work you started", naming **subagents** explicitly | the clause above said "background command", and the next casualties were waiting on **subagents they had spawned** — a simplification agent and a review agent — not on Bash. A worker does not read "command" as covering the agent it just launched. One of them even had its own review child try to `SendMessage` the parent and get told the session was unreachable |
| commit before any optional quality pass | the ordering is the fix; every other clause here is a guard. A worker has finished the work, written a `PASS` verdict, spawned a simplification agent, ended its turn waiting for it, and left every file of the change uncommitted with zero commits on the branch. Had it committed first, the identical stranding would have cost a simplification pass instead of the whole slice. This shrinks the window rather than policing the symptom |
| `verified_parent`, not `commit`, and never corrected afterwards | a verdict is evidence only if it points at the code it describes, and the older clause chased that with the wrong field. `commit` = branch head cannot hold on the workflow transport at all: `implement.js` verifies in one stage and commits in a later one, so the sha is always the pre-commit head and the orchestrator's staleness row fires on every honest pass unless hand-corrected before landing. The obvious repair, a later stage rewriting the field, was built and refused by the safety classifier as audit tampering — correctly, since it asked an agent to write "this commit was verified" about a commit no stage had verified. Naming the field for what it truthfully holds makes both transports write the same thing and leaves nothing to correct |
| `item` = the tracker id, in the field and the filename | a stranded worker wrote its verdict under a filename derived from an undefined key, with the issue *title* in `item` instead of its id, so the id was in neither place. Step 5 read it as a worker that stopped without a verdict, and step 7's exact-path check would have deleted a complete `FAIL` verdict with the worktree |
| no edits to shared index files | a repo-wide index (a file map, a component registry, a docs table of contents) is one list every change appends to, so N branches collide on it by construction — most of a round's parallel branches conflicting on one such file, some aborting outright, and resolving them by hand costing a sizeable share of the round, none of it about the code being reviewed |
| "entries your change made untrue", not "files you created" | under an earlier version of this clause, a worker that added no files returned `index_entries: []` and left index entries describing the resume rule it had just changed. An edit-only diff reads as "nothing to index" unless the brief says otherwise, and the failure is silent by construction — suppressing the edit is exactly what removed the conflict that used to announce it |

## Naming the shared index files

`<shared-index-files>` is filled in per repo at dispatch, not left as a placeholder. Find them before the first dispatch: a file the repo's own `CLAUDE.md` tells every change to keep in sync, and any file whose diff is one appended row per change. On `iptv-mac` that is `docs/file-map.md`; `docs/roadmap.md` and `docs/PRD.md` are borderline — they are narrative rather than one-row-per-file, so a worker editing them conflicts less often and the edit needs its context.

If a repo has none, drop the clause. It is a no-op there, and the rule below applies.

**The orchestrator owes the other half of this trade.** Writing the entries after landing is part of step 6, not an optional tidy-up — a swarm that suppresses the edits and then forgets to make them has traded a loud conflict for a silent staleness, which is worse. Read `index_entries` off every landed worker's **returned object**, write them in the primary checkout, and commit them with the merge or immediately after.

## Adding to the brief

Add a clause when a worker fails in a way the brief did not cover, and record the failure in the table above. A clause with no observed failure behind it is a **no-op** — the worker already behaves that way, and it costs tokens in every dispatch.

**A clause that restates something `/implement` already says is worse than a no-op**: it is a second copy that will drift from the original, and the worker will have to guess which one wins.
