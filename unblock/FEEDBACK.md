# Unblock — feedback

Loaded by [SKILL.md](SKILL.md) Phase U4 when the branch is mine and its open PR carries **unaddressed reviewer feedback in any shape** — an unresolved inline thread, a formal review whose substance sits in the review **body** (zero inline threads), or a plain conversation comment with nothing pushed since (see SKILL.md Phase U4's *commits-pushed-after* heuristic). Work through every feedback point: fetch → score → plan → apply code fixes + write a local reply doc. **Never gate on inline-thread count alone** — a body-only review has zero threads and is the exact case that silently slipped through before.

**This file owns how a response to feedback is written, and that is its own formatting problem.** It is deliberately separate from [../review/POSTING.md](../review/POSTING.md), which formats findings you are handing *to* an author. Here you are answering a reviewer who already read your code: the shape, the caps, and the banned phrases are all different, and merging the two documents makes both worse.

**Never posts words to GitHub.** All reviewer replies are printed in chat, quoted as a Markdown
blockquote, for the user to copy-paste; nothing is written to disk and thread resolution is the
user's to do. The one action this file may take on GitHub is re-requesting a formal reviewer once
the fixes are pushed (Phase 08), and only on an explicit yes.

**[RULES.md](../review/RULES.md) binds this file** — RULE 0 (no selector, ever), RULE 1 (effort never decides), RULE 2 (the gate does the job it names, it does not ask permission to). Load it if it is not already in context.

## Phase 01 — Pre-flight

**Phase U1 already fetched, proved the tree clean, and put the checkout at the branch head.** Do not re-run any of that; a second `git fetch` here is the shape of the duplication that made these two skills one skill.

One check this file adds: `gh auth status` must succeed. If not, stop and say so.

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

**Guard — don't bounce a body-only review back out.** Return to [SKILL.md](SKILL.md) Phase U4 as "no feedback" **only** when **all three** sources are empty of non-author feedback (no unresolved thread, no non-author review body, no non-author comment). Zero *inline threads* alone is **not** grounds to bounce — that was the old bug. If (b) or (c) has content, stay here and triage it.

**Reconcile mode — check each item against current HEAD.** When commits were pushed *after* the feedback landed (the ambiguous case from Phase U4), some items may already be fixed. For every feedback item, read the **current** code (Phase 04) before scoring: an item resolved by a post-feedback commit is classified `reply: already addressed in <sha>` (cite the commit and the current code), not re-implemented. Never assume "commits since ⇒ all handled" — verify each point; partial fixes are common.

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

**[RULES.md](../review/RULES.md) RULE 1 is the full statement and it binds here.** Its three legitimate reasons to not fix something now — the code is correct as-is, the work is divergent, the fix is blocked on the user's intent — are the only three this phase may use, and each must be stated as itself.

**The specific failure this phase produces when RULE 1 slips:** a wall of valid findings gets a uniform "deliberate / follow-up / not in this PR" because implementing them all looked like a lot of work. Sorting findings by effort and calling the expensive half "out of scope" is not triage — it is skipping the work, and the user will catch it.

**Self-check before presenting the plan.** Count the `reply` actions. If most findings landed on `reply`, or if several `reply` items share a same-shaped justification, stop and re-score every one of them against RULE 1's three reasons. A reviewer who wrote ten findings usually found ten real things.

**Recommended action** — pick one:

- **address** — change the code to satisfy the comment. Include a one-line description of what the change is.
- **partial** — make a smaller change than the reviewer asked for, or address part of the concern. Describe what to do and what to skip.
- **reply** — no code change; write a draft reply explaining why (out of scope, intentional, addressed elsewhere, outdated). The reply goes in the response block — never posted.
- **ignore** — skip without responding. Reserve for clearly-stale outdated threads, accidental comments, or duplicates already covered by another thread you're addressing.

Bias against implementing **preference** comments. A 30-point taste comment that gets implemented is worse than one that gets a polite explanation — it adds churn to the diff and signals to future reviewers that all feedback is mandatory. This is a bias against churn on *low-scoring* items, and nothing more: it is **not** licence to thin out a list of high-scoring findings, and it never applies to anything scored 75+. When a reviewer is right about ten things, ten `address` actions is the correct plan, not a red flag.

If a thread has multiple comments (back-and-forth between reviewer and author), read the WHOLE chain — the original concern may already be resolved in discussion.

## Phase 06 — Present the response block

Print, in chat, a **single consolidated reply** the user copy-pastes as one PR comment. The reply
is an ordered list where item N corresponds to issue N from the plan (Phase 07) — same numbering,
same ordering.

**No file.** Quote the block as Markdown (`>` on every line) so it reads as one pasteable unit
apart from your own commentary. It is transient — nobody has ever opened one of these back up on
disk, so stop writing one. When Phase 07 backfills commit SHAs after landing the fixes, re-print
the updated block rather than editing a file that never existed.

### Budget — hard caps, not guidance

The pasteable block obeys all four. If a draft breaks one, cut words; never raise the cap.

| Cap | Value |
|---|---|
| Whole pasteable block | **150 words**, excluding the numbered prefixes and the `file:line` tags |
| Per item | **1 line**; a second line only when the *why* is not visible in the change itself |
| Per sentence | **20 words** |
| Items | **one per plan issue with action `address` / `partial` / `reply`**; `ignore` items never appear |

Over 8 items the block still fits 150 words — that is 15 words an item, which is enough. It is not licence to merge items. An item that cannot be said in eight words is usually two items.

Document format:

```
# PR #<number> response — <title>

<pr_url>
Generated: YYYY-MM-DD HH:MM:SS
Head: <short-sha>

> Copy-paste the block below as a single PR comment. Nothing was posted for you.

---

1. <what was flagged, ≤6 words> — <what changed, imperative-past> (`<path>:<line>`)
2. <what was flagged, ≤6 words> — not changing. <evidence sentence with a value or a `<path>:<line>`>
3. <what was flagged, ≤6 words> — <what landed> (`<path>:<line>`); skipped <what>, <reason>
...

---

## Reference (not for pasting)

- 1: <thread/comment URL> · address · <path>:<line>
- 2: <thread/comment URL> · reply   · <path>:<line>
- 3: <thread/comment URL> · partial · <path>:<line>
```

### What each action looks like

- **address** → one line. What changed and where. `renamed` / `moved` / `added` / `now returns`. Add `in \`<sha>\`` only when the fixes span more than one commit.
- **partial** → one line. What landed, then what you did not do and the reason — the reason is one of the three legitimate ones from Phase 05, named as itself.
- **reply** → two lines maximum, and the second carries the evidence: a value read out of the running code, or a `<path>:<line>` where the codebase already settles it. A `reply` with no value and no path is not finished.

**Commit SHA handling.** `<commit-sha-placeholder>` is a temporary marker. As soon as code changes are committed (after plan approval), re-print the block with every placeholder replaced by the real short SHA from the `git commit` output. If all `address`/`partial` items land in one commit, drop the SHA reference. Never leave a placeholder in the final printed block.

### What is cut entirely

| Cut | Why |
|---|---|
| `Thanks @<reviewer> —` and `Quick rundown:` openers | The list is the message. A greeting is a line the reviewer reads and learns nothing from. |
| Any restatement of what the reviewer said | They wrote it. The ≤6-word flag is a pointer, not a summary. |
| "Good catch", "you're right", "fair point", apologies | Not information; each one invites a reply that is also not information. |
| The optional "note on the approach" for `address` items | The diff is the approach. If the approach genuinely needs defending, that is a `partial`, not a footnote. |
| `ignore` items | They stay in the Phase 07 plan for the user and never reach the PR. |
| Headers, nested bullets, bold, tables inside the pasteable block | One flat numbered list a human reads top to bottom. |

### Reply-comment style rules

These are words posted under the user's name on someone else's PR. Tone is not decoration here — a hedged or padded reply reads as an opening for negotiation, and the reviewer takes it.

**Sentence shape** (ASD-STE100 — https://www.asd-ste100.org/ ; Google developer documentation style guide — https://developers.google.com/style/tone):

1. **One idea per sentence.** No sentence carries a claim and its justification. Split them.
2. **20 words per sentence, maximum.** Do not hit the cap by dropping the subject or the article — an ambiguous short sentence is worse than a clear long one.
3. **Active voice.** "The scan now reads the section id from config", never "the section id is now read from config".
4. **Present tense for current behaviour, simple past for the change.** "`resolveSeat` returns the button seat" and "moved the guard into `dealRound`". No present perfect, no future tense.
5. **No semicolons.** Two sentences instead.
6. **Noun clusters capped at three words.** "player session cache key lookup" is a sentence hiding from you.

**Banned outright** — each one lengthens the thread:

- **Hedges:** `might`, `may`, `could potentially`, `it seems`, `I think`, `arguably`, `probably`, `IIRC`, `in theory`, `somewhat`, `a bit`.
- **Apology and gratitude:** `sorry`, `apologies`, `thanks`, `thank you`, `good catch`, `great point`, `nice spot`, `appreciate`.
- **Restatement:** any clause beginning "you mentioned", "as you noted", "your point about", "if I understand correctly".
- **Softeners around a refusal:** `happy to change this if you feel strongly`, `let me know if you'd prefer`, `open to discussion`, `no strong opinion`. State the position. The reviewer knows how to reply.
- **Abstraction nouns doing a fact's job:** `incorrect behavior`, `unexpected state`, `mishandled`, `improper`, `suboptimal`, `non-deterministic ordering`, `the logic doesn't account for`, `edge case`, `cosmetic`, `semantics`, `surface`, `invariant`, `boundary`. Also banned: any sentence whose subject is an abstraction. Not "the ordering is unstable" — "the second player with two pair got the side pot".
- **Phantom authority:** `a known issue`, `well-documented`, `widely reported`, `notoriously`, `tends to`, `is known to`, unless a URL sits inside the same sentence.

**Evidence rule.** Any reply claiming the reviewer is wrong, that the code is already correct, or that a convention says otherwise MUST carry one of these in the same item: a value read out of the running system (a count, a returned value, a duration, a row); a `<path>:<line>` pointing at the code that settles it; or a commit sha where it was already fixed. No exceptions. "This is intentional" with nothing after it is not a reply, it is a second round of review.

**Handles.** Name a reviewer only when the PR has more than one and an item would otherwise be unattributable. Never open with a handle.

**Worked reduction.** The same three items, before and after:

```
Thanks @alexthemighty — quick rundown:

1. Side pot going to the wrong player at showdown — fixed. I reworked
   evaluateShowdown so that it now takes kickers into account before it
   decides the winner, which should handle the case you flagged.
2. Hardcoded Plex section id — you're right that this is fragile, though
   I think it might only bite on a non-default install. It seems safer to
   leave it for now; happy to change this if you feel strongly.
3. Missing test for the heads-up blind swap — good catch, added.
```

```
1. Side pot at showdown — kickers now break the tie before the pot is
   assigned (`poker-ui/src/game/handEval.ts:214`)
2. Hardcoded Plex section id — not changing. `PLEX_LIBRARY_SECTION` already
   overrides it and defaults to 3 only when unset (`scan-worker/config.ts:31`)
3. Heads-up blind swap — added (`poker-ui/test/seatRotation.test.ts:64`)
```

118 words to 52. Item 2 is the load-bearing change: the first version hedges twice, offers to reopen the argument, and cites nothing — three separate invitations to reply. The second states the position once and points at the line that settles it.

## Phase 07 — Print the plan, then apply it

**Print the plan in chat and act on it. Do not call `ExitPlanMode` and do not wait for approval** — RULE 2: the gate already decided that unanswered feedback gets answered, and asking again is the halt this skill exists to remove. The plan is the record of what you are doing.

**The one exception is an item whose action is blocked on the user's intent** (RULE 1's third reason). Those, and only those, are pulled out of the plan into a short list at the end with the question stated, and left undone while everything else lands:

```
1 item needs you:

4. @alexthemighty wants cohort assignment to prefer the smallest cohort; the branch prefers the newest. Both are defensible and the choice is yours.

The other 6 are applied and the response doc is written.
```

Format for the plan itself:

```
# PR #<number> — <title>

<pr_url>
<N> unresolved threads · base: <base> · head: <short-sha>

## Threads

Full block for every item scored **50 and above**. Fields in this order, no others:

### 1. [92 · address] <one-line summary>
- `path/to/file.ext:LINE` — outdated: no — <comment url>
- **@login:** "<the key sentence, quoted, one sentence>"
- **Score:** <one sentence, ≤20 words, citing the code or the comment>
- **Plan:** <the code change, one sentence>

### 2. [68 · partial] <one-line summary>
- `poker-ui/src/table/SeatRing.tsx:88` — outdated: no — <comment url>
- **@login:** "..."
- **Score:** ...
- **Plan:** add the null check; the ring refactor is a different concern and goes on its own branch

Everything scored **below 50** is one table row, no block — the long tail is always the low scores, and four labelled fields to say "skipping this" is where the plan's length actually lives:

| # | score | action | summary | file | why |
|---|---|---|---|---|---|
| 3 | 40 | reply | double-quote preference | `scan-worker/config.ts:12` | repo convention is single quotes — `.prettierrc:4` |
| 4 | 15 | ignore | drop `formatSeatLabel` | — | function removed in `a41c9de` |

## Summary
- address N · partial N · reply N · ignore N · N files touched
- Paste the blockquoted reply above as ONE PR comment. Do not split per thread.
```

The quoted reviewer sentence, the score rationale, and the plan sentence all stay for items scored 50+. Cutting those is how RULE 1's effort-triage failure gets back in — a plan that shows scores without their reasons cannot be argued with, so nobody argues with it.

Then apply the code changes for the `address` / `partial` items, commit under the rules below, and
re-print the response block in chat with the real short SHAs backfilled in place of the
placeholders. The user handles all GitHub replies and thread resolution themselves.

**Commit, do not push.** The push is [SKILL.md](SKILL.md) Phase U5's single confirm, batched with whatever the conflicts and tests gates did.

### Commit messages for review fixes

A review-fix commit is read by the reviewer, in the PR's commit list, next to their own comment. It is the second outward artifact of this branch and gets the same discipline as the first.

**The rules, in force order.** Where the sources disagree, the later line wins and the reason is stated — never pick silently.

1. Separate subject from body with a blank line. (cbea rule 1 — https://cbea.ms/git-commit/)
2. **Subject ≤ 72 characters.** cbea rule 2 and tbaggery (https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html) both say 50, with cbea calling 72 the hard truncation point. **CLAUDE.md section 7 says ≤72, and CLAUDE.md wins** — it is the repo owner's own convention, and the Conventional Commits prefix eats 10–20 characters before the description starts. Aim short anyway: a subject you cannot get under 72 usually means the commit is two commits.
3. **Conventional Commits: `type(scope): description`.** `type` is one of `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`. `scope` is the package or subsystem; omit the parentheses entirely when no single scope fits. **This overrides cbea rule 3 (capitalize the subject)** — the type is lowercase by the spec, and the description stays lowercase unless it opens with an identifier that is capitalized in the code.
4. Do not end the subject with a period. (cbea rule 4)
5. **Imperative mood.** "compare kickers", never "compared kickers" or "compares kickers". Git writes its own commits this way. (cbea rule 5, tbaggery)
6. **Body wrapped at 72 columns**, blank line between paragraphs. `git log` does not wrap. (cbea rule 6, tbaggery)
7. **The body explains the problem and why this change fixes it — not how.** The diff is the how. Write the body only when the why is not obvious from the subject; a one-line commit is finished when it is. (cbea rule 7, CLAUDE.md section 7)

**Review-specific rules on top:**

- **Never name the review as the change.** `fix: address review comments`, `fix: PR feedback`, `chore: review fixes` are all banned — they describe your Tuesday, not the code. The subject names what the code now does.
- **The body may cite where the finding came from, on its own last line**, one line, no thanks: `Raised by @alexthemighty on PR #214.` Omit it when the subject and body already stand alone.
- **One finding per commit** when the findings are unrelated. The reviewer reads the commit list against their own comments; a commit satisfying four unrelated findings cannot be checked against any of them.
- **ABSOLUTE — no attribution to any tool, assistant, model, or vendor**, in the subject, the body, or a trailer. No `Co-Authored-By` of any kind, no generated-with footer, no emoji badge. Scan every message before `git commit`.

**Worked examples.**

```
fix(hand-eval): compare kickers before awarding the side pot

evaluateShowdown returned the first player whose rank matched, so on
a board-paired two pair the 3,200-chip side pot went to the player
holding the 9 kicker instead of the one holding the ace. Kickers now
break the tie before the pot is assigned.

Raised by @alexthemighty on PR #214.
```

```
refactor(scan-worker): read the Plex section id from config

The section id was hardcoded to 3. On a Plex server whose library
happens to be section 5, the nightly scan walked an empty section,
inserted zero rows, and exited 0 — so the catalog silently stopped
updating and nothing logged a failure. The id now comes from
PLEX_LIBRARY_SECTION and the worker exits non-zero when it is unset.
```

```
test(seat-rotation): cover the heads-up blind swap
```

The third has no body on purpose: the subject says what the commit adds, and nothing about the why is hidden.

If the user rejects or edits, re-score the affected threads, regenerate the response block, and re-present.

## Phase 08 — Hand the re-request to Phase U5's slate

**Whenever the feedback came from a formal review, offer to re-request that reviewer once the fixes are pushed.** Not a footnote and not something the user should have to think of — a review with a verdict on it stays on the PR as the reviewer's standing position, and `CHANGES_REQUESTED` keeps gating the merge, until they are asked again. Fixing everything and saying nothing leaves the PR looking exactly as blocked as it did before the work.

The offer applies to a reviewer who submitted a **formal review of any state** — `CHANGES_REQUESTED`, `COMMENTED`, or `APPROVED` on a since-changed diff. It does **not** apply to someone who only left a conversation comment: there is no review to supersede, and re-requesting reads as a nudge rather than a status change.

**This phase prints no prompt of its own.** It contributes one row per reviewer to [SKILL.md](SKILL.md) Phase U5's single slate, which is the only thing the whole skill asks:

```
2. **re-request** — @alexthemighty's `CHANGES_REQUESTED` still gates the merge. My pick: re-request.
```

A second prompt under the response block — `re-request` / `skip` on its own line, beneath U5's own question — makes the user answer twice to accept two things you already recommended. One slate, one keyword (RULE 0 — never a selector).

On an explicit yes to that row — this is an outward action on someone else's queue, held to the same gate as any send:

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
- **Print the plan before editing, but do not wait on it.** The plan goes in chat first so the user can see what is about to change and interrupt; then the `address` / `partial` items are applied. Only items blocked on the user's intent wait.
- **All replies go into the response block as one consolidated comment.** The user copy-pastes it as a single PR-level comment. Never offer to post for them, and never split into per-thread drafts unless the user explicitly asks.
- **Don't manufacture feedback.** Report "no feedback" back to Phase U4 only when **all three** sources (inline threads, non-author review bodies, non-author conversation comments) are empty — never invent an item to triage. Zero inline threads alone is not emptiness if a review body or comment carries findings.
- **Cite the comment URL** for each thread in both the plan and the response block.
- **Outdated ≠ ignore.** Outdated threads frequently still need a one-line reply so the reviewer knows you saw it — those get a `reply` action with a draft.
- **Score on evidence.** Defend each score by quoting the comment or pointing at the file. Avoid scoring on vibes.
