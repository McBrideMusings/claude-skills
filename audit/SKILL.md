---
name: audit
description: "The single entry point for reviewing code. Runs an eight-axis review and routes by context: on a repo you own it just reviews + documents; on a collaborative repo it triages the PR queue (on main), reviews your own branch, or reviews a teammate's PR and offers to post. `audit dual` adds an independent cross-vendor delegate second opinion, reconciled into one report. Triggers: 'audit', 'review this', 'review my changes', 'review my code', 'review prs', 'pr review queue', 'triage my review queue', 'what PRs need my review', 'dual audit', 'audit with codex', 'second-opinion review'."
---

# Audit

Review code changes for bugs, quality issues, CLAUDE.md compliance, **architecture fit**, **spec compliance**, **negative space** (unmet obligations the diff creates), and **best practices** checked against current external docs. Runs parallel sub-agents across eight review axes and reports axis-tagged findings. `audit` is the **single entry point** for review — it routes by context (your working tree, a branch, or a queue of teammate PRs) and decides what to offer at the end (a fix pass, or posting to a PR) from where you invoke it.

## Flavors — solo vs dual

- **`audit`** (default) — Claude reviews on its own.
- **`audit dual`** — Claude reviews, *and* an independent cross-vendor delegate reviews the same diff; the two are reconciled into one source-tagged report. The delegate catches what a same-model self-review misses (concurrency, lifecycle, edge cases) and gives a second architecture read. The token `dual` anywhere in the arguments turns it on. See **Dual flavor** below.

## Phase 00 — Route by context

Audit's workflow is set by two ownership checks. Resolve both first, then pick the workflow; everything else (the review core, dual flavor, offers) hangs off this.

**1. Do I own the repo?**
```
gh repo view --json owner --jq .owner.login
gh api user --jq .login
```
Owner == my login → **owned (solo) repo**: I work alone here and never open PRs, so there is no queue and nothing to post to. Audit reviews + documents, then offers to fix.
Owner != my login (or no GitHub remote) → **collaborative repo**: the PR world applies (queue, posting, teammate reviews).

**2. Is this branch/PR mine?** (collaborative repos only)
```
gh pr view --json author,number,url --jq .author.login
```
PR author == my login → **mine**. No PR → fall back to the branch name: mine if it starts with `pierce` (case-insensitive, `/` or `-` separator); else check commit authorship (`git log -1 --format=%ae` == my git email). Still ambiguous → **ask in plain chat, never guess**.

### Routing table

| | **Repo I own** (solo) | **Repo I don't own** (collaborative) |
|---|---|---|
| **on `main`** | review working tree → document → offer fix | **Queue mode**: triage open PRs → review each → offer to post |
| **my branch / my PR** | review → document → offer fix | review → document → offer fix (no post) |
| **teammate's PR branch** | n/a | review → document → offer to **post** |
| **not mine, no PR** | review → document | review → document |

- **Offer to fix** ⟺ the branch is mine (or it's my owned-repo working tree): hand to `iterate` (plain or `iterate delegate`).
- **Offer to post** ⟺ the branch has an open PR **not** authored by me: a formal review verdict (Approve / Request changes / Comment) carrying one consolidated report body — or a plain comment — proposed and confirmed, never auto-submitted.
- Both offers are gated on an explicit yes in the moment — never automatic (global "never send / act on my behalf" rule). See **End of pass**.

Everything except Queue mode is a single-target review: continue into the review core below against that target. **Queue mode** wraps the core, running it once per selected PR.

## Modes

- **Uncommitted changes** (default when working tree dirty): review unstaged + staged.
- **Branch changes** (default when working tree clean): review the final-state diff of the current branch vs its base (main / master) — i.e. `git diff <merge-base>...HEAD`. This is *what would land if the branch merged right now*, not a commit-by-commit walkthrough.
- **Fixed-point** (when argument passed): review HEAD vs the argument — a commit SHA, branch name, tag, `HEAD~N`, `origin/main`, etc.

**Do not offer the user a menu of narrower scopes** ("last 5 commits", "last 10 commits") just because the diff looks large. The point of a branch review is the merged-in surface area — review it. If the diff is genuinely too large to fit in one pass, *say so* and ask whether to slice by path/subdir, not by commit count. Any such ask is a plain-chat question — never the `AskUserQuestion` tool / structured-question schema.

## Review core (Phases 01–07)

These phases are the review itself — what runs against a single target (your working tree, your branch, or one PR). Queue mode runs them once per PR; the dual flavor extends them with a second reviewer; the offers come after.

### Phase 01 — Determine What to Review

- If invoked with an argument (e.g. `audit HEAD~3`, `audit v1.2.3`, `audit feature-branch`), use it as the fixed point. Diff is `git diff <fixed-point>...HEAD` (three-dot — comparison against merge-base). Commit list: `git log <fixed-point>..HEAD --oneline`.
- Else if there are uncommitted changes (unstaged or staged): review those via `git status` + `git diff`.
- Else if working tree is clean: find the base branch (`main` / `master`), compute `git merge-base HEAD origin/main`, then diff and log against that.
- If no changes anywhere: say so and stop.

### Phase 02 — Find CLAUDE.md Context

Use a Haiku agent to locate the root `CLAUDE.md` and any `CLAUDE.md` files in directories whose files were changed.

### Phase 03 — Find the Spec Source

(For the Spec sub-agent in Phase 04.) Search in order:

- Issue references in the commit messages (`#123`, `Closes #45`, `Fixes #67`) — fetch via `gh issue view <N>`.
- A path passed as a second argument or in the conversation context.
- A PRD / plan / spec file matching the branch name or feature, in: `docs/PRD.md`, `docs/PRD-*.md`, `docs/specs/`, `~/.claude/plans/*<branch-slug>*.md`, `.scratch/`.
- If nothing found, briefly ask the user where the spec is. If they say "no spec", the Spec sub-agent will skip and report "no spec available".

### Phase 03b — Detect Draft-PR Status

Check whether the current branch has an associated PR and whether it is a draft:

```
gh pr view --json isDraft,number,title,url 2>/dev/null
```

- If the command succeeds and `isDraft` is `true`: set `IS_DRAFT=true` and capture the PR number/URL. Draft PRs are explicit "work in progress" signals from the author — missing requirements and outstanding TODOs are **expected** and must not be reported as issues of the same kind as bugs in completed code.
- If the command fails (no PR, no `gh`, not a GitHub remote, etc.) or `isDraft` is `false`: set `IS_DRAFT=false`. Treat the working scope as completed work.
- For the **uncommitted changes** mode, `IS_DRAFT=false` regardless — uncommitted local work doesn't have draft semantics.

Pass `IS_DRAFT` and the PR URL into Phase 04 so the Spec sub-agent can split its output correctly.

### Phase 04 — Launch Parallel Lens Sub-Agents

One message, all sub-agents in parallel. The scored lenses live as separate briefs in [`axes/`](axes/) — **all of them run by default**. For each lens file, launch one **Sonnet** sub-agent whose brief is that file's content **plus** the shared writing-style rules forwarded verbatim (the "Writing style for issue entries" rules, and — when `IS_DRAFT=true` — the "Writing style for entries on draft PRs" rules), plus `IS_DRAFT`, the spec source from Phase 03 (for the Spec lens), and the exact diff scope from Phase 01. The axis files do **not** restate the writing-style rules; the dispatch forwards them so findings arrive at Phase 05 already in the target shape (full-sentence headline naming the specific failure, backtick-quoted identifiers in **Why**, a causation chain, and a concrete **Fix** unless none is obvious without investigation).

Scored lenses — each its own file in `axes/`:

- [`axes/standards.md`](axes/standards.md) — CLAUDE.md compliance
- [`axes/bug.md`](axes/bug.md) — bug scan
- [`axes/history.md`](axes/history.md) — historical context (reads `git blame`)
- [`axes/contracts.md`](axes/contracts.md) — code comments & contracts
- [`axes/architecture.md`](axes/architecture.md) — architecture fit
- [`axes/spec.md`](axes/spec.md) — spec compliance (consumes the Phase 03 spec source + `IS_DRAFT`)
- [`axes/negative-space.md`](axes/negative-space.md) — unmet obligations the diff itself creates
- [`axes/best-practice.md`](axes/best-practice.md) — dependency usage vs current official docs (**gated** — most diffs skip it; emits *flags* verified in Phase 04b, not findings)

Plus one always-on, **non-scored** sub-agent that does not live in `axes/` (it produces narrative, not scored issues, and is never opted out):

- **Summary (Sonnet)** — plain-English description of what the changes do, 3–6 sentences, group related changes, define jargon inline. Produces the "What this changes" section.

### Phase 04b — Verify best-practice flags against live docs

The **best-practice** lens produces *flags*, not findings — it has no doc access. Run this phase only when that lens ran (it's gated) and returned at least one flag; otherwise skip straight to Phase 05. For each flag:

- Load WebSearch / WebFetch via ToolSearch if not already available, then fetch the **current** official docs for the dependency/API in question — prefer the canonical source (the project's own docs site or upstream repo, not a blog).
- A flag survives only if (a) the diff's usage actually deviates from what current docs recommend, **and** (b) the deviation carries a concrete cost (deprecation, security, perf, correctness). **Cite the source URL inline and mark confidence.**
- Drop any flag that is idiom-only, that current docs actually endorse, or that you cannot corroborate against a real source — an unverified flag is not a finding (the "no phantom authority" rule).
- Surviving flags become `best-practice` findings carrying their citation + confidence, and flow into Phase 05 scoring like any other issue.

### Phase 05 — Score Every Issue

For each issue from any of the eight scored lenses (best-practice issues only after surviving Phase 04b), launch a parallel **Haiku** scoring sub-agent. Pass the [FALSE-POSITIVES.md](FALSE-POSITIVES.md) content as the brief — it contains the scoring scale and the criteria for what counts as a false positive.

### Phase 06 — Filter

Keep issues scoring **≥ 75**. Drop the rest.

### Phase 07 — Write the Report

- Filename: `/Users/pierce/.claude-tmp/claude-review-YYYY-MM-DD-HHMMSS.md` using current local time. No `mkdir` needed — `/Users/pierce/.claude-tmp/` is a persistent directory. No pruning needed; files are tiny.
- Write the review using the format below.
- Print the full review body to chat, then follow with a one-line link to the file. **The path must be the last token on its line with no trailing punctuation** (so Ghostty ⌘-click stays clean) — e.g. `Review written to /Users/pierce/.claude-tmp/claude-review-2026-05-05-143022.md`

## Dual flavor (`audit dual`)

When `dual` is in the arguments, after the review core produces Claude's own findings, get an independent second opinion from the cross-vendor delegate on the **same** diff, then reconcile.

**Always go through the `delegate` router — never call a vendor binary directly.** Read [../delegate/SKILL.md](../delegate/SKILL.md) for the resolver and Terminal.app transport. **Gate first:** run `delegate check`; if it fails (no delegate configured, not authenticated, Terminal automation not permitted), say so and **fall back to a plain solo audit** — a single-model review is still useful; just tell the user the second opinion was skipped and why.

```bash
D="$HOME/.claude/skills/delegate/delegate"
"$D" check || { echo "Delegate unavailable — running solo audit only"; }
```

1. Write the review prompt to a temp file — review instructions + the **literal** diff command the core used (`gh pr diff`, the merge-safe diff, or `git diff HEAD`). Let the delegate run that command itself; don't paste a huge diff into the prompt.
2. Run `"$D" exec "$prompt" "/tmp/<slug>-delegate.md"` in the **background** (Bash run_in_background). The harness notifies you when it finishes; then read the file and extract the substance (ignore the vendor's chrome/cost footer).
3. **Reconcile** into one set, deduped by file+line+claim. Tag each finding's **source** with the tool that found it: `audit` for Claude's own, the **resolved delegate name** for the delegate's, or `both` when both flagged it. Get the delegate name at runtime — `delegate agent` prints the real tool (`codex`, `reasonix`, …) — and use that literal name in the tag (`[codex]`, never `[delegate]`). The skill never *presumes* which tool that is; it learns it from `delegate agent` after the run. "Both flagged it" is a strong signal; "only the delegate flagged it" is exactly the catch dual exists for — weight it, don't discount it for being single-source.
4. Fold the delegate's findings into the matching axis sections of the report (its architecture findings into Architecture, its bug findings into Bugs, etc.) and carry the source tag through to the file format below. Dual is still **read-only** — it reviews, never edits.

```bash
prompt="$(mktemp -t audit-dual.XXXXXX)"
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

**Select.** Ask in **plain chat text** which PRs to review (any subset, e.g. "all", "1016 and 1018", or a list of numbers) and which flavor (`audit` vs `audit dual`) to apply to all selected PRs this run. **Do not use the `AskUserQuestion` tool here** — its 5-option cap silently truncates longer queues and an "all" option reads as inconsistent when the visible choices don't cover every PR. Plain text has no such cap and lets the user pick freely.

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

## File format

The report **opens with a single high-level summary sentence** — no `# Audit` H1, no `Reviewed/PR/Spec/Date` metadata block, no separate "what this changes" section. That one sentence *is* the top line: how many issues were found, which ones block (call out the broken-behavior ones by their number) and which are non-blocking quality notes. Everything after it is the issue list, grouped by axis. The filename already carries the date/scope — don't repeat it in the body.

```
Six issues — one blocking spec mismatch (#1) ships a live-but-broken Discord button in prod; the other five (architecture, contracts, best-practice) are non-blocking quality notes worth folding in but break nothing.

## Outstanding work (draft PR)
(only when IS_DRAFT=true and the Spec agent produced `spec/missing-partial` entries — expected gaps, not issues. Draft entry style: Gap, not Why/Fix. No severity, not counted in the Issues total. Omit this whole section when not a draft.)

1. **[spec/missing-partial]** Headline — full sentence, concrete identifiers in backticks.
   - **File:** `path/to/file.ext:LINE` (or `— (not yet implemented)` if the gap is the absence of a file/function)
   - **Spec:** "exact quote of the spec line that asked for it"
   - **Gap:** What's missing or only partly done, as a status note for the author rather than a fix proposal.

## Issues (6 found)

### Spec (1)

1. **[spec/wrong-impl · high]** Full-sentence headline that names the actual failure, the condition under which it bites, and where — concrete identifiers in backticks.
   - **File:** `apps/cloudflare/wrangler.toml:471` (other sites listed in parens)
   - **Spec:** "exact quote of the spec line" (Spec axis only)
   - **Why:** The causation chain — the sequence of operations that goes wrong, the silent-failure mode, the surrounding state that makes it bite, and why the diff makes it worse than before. Real symbols from the code in backticks.
   - **Fix:** Concrete minimal remediation; name the guard / signature change / removed line in backticks; state the post-condition so the reader can sanity-check it against the failure mode.

### Bugs (2)

2. **[bug · medium]** Headline …
   - **File:** `path:LINE`
   - **Why:** …
   - **Fix:** …

3. **[bug · low]** Headline …
   - **File:** `path:LINE`
   - **Why:** …
   - **Fix:** …

### Architecture (2)

4. **[architecture · medium]** Headline naming the layer/abstraction/ownership problem …
   - **File:** `src/api/order_controller.py:48`
   - **Why:** … a layer-fit violation that spreads ownership of "how orders are written" across two modules.
   - **Fix (design call):** Route the write through the existing seam … (architecture/design findings use **Fix (design call):**; a dedicated pass is `improve-codebase-architecture`.)

5. **[architecture · medium]** Headline …
   - **File:** `path:LINE`
   - **Why:** …
   - **Fix (design call):** …

### Contracts (1)

6. **[contracts · low]** Headline …
   - **File:** `path:LINE`
   - **Why:** …
   - **Fix:** …
```

### Layout rules

- **The top line is the summary sentence.** Nothing — no header, no metadata — sits above it.
- **`## Issues (N found)`** — N is the total across all axes. Draft "Outstanding work" gaps are *not* counted in N.
- **Group by axis** under `### <Axis> (count)` headers — `Spec`, `Bugs`, `Standards`, `History`, `Contracts`, `Architecture`, `Negative-space`, `Best-practice`. Show only axes that have entries; never print an empty `(0)` section. Order the sections most-important-first (the axis holding the highest-severity finding leads); within a section, sort high → medium → low, then by file path.
- **Numbering is continuous across sections** — 1…N down the whole report, never restarting at 1 per axis. (Above: Spec is 1, Bugs are 2–3, Architecture are 4–5, Contracts is 6.)
- **Small lists may stay flat.** When N is small (≈≤4) and the findings cluster in one or two axes, a single flat ordered list with no `### Axis` headers is fine. Numbering is 1…N either way.
- **Never include a "Dismissed", "Considered and dismissed", or "Dismissed during reconciliation" section** — in any form. Findings that don't survive scoring are simply absent. The report is the surviving issues and nothing else.

## No issues found
(if all scored below 75; on a draft PR, this means no issues *and* no expected gaps surfaced — emit the summary sentence saying so, then this header.)
```

### Writing style for issue entries

The headline, **Why**, and **Fix** are the three load-bearing fields. Match the depth shown in the example above — these are written for a reader who has not read the diff and needs enough context to act:

- **Headline (after the axis tag).** A full, specific sentence that names the actual failure or violation — not a generic label. State what breaks, under what condition, and where. Quote concrete identifiers (paths, env vars, function names, flags) in backticks. Avoid placeholder phrasings like "Brief description", "Possible issue", "Logic error in handler".
- **File.** `path:LINE` or `path:START-END` for a contiguous range. If multiple non-adjacent lines are involved, list the primary site and mention the others in **Why**. Optional parenthetical qualifier when meaningful (e.g. `(pre-fix)` for a retrospective, `(new code)` for an added block).
- **Why.** Walk the reader through the failure: the sequence of operations that go wrong, the silent-failure mode if any, the surrounding state that makes it bite, and why the diff makes it worse than the prior state. Quote real symbols from the code in backticks (`$LINK`, `mkdir -p`, `2>/dev/null`) rather than describing them abstractly. For spec issues, quote the spec line verbatim. For history issues, name the prior commit/PR and what it established. For contracts issues, quote the comment or signature being violated. Multi-sentence is expected when the causation chain warrants it; don't pad short ones.
- **Fix.** A concrete, minimal remediation a reader could apply. Name the specific guard, signature change, replaced API, or removed line — quote the change in backticks where useful. State the post-condition ("Wrapper then leaves the link alone when USB is gone…") so the reader can sanity-check the proposal against the original failure mode. Omit **Fix** only when no remediation is obvious without further investigation; in that case end **Why** with an explicit "Fix: needs investigation — [what to look at]" rather than a vague hand-wave.

The example above is the target shape, not the upper bound. A genuinely simple issue can be shorter — but never sacrifice the concrete identifiers and the causation chain for brevity.

### Writing style for entries on draft PRs

Draft PRs use a deliberately softer entry shape for `spec/missing-partial` findings — these are **expected gaps in in-progress work**, not problems with shipped code. Use **Gap** in place of **Why** / **Fix**:

- **Tone.** Status note for the author, not an accusation. "Spec asks for X; the diff stops short of Y" rather than "X is broken / Y is wrong".
- **Spec quote is mandatory.** A gap without a spec line attached is just speculation about intent — quote the actual line that asked for the missing behaviour.
- **No Fix field.** The author already knows it's not done; prescribing a fix is noise. If you have a load-bearing implementation hint (e.g. "this depends on the `X` helper that doesn't exist yet"), put it in the Gap text.
- **No severity tag.** `spec/missing-partial` on a draft is reported as-is — the score still filters out spurious gap-claims via the Phase 06 cutoff, but the surfaced entries aren't graded high/medium/low.
- **Bugs in draft code are still bugs.** This softening applies *only* to the missing/partial sub-category of the Spec axis. A null-deref in code that *was* written, even on a draft PR, is a `bug/high` and reported normally. Same for scope creep and wrong implementation on Spec — wrong code is wrong regardless of draft status.

### Axis tags

Every issue is tagged `[<axis>(/<subtype>) · <severity>]` — axis (with an optional `/subtype`) and severity, joined by a middle dot with a space either side: `[bug · medium]`, `[architecture · medium]`, `[spec/wrong-impl · high]`, `[contracts · low]`. Axis values:

- `spec` — from the Spec agent (missing requirement, scope creep, wrong implementation)
- `bug` — from the Bug scan agent
- `standards` — from the CLAUDE.md compliance agent
- `history` — from the Historical context agent
- `contracts` — from the Code comments and contracts agent
- `architecture` — from the Architecture fit agent (layer/boundary violation, wrong abstraction level, pattern inconsistency, structural scalability, ownership ambiguity). Always a design call — surface even at medium confidence; never dismiss as a style nit.
- `negative-space` — from the Negative-space lens (an unmet obligation the diff creates: un-updated caller, unhandled failure path, missing test/validation/observability, unflagged breaking change or migration). Always a design call — surface, never auto-fix; bounded to obligations the diff itself creates. Use **Fix (design call):** framing.
- `best-practice` — from the Best-practices-vs-live-docs lens (diff uses an external dependency against current official-doc guidance, with a concrete cost). Verified against live docs in Phase 04b; the report entry **must carry a source URL + confidence**. Never a style rewrite.

Severity: `low` / `medium` / `high`, derived from the confidence score (75–84 → `low`/`medium`, 85–94 → `medium`/`high`, 95+ → `high`), weighted by impact. No leading emphasis, emoji, or badge — the tag carries it.

**Severity is not blocking.** The `low`/`medium`/`high` tag measures confidence-weighted impact; whether a finding *blocks* is a separate, binary question answered only by the verdict rule above — does the diff ship new or newly-broken behavior. A `low`-severity regression blocks; a `high`-severity "this would be cleaner" does not. Carry the severity tag for the reader, but decide the verdict on the broken-behavior test, never on the severity word.

A change can pass one axis and fail another. Reporting axis-tagged stops one axis from masking the other — e.g. "Standards pass, Spec fail" is a real category of finding.
