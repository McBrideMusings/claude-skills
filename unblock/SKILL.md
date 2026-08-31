---
name: unblock
description: "Get a blocked branch to mergeable, doing the work rather than offering: resolve merge conflicts, diagnose and fix red CI, respond to unaddressed PR feedback. On the default branch it sweeps every blocked branch you own. Triggers: 'the PR is red', 'CI is failing', 'conflicts', 'resolve failing tests', 'address the review comments', 'unstick my PRs'."
---

# Unblock

**Something is standing between this branch and a merge. Remove it.**

Four things block a branch, and this skill owns all four:

0. The local checkout is not at the branch head — **checked and repaired every single run**.
1. The branch **conflicts** with its base.
2. Its **checks are red**.
3. It carries **reviewer feedback nobody has answered**.

Each of 1–3 runs only if it is actually true. Gate 0 runs unconditionally, first, always.

**[RULES.md](../review/RULES.md) binds this whole skill and every file it loads — load it now,
before routing.** RULE 0 (no selector, ever), RULE 1 (effort never decides), and RULE 2 (a gate
does the job it names) are all live here. RULE 2 is the reason this skill exists as its own
thing: `review` used to print *"the branch conflicts with origin/main — `resolve` · `review
anyway` · `stop`"* and wait, which made the user approve the skill doing what the skill is for.

The pieces load on demand, only when their gate fires:

| gate | generic file | project override, preferred when present |
| --- | --- | --- |
| conflicts | [CONFLICTS.md](CONFLICTS.md) | `<repo>/.claude/skills/resolve-conflicts/SKILL.md` |
| tests | [TESTS.md](TESTS.md) | `<repo>/.claude/skills/resolve-failing-tests/SKILL.md` |
| feedback | [FEEDBACK.md](FEEDBACK.md) | — |
| sweep (on the default branch) | [SWEEP.md](SWEEP.md) | — |

## Phase U0 — Resolve the target, never ask what it is

```
git rev-parse --show-toplevel
git branch --show-current
gh repo view --json owner --jq .owner.login      # failure ⇒ no GitHub remote
gh api user --jq .login
gh pr view --json number,state,mergeable,author,headRefName,url
```

**On the repo's default branch → this is a sweep.** Go to [SWEEP.md](SWEEP.md) and stop reading
here. There is no single branch to unblock from `main`, and reviewing or repairing `main` itself
is not what was asked.

**On any other branch → single-target.** Build the record once; every gate reads it and no gate
re-shells for its own facts.

```
Target
  root          git rev-parse --show-toplevel
  branch        git branch --show-current
  remote        'none' | 'github'
  base          remote=='github' ? origin/<default> : <default>
  pr            {number,state,mergeable,url} | null
  mine          pr ? pr.author.login == my login : (branch starts with 'pierce' | last commit email is mine)
  checks        {failing:[…]} | 'none-configured' | 'no-pr'
  lastCommit    newest commit date on the branch
  lastFeedback  newest non-author thread / review body / conversation comment | null
```

**Never ask the user whose PR it is, which PR is meant, or what "the tests" means.** Every one
of those is answered above. Asking anyway tells the user you did not look.

**Not mine** (a teammate's PR) → gates 1 and 2 **diagnose but do not fix**: you do not push
commits to someone else's branch to get their CI green. Gate 3 does not apply at all — their
feedback is not yours to answer. Carry the diagnosis out as evidence and say in one line that no
fix was attempted because the branch is not yours.

## Phase U1 — Gate 0: freshness. Every run, no exceptions

**The whole point of this gate is that it is unconditional.** A stale checkout — an old
session's clone, a force-push, an upstream rebase since you last fetched — makes everything
downstream void: you resolve conflicts that no longer exist, fix tests the author already fixed,
and answer feedback against code that has been replaced.

```
git -C <root> fetch origin --prune
git -C <root> status --porcelain
local=$(git -C <root> rev-parse HEAD)
remote=$(git -C <root> rev-parse '@{u}' 2>/dev/null)     # no upstream ⇒ skip this gate
```

Then exactly one of five states, decided in this order:

| state | test | action |
| --- | --- | --- |
| **current** | `local == remote` | nothing; say nothing |
| **behind** | `git merge-base --is-ancestor $local $remote` | `git merge --ff-only '@{u}'` — one line: `fast-forwarded <branch> to origin, N commits` |
| **ahead** | `git merge-base --is-ancestor $remote $local` | nothing to repair; the unpushed commits are yours |
| **rewritten** | diverged, and `git cherry '@{u}' HEAD` prints **only** `-` lines | `git reset --hard '@{u}'` — one line: `origin/<branch> was rewritten (rebase or force-push); reset local to match` |
| **diverged for real** | diverged, and `git cherry` prints any `+` line | **STOP.** Print each `+` commit and say they exist only here. RULE 2's first escape. |

`git cherry` is the load-bearing call: a `-` means the commit is already upstream **by patch
equivalence**, which is exactly what an upstream rebase produces — same change, new sha. Reading
`git log '@{u}..HEAD'` instead sees those as local work and refuses to repair a branch that has
nothing at risk.

**When a PR is the target, the authoritative head is the PR's own head commit, not
`origin/<branch>`** — a PR head can point somewhere the branch ref does not. Compare against it
directly and use it as `remote` in the table above:

```
gh pr view <n> --json headRefOid --jq .headRefOid
```

**On a branch that is not mine, repair by detaching, not by moving the ref**: `git checkout
<head-sha>` rather than `git reset --hard`. The branch ref is the author's; moving it locally is
a state change on their work with nothing to gain.

**Say what happened, both ways.** A repair prints one line — old HEAD sha → new HEAD sha, and the
commit titles just pulled in (`git log --oneline <old>..<new>`). A clean pass prints nothing. A
silent reset is how a user discovers later that the tree moved under them.

**Never work around a stale checkout by reading the remote diff alone** — `gh pr diff` into a
prompt, a `git diff` against `FETCH_HEAD` — while the working tree still holds old files.
Everything downstream reads files, not just the diff, so a diff-only patch leaves every reader on
the stale tree, which is the exact failure this gate exists to prevent.

**A dirty working tree blocks `reset --hard` and `merge --ff-only` both.** If `status
--porcelain` printed anything, stop and name the dirty paths. Never stash, never discard, never
`checkout -- .` on the user's behalf.

After any repair, **re-read every field of `Target`** — the sha moved, so `mergeable`, `checks`
and `lastCommit` are all stale. The gates below run against the fresh record.

## Phase U2 — Gate 1: conflicts

**Skip when** the branch is not mine, or `remote == 'none'`, or `pr == null` — nothing is being
merged, so nothing conflicts.

**Fire when** `pr.mergeable == 'CONFLICTING'`. `UNKNOWN` is not a conflict: GitHub has not
finished computing the merge. Re-read it after a few seconds rather than treating it as either.

**Distance behind the base is not a conflict, at any number.** A branch 200 commits behind
`origin/main` that merges cleanly is not blocked. Never count `HEAD..<base>`, never mention how
far behind a branch is, and never merge main in as a precondition for anything.
`pr.mergeable == 'CONFLICTING'` is the whole test.

**When it fires, resolve them.** Do not offer to (RULE 2). Load, in this order:

1. `<root>/.claude/skills/resolve-conflicts/SKILL.md` if it exists — the project knows something
   generic conflict resolution does not (a generated file that must be regenerated rather than
   merged, a lockfile with a resolution command, a schema that has an owner).
2. Otherwise [CONFLICTS.md](CONFLICTS.md).

**A project's conflict knowledge usually is not a whole skill.** Most repos need two or three
lines — which paths regenerate rather than merge, which lockfile has a command — and those
belong in the repo's `CLAUDE.local.md`, already in context. Read what is there before assuming
the generic path is right. Only write a project skill when the resolution is a real procedure.

Neither file pushes. The push is Phase U5's single confirm.

## Phase U3 — Gate 2: failing checks

**Skip when** `checks == 'no-pr'` (say it in one clause: *no PR — CI gate skipped*) or
`checks == 'none-configured'` (*no checks configured*).

**No PR and no CI does not mean no test gate** — it means the local suite is opt-in. Say the
gate is available in one line and let the user type `tests`. Do not run a repo's whole suite
unasked on a branch nobody has published.

**Fire when** `failing.length > 0`. Load, in this order:

1. `<root>/.claude/skills/resolve-failing-tests/SKILL.md` if it exists — **and prefer it hard.**
   Which check is an aggregator, how shards are named, which rows are not tests at all, how to
   run one project's suite without the whole repo, and which reds are false under load are all
   repo-specific facts. A generic file that guesses at them wastes a run and reports a
   load-induced failure as a real one.
2. Otherwise [TESTS.md](TESTS.md), which carries the method and no job names.

**Not mine** → load the diagnosis phases only, carry the result out as evidence, make no fix and
no push. A finding that came from a failing test is the strongest kind to hand back, because the
log is the reproduction.

## Phase U4 — Gate 3: unanswered feedback

**Skip when** the branch is not mine, or there is no open PR.

Feedback arrives in **three** shapes and you must check **all three**. A gate that counts inline
`reviewThreads` alone silently misses the other two and reports a PR with a wall of unaddressed
feedback as clean.

```
me=$(gh api user --jq .login)
# a) inline review threads + resolution state
gh api graphql -F owner=<owner> -F repo=<repo> -F number=<n> -f query='query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){reviewThreads(first:100){nodes{isResolved comments(first:1){nodes{author{login} createdAt}}}}}}}'
# b) formal reviews — ANY state (CHANGES_REQUESTED, COMMENTED, APPROVED), body + timestamp
gh pr view <n> --json reviews --jq "[.reviews[]|select(.author.login!=\"$me\" and (.body|length>0))|{author:.author.login,state:.state,submittedAt:.submittedAt}]"
# c) top-level conversation comments (never carry a resolved state)
gh pr view <n> --json comments --jq "[.comments[]|select(.author.login!=\"$me\")|{author:.author.login,createdAt:.createdAt}]"
```

`lastFeedback` = the newest timestamp across any **unresolved** inline thread, any non-author
review body, and any non-author conversation comment. Then:

- **Any unresolved inline thread** → fire. The classic signal, still valid.
- **Else non-author feedback exists and `lastCommit <= lastFeedback`** — nothing was pushed after
  it → the feedback is unaddressed → fire. This is the case a thread-count gate misses: a
  body-only review, or a bare comment with no commits since.
- **Else non-author feedback exists and `lastCommit > lastFeedback`** → fire **in reconcile
  mode**: some, all or none of it may already be fixed. Read each point against current HEAD and
  classify the already-fixed ones as `reply: already addressed in <sha>`. Reading feedback is
  cheap; skipping it is the expensive mistake.

  **Reconciling every point to "already addressed" is not an exit — it is the strongest case for
  the re-request.** The findings are fixed and the reviewer is the only one who can say so on the
  PR; their standing verdict does not lapse because you read it and agreed. Carry the row to U5
  and say the points are addressed, rather than reporting the gate as clean and stopping.
- **Else** → no feedback, gate skipped, say nothing.

`lastCommit <= lastFeedback` is the load-bearing heuristic: **if nothing changed on the PR since
the feedback landed, the underlying issues have not been dealt with** — whether the reviewer used
the formal "Request changes" button or just typed a comment. Timestamps are ISO-8601, so a string
compare orders them; within a few seconds, treat it as reconcile mode rather than assuming
addressed.

**When it fires** → [FEEDBACK.md](FEEDBACK.md), which owns fetching, scoring, and — the part that
is its own problem — **how a response to feedback is written**. That is a different formatting
job from how `review` writes its own findings, and the two documents are deliberately separate:
`review/POSTING.md` formats findings you are handing *to* an author; `FEEDBACK.md` formats
answers you are handing *back* to a reviewer.

## Phase U5 — One report, one slate

Print, once, whatever the pass actually did — one line per gate that fired, nothing for gates
that did not:

```
freshness  origin/pierce/leagues-lp was rewritten; reset local to match
conflicts  resolved 4 in 2 files (packages/leagues/src/cohort.ts, apps/cloudflare/src/do/league.ts)
tests      2 failing, both fixed — check-cloudflare-test (3), check-cloudflare-test (7)
feedback   1 body-only review from alexthemighty — 3 points: 2 addressed, 1 reply
```

Then **one slate, and it is the only thing this skill asks — every outward action the pass
produced goes in it, numbered, each with your pick**. `FEEDBACK.md` Phase 08's reply and
re-request are not rows of their own; they are the rest of the push row, and that file prints no
prompt. Close the slate with `CLAUDE.md`'s escape hatch:

> `unblock` made 3 commits on `pierce/leagues-lp`. Outward actions waiting:
>
> 1. **push + reply + re-request** — 3 commits to `origin/pierce/leagues-lp`, then post the
>    3-point response block above and re-request @alexthemighty, who reviewed `4c1f9ab` before
>    any of them existed. My pick: all three.
>
> Type `go`, or `1 skip` to leave the branch as it is.

**One slate, one keyword, however many rows.** Two prompts at the bottom of one message —
`push` / `hold` on one line and `re-request` / `skip` on the next — is the failure this phase
exists to prevent: the user has to answer twice to accept what you already recommended. A pass
with exactly one outward action still prints the slate, one row, closed with `go`.

- **Ordering is execution order.** Push is always row 1 when it is present, because every other
  outward action assumes the commits are on the branch.
- **The reply and the re-request are PART OF the push row, not rows beside it.** Push, then
  `gh pr comment` with the consolidated response block, then `gh pr edit --add-reviewer` for every
  login that has already submitted a formal review — `CHANGES_REQUESTED`, `COMMENTED` or
  `APPROVED` alike — whichever gate produced the commits. Write the row as
  `push + reply + re-request` and take all three on `go`.

  The three are one claim, not three favours. New commits with no explanation make the reviewer
  reconstruct what changed; an explanation with no push describes code that is not there; and a
  reviewer's verdict is a statement about the diff they read, so the moment this pass pushes it
  sits on the PR looking current while describing code that no longer exists — an `APPROVED` that
  now approves unreviewed commits, a `CHANGES_REQUESTED` that still gates a merge over findings
  that are fixed. One approval covers all three because no two of them are useful apart.

  **Never split any of them into its own numbered row, never mark one "yours to do", and never
  leave one to a follow-up message.** A separate row is a second thing to notice at the end of a
  long pass. A row whose pick is "post it yourself" is worse — `go` means *apply my picks*, so a
  row with no pick to apply cannot be accepted at all, and the user has to ask a second time for
  something they already said yes to. A follow-up message is the user approving a consequence of
  what they already approved. All three are the failure this bullet exists to prevent. The user
  types `go` once and the branch ends the turn pushed, answered, and back in the reviewer's queue.

  **They do not wait on the feedback gate.** Gate 3 fires on *unanswered* feedback; the
  re-request fires on *any* push with a prior reviewer, so a pass that only resolved conflicts or
  only fixed red CI still owes it. Read the reviewer list directly rather than inferring it from
  whether U4 fired:

  ```
  gh pr view <n> --json reviews,author --jq '[.reviews[].author.login] - [.author.login] | unique'
  ```

  A pass that never loaded `FEEDBACK.md` has no reply to post; the row is then
  `push + re-request` and that is the only shape with a missing third.

  Name the reason in the row's own words — what the pass pushed, not what the reviewer said:
  `push + reply + re-request — 2 commits, then the 3-point reply and a re-request for
  @alexthemighty, who reviewed 1e0555f4 before the main merge and the export fix existed.`

- **A skipped push takes the reply and the re-request with it.** `1 skip` means none of the three
  happened — say so in one clause. Telling a reviewer what changed, or putting them back in the
  queue, against commits that never left the machine asks them to look at nothing.
- **A row the user skips is reported as not done**, in one clause. Skipping push leaves every
  commit local — say the branch is still blocked on GitHub's side, since the fixes exist only
  here.
- **On an owned repo with no PR**, push is not outward and does not get a row: commit and push
  without asking, per `CLAUDE.md`'s "commit and push finished work without asking in my repos".
  Print the slate only if some other row survives.
- **Never push while anything is still red**, and never describe the PR as fixed before the push
  lands.
- **Never `--force`**, never push to the default branch, never open a PR from here.

**After the push, prove CI actually started before saying it did.** A push is not a run. Read both,
against the new head:

```
gh pr view <n> --json mergeable,headRefOid --jq '"\(.mergeable) \(.headRefOid[0:9])"'
gh run list --branch <branch> --limit 5 --json headSha,status,workflowName
```

- **`CONFLICTING` means no run will ever appear.** GitHub builds a PR's checks against a merge ref
  it cannot construct while the branch conflicts, so a conflicting PR gets *zero* check runs — not
  failing ones, none. A pass that pushed a red-CI fix onto a conflicting branch has fixed nothing
  observable, and the merge that clears the conflict is what starts the first run.
- **A run can take a minute to register.** Poll it; an empty list one second after the push is not
  evidence either way. `queued` is the confirmation, not the absence of a row.
- **Say what you saw, never what should follow from a push.** "CI is re-running" asserted off a
  successful push, with no run on the new head, is the failure this bullet exists to prevent: it
  reads as verification, it costs the user a turn to discover it was inference, and the branch sits
  untested while everyone believes otherwise. Report `queued on <sha>`, or report that no run
  exists and why.

**A gate that fired and did not finish is reported as unfinished, in the same block.** A test you
could not get green, a conflict hunk whose two sides genuinely mean different things, a feedback
point that needs the user's intent — name it and say what you need. Do not roll it into a
success line.

## Called from `review`

`review` calls this skill and **continues** — it does not stop and hand control to the user in
the middle. The contract:

1. `review` invokes `unblock` on the target branch.
2. `unblock` runs U0–U5 in full, including its own push confirm.
3. `unblock` returns a one-line state summary.
4. `review` **re-probes the branch from scratch** — the sha moved — and runs its axes.

**Fixing a branch changes the diff under review, which is the entire reason the order is this
way.** A review written against a conflicted tree describes a diff that will not exist after
resolution.

**Do not re-run gates that just ran.** If `review` calls `unblock` and then something later in
the review wants to check conflicts again, it reads the returned summary. One pass per
invocation.
