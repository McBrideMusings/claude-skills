---
name: review
description: "The single entry point for reviewing code. Runs an eight-axis review and routes by context: on a repo you own it just reviews + documents; on a collaborative repo it triages the PR queue (on main), reviews your own branch, or reviews a teammate's PR and offers to post. On your own open PR it branches: unresolved review comments → work through them point-by-point; none → self-review the branch and offer grill-me on any uncertainty. `review dual` adds an independent cross-vendor delegate second opinion, reconciled into one report. Triggers: 'review', 'review this', 'review my changes', 'review my code', 'review prs', 'pr review queue', 'triage my review queue', 'what PRs need my review', 'dual review', 'review with codex', 'second-opinion review', 'address PR comments', 'address review comments', 'work through PR feedback', 'handle reviewer comments', 'respond to PR review', 'triage PR feedback', 'unresolved PR comments', 'go through PR comments', 'PR review responses'."
---

# Review

Review code changes for bugs, quality issues, CLAUDE.md compliance, **architecture fit**, **spec compliance**, **negative space** (unmet obligations the diff creates), and **best practices** checked against current external docs. `review` is the **single entry point** for review — it routes by context (your working tree, a branch, one PR, or a queue of teammate PRs) and decides what to offer at the end (a fix pass, or posting to a PR) from where you invoke it.

The review engine itself — the eight-axis dispatch, scoring, and report format — lives in [REVIEW-CORE.md](REVIEW-CORE.md). This file is the router: it resolves ownership, picks a branch, then hands off to REVIEW-CORE.md (self-review) or [PR-COMMENTS.md](PR-COMMENTS.md) (address my PR's unresolved comments). Load the branch file only once you've routed to it — that keeps context small.

## Flavors — solo vs dual

- **`review`** (default) — Claude reviews on its own.
- **`review dual`** — Claude reviews, *and* an independent cross-vendor delegate reviews the same diff; the two are reconciled into one source-tagged report. The delegate catches what a same-model self-review misses (concurrency, lifecycle, edge cases) and gives a second architecture read. The token `dual` anywhere in the arguments turns it on. See **Dual flavor** below.

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

**3. My-PR sub-branch — comments or self-review?** When the branch is mine *and* has an open PR, check for unresolved reviewer feedback before reviewing:
```
gh api graphql -F owner=<owner> -F repo=<repo> -F number=<n> -f query='query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){reviewThreads(first:100){nodes{isResolved}}}}}'
```
- **≥1 unresolved thread** → auto-enter the comment branch: run [PR-COMMENTS.md](PR-COMMENTS.md). (Reviewers gave feedback; work through it point-by-point before anything else.)
- **Zero unresolved threads** (or no PR at all) → run the self-review core [REVIEW-CORE.md](REVIEW-CORE.md). After it writes the report, **if the report has uncertain findings** (see REVIEW-CORE.md "Uncertain findings → grill-me hand-off"), offer a `grill-me` pass to resolve them one question at a time. Then the fix offer below.

### Routing table

| | **Repo I own** (solo) | **Repo I don't own** (collaborative) |
|---|---|---|
| **on `main`** | review working tree → document → offer fix | **Queue mode**: triage open PRs → review each → offer to post |
| **my branch / my PR** | review → document → offer fix | **has unresolved review comments** → comment branch (PR-COMMENTS.md); **else** → self-review → grill-me if uncertain → offer fix (no post) |
| **teammate's PR branch** | n/a | review → document → offer to **post** |
| **not mine, no PR** | review → document | review → document |

- **Comment branch** ⟺ the branch is mine *and* its open PR has ≥1 unresolved review thread: run PR-COMMENTS.md instead of the self-review core (mutually exclusive).
- **Offer to fix** ⟺ the branch is mine (or it's my owned-repo working tree): hand to `iterate` (plain or `iterate delegate`).
- **Offer to post** ⟺ the branch has an open PR **not** authored by me: a formal review verdict (Approve / Request changes / Comment) carrying one consolidated report body — or a plain comment — proposed and confirmed, never auto-submitted.
- All offers are gated on an explicit yes in the moment — never automatic (global "never send / act on my behalf" rule). See **End of pass**.

Everything except Queue mode and the comment branch is a single-target self-review: continue into [REVIEW-CORE.md](REVIEW-CORE.md) against that target. **Queue mode** wraps the core, running it once per selected PR.

## Dual flavor (`review dual`)

When `dual` is in the arguments, after the review core produces Claude's own findings, get an independent second opinion from the cross-vendor delegate on the **same** diff, then reconcile. (Dual applies to the self-review core, not the comment branch.)

**Always go through the `delegate` router — never call a vendor binary directly.** Read [../delegate/SKILL.md](../delegate/SKILL.md) for the resolver and Terminal.app transport. **Gate first:** run `delegate check`; if it fails (no delegate configured, not authenticated, Terminal automation not permitted), say so and **fall back to a plain solo review** — a single-model review is still useful; just tell the user the second opinion was skipped and why.

```bash
D="$HOME/.claude/skills/delegate/delegate"
"$D" check || { echo "Delegate unavailable — running solo review only"; }
```

1. Write the review prompt to a temp file — review instructions + the **literal** diff command the core used (`gh pr diff`, the merge-safe diff, or `git diff HEAD`). Let the delegate run that command itself; don't paste a huge diff into the prompt.
2. Run `"$D" exec "$prompt" "/tmp/<slug>-delegate.md"` in the **background** (Bash run_in_background). The harness notifies you when it finishes; then read the file and extract the substance (ignore the vendor's chrome/cost footer).
3. **Reconcile** into one set, deduped by file+line+claim. Tag each finding's **source** with the tool that found it: `review` for Claude's own, the **resolved delegate name** for the delegate's, or `both` when both flagged it. Get the delegate name at runtime — `delegate agent` prints the real tool (`codex`, `reasonix`, …) — and use that literal name in the tag (`[codex]`, never `[delegate]`). The skill never *presumes* which tool that is; it learns it from `delegate agent` after the run. "Both flagged it" is a strong signal; "only the delegate flagged it" is exactly the catch dual exists for — weight it, don't discount it for being single-source.
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
3. Run the review core (and dual flavor if chosen) against the PR's diff vs its base (usually `origin/main`). Let it finish before the next PR.
4. Run the **post offer** for this PR (it's a teammate PR → propose a review verdict or plain comment, explicit yes). Capture report path + the verdict you posted (or "not posted").

**Complete.** Return to the recorded branch (`git checkout <original-branch>`). Summarize one row per PR — number, title, verdict, blocking-finding count, report path, posted (y/n). Never parallelize checkouts or reviews.

## End of pass — offers & output

After the report is written, **always print**:
- the **PR URL** if one exists (`gh pr view --json url --jq .url`),
- the **report file path** as the last token on its line, no trailing punctuation.

Then run **exactly one** offer, per the Phase 00 routing — never both, never automatic:

**Offer grill-me** — only on the self-review path, and only when the report carries uncertain findings (per REVIEW-CORE.md's hand-off rule). Offer a `grill-me` pass that interrogates those findings one question at a time to settle intent. This is an *addition* to the fix offer below, not a replacement — run it first when it applies, then continue to the fix offer.

**Offer to post** — when the branch has an open PR **not** authored by me (a teammate's PR, via Queue mode or a direct checkout). On a PR you didn't author GitHub lets you submit a **formal review verdict**, not just a conversation comment — and it records that verdict as your review decision (Request changes even gates the merge). So the post offer **always proposes a verdict as part of it**, never a bare comment. (Self-authored PRs can't get a verdict — GitHub blocks self-approve/-request-changes — which is why this lives only on the teammate-PR path.)

**Recommend the verdict — block on broken behavior, not on severity.** What separates blocking from non-blocking is *what the finding is about*, never how confident or how large it is:

- **Blocking → Request changes** (`gh pr review --request-changes`; gates the merge). Any finding that the diff makes behavior *wrong*: a new bug, or existing behavior this diff breaks (a regression). **New or newly-broken behavior is always blocking** — a `low`-confidence regression still blocks, because the question is "does this ship something broken," not "how sure am I" or "how big is it." This is axis-independent: a `spec/wrong-impl`, a `contracts` violation that breaks a caller, a `negative-space` un-updated caller, or a `standards` correctness breach each block exactly as a `bug` does, because each is broken behavior the diff introduces. If even one such finding survived → Request changes.
- **Non-blocking → Comment** (`gh pr review --comment`; findings on record, no merge gate). Everything where behavior is *correct* but the code could be more elegant, more efficient, better-organized, or better-documented. These are improvements, not breakage — record them, never gate on them. Pure-quality `architecture`, `best-practice`, and most `contracts`/`standards` findings live here. (A pre-existing bug the diff merely sits near, but does not introduce or worsen, is a non-blocking note — blocking is reserved for behavior *this diff* breaks.)
- **Approve** (`gh pr review --approve`) — only when nothing survived (and on a draft, no expected-gap entries either).

**Propose, then confirm — never auto-submit.** State the recommended verdict, the exact body that will be posted (the report: summary line + axis-grouped findings), and that the user can pick a different verdict or decline. A verdict review — Request changes especially — is an outward action that changes the PR's merge state, so it is held to the same **explicit-yes-in-this-message** gate as any send (global "never send / act on my behalf" rule). Prior or implied consent does not count.

On an explicit **yes in that message**, submit the confirmed verdict as one consolidated review (`--request-changes`, `--approve`, or `--comment`):
```
gh pr review <number> --request-changes --body "$(cat <<'EOF'
<report body>
EOF
)"
```
If the user wants to weigh in **without** a verdict, post the report as a plain conversation comment instead (`gh pr comment <number> --body …`); if they'd rather post by hand, give them the body to paste. Default to NOT posting anything.

**Offer to fix** — when the branch is mine (or my owned-repo working tree). There's nowhere to post my own review; offer a fix pass instead, presenting both flows so the user picks:
- **`iterate`** — Claude fixes the findings itself.
- **`iterate delegate`** — Claude orchestrates; a cheaper model implements the fixes; Claude validates.

Hand the report path to the chosen flow. Don't start it without a yes.

**Neither** — a branch that isn't mine with no open PR (nothing to post to, not my code to fix): just the printed report + path. No offer.
