# Review — PR comments branch

Auto-entered from [SKILL.md](SKILL.md) Phase 00 when the current branch has an **open PR that is mine** (author or assignee) carrying **≥1 unresolved review thread**. Work through the reviewers' unresolved comments point-by-point: fetch → score → plan → (on approval) apply code fixes + write a local reply doc. Mutually exclusive with the self-review core — when there are unresolved threads, this branch runs *instead of* [REVIEW-CORE.md](REVIEW-CORE.md).

**Never posts to GitHub.** All reviewer replies are written to a local response document the user copy-pastes; thread resolution is the user's to do.

## Phase 01 — Pre-flight (mandatory; abort if any check fails)

Before touching GitHub, prove the local state is safe to act on. Stop and tell the user if any check fails — do not auto-fix.

1. **Clean working tree**: `git status --porcelain` must be empty. If not, abort with the list of dirty files and tell the user to stash, commit, or discard.
2. **Branch has a remote**: the current branch's upstream must resolve (`git rev-parse --abbrev-ref --symbolic-full-name origin/$(git branch --show-current)` or `git status -sb`). If none, abort — the PR flow needs a remote.
3. **Branch matches origin**: `git fetch origin <branch>`, then compare `git rev-parse HEAD` vs `git rev-parse origin/<branch>`. They must be equal. If local is behind, ahead, or diverged, abort and tell the user (suggest `resolve-conflicts` or a push, but don't run them).
4. **GitHub CLI auth**: `gh auth status` must succeed. If not, abort.

## Phase 02 — Locate the PR

- `gh pr view <branch> --json number,url,title,headRefOid,baseRefName,state` (pass the branch explicitly so it's deterministic).
- If the PR is `CLOSED` or `MERGED`, abort with the state. (Draft is fine — proceed.)
- Capture `pr_number`, `pr_url`, `head_sha`, `base`. Print the PR title and URL so the user sees what is being triaged.

## Phase 03 — Fetch unresolved review threads

Use GraphQL — the JSON fields on `gh pr view` don't expose thread resolution state.

```
gh api graphql -F owner=<owner> -F repo=<repo> -F number=<pr_number> -f query='
query($owner:String!, $repo:String!, $number:Int!) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$number) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          isOutdated
          isCollapsed
          path
          line
          originalLine
          startLine
          diffSide
          comments(first: 50) {
            nodes {
              author { login }
              body
              url
              createdAt
              outdated
              originalCommit { oid }
            }
          }
        }
      }
    }
  }
}'
```

Filter to threads where `isResolved == false`. Keep `isOutdated` threads but mark them — they often deserve a "reply" rather than a code change.

If zero unresolved threads survive, the branch should not have routed here — fall back to [REVIEW-CORE.md](REVIEW-CORE.md) (self-review) instead.

Also pull top-level PR conversation comments (not tied to a diff line): `gh pr view <pr_number> --json comments`. These don't have a "resolved" state, so include any added after the last review by a non-author reviewer. If unsure whether one is in-scope, ask the user — as a plain-chat question, never the `AskUserQuestion` tool / structured-question schema.

## Phase 04 — Read code context for each thread

For each unresolved thread, read the file at `path` around the commented line(s). Pull ±20 lines so the analysis can judge the comment in context. Use the local checkout — Phase 01 already proved it matches `origin/<branch>`.

If the thread is `isOutdated`, note it — the code at that line may have moved or changed since. Still read what's there now.

## Phase 05 — Score and classify every thread

For each thread, decide:

**Score (0–100)** — how strong is the concern?

- **90–100** — Real bug, security issue, broken contract, factual correctness problem. Should be fixed.
- **75–89** — Clear improvement: simpler implementation, missed edge case, valid maintainability concern, repo-convention violation.
- **50–74** — Judgement call: reasonable point with real tradeoffs, or a stylistic preference where the codebase doesn't strongly mandate either side.
- **25–49** — Minor / preference: nitpick, taste, or a reviewer assumption that doesn't apply here.
- **0–24** — Misunderstanding, out of scope, contradicts an explicit user decision, refers to code that no longer exists / has been refactored, or duplicates another thread.

**Recommended action** — pick one:

- **address** — change the code to satisfy the comment. Include a one-line description of what the change is.
- **partial** — make a smaller change than the reviewer asked for, or address part of the concern. Describe what to do and what to skip.
- **reply** — no code change; write a draft reply explaining why (out of scope, intentional, addressed elsewhere, outdated). The reply goes in the response document — never posted.
- **ignore** — skip without responding. Reserve for clearly-stale outdated threads, accidental comments, or duplicates already covered by another thread you're addressing.

Bias against blanket "address all". A 30-point comment that gets implemented is worse than a 30-point comment that gets a polite explanation — it adds churn to the diff and signals to future reviewers that all feedback is mandatory.

If a thread has multiple comments (back-and-forth between reviewer and author), read the WHOLE chain — the original concern may already be resolved in discussion.

## Phase 06 — Write the response document

Write a **single consolidated reply** the user copy-pastes as one PR comment. The reply is an ordered list where item N corresponds to issue N from the plan (Phase 07) — same numbering, same ordering.

- Filename: `/Users/pierce/.claude-tmp/claude-pr-comments-<number>-<YYYY-MM-DD-HHMMSS>.md` using current local time. No `mkdir` needed — `/Users/pierce/.claude-tmp/` is a persistent directory. No pruning needed; files are tiny.

Document format:

```
# PR #<number> response — <title>

<pr_url>
Generated: YYYY-MM-DD HH:MM:SS
Head: <short-sha>

> Copy-paste the block below as a single PR comment. Nothing was posted for you.

---

Thanks @<reviewer> — quick rundown:

1. <issue 1 one-line summary> — fixed. <optional one-sentence note on the approach if non-obvious>
2. <issue 2 one-line summary> — <reply text explaining why no change, or what partial change was made>. (<file>:<line>)
3. <issue 3 one-line summary> — fixed. [if multiple commits: "fixed in `<sha>`"]
...

---

## Reference (not for pasting)

- 1: <thread/comment URL> · action: address · file: <path>:<line>
- 2: <thread/comment URL> · action: reply  · file: <path>:<line>
- 3: <thread/comment URL> · action: partial · file: <path>:<line>
```

Rules for the consolidated reply:

- **One numbered item per plan issue.** Numbering must match Phase 07 exactly.
- **Include items with action `address`, `partial`, or `reply`.** Skip `ignore` items entirely; call them out at the bottom of the plan instead.
- **Leading sentence is the reviewer-friendly summary**, followed by the per-issue text:
  - `address` → "fixed" (single commit) or "fixed in `<sha>`" (multiple commits) + an optional brief note if the approach is non-obvious.
  - `partial` → name what landed and what was deliberately skipped, with a one-line reason for the skip.
  - `reply` → the explanation itself (out of scope, intentional, addressed elsewhere, outdated, codebase convention cites file:line).
- **Keep it conversational and short.** One line per item; two max. No headers, no nested bullets — one comment a human reads top-to-bottom.
- **Commit SHA handling.** `<commit-sha-placeholder>` is a temporary marker. As soon as code changes are committed (after plan approval), replace every placeholder with the real short SHA from the `git commit` output. If all `address`/`partial` items land in one commit, drop the SHA reference — "fixed" is enough. Never leave a placeholder in the final document.
- **Reference section at the bottom** lists each numbered item's source URL, action, and file:line — never pasted.
- **Single- vs multi-reviewer.** All from one reviewer → address by handle in the opener. Multiple → drop the "@reviewer" greeting, open "Quick rundown:".

## Phase 07 — Present the plan (plan mode)

Build the plan body and call `ExitPlanMode` with it. Format:

```
# PR #<number> — <title>

<pr_url>
<N> unresolved threads · base: <base> · head: <short-sha>
Response: /Users/pierce/.claude-tmp/claude-pr-comments-<number>-<timestamp>.md (single consolidated reply, numbered to match the issues below)

## Threads

### 1. [score: 92 · address] <one-line summary>
- **File:** `path/to/file.ext:LINE` (outdated: yes/no)
- **Thread:** <comment url>
- **Reviewer (@login):** <quote the key sentence>
- **Why it matters:** <1–2 sentence rationale for the score>
- **Plan:** <what the code change will be>

### 2. [score: 68 · partial] <one-line summary>
- **File:** ...
- **Thread:** ...
- **Reviewer (@login):** ...
- **Why:** ...
- **Plan:** address the null check; skip the broader refactor (out of scope for this PR)

### 3. [score: 40 · reply] <one-line summary>
- **File:** ...
- **Thread:** ...
- **Reviewer (@login):** ...
- **Why:** stylistic preference; codebase convention is the other way (cite file:line)
- **Reply draft:** in response document, Thread 3

### 4. [score: 15 · ignore] <one-line summary>
- **File:** ...
- **Thread:** ...
- **Reviewer (@login):** ...
- **Why:** refers to a function that no longer exists in this PR (outdated, removed in <sha>)

## Summary
- Address: N · Partial: N · Reply: N · Ignore: N
- Code touch points: roughly N files
- Response: /Users/pierce/.claude-tmp/claude-pr-comments-<number>-<timestamp>.md (one consolidated comment — paste as a single PR comment, do not split per thread)
```

On approval, apply the code changes for the `address` / `partial` items, commit, and backfill the real SHAs into the response document. The user handles all GitHub replies and thread resolution themselves using the response document.

If the user rejects or edits, re-score the affected threads, regenerate the response document, and re-present.

## Guardrails

- **No GitHub writes, ever.** No `gh pr comment`, no `gh pr review`, no `gh api` mutations, no thread resolution. Read-only against GitHub for the entire branch.
- **No code edits before plan approval.** Edits happen after the user approves the plan — and only for `address` / `partial` items.
- **All replies go to the response document as one consolidated comment.** The user copy-pastes it as a single PR-level comment. Never offer to post for them, and never split into per-thread drafts unless the user explicitly asks.
- **Don't manufacture threads.** If the GraphQL response is empty, fall back to the self-review core — never invent a comment to triage.
- **Cite the comment URL** for each thread in both the plan and the response document.
- **Outdated ≠ ignore.** Outdated threads frequently still need a one-line reply so the reviewer knows you saw it — those get a `reply` action with a draft.
- **Score on evidence.** Defend each score by quoting the comment or pointing at the file. Avoid scoring on vibes.
