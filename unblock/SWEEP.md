# Sweep — one session per branch

Loaded when `unblock` or `review` is invoked **on the repo's default branch**. There is no single
branch to act on from `main`, so the answer is to act on all of them at once: one git worktree
and one working session per branch, fanned out, then proved.

Both callers share everything below except two things:

| | `unblock` on `main` | `review` on `main` |
| --- | --- | --- |
| **selects** | branches I own that are blocked — conflicts, red checks, or unanswered feedback | PRs waiting on **my** review |
| **the session runs** | `/unblock` on that branch | `/review` on that PR |

[RULES.md](../review/RULES.md) binds this file. Every question here is typed chat text.

## S1 — Preconditions

```
git rev-parse --show-toplevel
git -C <root> status --porcelain      # must be empty
gh auth status
```

A dirty default branch stops the sweep: every worktree is cut from this repo and the sweep is
about to create a lot of them. Say what is dirty and stop.

## S2 — Select the branches

Generic source, works in any repo with a GitHub remote:

```
gh pr list --state open --limit 50 \
  --json number,title,author,headRefName,url,isDraft,mergeable,reviewDecision,statusCheckRollup,updatedAt
```

Then, per caller:

**`unblock` selects** a PR where `author.login == my login` **and** any of:

| condition | field |
| --- | --- |
| merge conflicts | `mergeable == "CONFLICTING"` |
| changes requested | `reviewDecision == "CHANGES_REQUESTED"` |
| CI red | any `statusCheckRollup[].conclusion == "FAILURE"` |

**`author.login == my login` is load-bearing on all three.** Fixing conflicts or a red job means
pushing commits to that branch, and on someone else's PR that is writing to their work uninvited.
A conflicted PR belonging to someone else gets **named in the skipped list with its author**,
never a session — the user can ask for it by number if they want it taken.

**`review` selects** a PR where `author.login != my login` and my review is outstanding:

```
gh pr list --search "involves:@me -author:@me -reviewed-by:@me" --state open --limit 30 \
  --json number,title,author,headRefName,url,createdAt,additions,deletions,reviewRequests
```

`-reviewed-by:@me` excludes only PRs carrying a *submitted* review from me; comment-only
participation still shows. Mention the gap only if a result looks off.

**`mergeable == "UNKNOWN"` is not a conflict** — GitHub has not finished computing the merge.
Re-read it rather than treating it as either.

**Drafts are swept like any other PR by `unblock`.** `isDraft` says the author is not asking for
review yet; it says nothing about whether the branch merges or the tests pass, which is what this
fixes. Mark them `(draft)` in the table. `review` skips drafts — nobody asked.

**A repo may document a better source than `gh pr list` in its `CLAUDE.local.md`** — a dashboard
CLI that classifies whose move it is, which GitHub's own review-request list does not (GitHub
deletes the review request the moment a reviewer submits, so a PR you reviewed yesterday stops
appearing as requested even though the author just pushed an answer). Read what the repo says
before falling back to the generic query.

**Print the selected table in chat before opening anything, and name what you skipped.** A PR
with no conflicts, green checks and a submitted review is waiting on a human, not stuck.

## S3 — Confirm the fan-out

This spawns N long-lived sessions and N worktrees. That is a real cost, so it gets one line and
a typed answer — the only confirm in the sweep, and it is not RULE 2's kind of halt, because the
question is *how many* and *which*, not *whether the skill should do its job*:

```
6 branches to unblock, 2 skipped (not mine). This opens 6 worktrees and 6 sessions.
`go` for all · a subset by number (`1865 1871`) · `stop`
```

## S4 — Worktree per branch

Path: `~/.worktrees/<repo-name>/<branch with / replaced by ->`.

```
git -C <root> fetch origin --prune
git -C <root> worktree list --porcelain | grep -Fx "worktree <path>"
git -C <root> worktree add --track -b <branch> <path> origin/<branch>   # only if that grep found nothing
```

**Match the path exactly, do not eyeball the list.** A busy repo has dozens of worktrees;
`worktree list | head` silently hides some, and a run that "cannot find" an existing worktree
tries to create a second one for a branch git already has checked out. That fails, and the
failure looks like a broken branch rather than a truncated read.

Then check the checkout is clean before dispatching into it:

```
git -C <path> status --porcelain
```

Anything printed means someone — or a session in another pane — has work in progress there. Do
not dispatch on top of it: report the path in chat and leave that branch out.

**Link the repo's local-only skills in, or the session inside will not have them.** This is the
step that decides whether the worker gets the project's `resolve-failing-tests` knowledge or
falls back to the generic file:

```
mkdir -p <path>/.claude/skills
for s in <root>/.claude/skills/*/; do ln -sfn "$s" "<path>/.claude/skills/$(basename "$s")"; done
```

Anything else the repo needs per-worktree — a `.envrc`, a local config — is the repo's to
document in its `CLAUDE.local.md`. Read it; a fresh worktree missing one gets no env vars and
the worker reports a missing credential that is not missing.

## S5 — Where the sessions run

Three transports, in order. Take the first that is available.

**1. herdr panes** — `HERDR_ENV == 1`. Load the [herdr](../herdr/SKILL.md) skill before issuing
any herdr command; it is the authority on the CLI's current shape. Nothing is ever closed:

- **No workspace on that worktree** — open one:
  ```
  herdr worktree open --cwd <root> --path <path> --label <n>-<slug> --no-focus
  ```
- **A workspace already exists there** — split a pane inside it and leave what is running alone.
  `pane split` takes a **pane**, not a workspace; there is no `--workspace` flag:
  ```
  herdr pane list --workspace <id>          # pick a pane_id
  herdr pane split --pane <pane-id> --direction right --cwd <path> --no-focus
  ```
  Split `right` when the pane is wide, `down` when it is tall — `herdr pane layout --pane <id>`
  gives its `rect`.

**Existing workspaces are found by their worktree path, not their label.** A workspace opened by
hand can sit on one of these checkouts under any name, so a label search finds nothing and opens
a duplicate:

```
herdr workspace list | jq -r '.result.workspaces[]? | select(.worktree) | "\(.workspace_id) \(.worktree.checkout_path)"'
```

`<slug>` is the branch with any `pierce/` prefix dropped and `/` replaced by `-`, capped at 28
characters. Read the pane id from `.result.root_pane.pane_id` (worktree open) or
`.result.pane.pane_id` (split). **Never `--focus`** — the user is working.

```
herdr agent list                                    # names must be unique among live agents
herdr agent start <n> --kind claude --pane <pane-id>
herdr agent prompt <n> "<prompt>"
```

A name already taken means a session from an earlier sweep is still alive: send the new
instruction to it with `herdr agent prompt` rather than starting a second one, or suffix the
name. `agent start` waits up to 30s each — run them in batches of three or four per call.
Prompts are one line; a newline followed by `#` trips a path hook.

**2. Terminal.app windows** — not in herdr. Take the ladder from
[../dispatch/TARGETS.md](../dispatch/TARGETS.md) rather than re-deriving the invocation here. Say
in one line that the sweep is running in Terminal windows and that they are not tracked the way
herdr panes are.

**3. Sequential, in this session** — when the user declines both, or neither is available. **Cap
at 5 branches**, work them one at a time in this context, and say so in one line up front,
naming what was cut:

```
Not in herdr and Terminal windows declined — running 5 of 8 sequentially here.
Cut: #1871, #1880, #1884. Re-run the sweep for those.
```

Sequential is the fallback because it is the one that always works, not because it is equivalent:
five `/unblock` passes in one context is a lot of context, and the sixth is why the cap exists.

## S6 — The prompt

**Order inside the prompt: conflicts first, then tests, then feedback** — the same order
[SKILL.md](SKILL.md) runs its gates, and for the same reason. Merging the base in first means
feedback gets answered against code that already contains the base; the other way round, you fix
a file, merge the base over the same lines, and resolve them twice.

The prompt is one line and names the skill, not the steps — the worker has the same skills you
do, and re-typing the procedure into a prompt is how it drifts from the file:

- **`unblock` worker** — `Run the /unblock skill on this branch. <what is blocked, from the table>.`
- **`review` worker** — `Run the /review skill on PR <n>, checked out here. Report findings in this pane.`

**The repo's own tail, copied verbatim.** A repo that needs something appended to every dispatched
prompt — a check command with a known lock, a "never deploy" line, a migration prohibition —
documents that tail in its `CLAUDE.local.md` under a heading the sweep can find. Copy it exactly;
retyping it from memory each run is how a rule goes missing. A repo with no documented tail gets
none, and that is fine.

## S7 — Report the dispatch

A table of branch → where it is running → what it is doing, then how to watch:

```
herdr agent list
herdr agent read <n> --source recent-unwrapped --lines 80
```

`working` → `done` means it finished. `blocked` means it is asking something.

A session whose Claude exits takes its shell — and therefore its workspace — with it, so a
finished branch's pane disappearing is normal, not a crash. A pane split into an existing
workspace is the exception: that workspace outlives its session.

## S8 — Prove it worked

**Reporting that sessions were started is not reporting that branches were unblocked.** Once no
sweep agent is still `working`, re-run S2's query and diff it against the table from S2:

```
gh pr list --state open --limit 50 --json number,headRefName,author,mergeable,reviewDecision,statusCheckRollup \
  | jq -r '.[] | select(.author.login=="<me>" and (.mergeable=="CONFLICTING" or .reviewDecision=="CHANGES_REQUESTED")) | [.number,.headBranch] | @tsv'
```

Anything still listed either failed or is waiting on the user in its pane — read that agent to
find out which. **Report that, not the dispatch.**

The default branch moves while a sweep runs, so a PR that was clean at S2 can be conflicting by
the end. That is a new sweep, not a failure of this one; say so rather than quietly
re-dispatching.

## Teardown is not automatic

**The worker never removes its own worktree** — a session cannot outlive its cwd. Removal happens
from the main checkout, after the sweep proves the branch landed, and only for worktrees with
nothing live standing in them. `free-disk-space` owns retiring merged worktrees; do not race it.
