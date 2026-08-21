---
name: review
description: "The single entry point for reviewing code: a ten-axis review (with gated security lens) routed by context — own repo: review + document; collaborative repo: triage the PR queue, review your branch, or review a teammate's PR with per-finding fix/post-back offers; own open PR: work through unresolved comments or self-review. `review dual` adds a cross-vendor second opinion; `review repo` reviews the whole codebase (always confirms first); `review workflow` runs the lens fan-out and scoring in a workflow so only surviving findings reach this context; `noverify` skips the execution gate that runs each behavior claim against the code before it can reach the report. Covers every review, PR-queue, security-review, and address-PR-comments request. Never uses AskUserQuestion — every choice is plain chat text answered by a typed keyword."
---

# Review

Review code changes for bugs, **security vulnerabilities**, quality issues, CLAUDE.md compliance, **architecture fit**, **spec compliance**, **negative space** (unmet obligations the diff creates), and **best practices** checked against current external docs. `review` is the **single entry point** for review — it routes by context (your working tree, a branch, one PR, or a queue of teammate PRs) and decides what to offer at the end (a fix pass, or posting to a PR) from where you invoke it.

The review engine itself — the ten-axis dispatch, scoring, and report format — lives in [REVIEW-CORE.md](REVIEW-CORE.md). This file is the router: it resolves ownership, picks a branch, then hands off to REVIEW-CORE.md (self-review) or [PR-COMMENTS.md](PR-COMMENTS.md) (address my PR's unresolved comments). Load the branch file only once you've routed to it — that keeps context small.

## RULE 0 — `AskUserQuestion` is BANNED for the entire lifetime of a review

**Every question this skill asks the user — without a single exception — is plain chat text answered by a typed keyword. The `AskUserQuestion` tool (the arrow-key option selector) is never called at any point in a review pass.**

This is a hard, non-negotiable ban with the same standing as the no-AI-attribution rule. It holds regardless of how the review was entered — typed `/review`, routed here from `implement`, `iterate`, `wrap-up`, or any other skill. A caller's habits do not unlock the tool; a review pass is a no-selector zone from the moment this file loads until the pass ends, **including the sub-files it hands off to** ([REVIEW-CORE.md](REVIEW-CORE.md), [PR-COMMENTS.md](PR-COMMENTS.md)) and any subagent spawned during the pass.

It covers **every** decision point, not just the ones spelled out below. Non-exhaustive: end-of-pass finding disposition, which PRs to review from the queue, review flavor, review scope, verdict choice, whether to run grill-me, whether to fix on the branch, whether to write the summary doc, and any ambiguity that needs the user to settle it.

**Do this instead.** Print the options as plain chat text — numbered or keyworded, as many as actually exist — and say what to type. Keywords are good (`fix`, `post`, `approve`, `skip`, `all`, `1016 and 1018`); the point is that the answer is *typed*, not picked from a menu widget. On more than one finding, list each with its own line so the user can answer per finding (`1 fix, 2 post, 3 skip`).

**Every such list carries your own recommendation per item, and ends with the accept-all line — always:**

> Type **`go`** to apply my picks exactly as described, or answer per finding (`1 fix, 2 post, 3 skip`).

A findings list with no recommendation is a non-answer (`CLAUDE.md`, Deciding & designing); one with recommendations but no way to accept them wholesale makes the user re-type a decision they already agree with. `go` means *the picks as stated*, skips included — never "fix everything".

**Self-check before every question in a review.** If you are about to open a selector, stop — that is this rule firing. Rewrite the question as chat text and send that instead.

### Where it has actually broken — check these two by name

The rule was violated twice in ~120 real passes, both at points the prose above already covers but nobody recognised in the moment. Treat these as named tripwires:

1. **"The diff hasn't changed since I last reviewed this — what do you want from this pass?"** A re-review of an unchanged diff feels like a fresh routing decision, so it invites a selector. It is a review question, asked after `/review`, and it is banned. Say it in chat: *"Diff is unchanged since the last pass on #1188. Type `again` for a fresh pass, `axes <names>` to re-run specific lenses, or tell me what changed in your thinking."*
2. **"How much of this should I apply now vs hand back?"** Scope-of-fix at the end of a pass is *exactly* the end-of-pass disposition the rule enumerates. Per-finding typed answers, always: *"1 fix, 2 post, 3 skip."*

Both fired mid-pass in the work repo. The lesson is not that the rule was unclear — it is that a selector looks reasonable precisely when the question feels like routing rather than review. **From `/review` until the report is written, there is no such thing as a routing question that escapes this rule.**

## RULE 1 — effort NEVER decides what gets fixed

**How much work a fix is — its size, its difficulty, how many files it touches, how long it would "take" — is banned as a reason to skip it, defer it, downgrade it, or recommend against it.** This binds everywhere in a review pass: scoring a reviewer's comment ([PR-COMMENTS.md](PR-COMMENTS.md) Phase 05), the end-of-pass fix/post/skip disposition, the blocking verdict, and every subagent spawned during the pass.

**Never state or reason from a time estimate.** Human-hour estimates ("a quick one-liner", "an afternoon", "a big lift") import a cost model that does not apply — the agent writes the fix, and what reads as hours of human work is minutes of tool calls. Naming a change's *shape* as description ("one attribute", "six lines") is fine; using size as the *justification* is not.

**Banned justifications**, in chat, in the report, and in any drafted reply: "not worth it", "low value", "marginal", "too big for this PR", "I'd rather not fold that in", and "follow-up" / "out of scope" whenever the real reason is magnitude.

**Only three things justify not fixing now**, and each must be stated as itself:

1. **The code is correct as-is** — say why on the merits, citing the code.
2. **Divergent work** — a *different concern*, so it belongs in its own unit of work. Divergence is about subject matter, never size. It is also what parallelizes: route it ("own branch, runs alongside this"), don't shelve it.
3. **Blocked on the user's intent** — state the question rather than guessing.

Anything fitting none of the three gets fixed. **Self-check:** if most findings in a pass landed on skip/reply, or several share a same-shaped excuse, re-judge every one of them against those three reasons before presenting.

## Flavors — solo vs dual

- **`review`** (default) — Claude reviews on its own.
- **`review dual`** — Claude reviews, *and* an independent cross-vendor delegate reviews the same diff; the two are reconciled into one source-tagged report. The delegate catches what a same-model self-review misses (concurrency, lifecycle, edge cases) and gives a second architecture read. The token `dual` anywhere in the arguments turns it on. See **Dual flavor** below.

## Transport — where the lenses run

Orthogonal to every flavor and scope above. The `workflow` token moves **Phases 04–06c only** — the lens fan-out, best-practice verification, scoring, the reproduction gate, the ≥75 filter, and fix authoring — into a workflow script, so only surviving findings enter this context instead of every lens report. Routing, scope, the report, and every question stay in the session. `review workflow`, `review repo workflow`, `review dual workflow`.

No token → the session transport: [REVIEW-CORE.md](REVIEW-CORE.md) exactly as written, Agent-tool sub-agents launched in parallel from this loop. That is the default and it is unchanged.

Mechanics, and what each phase costs under the switch: [TRANSPORT-WORKFLOW.md](TRANSPORT-WORKFLOW.md). **RULE 0 holds under both** — the workflow contains no question because every question in a review pass falls outside Phases 04–06.

## Verification gate — `noverify`

Phase 05b ([REVIEW-CORE.md](REVIEW-CORE.md)) feeds each behavior-claiming finding's stated input to the running code in a throwaway git worktree and keeps only what actually reproduces; Phase 06c then checks that the proposed fix removes it. The gate is **on by default** on every route, costs ≤8 minutes, and never touches the working tree. The token **`noverify`** turns it off for one pass — use it when the toolchain is unavailable, and expect a noisier report. There is no way to turn it off permanently, because "the model read it and was confident" is the thing it exists to distrust.

## Scope — `review repo`

**`review repo`.** Orthogonal to solo/dual: the `repo` token reviews the **whole codebase on the current branch** instead of a diff — every axis runs (gating off), it's context-heavy, and it always confirms before starting. It's also auto-offered when you invoke `review` with nothing to diff (clean tree, up to date). Combinable with dual (`review repo dual`). Mechanics live in [REVIEW-CORE.md](REVIEW-CORE.md) Phase 01r.

## Phase 00 — Route by context

Review's workflow is set by two ownership checks. Resolve both first, then pick the workflow; everything else (the review core, comment branch, dual flavor, offers) hangs off this.

**1. Do I own the repo?**
```
gh repo view --json owner --jq .owner.login
gh api user --jq .login
```
Owner == my login → **owned (solo) repo**: I work alone here and never open PRs, so there is no queue and nothing to post to. It reviews + documents, then offers to fix.
Owner != my login (or no GitHub remote) → **collaborative repo**: the PR world applies (queue, posting, teammate reviews).

**2. Is this branch/PR mine?** (collaborative repos only)
```
gh pr view --json author,assignees,number,url,state
```
Mine if the PR `author.login == my login` **or** my login is in `assignees[].login`. No PR → fall back to the branch name: mine if it starts with `pierce` (case-insensitive, `/` or `-` separator); else check commit authorship (`git log -1 --format=%ae` == my git email). Still ambiguous → **ask in plain chat, never guess**.

**3. My-PR sub-branch — comments or self-review?** When the branch is mine *and* has an open PR, check for **unaddressed reviewer feedback** before reviewing. Reviewer feedback arrives in **three** shapes and you must check **all three** — a formal review with inline comments, a formal review whose whole substance sits in the review **body** (zero inline threads), or a plain conversation comment where the reviewer never clicked "Request changes" at all. A gate that only counts inline `reviewThreads` **silently misses the last two** and wrongly self-reviews a PR that has a wall of unaddressed feedback sitting on it. Never route on thread count alone.

Gather every feedback source from **non-authors** (exclude your own login), then decide with the *commits-pushed-after* heuristic:

```
me=$(gh api user --jq .login)
# a) inline review threads + resolution state
gh api graphql -F owner=<owner> -F repo=<repo> -F number=<n> -f query='query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){reviewThreads(first:100){nodes{isResolved comments(first:1){nodes{author{login} createdAt}}}}}}}'
# b) formal reviews — ANY state (CHANGES_REQUESTED, COMMENTED, APPROVED), body + timestamp
gh pr view <n> --json reviews --jq "[.reviews[]|select(.author.login!=\"$me\" and (.body|length>0))|{author:.author.login,state:.state,submittedAt:.submittedAt}]"
# c) top-level conversation comments (never carry a resolved state)
gh pr view <n> --json comments --jq "[.comments[]|select(.author.login!=\"$me\")|{author:.author.login,createdAt:.createdAt}]"
# newest branch commit time (what "pushed after" is measured against)
gh pr view <n> --json commits --jq "[.commits[].committedDate]|max"
```

Let `latest_feedback` = the newest timestamp across: any **unresolved** inline thread, any non-author review body (b), and any non-author conversation comment (c). Let `latest_commit` = the newest commit date on the branch. Then:

- **Any unresolved inline thread** → **comment branch** ([PR-COMMENTS.md](PR-COMMENTS.md)). (The classic signal — still valid.)
- **Else if there is non-author review/comment feedback (b or c) and `latest_commit <= latest_feedback`** — i.e. **nothing was pushed after the feedback** → the feedback is almost certainly **unaddressed** → **comment branch**. This is the case a thread-count gate misses: a body-only review or a bare comment with no commits since.
- **Else if there is non-author feedback but commits *were* pushed after it** (`latest_commit > latest_feedback`) → **ambiguous** — the author may have addressed some, all, or none of it. Do **not** blind-self-review and bury it. Enter the comment branch anyway, but in *reconcile mode*: read each feedback point and check it against **current** HEAD (it may already be fixed by a post-feedback commit — classify those as `reply: already addressed in <sha>`). Reading feedback is cheap; skipping it is the expensive mistake.
- **Else (no non-author feedback at all)** → run the self-review core [REVIEW-CORE.md](REVIEW-CORE.md). After it writes the report, **if the report has uncertain findings** (see REVIEW-CORE.md "Uncertain findings → grill-me hand-off"), offer a `grill-me` pass to resolve them one question at a time. Then the fix offer below.

The `latest_commit <= latest_feedback` test is the load-bearing heuristic: **if nothing changed on the PR since the feedback landed, the underlying issues have not been dealt with** — regardless of whether the reviewer used the formal "Request changes" button or just typed a comment. Timestamps are ISO-8601, so a string compare orders them correctly; when they're within a few seconds or a commit's authored-vs-pushed time is unclear, treat it as the ambiguous (reconcile-mode) case rather than assuming addressed.

### Routing table

| | **Repo I own** (solo) | **Repo I don't own** (collaborative) |
|---|---|---|
| **on `main`** | review working tree → document → offer fix | **Queue mode**: triage open PRs → review each → offer to post |
| **my branch / my PR** | review → document → offer fix | **has unaddressed reviewer feedback** (any of: unresolved thread / body-only review / bare comment with no commits pushed since) → comment branch (PR-COMMENTS.md); **else** → self-review → grill-me if uncertain → offer fix (no post) |
| **teammate's PR branch** | n/a | review → document → offer per finding: **fix small low/med issues on the branch**, **post** high-severity / design / intent-changing ones for the author |
| **not mine, no PR** | review → document | review → document |

- **Whatever the route, the checkout must be at the branch head before anything is reviewed.** [REVIEW-CORE.md](REVIEW-CORE.md) Phase 01a is the mandatory check — a stale worktree (an old session's checkout, a force-push or rebase since you last fetched) reviews code the author already replaced and produces a confident, entirely void report. It applies to the comment branch too: reading feedback against a stale tree misclassifies fixed points as unaddressed.
- **Comment branch** ⟺ the branch is mine *and* its open PR carries unaddressed reviewer feedback in **any** shape — an unresolved inline thread, a formal review whose substance is in the body, or a plain conversation comment with no commit pushed since (see step 3's *commits-pushed-after* heuristic). Run PR-COMMENTS.md instead of the self-review core (mutually exclusive). Do not gate this on inline-thread count alone.
- **Offer to fix** ⟺ there's a branch checked out to fix on. On **my own code** (my branch or my owned-repo working tree): hand to `implement` (plain or `implement delegate`). On a **teammate's PR branch** I have checked out: apply only the small, `low`/`medium`, behavior-preserving findings directly, commit as me, and push to the PR's own branch — even though I don't own it; hand the rest back via the post offer.
- **Offer to post** ⟺ the branch has an open PR **not** authored by me: for the findings **not** being fixed directly, a formal review verdict (Approve / Request changes / Comment) carrying one consolidated report body — or a plain comment — proposed and confirmed, never auto-submitted.
- All offers are gated on an explicit yes in the moment — never automatic (global "never send / act on my behalf" rule). See **End of pass**.

Everything except Queue mode and the comment branch is a single-target self-review: continue into [REVIEW-CORE.md](REVIEW-CORE.md) against that target. **Queue mode** wraps the core, running it once per selected PR.

## Phase 00.5 — Explain the PR before reviewing it

**Whenever the review target is a PR — mine or a teammate's, every time, no exceptions — explain what it does before you review it.** Run the [summary](../summary/SKILL.md) skill against the PR's branch, then present the result **in chat**. Do this *before* the findings, so the user reads what the change is and then reads the review of it.

**Assume the reader has never seen this code.** Plain language, no insider terms, no repo shorthand — name the actual thing that changed and the actual behavior that was wrong. "The payout code paid the winner twice when two players went all-in on the same hand; this makes it pay once" beats "fixes double-settlement in the all-in path".

Two things go in the chat explanation:
1. **What the PR changed** — the summary skill's header + change list, in the reader's-never-seen-it language above.
2. **The issue it was fixing** — what was broken before, and what breaks for a person using it. Pull the issue via `gh pr view <n> --json body` and any `Resolves #N` / `Fixes #N` reference (`gh issue view <n> --json title,body`). If the PR links no issue, say what the commits and diff show it was fixing.

**Skip the issue half for a new feature.** A PR that adds something that didn't exist has no bug behind it — say what it adds and move on. Don't invent a fixed issue to fill the slot.

**This is chat-only — it never enters the PR.** It's the user's orientation, not review output: it does not go in the report file, the review verdict body, or any posted comment. What gets posted is only the findings (see End of pass).

**Skipping the summary document.** The summary skill writes a file to `<repo-root>/tmp/claude/summaries/…`. On a teammate's PR that file is usually noise. Default: run the skill for its analysis, present it in chat, and **skip the file write** — say "summary not written to disk" in one clause. Write the file when the user asks for it, or when the PR is mine and I'll want the text for the PR description; then print its absolute path as the last token on its line. If the user says `skip summary` at any point, drop this phase entirely and go straight to the review.

## Dual flavor (`review dual`)

When `dual` is in the arguments, after the review core produces Claude's own findings, get an independent second opinion from the cross-vendor delegate on the **same** diff, then reconcile. (Dual applies to the self-review core, not the comment branch.)

**Always go through the `dispatch` router — never call a vendor binary directly.** Read [../dispatch/SKILL.md](../dispatch/SKILL.md) for the resolver and its transports. **Gate first:** run `dispatch check`; if it fails (no delegate configured, not authenticated, Terminal automation not permitted), say so and **fall back to a plain solo review** — a single-model review is still useful; just tell the user the second opinion was skipped and why.

**Dual is the one flavor whose escalation is automatic.** [../dispatch/TARGETS.md](../dispatch/TARGETS.md) defaults all delegation to an in-session Claude agent; dual is exempt because a second opinion from the same model is not a second opinion. **Cross-vendor is the reason, and it is the only one** — never reach for the router here for anything else, and never substitute an `Agent` call, which would silently make dual a solo review wearing two tags.

**Where the delegate runs is resolved, not chosen** — a live herdr tab inside herdr, else a Terminal.app window. `dispatch exec` prints it; put that line in the status message so the user knows whether there is a tab to switch to.

```bash
D="$HOME/.claude/skills/dispatch/dispatch"
"$D" check || { echo "Delegate unavailable — running solo review only"; }
"$D" transport      # name the surface in the status line before you start it
```

1. Write the review prompt to a temp file — review instructions + the **literal** diff command the core used (`gh pr diff`, the merge-safe diff, or `git diff HEAD`). Let the delegate run that command itself; don't paste a huge diff into the prompt.
2. Run `"$D" exec "$prompt" "/tmp/<slug>-delegate.md"` in the **background** (Bash run_in_background). The harness notifies you when it finishes; then read the file and extract the substance (ignore the vendor's chrome/cost footer).
3. **Reconcile** into one set, deduped by file+line+claim. Tag each finding's **source** with the **name of the model, harness, or vendor that found it** — `[claude]` for Claude's own findings, the **resolved delegate name** for the delegate's, or `[both]` when both flagged it.

   **A source tag NEVER carries the name of a skill, a lens, an axis, or a process.** The tag answers "which reviewer said this," and the only valid answers are things a person could point at and name: a model (`[claude]`, `[codex]`, `[gpt-5]`), a harness or vendor (`[reasonix]`), or `[both]`. **`[review]` is wrong and is the specific mistake this rule exists to stop** — `review` is this skill's own name, it identifies no reviewer, and it has shipped to a real PR that way. Same ban on `[lens]`, `[bug-lens]`, `[self]`, `[internal]`, `[dual]`, and `[delegate]`.

   Get the delegate name at runtime — `dispatch agent` prints the real tool (`codex`, `reasonix`, …) — and use that literal name in the tag (`[codex]`, never `[delegate]`). The skill never *presumes* which tool that is; it learns it from `dispatch agent` after the run. "Both flagged it" is a strong signal; "only the delegate flagged it" is exactly the catch dual exists for — weight it, don't discount it for being single-source.

   **Before posting or writing any source-tagged report, scan the body for a tag that isn't a model/harness/vendor name or `both`.** One found means the tagging is wrong throughout, not in one spot — fix every tag, not the one you noticed.
4. Fold the delegate's findings into the matching axis sections of the report (its architecture findings into Architecture, its bug findings into Bugs, etc.) and carry the source tag through to the file format. Dual is still **read-only** — it reviews, never edits.

```bash
prompt="$(mktemp -t review-dual.XXXXXX)"
cat > "$prompt" <<'PROMPT'
Review the changes produced by this exact diff command: <diff-cmd>
Enforce the project conventions in CLAUDE.md / AGENTS.md / .claude/rules/*.
Report two dimensions separately:
  CODE: correctness, types, nil-safety, concurrency, lifecycle, edge cases, error handling, dead code.
  ARCHITECTURE: fit, abstraction level, pattern consistency, structural scalability, ownership clarity —
    always design calls, never style nits.
Output prioritized findings (Critical / Important / Minor), terse, no praise.
PROMPT
"$D" exec "$prompt" "/tmp/<slug>-delegate.md"      # run this call in the background
```

## Queue mode (collaborative repo, on `main`)

When Phase 00 routes here, review the PR review queue one PR at a time: triage → select → checkout → review → report. Read-only with respect to GitHub except the explicit-yes post offer at the end of each PR.

**Preflight.** Must be a git repo with a GitHub remote and a **clean working tree** (checking out PR branches needs it). If dirty, **stop** and say what's dirty; never stash or discard on the user's behalf. Record the current branch — the workflow returns here at the end.

**Triage.** Find open PRs that involve me and lack my review:
```
gh pr list --search "involves:@me -author:@me -reviewed-by:@me" --state open --json number,title,author,createdAt,additions,deletions,reviewRequests,url,body --limit 30
```
Present a table — one row per PR — with these columns: **#** (as a markdown link to the PR `url`), **what it does** (a one-sentence plain-language description derived from the PR `body` — what the change actually accomplishes, not a restatement of the title; titles often say too little), **author**, **age**, **+/- size**, and review-requested vs merely mentioned. Order: review-requested first, then oldest first. Always print the clickable URL — never make the user go hunting for the link. Empty → "review queue is clear" and stop. (`-reviewed-by:@me` only excludes PRs with a *submitted* review; comment-only participation still shows. Mention the gap only if a result looks off.)

**Select.** Ask in **plain chat text** which PRs to review (any subset, e.g. "all", "1016 and 1018", or a list of numbers) and which flavor (`review` vs `review dual`) to apply to all selected PRs this run. **Do not use the `AskUserQuestion` tool here** — its 5-option cap silently truncates longer queues and an "all" option reads as inconsistent when the visible choices don't cover every PR. Plain text has no such cap and lets the user pick freely.

**Review loop (strictly sequential, one PR at a time):**
1. `gh pr checkout <number>` — on failure, report the error, skip this PR, continue. Never force anything.
2. Read context: `gh pr view <number> --json title,body,comments,reviews` — feeds the Spec axis and avoids re-flagging what other reviewers already raised.
3. **Run Phase 00.5 for this PR** — explain what it changed and the issue it fixed, in chat, before its findings. Per-PR, every PR in the queue; the triage table's one-liner does **not** stand in for it. `skip summary` from the user drops it for the rest of the run.
4. Run the review core (and dual flavor if chosen) against the PR's diff vs its base (usually `origin/main`). Let it finish before the next PR.
5. Run the **fix-and-post offer** for this PR (it's a teammate PR → propose which findings to fix on the branch vs hand back via verdict/comment, explicit yes for each action). Capture report path, what was pushed (commit + branch), and the verdict you posted (or "not posted").

**Complete.** Return to the recorded branch (`git checkout <original-branch>`). Summarize one row per PR — number, title, verdict, blocking-finding count, report path, posted (y/n). Never parallelize checkouts or reviews.

## End of pass — offers & output

After the report is written, **always print**:
- the **PR URL** if one exists (`gh pr view --json url --jq .url`),
- the **report file path** as the last token on its line, no trailing punctuation.

Then run the offer(s) for this routing, per Phase 00 — never automatic. On my own code it's a single fix offer; on a **teammate's PR** it's a combined **fix-then-post** offer where the user decides, per finding, whether to fix it on the branch, post it back to the author, or drop it. The self-review path may also add grill-me first.

**Every offer here is plain chat text — RULE 0 applies hardest at this exact point.** The end-of-pass disposition is where the selector gets reached for most often, and it is banned here like everywhere else. Print one line per finding with its keyword options and let the user type the answer:

```
1. [bug · T1 · high] <one-line finding> — verified `reproduced` — `post` (recommended — blocking, reproduces) · `fix` · `skip`
2. [best-practice · T2 · low] <one-line finding> — `fix` (land it on the branch, then Approve) · `post` · `skip`
3. [slop · T2 · low] <one-line finding> — over the 5-thread posting budget; `fix` · `skip` (no `post`)

Type a disposition per finding, e.g. `1 post, 2 fix, 3 skip` — or `go` to accept every listed `(recommended)` keyword at once.
```

Lead each line with the recommended keyword's rationale in a clause, not a paragraph. Never render this as an option menu.

**`go` is a keyword, not a selector — it does not reopen RULE 0.** RULE 0 bans a *menu* that hides the reasoning behind a click; `go` is typed chat text that means "apply the disposition already printed and reasoned about on every line above," same as `yes` confirms the one action in a single-action offer (an Approve with nothing found, arming auto-merge). It is available whenever **every** line in the list carries a `(recommended)` keyword — if any finding's line has no clear recommendation (two keywords with neither marked, or a genuine "your call" case), that finding is excluded from what `go` covers and must still be typed individually; say so in the same message as the list (`go covers 1–2; 3 has no clear recommendation — type its disposition separately`). `go` never applies to Queue mode's PR-selection step or any other multi-item choice that isn't a findings disposition — those already have their own plain-text answer format and don't carry per-line recommendations to default to.

**Offer grill-me** — only on the self-review path, and only when the report carries uncertain findings (per REVIEW-CORE.md's hand-off rule). Offer a `grill-me` pass that interrogates those findings one question at a time to settle intent. This is an *addition* to the fix offer below, not a replacement — run it first when it applies, then continue to the fix offer.

**Offer to fix and/or post** — when the branch has an open PR **not** authored by me (a teammate's PR, via Queue mode or a direct checkout). You already have the branch checked out, so each finding can go one of three ways, and the user picks per finding:

1. **Fix it on the branch** — apply the change to the checked-out PR branch, commit (as me, plain message, no AI attribution), and push to the PR's own branch (`git push origin <headRefName>`). This lands the fix in the teammate's PR directly, even though I don't own it.
2. **Post it for the author** — leave the code alone and hand the finding back via the formal review verdict / comment, for the author to resolve.
3. **Neither** — drop it; it stays in the report file, nothing goes to GitHub or the branch.

**Default split — fix the small stuff, hand the rest back.** Propose this stance up front, then let the user override per finding:
- **Fix directly (default for these):** `low`- or `medium`-severity findings that are small, contained, and **behavior-preserving** — a missing guard, a one-line bug fix, helper reuse, a typo, dead-code removal, a `fromGame`-style flag correction. They don't change what the author built, so applying them is safe and saves a round-trip.
- **Hand to the author (default for these):** `high`-severity findings, `architecture` / `negative-space` design calls, or **anything that would change or break the PR's intended behavior, feature, or outcome**. Here the author's intent is load-bearing — a direct edit risks overwriting a deliberate choice — so these go back as review comments, not commits. When unsure whether a fix would alter intended behavior, treat it as hand-to-author.

Split on "is this small, safe, and intent-neutral," **not** on the blocking verdict — severity ≠ blocking still holds, so a blocking bug can be a tiny behavior-preserving one-liner that belongs in the fix bucket, while a non-blocking architecture note usually belongs in the hand-back bucket.

**Fixing on the branch — mechanics + gate.** Pushing commits to someone else's PR branch is an outward action on their work, so it's held to the same **explicit-yes-in-this-message** gate as any send, and to the CLAUDE.md push-confirmation rule.
- Preflight: the PR branch must be checked out with a clean working tree. State exactly which findings you'll commit and confirm before touching the branch.
- Apply the selected fixes (hand the finding subset to `implement` / `implement delegate`, or edit directly for one-liners), run the project's checks, then `git push origin <headRefName>` — never to `main`, never `--force`. Pre-flight the no-attribution rule on the commit message.
- Caveat: this needs push access to the PR's head branch. Same-org branches accept the push; a fork from an outside contributor only accepts it if "allow maintainer edits" is on. If the push is rejected, say so and fall that finding back to the post bucket.

**Comment budget — at most FIVE posted threads per PR, per pass.** Everything above the cap stays in the local report file and in chat; it does not go to GitHub. This caps the *posted* set only — the report file is always complete.

Five is the number because of what the extra ones cost. Concise, focused review comments are far more likely to be acted on than long ones, and the failure being corrected here is a tool posting 14 comments carrying 3 real findings — the author then spends the round-trip sorting them instead of fixing the bug. At the ≥0.80 signal-ratio target, five threads permit at most one item the author judges to be noise; a sixth, seventh, and eighth thread do not add coverage, they add a review cycle. If you cannot say the PR's problems in five threads, the PR needs a conversation, not a longer comment list — say that in chat.

**Ranking for the cap**, applied after the Phase 06 filter:

1. **Tier 1 with verdict `reproduced`** — post every one. **The cap does not apply to these and they are never cut, at any count.** If seven reproduced Tier 1 findings survive, all seven post, and you say in chat that blocking findings exceeded the budget. Shipping broken behavior to save a comment slot is not a trade this rule permits.
2. **Tier 1, `not-executable`** — highest score first.
3. **Tier 2** — highest score first, then by file path.

Fill the remaining slots down that order and stop. Tier 3 never enters the list because it never survives Phase 06.

**The posted comment says nothing about what was withheld.** No "3 additional non-blocking items omitted", no counts, no axis summary, no offer to expand. A disclosure line is an invitation to ask for the rest, which reinstates exactly the round-trip the cap removes. **Tell the user instead**, in chat, in one line naming the count, the axes, and the report path: `3 Tier 2 findings held back (contracts, slop) — full list in the report.` They can post any of them by name if they disagree.

**Posting the rest — recommend the verdict, block on broken behavior, not on severity.** For the findings going back to the author (not fixed on the branch), propose one consolidated review verdict. On a PR you didn't author GitHub records that verdict as your review decision (Request changes even gates the merge), so the post offer **always proposes a verdict**, never a bare comment. (Self-authored PRs can't get a verdict — GitHub blocks self-approve/-request-changes — which is why this lives only on the teammate-PR path.) What separates blocking from non-blocking is *what the finding is about*, never how confident or how large it is:

- **Blocking → Request changes** (`gh pr review --request-changes`; gates the merge). Any finding that the diff makes behavior *wrong*: a new bug, or existing behavior this diff breaks (a regression). **New or newly-broken behavior is always blocking** — a `low`-confidence regression still blocks, because the question is "does this ship something broken," not "how sure am I" or "how big is it." This is axis-independent: a `spec/wrong-impl`, a `contracts` violation that breaks a caller, a `negative-space` un-updated caller, or a `standards` correctness breach each block exactly as a `bug` does, because each is broken behavior the diff introduces. If even one such finding survived → Request changes.
- **Non-blocking → Comment** (`gh pr review --comment`; findings on record, no merge gate). Everything where behavior is *correct* but the code could be more elegant, more efficient, better-organized, or better-documented. These are improvements, not breakage — record them, never gate on them. Pure-quality `architecture`, `best-practice`, and most `contracts`/`standards` findings live here. (A pre-existing bug the diff merely sits near, but does not introduce or worsen, is a non-blocking note — blocking is reserved for behavior *this diff* breaks.)
- **Approve** (`gh pr review --approve`) — when nothing survived (and on a draft, no expected-gap entries either), **or once every survivor has been fixed on the branch** (fix-then-approve): after the fix commits land, nothing broken or unaddressed remains, so Approve is the honest verdict.

**Low-severity, non-blocking finding → the fix-on-branch offer is MANDATORY, never dropped.** When the survivors are all `low`-severity, non-blocking quality notes (a lone `best-practice`/`contracts`/`architecture` nit and nothing broken), you **must** present **fix it on the branch, then Approve** as a listed option — and lead with it. Do **not** present "Comment / Approve as-is / Neither" as the *only* choices: an offer set with no fix-on-branch path buries a fixable nit or ships it unaddressed, and is the specific failure this rule exists to stop. The finding is small and the merge isn't gated, so the cleanest outcome is landing the small fix and approving clean.

This holds **even when the *ideal* fix needs the author's intent.** The presence of a design-call element does **not** license collapsing to post-only — it changes *what* you offer to fix, not *whether* you offer. Before falling back, ask: is there a narrower, safe, behavior-preserving version of this fix I could land now (a guard, a comment clarifying the contract, a rename, a doc note) even if the fuller restructure is the author's call? If yes, offer *that* on-branch, then Approve. Only when there is genuinely **no** safe on-branch change at all — the entire finding hinges on a choice you can't make without the author, and there is no partial fix worth landing — may you present a post-only offer, and then you must **say explicitly** "no safe on-branch fix here because …" so the omission is a stated, deliberate decision rather than a silent drop. When in doubt, list the fix-on-branch option and let the user decline it; never decide unilaterally that a low finding is hand-to-author-only.

**Propose, then confirm — never auto-submit.** State the recommended verdict, the exact body that will be posted (the report scoped to the handed-back findings — summary line + axis-grouped findings, minus any you're fixing on the branch, with a one-line note of what was pushed instead), and that the user can pick a different verdict or decline. A verdict review — Request changes especially — is an outward action that changes the PR's merge state, so it is held to the same **explicit-yes-in-this-message** gate as any send (global "never send / act on my behalf" rule). Prior or implied consent does not count.

On an explicit **yes in that message**, submit the confirmed verdict as one consolidated review (`--request-changes`, `--approve`, or `--comment`):
```
gh pr review <number> --request-changes --body "$(cat <<'EOF'
<report body>
EOF
)"
```
If the user wants to weigh in **without** a verdict, post the report as a plain conversation comment instead (`gh pr comment <number> --body …`); if they'd rather post by hand, give them the body to paste. Default to NOT posting anything.

**Offer to fix (my own code)** — when the branch is mine (or my owned-repo working tree). There's nowhere to post my own review; offer a fix pass instead, presenting both flows so the user picks:
- **`implement`** — Claude fixes the findings itself.
- **`implement delegate`** — Claude orchestrates; a cheaper model implements the fixes; Claude validates.

Hand the report path to the chosen flow. Don't start it without a yes.

**Offer to arm auto-merge (my own open PR)** — only on the self-review path when the target is **my own open PR** and the pass came out clean: no blocking/serious finding survived, **or** every finding was just fixed. Gate on the repo actually allowing it:
```
gh api repos/<owner>/<repo> --jq '.allow_auto_merge'
```
`true` → print one plain-text line: `Repo allows auto-merge — arm it so GitHub merges on approval? \`arm\` / \`skip\``. On an explicit `arm` in that message (outward action → same explicit-yes gate as any send), run:
```
gh pr merge <n> --squash --delete-branch --auto
```
`false`, no open PR, or serious findings still open → **say nothing, no offer**. Never touches repo settings; only the per-PR button, only where GitHub already offers it.

**Neither** — a branch that isn't mine with no open PR (nothing to post to, not my code to fix): just the printed report + path. No offer.
