---
name: review-prs
description: "Walk through the PR review queue: find open PRs that involve me and that I haven't reviewed yet, let me pick which ones to work, then for each one (one at a time) check out the PR branch and run the audit or dual-audit skill on it. Never posts anything to GitHub. Triggers: 'review prs', '/review-prs', 'pr review queue', 'triage my review queue', 'what PRs need my review', 'work my review queue'."
---

# Review PRs

Interactive review-queue workflow: triage → select → checkout → audit → report. One PR at a time. Read-only with respect to GitHub — this skill NEVER posts reviews, comments, or approvals; it produces local audit reports the user acts on themselves.

## Input

Optional argument: a repo (`owner/name`) to triage instead of the current repo, or one or more PR numbers to skip triage and go straight to those PRs.

## Phases

### Phase 01 — Preflight

- Must be inside a git repo with a GitHub remote. If not, stop and say so.
- Run `git status --porcelain`. If the tree is dirty, **stop** — checking out PR branches requires a clean tree. Tell the user what's dirty and let them decide; never stash or discard on their behalf.
- Record the current branch name — the workflow returns here at the end.

### Phase 02 — Triage

Find open PRs that involve the user and lack a review from them:

```
gh pr list --search "involves:@me -author:@me -reviewed-by:@me" --state open \
  --json number,title,author,createdAt,additions,deletions,reviewRequests,url --limit 30
```

Known gap: `-reviewed-by:@me` only excludes PRs with a *submitted review* — comment-only participation still shows as unreviewed. That's acceptable for triage; mention it only if a result looks suspicious.

Present the results as a table: PR number, title, author, age, diff size (+/-), and whether the user is explicitly review-requested vs merely mentioned. Order: review-requested first, then oldest first.

If the list is empty, report "review queue is clear" and stop.

### Phase 03 — Select

Ask the user two things (AskUserQuestion is appropriate here — these are standalone menus, not in-flow confirms):

1. **Which PRs to review** — multi-select over the triaged list.
2. **Audit flavor** — `/audit` (Claude-only) or `/dual-audit` (adds the cross-vendor delegate second opinion). One answer applies to all selected PRs this run.

### Phase 04 — Review loop (one PR at a time, strictly sequential)

For each selected PR, in the order chosen:

1. `gh pr checkout <number>` — if this fails, report the error, skip this PR, and continue with the next one. Never force anything.
2. Read context before auditing: `gh pr view <number> --json title,body,comments,reviews` — the PR description, any linked issue, and existing reviewer comments. This feeds the audit's Spec axis and avoids re-flagging things other reviewers already raised.
3. Invoke the chosen skill — `Skill(audit)` or `Skill(dual-audit)` — in branch mode: review the branch's changes against the PR's base branch (usually `origin/main`). Let the audit run to completion before touching the next PR.
4. Note where the audit wrote its report and capture its headline verdict (blocking findings count, notable issues).

### Phase 05 — Complete

- Return to the branch recorded in Phase 01 (`git checkout <original-branch>`).
- Summarize the run: one row per PR — number, title, verdict, blocking-finding count, report path.
- State explicitly that nothing was posted to GitHub. If the user wants to turn findings into review comments, that is a separate, explicit follow-up they initiate — draft text on request, but the user posts it (or gives an explicit yes for each post).

## Hard rules

- Never post reviews, comments, approvals, or request-changes to GitHub from this skill. No exceptions.
- Never stash, reset, or otherwise mutate the user's working tree to make a checkout succeed.
- One PR at a time — never parallelize checkouts or audits in this workflow.
