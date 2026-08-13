# Review — PR comments branch

Auto-entered from [SKILL.md](SKILL.md) Phase 00 when the current branch has an **open PR that is mine** (author or assignee) carrying **unaddressed reviewer feedback in any shape** — an unresolved inline thread, a formal review whose substance sits in the review **body** (zero inline threads), or a plain conversation comment with nothing pushed since (see SKILL.md step 3's *commits-pushed-after* heuristic). Work through every feedback point one by one: fetch → score → plan → (on approval) apply code fixes + write a local reply doc. Mutually exclusive with the self-review core — this branch runs *instead of* [REVIEW-CORE.md](REVIEW-CORE.md). **Never gate on inline-thread count alone** — a body-only review has zero threads and is the exact case that silently slipped through before.

**Never posts words to GitHub.** All reviewer replies are written to a local response document the user copy-pastes; thread resolution is the user's to do. The one action this branch may take on GitHub is re-requesting a formal reviewer once the fixes are pushed (Phase 08), and only on an explicit yes.

**RULE 0 — `AskUserQuestion` is banned for this whole pass.** Every question asked while this file is running is plain chat text answered by a typed keyword; the option selector is never opened, for any decision, regardless of which skill entered the review. Full statement in [SKILL.md](SKILL.md) RULE 0 — it binds here identically.

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

## Phase 03 — Fetch unaddressed feedback (all three shapes)

Reviewer feedback is not just inline threads. Fetch and triage **all three** shapes — a review with inline comments, a review whose whole substance is in the **body** (zero inline threads), and a plain **conversation comment** the reviewer never attached to a line. Missing the last two is exactly how a PR with a wall of feedback gets blind-self-reviewed. A "feedback item" from any source is triaged the same way in Phase 05.

**(a) Inline review threads** — GraphQL, because the JSON fields on `gh pr view` don't expose thread resolution state.

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

**(b) Formal review bodies** — a reviewer can put every finding in the review body with **no inline threads at all** (e.g. one "multi-agent review" block listing W1…W9). These carry no per-item resolution state, so you can't filter them by `isResolved`; instead split the body into individual feedback items yourself.

```
me=$(gh api user --jq .login)
gh pr view <pr_number> --json reviews --jq "[.reviews[]|select(.author.login!=\"$me\" and (.body|length>0))|{author:.author.login,state:.state,submittedAt:.submittedAt,body:.body}]"
```

Read each non-author review body in full and enumerate its findings as separate items. A review with `state` `COMMENTED` counts exactly as much as `CHANGES_REQUESTED` — the reviewer's words are the feedback, not the button they clicked.

**(c) Top-level conversation comments** (not tied to a diff line): `gh pr view <pr_number> --json comments`. No "resolved" state, so treat each non-author comment as a feedback item. If unsure whether one is in-scope, ask the user — as a plain-chat question, never the `AskUserQuestion` tool / structured-question schema.

**Guard — don't bounce a body-only review back to self-review.** Fall back to [REVIEW-CORE.md](REVIEW-CORE.md) **only** when **all three** sources are empty of non-author feedback (no unresolved thread, no non-author review body, no non-author comment). Zero *inline threads* alone is **not** grounds to fall back — that was the old bug. If (b) or (c) has content, stay here and triage it.

**Reconcile mode — check each item against current HEAD.** When commits were pushed *after* the feedback landed (the ambiguous case from SKILL.md step 3), some items may already be fixed. For every feedback item, read the **current** code (Phase 04) before scoring: an item resolved by a post-feedback commit is classified `reply: already addressed in <sha>` (cite the commit and the current code), not re-implemented. Never assume "commits since ⇒ all handled" — verify each point; partial fixes are common.

## Phase 04 — Read code context for each feedback item

For each feedback item (inline thread, review-body finding, or conversation comment), read the current code it concerns. For an inline thread that's the file at `path` around the commented line(s), ±20 lines. For a body/comment finding that names a file/symbol, locate it (Grep/Glob) and read the current state. Use the local checkout — Phase 01 already proved it matches `origin/<branch>`.

If an inline thread is `isOutdated`, note it — the code at that line may have moved or changed since. Still read what's there now. In **reconcile mode** (commits pushed after the feedback), reading current HEAD is how you catch items a later commit already fixed — those become `reply: already addressed in <sha>`.

## Phase 05 — Score and classify every thread

For each thread, decide:

**Score (0–100)** — how strong is the concern?

- **90–100** — Real bug, security issue, broken contract, factual correctness problem. Should be fixed.
- **75–89** — Clear improvement: simpler implementation, missed edge case, valid maintainability concern, repo-convention violation.
- **50–74** — Judgement call: reasonable point with real tradeoffs, or a stylistic preference where the codebase doesn't strongly mandate either side.
- **25–49** — Minor / preference: nitpick, taste, or a reviewer assumption that doesn't apply here.
- **0–24** — Misunderstanding, out of scope, contradicts an explicit user decision, refers to code that no longer exists / has been refactored, or duplicates another thread.

**The score measures whether the reviewer is RIGHT — never how much work being right implies.** Size, difficulty, file count, "how much of the diff this touches" are not inputs. A correct 92 that takes six files is a 92.

### Effort is BANNED as an input to score or action

**Never decide to `reply` instead of `address` because the fix is large, hard, tedious, or spread across files.** This is the single most common failure of this phase: a wall of valid findings gets a uniform "deliberate / follow-up / not in this PR" because implementing them all looked like a lot of work. Sorting findings by effort and calling the expensive half "out of scope" is not triage — it is skipping the work, and the user will catch it.

**Effort is not a real cost here.** The agent writes the fix; a change that reads as "an afternoon" in human terms is minutes of tool calls. Estimating in human-hours imports a cost model that does not apply to who is doing the work. So:

- **Never state, imply, or reason from a time estimate** — no "quick", "an afternoon", "a big lift", "a few hours", "a one-liner vs a refactor" as *justification*. (Naming a fix's shape — "one attribute", "six lines" — as a *description* is fine; using it as the reason to skip is not.)
- **Banned justifications**, in the plan and in the response document alike: "not worth it", "low value", "marginal", "an edge case", "too big for this PR", "I'd rather not fold this in", "follow-up" / "out of scope" when the only actual reason is size.

**The three legitimate reasons to not fix something now** — each must be stated as itself, never as a stand-in for effort:

1. **The code is correct as-is.** Say *why*, on the merits, citing the code: the predicate is already covered by an existing index; the exemption protects live work; the reviewer's claim is factually wrong (show it). This is a `reply` with evidence, not an opinion.
2. **Divergent work** — the change is about a *different concern* than this PR, so it belongs in its own unit of work. Divergence is about subject matter, never magnitude. Divergent work is exactly what parallelizes: say so concretely — "own branch, can run alongside this" — so it reads as work being *routed*, not deferred. If you cannot name the different concern in one clause, it is not divergent; it is just large, and large is not a reason.
3. **Blocked on a decision only the user can make** — the fix depends on intent you do not have. State the question. Do not guess and do not bury it.

If a finding fits none of the three, its action is `address`. "It's a lot of work" is not a fourth reason.

**Self-check before presenting the plan.** Count the `reply` actions. If most findings landed on `reply`, or if several `reply` items share a same-shaped justification, stop and re-score every one of them against the three reasons above. A reviewer who wrote ten findings usually found ten real things.

**Recommended action** — pick one:

- **address** — change the code to satisfy the comment. Include a one-line description of what the change is.
- **partial** — make a smaller change than the reviewer asked for, or address part of the concern. Describe what to do and what to skip.
- **reply** — no code change; write a draft reply explaining why (out of scope, intentional, addressed elsewhere, outdated). The reply goes in the response document — never posted.
- **ignore** — skip without responding. Reserve for clearly-stale outdated threads, accidental comments, or duplicates already covered by another thread you're addressing.

Bias against implementing **preference** comments. A 30-point taste comment that gets implemented is worse than one that gets a polite explanation — it adds churn to the diff and signals to future reviewers that all feedback is mandatory. This is a bias against churn on *low-scoring* items, and nothing more: it is **not** licence to thin out a list of high-scoring findings, and it never applies to anything scored 75+. When a reviewer is right about ten things, ten `address` actions is the correct plan, not a red flag.

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

## Phase 08 — Offer to re-request the review

**Whenever the feedback came from a formal review, offer to re-request that reviewer once the fixes are pushed.** Not a footnote and not something the user should have to think of — a review with a verdict on it stays on the PR as the reviewer's standing position, and `CHANGES_REQUESTED` keeps gating the merge, until they are asked again. Fixing everything and saying nothing leaves the PR looking exactly as blocked as it did before the work.

The offer applies to a reviewer who submitted a **formal review of any state** — `CHANGES_REQUESTED`, `COMMENTED`, or `APPROVED` on a since-changed diff. It does **not** apply to someone who only left a conversation comment: there is no review to supersede, and re-requesting reads as a nudge rather than a status change.

Make the offer in the same message as the response document, one plain line per reviewer, keyword-answered (RULE 0 — never a selector):

```
@alexthemighty's CHANGES_REQUESTED is still gating the merge. Re-request their review? `re-request` / `skip`
```

On an explicit yes **in that message** — this is an outward action on someone else's queue, held to the same gate as any send:

```
gh pr edit <pr_number> --repo <owner>/<repo> --add-reviewer <login>
```

`--add-reviewer` works on someone who has already reviewed: GitHub drops their prior verdict from the merge gate and puts them back in `reviewRequests`. Confirm it by reading the list back rather than trusting the command's silence:

```
gh pr view <pr_number> --json reviewRequests --jq '[.reviewRequests[].login]'
```

**Order matters: push first.** Re-requesting before the fix commits are on the branch asks someone to look at the code they already rejected. Same rule as the reply itself — the branch must be pushed before either goes out.

**Two ways it fails, both worth naming rather than retrying.** A reviewer without push access to the repo cannot be re-requested and the command errors; say so and leave the reply to do the work. And re-requesting yourself is rejected outright — if the author and the reviewer are the same login, there is nothing to offer.

## Guardrails

- **No GitHub writes except the Phase 08 re-request, and that one only on an explicit yes.** No `gh pr comment`, no `gh pr review`, no `gh api` mutations, no thread resolution — the reply is the user's to paste and the threads are theirs to resolve. The single exception is `gh pr edit --add-reviewer` in Phase 08, which posts no words of its own and only puts back a request the reviewer's own verdict replaced; it still needs a yes in the message, never prior or implied consent.
- **No code edits before plan approval.** Edits happen after the user approves the plan — and only for `address` / `partial` items.
- **All replies go to the response document as one consolidated comment.** The user copy-pastes it as a single PR-level comment. Never offer to post for them, and never split into per-thread drafts unless the user explicitly asks.
- **Don't manufacture feedback.** Fall back to the self-review core only when **all three** sources (inline threads, non-author review bodies, non-author conversation comments) are empty — never invent an item to triage. Zero inline threads alone is not emptiness if a review body or comment carries findings.
- **Cite the comment URL** for each thread in both the plan and the response document.
- **Outdated ≠ ignore.** Outdated threads frequently still need a one-line reply so the reviewer knows you saw it — those get a `reply` action with a draft.
- **Score on evidence.** Defend each score by quoting the comment or pointing at the file. Avoid scoring on vibes.
