---
name: wrap-up
description: "Close out the current session: assess changes, update tracking, update docs, run review + simplify, commit, push, resolve follow-ups (fix now / file / skip), summarize, and land the branch — merge on an owned repo, PR on a collaborative one. Also invoked by implement as its final phase."
---

Work through each phase below. Skip any phase that doesn't apply to this project — never create files, tracking systems, or documentation that doesn't already exist.

---

## ⛔ RUN TO COMPLETION — wrap-up is not done until the work is committed, pushed, AND landed

The entire reason wrap-up exists is **Phase 5: commit and push.** Phases 1–4 are preparation; Phase 6 resolves follow-ups (which may add commits), summarizes, and lands the branch. If you stop before Phase 5, you have left the user's work uncommitted — the exact failure wrap-up is meant to prevent. This is the #1 way wrap-up fails, so treat it as non-negotiable:

- **A quality check that finds nothing is a GREEN LIGHT to commit, not a stopping point.** Phase 4 returning `(none)` means proceed *immediately* to Phase 5. A clean review is the single most common false finish line — do not fall for it.
- **Do NOT emit a recap, summary, or "here's what I did" message and end your turn before Phase 5 has committed and pushed.** A terminal-looking output from a sub-skill (a code review, a passing test run) is not the end of the pass.
- **Phases run in order to the end.** The only legal early exit is a genuine blocker that needs the user (a 75+ review issue you cannot auto-fix, a failed push, a merge conflict) — surface it explicitly and stop. "The review was clean" is the opposite of a blocker.
- **Done means:** `git status` is clean, the branch is pushed (including any follow-up fixed during Phase 6), Phase 6 has run, and the branch has **landed** — merged into the default branch with the workspace back on a clean default branch on a repo you own, or a PR opened on a collaborative one. Leaving committed work stranded on an unmerged feature branch on an owned repo is NOT done. Until all are true, you are mid-wrap-up — keep going.

When invoked by `implement`, this is doubly true: stopping mid-wrap-up strands the whole autonomous pass with uncommitted work.

---

## Pass mode — default to interactive; go autonomous only on a proven `continuous` token

Wrap-up runs in one of two postures, and getting this wrong either stalls an unattended run (interactive prompt inside a loop) or — far worse — **acts autonomously when a human should have been in the loop** (files/skips follow-ups, or lands a branch, without the review the user wanted). The safe default makes that second direction impossible:

> **Assume INTERACTIVE (standalone) unless you can point to an explicit `continuous` token in this invocation's arguments.** Autonomy is opt-in and must be *proven*, never inferred — if the token isn't unambiguously present, you are in an interactive pass, and every step that could act on the user's behalf **halts for their disposition**. Ambiguity resolves to "ask the human," always.

- **Interactive pass** (default; a manual `/wrap-up`, or a **standalone** `/implement`): the Phase 6 follow-up step **halts** so the user reviews what the session uncovered and chooses fix-now / file / skip per item.
- **Continuous pass** (only when the `continuous` token is present, injected by `/iterate`): the follow-up step files **autonomously** with no prompt, so the loop never stalls.

This gate governs Phase 6 Step A (follow-ups) below. Resolve the posture once, here.

---

## When to Use

- The user invokes `/wrap-up` or asks to "wrap up", "close out the session", "finalize this work"
- A coherent session of work is complete and ready to be committed, tracked, and summarized
- The working tree is in a state intended to be committed (not mid-debug, not exploratory scratch)
- Invoked by `implement` as its final phase

## When NOT to Use

- Mid-feature with broken tests or known regressions — finish or revert first
- The user is mid-debug and the dirty tree is intentional scratch
- The branch isn't ready and the user is just pausing — use `handoff` instead
- Work spans multiple unrelated topics that should commit separately — split first, then wrap up each

Invoking this skill grants explicit authority to auto-commit and auto-push. The global "never commit without asking" rule is satisfied by the act of invocation.

---

## ⛔ BASH COMMAND RULES

When invoked by `implement`, wrap-up runs unattended and a single permission prompt kills the autonomous run. Same hard bans as `implement` — never use `@{u}`/`@{upstream}`/`{…}` refspecs (use `origin/main` or `origin/$(git branch --show-current)`), never chain non-allowlisted sub-commands with `&&`/`;`, never `$(...)` a non-allowlisted inner command, no `#` comments or newlines inside a Bash call, never `cd … && git` (use `git -C <abs-path> …`), and never `cat <file> || echo` existence-checks (use the Read tool). See `implement`'s BASH COMMAND RULES for the full list — they apply here verbatim.

---

## Phase 1: Assess what was done

Summarize the work completed this session by reviewing:
- Recent conversation history
- `git diff` and `git status` for uncommitted changes
- Recent commits on the current branch (`git log --oneline -20`)

**Multiple repos:** If the session touched more than one repository, run a full wrap-up for each — separate commits, tracking updates, and follow-up lists per repo. Do not bundle cross-repo follow-ups.

---

## Phase 2: Update tracking

Check for and update ANY of these tracking mechanisms that exist. Do not create any that don't exist. Capture which issues closed this pass for the Phase 6 summary.

**Ownership check — do this first (reused again in Phase 6 landing).** `gh repo view --json owner --jq .owner.login` vs `gh api user --jq .login`. Owner == my login (or no GitHub remote) → **owned (solo)**; else → **collaborative**.

### GitHub Issues and Milestones

**Always — owned and collaborative alike:**
- Run `gh issue list --state open` and review each open issue against the session's work. Look for **two** cases, not one:
  - **Completed** — session work fulfilled the issue's intent.
  - **Reversed or obsoleted** — session work went the opposite direction, abandoned the intent, or made the issue moot. Example: an issue "Rename remaining init-* commands to audit-*" is obsoleted when the session instead renames the audit-* commands away from that prefix — the issue is now backwards.
- Build a list of matches. Surface them in the Phase 6 session summary regardless of owned/collaborative — the user wants to see "this session resolved issues #12, #34" either way.
- **Milestones** — `gh` has no `milestone` subcommand. Use the API to list:
  - `gh api repos/{owner}/{repo}/milestones --jq '.[] | "\(.number) \(.title) \(.open_issues)/\(.open_issues + .closed_issues)"'`

**Owned (solo) repos only — actually close:**
- Close issues with `gh issue close NUMBER --comment "reason"` (use a summary of what shipped for completed; name the reversal for obsoleted).
- Close milestones (when 0 open issues remain): `gh api repos/{owner}/{repo}/milestones/NUMBER -X PATCH -f state=closed`
- **Always** check milestones after closing issues — if a milestone has 0 open issues, close it immediately.
- Under `implement`'s overrides this is automatic (no confirmation).

**Collaborative repos — report only, never close:**
- Do NOT call `gh issue close` or the milestone close API — issue lifecycle there belongs to someone else (a PM or the repo owner triages).
- Do NOT post a comment on issues unless the user explicitly asks ("comment on #123 that this is done").
- In the session summary, list matches as **"Issues resolved by this session (not closed — owned by `<owner>`): #12, #34"** so the user can hand them off.

### Followups file
- The followups file lives at `<repo-root>/tmp/claude/followups.md`. Get `<repo-root>` via `git rev-parse --show-toplevel` as a **separate Bash call** — never nest `$(...)` (triggers a permission prompt). Use the Read tool to check if the file exists; do NOT use `cat ... || echo ...` (compound triggers a permission prompt).
- If the file exists, scan items in prior dated sections for any that this session's work **completed, reversed, or obsoleted** (same two cases as GitHub issues above).
- For each match, propose moving the item to a `## Resolved` section at the bottom of the file (the followups file is append-only — items get sectioned, never deleted). Show the user the proposed moves and ask before applying.
- If the file doesn't exist, skip silently.

### Roadmap / TODO documents
- Check for roadmap or TODO files: `ROADMAP.md`, `TODO.md`, `docs/roadmap.md`, or similar
- If found: mark completed items, update status, add notes on what was accomplished

### CLAUDE.md task tracking
- If CLAUDE.md contains a roadmap, milestone list, or task tracking section: update it to reflect completed work

### In-repo issue tracking
- Check for `.github/`, `docs/issues/`, or any other in-repo tracking
- Update as appropriate

---

## Phase 3: Update docs

Apply mechanical doc updates (file-map.md, CLAUDE.md doc-table additions) automatically. For substantive doc updates that would normally prompt for diff confirmation under `implement`, do NOT prompt — append them as Phase 6 follow-up items instead.

---

## Phase 4: Quality checks

Run a **self PR-review** — the review skill's core ([../review/REVIEW-CORE.md](../review/REVIEW-CORE.md)) over the session diff — plus code-simplifier (in parallel where possible). This is the same eight-axis engine `review` runs on a teammate's PR, turned on our own work: architecture-fit is one of its axes, so it no longer needs a separate check.

1. Run REVIEW-CORE.md against the session diff (uncommitted or branch-vs-base, per its Modes). If code-simplifier isn't a registered subagent type, invoke the equivalent skill inline via the Skill tool and continue.
2. Wait for both to complete.
3. Apply simplifications from code-simplifier.
4. Fix any issues scored 75+ from the review core before committing.
5. **Architecture findings are surfaced, never auto-fixed** — they're design calls, and wrap-up often runs unattended. Collect them (the review core's `architecture` and `negative-space` axes) and carry each into Phase 6 as a follow-up titled `Architecture: <finding>`. The only exception: a finding that is *also* a 75+ correctness bug is fixed under step 4.
6. If all found nothing actionable, proceed to Phase 5.

**⛔ Do not stop here.** A clean review is a green light to Phase 5, NOT a place to end your turn. Architecture findings being open is not a blocker — they become follow-ups in Phase 6.

---

## Phase 5: Commit and push

1. Stage and commit all remaining changes (docs, tracking, quality fixes, straggling code).
   - Use the project's commit conventions (check CLAUDE.md).
   - If none exist: one short sentence describing what changed.
   - Do NOT use conventional-commit prefixes (`feat:`, `fix:`, etc.) — global rule.
2. Confirm `git status` is clean.
3. Push: `git push origin $(git branch --show-current)`. First push on a new branch: `git push -u origin $(git branch --show-current)` (match the branch's own name — never `main`).
4. Do NOT land here — the merge/PR is Phase 6 Step C, after follow-ups and the summary settle. Leave the branch pushed.

---

## Phase 6: Follow-ups → summary → land

Three steps, strictly in order. The follow-up step can create new changes, so it must fully settle before the summary can honestly describe the branch's final state, and before the branch lands.

Open with a brief recap: what was accomplished, and what tracking/docs were updated.

### Step A — Resolve follow-ups (must fully settle before summarizing)

Invoke the `followups` skill in Generate mode to surface candidates from this session — **including Phase 4 architecture findings** (one item each, titled `Architecture: <finding>`, with file and one-line tradeoff). Every candidate ends in one of three dispositions: **fix now**, **file**, or **skip**.

**Posture (from the Pass-mode gate above — prove `continuous` or you are interactive):**

- **Interactive pass — HALT here and collect dispositions from the user.** This is the default and the safe direction. Do not file, do not skip, do not proceed until the user has chosen per item. If you are not certain the pass is continuous, you are here.
- **Continuous pass (proven token only) — file autonomously, no halt.** Items that don't clearly clear the bar are skipped silently and resurface next session.

**Presentation — interactive passes (required):**

> **HARD RULE — never use `AskUserQuestion` / a chip-picker / a multi-select for follow-up dispositions.** Present all candidates together as plain markdown; the user answers all of them in one free-text reply. The widget forces one-item-at-a-time stepping, caps how many items you can show, and can't express a per-item three-way choice in one answer.

*Present pass* — one message, every candidate as a single numbered markdown list in a stable order. For each: title, one-line finding, and the exact slice of diff/code/PR it refers to as a `> file:line` block-quote so the user sees precisely what it is.

*Ask pass* — one plain-text question under the list:

> For each, tell me what to do — **fix now / file / skip**. Reply free-text by number, e.g. `fix 2, file 1 3, skip 4` (or "file all", "skip rest"). Anything you don't mention I'll **skip**.

Parse the reply into per-item dispositions; **unmentioned items default to skip.** Re-ask only if genuinely unparseable — never fall back to a widget. Record every choice before acting.

*Act pass* — only after every disposition is recorded, execute by group:
1. **Fix now** — apply and verify each, then **commit and push**, so everything the user chose to fix is in the repo before the rest proceeds. Quality check proportional to each change.
2. **File** — batch-file issues (`gh issue create`, or `followups.md` appends on a non-GitHub repo); capture new numbers/URLs for Step B.
3. **Skip** — drop.

**⛔ Do not proceed to Step B until every candidate is fixed-and-committed, filed, or skipped, and `git status` is clean.**

### Step B — Summarize

Invoke the `summary` skill to generate the unified summary of the branch's changes and session work. Because Step A settled first, this folds in both any just-applied fixes and the new issues spawned this session.

### Step C — Land the branch (merge on owned, PR on collaborative)

Reuse the Phase 2 ownership verdict.

**Repo I own (solo) — merge it, then leave the workspace clean.** Invoking wrap-up (or implement) authorizes the merge, exactly as it authorizes commit and push — the merge runs in **both** interactive and continuous passes (a solo merge needs no human input). If the current branch already *is* the default branch, skip (nothing to merge). Otherwise, with a remote:
1. Pre-check: `git status` clean and Phase 4 clean-or-fixed. **Never merge known-failing work** — an unresolved 75+ issue is the blocker; stop instead.
2. Capture the feature branch and the default branch (usually `main`).
3. Bring default current: `git -C <repo> checkout main`, `git -C <repo> pull --ff-only origin main`.
4. Merge: `git -C <repo> merge --no-ff <feature> -m "Merge <feature>"` (`--no-ff` keeps the feature as one revertable unit; plain message, no AI attribution).
5. **On conflict:** `git -C <repo> merge --abort`, `git -C <repo> checkout <feature>`, and STOP — surface it. A merge conflict is a genuine blocker; never force or silently hand-resolve.
6. Push: `git -C <repo> push origin main`.
7. Delete the merged branch: local `git -C <repo> branch -d <feature>` (`-d`, not `-D` — refuses if not fully merged) and remote `git -C <repo> push origin --delete <feature>`.
8. End state: on `main`, `git status` clean, feature branch gone. Report the merge in the summary.

No remote? Do the local `checkout main` + `merge --no-ff` + `branch -d` and skip the pull/push.

**Repo I don't own (collaborative) — never merge; open or update a PR.** Merging is the reviewer's call. Never call `gh issue close` here — for any Phase 2 **Completed** match, add a `Closes #<n>` line per issue to the PR body so GitHub closes it automatically when the PR merges. (Reversed/obsoleted matches aren't auto-closeable this way — those stay report-only per Phase 2, left for the reviewer.)
- **Interactive pass** → **offer** the PR (only on an explicit yes in the current message — global "never publish on my behalf" rule). Propose reviewers and labels as pre-checked options in the same confirmation round; use only labels that already exist (`gh label list`), never create labels. On yes, create the PR (`gh pr create --title … --assignee @me --reviewer … --label … --body …`, body including the `Closes #<n>` lines). If a PR already exists, offer to post the summary as a comment (`gh pr comment <n> --body …`) rather than overwriting the description. On a no, hand the user the summary to paste.
- **Continuous pass authorized by `/iterate`** → **create the PR autonomously.** Starting an `/iterate` on a collaborative repo is the standing authorization to open a PR per landed item (this is the one place a continuous pass publishes — and only because the loop's entry point authorized it). Same `gh pr create` call, reviewers/labels drawn from repo defaults and the summary; if a PR already exists, post the summary as a comment instead. Report the PR URL in the summary.

  > ⚠️ This is the only autonomous-publish path in wrap-up, and it exists solely to satisfy `/iterate`'s "PR on collaborative repos" contract. A raw `/loop /implement continuous` that did **not** come through `/iterate` does NOT get this — it leaves the branch pushed for a later interactive wrap-up. If you can't confirm the loop authorized publishing, treat the pass as interactive and offer rather than create.
