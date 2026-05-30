---
name: audit
description: Review uncommitted changes or branch changes against base branch (or an arbitrary fixed point). Two-axis review across Standards (bugs, CLAUDE.md compliance, history, contracts) and Spec (does the code do what the originating issue/PRD asked for?).
---

# Audit

Review code changes for bugs, quality issues, CLAUDE.md compliance, and **spec compliance**. Runs five parallel sub-agents and reports axis-tagged findings.

## Modes

- **Uncommitted changes** (default when working tree dirty): review unstaged + staged.
- **Branch changes** (default when working tree clean): review the final-state diff of the current branch vs its base (main / master) — i.e. `git diff <merge-base>...HEAD`. This is *what would land if the branch merged right now*, not a commit-by-commit walkthrough.
- **Fixed-point** (when argument passed): review HEAD vs the argument — a commit SHA, branch name, tag, `HEAD~N`, `origin/main`, etc.

**Do not offer the user a menu of narrower scopes** ("last 5 commits", "last 10 commits") just because the diff looks large. The point of a branch review is the merged-in surface area — review it. If the diff is genuinely too large to fit in one pass, *say so* and ask whether to slice by path/subdir, not by commit count. Any such ask is a plain-chat question — never the `AskUserQuestion` tool / structured-question schema.

## Phases

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

### Phase 04 — Launch Parallel Sub-Agents

One message, all sub-agents in parallel. **Every sub-agent that emits issues must follow the "Writing style for issue entries" rules below** — full-sentence headline naming the specific failure, backtick-quoted code/path identifiers in **Why**, a causation chain (not a one-liner restatement of the headline), and a concrete **Fix** unless none is obvious without further investigation. Briefs in the Bug / Standards / History / Contracts / Spec agents must each forward these rules verbatim so findings arrive at Phase 05 already in the target shape.

- **Summary (Sonnet)** — plain-English description of what the changes do, 3–6 sentences, group related changes, define jargon inline. Produces the "What this changes" section.

- **Standards / CLAUDE.md compliance (Sonnet)** — audit changes against the located CLAUDE.md files. Only flag violations of specific, stated rules. **Skip anything tooling enforces** (ESLint / Prettier / tsc / Biome — your linter already catches it).

- **Standards / Bug scan (Sonnet)** — read the diff for logic errors, off-by-ones, null/nil issues, race conditions, resource leaks. Ignore style and nitpicks. Distinguish hard bugs from judgement calls.

- **Standards / Historical context (Sonnet)** — read `git blame` and recent history of modified files. Flag changes that contradict established patterns or revert previous fixes.

- **Standards / Code comments and contracts (Sonnet)** — read code comments in modified files. Flag changes that violate documented contracts, TODOs that should be addressed, or stale comments left in.

- **Spec compliance (Sonnet)** — read the spec located in Phase 03, then read the diff. Report findings in three sub-categories, quoting the spec line for each, and tag each finding with its sub-category so Phase 07 can route them:
  1. **Missing or partial** (`spec/missing-partial`) — requirements the spec asked for that aren't implemented or are only partly done. Also surface explicit `TODO` / `FIXME` / `XXX` markers left in the diff that point at unfinished spec work.
  2. **Scope creep** (`spec/scope-creep`) — behaviour in the diff that wasn't asked for.
  3. **Wrong implementation** (`spec/wrong-impl`) — requirements that look implemented but the implementation is wrong (wrong return type, missed edge case, opposite default, etc.).

  **Draft PR handling.** If `IS_DRAFT=true`, prefix the "Missing or partial" section header with `(draft PR — expected gaps)` and write those entries with **Gap** instead of **Why** / **Fix** (see "Writing style for entries on draft PRs" below). `scope-creep` and `wrong-impl` are still issues even on a draft — wrong code is wrong regardless of completeness, and unrequested behaviour is worth flagging before the author marks the PR ready.

  If no spec was found / user opted out, output: `No spec available — skipped.` and exit. Don't manufacture spec content.

### Phase 05 — Score Every Issue

For each issue from any of the five review agents, launch a parallel **Haiku** scoring sub-agent. Pass the [FALSE-POSITIVES.md](FALSE-POSITIVES.md) content as the brief — it contains the scoring scale and the criteria for what counts as a false positive.

### Phase 06 — Filter

Keep issues scoring **≥ 75**. Drop the rest.

### Phase 07 — Write the Report

- Filename: `/Users/pierce/.claude-tmp/claude-review-YYYY-MM-DD-HHMMSS.md` using current local time. No `mkdir` needed — `/Users/pierce/.claude-tmp/` is a persistent directory. No pruning needed; files are tiny.
- Write the review using the format below.
- Print the full review body to chat, then follow with a one-line link to the file. **The path must be the last token on its line with no trailing punctuation** (so Ghostty ⌘-click stays clean) — e.g. `Review written to /Users/pierce/.claude-tmp/claude-review-2026-05-05-143022.md`

## File format

```
# Audit

Reviewed: [uncommitted changes | N commits on branch-name vs main | HEAD vs <fixed-point>]
PR: [#123 (draft) https://github.com/org/repo/pull/123  — only when a PR exists]
Spec: [path/URL to spec, or "none — Spec axis skipped"]
Date: YYYY-MM-DD HH:MM:SS

## What this changes

Plain-English description of what the change does and why. 3–6 sentences. Written for someone unfamiliar with this part of the codebase. Group related areas together. Define technical terms inline.

## Outstanding work (draft PR)
(only emitted when IS_DRAFT=true and the Spec agent produced `spec/missing-partial` entries; lists expected gaps rather than issues. Use the "draft PR" entry style — Gap, not Why/Fix. No severity tag, no score-based filtering.)

1. **[spec/missing-partial]** Headline — same writing rules as issue headlines: full sentence, concrete identifiers in backticks.
   - **File:** `path/to/file.ext:LINE` (or `— (not yet implemented)` if the gap is the absence of a file/function)
   - **Spec:** "exact quote of the spec line that asked for it"
   - **Gap:** What's missing or only partly done, written as a status note for the author rather than a fix proposal. One or two sentences.

## Issues (N found)

(Flat ordered list when N is roughly ≤4; once findings start to feel hard to scan — usually around N ≥ 5 — group by axis as below. Judge per review: a tight cluster of 5 closely-related bug findings is fine flat; 5 findings spanning four different axes is easier to read grouped. Within each grouped section, sort high → medium → low severity. Section counts in the headers.)

### Bugs (4)
1. **[bug/high]** Wrapper created a dangling `/root/.claude.json` symlink if USB was unmounted or the plugin's `CONFIG_DIR` was missing.
   - **File:** `source/usr/local/bin/claude:33-34`
   - **Why:** `mkdir -p`, `touch`, and `ln -s` were all silenced with `2>/dev/null` and unchecked. If `/boot/config/plugins/claude-code/claude-config/` did not exist (USB transiently unmounted, plugin removed mid-session), `touch` would fail and `ln -s` would still create the symlink pointing at a missing file. The previous step had already deleted any real file at `$LINK`, so the user's config was silently gone with no error message — and the next claude invocation would crash on the broken link.
   - **Fix:** Add an early `[ -d "$CONFIG_DIR" ] || return 0` guard, plus a post-`touch` `[ -f "$USB_TARGET" ] || return 0` check before the `ln -s`. Wrapper then leaves the link alone when USB is gone and lets claude surface its own error.
2. ...

### Spec (2)
(On a draft PR, this section contains only `spec/scope-creep` and `spec/wrong-impl` — `spec/missing-partial` lives under "Outstanding work" above.)
1. **[spec/wrong-impl]** ...

### Standards (1)
1. ...

### History (1)
1. ...

### Contracts (1)
1. ...

## No issues found
(if all scored below 75; on a draft PR, this means no issues *and* no expected gaps surfaced)
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

### Grouping when the issue list is long

When the issue list grows past roughly 5 entries — and especially when those entries span multiple axes — replace the flat ordered list with one ordered list per axis under an H3 header (`### Bugs (N)`, `### Spec (N)`, etc.). Show only axes that have entries; omit empty sections rather than printing "### History (0)". Within each section, order by severity (`high` → `medium` → `low`), then by file path as a tiebreaker. The threshold is soft: 5 closely-related bug findings can stay flat if grouping would produce one section with everything in it; 5 findings across four axes should always be grouped. Judge per review — readability is the goal, not the count.

### Axis tags

Every issue is tagged `[<axis>/<severity>]`. Axis values:

- `spec` — from the Spec agent (missing requirement, scope creep, wrong implementation)
- `bug` — from the Bug scan agent
- `standards` — from the CLAUDE.md compliance agent
- `history` — from the Historical context agent
- `contracts` — from the Code comments and contracts agent

Severity: `low` / `medium` / `high` derived from the confidence score (75–84 medium, 85–94 high, 95+ high with leading emphasis).

A change can pass one axis and fail another. Reporting axis-tagged stops one axis from masking the other — e.g. "Standards pass, Spec fail" is a real category of finding.
