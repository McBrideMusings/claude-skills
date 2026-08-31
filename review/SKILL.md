---
name: review
description: "Perform a code review. Routes by what you're standing in — uncommitted changes review the working tree, a feature branch reviews itself against its base, an explicit branch/PR/path argument overrides both, and the repo's default branch sweeps every PR waiting on your review. Runs the ten-axis engine (with gated security lens), scores, verifies each behavior claim by executing it, presents the report in chat, then offers per finding to fix it on the branch or post it back to the author. A branch that is blocked — conflicts, red CI, or unanswered reviewer feedback — is handed to `unblock` first, which fixes it and hands back; review never stops to ask permission to unblock. `review dual` adds a cross-vendor second opinion; `review repo` reviews the whole codebase (always confirms first); `review workflow` runs the lens fan-out and scoring in a workflow so only surviving findings reach this context; `noverify` skips the execution gate. Never uses AskUserQuestion — every choice is plain chat text answered by a typed keyword."
---

# Review

Review code changes for bugs, **security vulnerabilities**, quality issues, CLAUDE.md compliance, **architecture fit**, **spec compliance**, **negative space** (unmet obligations the diff creates), and **best practices** checked against current external docs.

**This skill performs a review.** Getting a branch *ready* to be reviewed — resolving conflicts, fixing red checks, answering feedback nobody has answered — is [unblock](../unblock/SKILL.md)'s job. Review calls it and continues.

| file | what it owns |
| --- | --- |
| [RULES.md](RULES.md) | RULE 0 (no selector), RULE 1 (effort never decides), RULE 2 (a gate does its job). **Load first.** |
| [REVIEW-CORE.md](REVIEW-CORE.md) | the ten-axis dispatch, scoring, verification, report format |
| [axes/](axes/) | one file per axis — `architecture`, `best-practice`, `bug`, `contracts`, `history`, `negative-space`, `security`, `slop`, `spec`, `standards`. REVIEW-CORE dispatches to them; a lens agent gets exactly one. |
| [POSTING.md](POSTING.md) | end-of-pass dispositions, the comment budget, the verdict |
| [FALSE-POSITIVES.md](FALSE-POSITIVES.md) | what not to flag |
| [TRANSPORT-WORKFLOW.md](TRANSPORT-WORKFLOW.md) | the `workflow` transport's mechanics |
| [../unblock/SWEEP.md](../unblock/SWEEP.md) | fan-out when invoked on the default branch |

Load a file only once you've routed to it — that keeps context small.

## Flavors, transport, gates

- **`review`** (default) — Claude reviews on its own.
- **`review dual`** — Claude reviews, *and* an independent cross-vendor delegate reviews the same diff; the two are reconciled into one source-tagged report. See **Dual flavor** below.
- **`workflow`** — moves Phases 04–06c only (lens fan-out, best-practice verification, scoring, the reproduction gate, the ≥75 filter, fix authoring) into a workflow script, so only surviving findings enter this context. Routing, the report, and every question stay in the session. Mechanics: [TRANSPORT-WORKFLOW.md](TRANSPORT-WORKFLOW.md). RULE 0 holds under both transports.
- **`noverify`** — turns off Phase 05b, which feeds each behavior-claiming finding's stated input to the running code in a throwaway git worktree and keeps only what reproduces. The gate is **on by default**, costs ≤8 minutes, and never touches the working tree. Use `noverify` when the toolchain is unavailable, and expect a noisier report. There is no permanent off switch, because "the model read it and was confident" is the thing it exists to distrust.
- **`repo`** — reviews the **whole codebase on the current branch** instead of a diff. Every axis runs, gating off; context-heavy; always confirms before starting. Combinable with dual. Mechanics: [REVIEW-CORE.md](REVIEW-CORE.md) Phase 01r.

## Phase 00 — Route by context

**An explicit argument wins over everything below.** `review <branch>`, `review <PR#>`, `review <path>`, `review repo` — take it and skip the rest of this phase.

With no argument, four contexts, resolved in this order. Every one is decidable from the commands below; **none of them is a question to the user.**

```
git status --porcelain
git branch --show-current
gh repo view --json defaultBranchRef,owner --jq '[.defaultBranchRef.name,.owner.login]'
gh api user --jq .login
gh pr view --json number,url,state,author,mergeable
```

| # | condition | target |
| --- | --- | --- |
| 1 | working tree is dirty | **the uncommitted changes** — `git diff HEAD` |
| 2 | on a non-default branch, clean tree | **the branch** — `<base>...HEAD` |
| 3 | on the default branch, collaborative repo | **sweep** — every PR waiting on my review, [../unblock/SWEEP.md](../unblock/SWEEP.md) |
| 4 | on the default branch, owned repo, clean tree | nothing to diff → offer `review repo` |

**Uncommitted changes win over the branch, and that is deliberate.** If you have edits in the tree, those are what you are asking about; the committed branch is already behind you. Say in one clause which you took: *"reviewing 3 uncommitted files; the branch's 8 commits are not in this pass."*

### Ownership — needed for the offers, not the routing

**Do I own the repo?** `owner.login == my login` → **owned repo**: I work alone here and never open PRs, so there is nothing to post to. Otherwise → **collaborative repo**.

**Is this PR mine?** **When a PR exists, `author.login` decides it and nothing else does.** Being the assignee does not make it mine; neither does having pushed commits to the branch, nor a branch name, nor `git log` authorship. Those are all *normal* on a PR I'm reviewing or helping on, so treating any of them as an ownership signal manufactures ambiguity out of the ordinary case.

**Never ask the user whose PR it is.** `gh pr view --json author` already answered it, and asking anyway tells the user you didn't look.

No PR at all → the branch name decides: mine if it starts with `pierce` (case-insensitive, `/` or `-` separator); else `git log -1 --format=%ae` == my git email. If both are silent, it isn't mine.

| | **Repo I own** | **Repo I don't own** |
|---|---|---|
| **uncommitted changes** | review → document → offer fix | review → document → offer fix |
| **my branch / my PR** | review → document → offer fix | review → document → offer fix (no post — GitHub blocks self-verdicts) |
| **teammate's PR** | n/a | review → document → offer per finding: fix small low/med issues on the branch, post the rest |
| **not mine, no PR** | review → document, no offer | review → document, no offer |

## Phase 00.1 — Hand a blocked branch to `unblock`, then continue

**Three things make a review void before it starts**, and all three are `unblock`'s to fix:

- the checkout is not at the branch head,
- the branch **conflicts** with its base,
- its **checks are red** — the answer may already be sitting in a CI log.

A fourth, unanswered reviewer feedback, is not a review problem at all: it is work owed to a reviewer, and a self-review that ignores it produces a second report nobody asked for while a real one sits unread.

**So: invoke [unblock](../unblock/SKILL.md) and let it finish. Do not offer to. Do not ask.**

This is RULE 2, and it is the reason this phase is four lines instead of the gate ladder it replaced. What that ladder did was print

> Gate: the branch conflicts with origin/main. Reviewing around a broken merge means reviewing a diff that won't exist after resolution.
> `resolve` · `review anyway` · `stop`

and wait — making the user approve the tool doing the thing the tool is for. That specific output is the failure. It does not come back.

```
skip unblock entirely if:
  target is the uncommitted working tree     (nothing is merging; nothing is red about a diff you haven't committed)
  target is not mine and has no PR           (not mine to fix)
  no GitHub remote                           (nothing to be blocked against)

otherwise:
  run ../unblock/SKILL.md against the target branch
  it runs its own gates, makes its own commits, takes its own single push confirm
  it returns a one-line state summary
  RE-PROBE the branch from scratch — the sha moved
  continue to Phase 00.5
```

**Not my branch** → `unblock` runs in diagnose-only mode by its own rules: it reads the failing checks and hands the diagnosis back as evidence, fixes nothing, pushes nothing. Carry that diagnosis into the report; a finding that came from a failing test is the strongest kind to post back, because the log is the reproduction.

**Distance behind the base is not a reason for anything, at any number.** A branch 200 commits behind `origin/main` that merges cleanly reviews exactly as well as one that is current: the diff under review is the branch's own changes against its merge base, and commits landing elsewhere on main do not alter it. Never count `HEAD..<base>`, never mention how far behind a branch is, and never merge main in as a precondition for reviewing.

### The novelty check — the one thing review still gates on itself

Review owns this because it is about review's own output, not the branch's state: **a second `review` on an unchanged branch must not produce a second identical report.**

Check this branch's marker — `/private/tmp/claude/reviews/.last-<branch-slug>`, an empty file
[REVIEW-CORE.md](REVIEW-CORE.md) Phase 07 touches at the end of every pass (the report itself is
never written to disk — see Phase 07). If the newest branch commit **and** the newest reviewer
feedback are both older than the marker's mtime, nothing has changed since you last looked:

```
nothing pushed and no new feedback since the last pass. `again` · `axes <names>` · `stop`
```

**This one asks, and it is not a RULE 2 violation** — there is no job to do. Re-running produces a byte-identical report, so the only question is what the user wants *instead*, which is a genuine unknown. Run `unblock` first regardless: fixing a red test moves the branch's newest commit, which is an input to this check.

## Phase 00.5 — Explain the PR before reviewing it

**Whenever the review target is a PR — mine or a teammate's, every time, no exceptions — explain what it does before you review it.** Run the [summary](../summary/SKILL.md) skill against the PR's branch, then present the result **in chat**, *before* the findings, so the user reads what the change is and then reads the review of it.

**Assume the reader has never seen this code.** Plain language, no insider terms, no repo shorthand — name the actual thing that changed and the actual behavior that was wrong. "The payout code paid the winner twice when two players went all-in on the same hand; this makes it pay once" beats "fixes double-settlement in the all-in path".

Two things go in the chat explanation:
1. **What the PR changed** — the summary skill's header and change list, in that language.
2. **The issue it was fixing** — what was broken before, and what breaks for a person using it. Pull the issue via `gh pr view <n> --json body` and any `Resolves #N` / `Fixes #N` reference (`gh issue view <n> --json title,body`). If the PR links no issue, say what the commits and diff show it was fixing.

**Skip the issue half for a new feature.** A PR that adds something that didn't exist has no bug behind it — say what it adds and move on. Don't invent a fixed issue to fill the slot.

**This is chat-only — it never enters the PR.** It's the user's orientation, not review output: it does not go in the review report, the verdict body, or any posted comment.

**Skipping the summary document.** The summary skill writes a file to `/private/tmp/claude/<repo-slug>/summaries/…`. On a teammate's PR that file is usually noise. Default: run the skill for its analysis, present it in chat, and **skip the file write** — say "summary not written to disk" in one clause. Write the file when the user asks, or when the PR is mine and I'll want the text for the PR description; then print its absolute path as the last token on its line. `skip summary` from the user drops this phase entirely.

## The review itself

Continue into [REVIEW-CORE.md](REVIEW-CORE.md) against the routed target. Then [POSTING.md](POSTING.md) for the dispositions.

## Dual flavor (`review dual`)

When `dual` is in the arguments, after the review core produces Claude's own findings, get an independent second opinion from the cross-vendor delegate on the **same** diff, then reconcile.

**Always go through the `dispatch` router — never call a vendor binary directly.** Read [../dispatch/SKILL.md](../dispatch/SKILL.md) for the resolver and its transports. **Gate first:** run `dispatch check`; if it fails (no delegate configured, not authenticated, Terminal automation not permitted), say so and **fall back to a plain solo review** — a single-model review is still useful; just tell the user the second opinion was skipped and why.

**Dual is the one flavor whose escalation is automatic.** `dispatch` — invoke it for the ladder — defaults all delegation to an in-session Claude agent; dual is exempt because a second opinion from the same model is not a second opinion. **Cross-vendor is the reason, and it is the only one** — never reach for the router here for anything else, and never substitute an `Agent` call, which would silently make dual a solo review wearing two tags.

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

   Get the delegate name at runtime — `dispatch agent` prints the real tool (`codex`, `reasonix`, …) — and use that literal name in the tag (`[codex]`, never `[delegate]`). "Both flagged it" is a strong signal; "only the delegate flagged it" is exactly the catch dual exists for — weight it, don't discount it for being single-source.

   **Before posting or writing any source-tagged report, scan the body for a tag that isn't a model/harness/vendor name or `both`.** One found means the tagging is wrong throughout, not in one spot — fix every tag, not the one you noticed.
4. Fold the delegate's findings into the matching axis sections of the report and carry the source tag through to the file format. Dual is still **read-only** — it reviews, never edits.

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

## Sweep mode — `review` on the default branch

Phase 00 context 3. Instead of reviewing `main` itself, review everything waiting on you: one worktree and one session per PR, per [../unblock/SWEEP.md](../unblock/SWEEP.md), which owns the fan-out mechanics, the herdr and Terminal transports, the sequential fallback, and the proof step.

Two things are review's to supply, and SWEEP.md reads them from here:

- **Selection** — open PRs where `author.login != my login` and my review is outstanding.
- **The worker's prompt** — `Run the /review skill on PR <n>, checked out here.` Nothing appended — the
  skill's own last phase is the disposition list and the proposed verdict, and naming an earlier step
  ("report findings") is what has made fanned-out reviews stop there instead of reaching it.

**Sweep is a dispatch, not a review.** Each session runs the full skill — Phase 00.1's `unblock` call
included, and Phase 07/POSTING.md's disposition list and verdict proposal too — inside its own worktree.
This context's job ends at S8's proof step; don't also review the PRs here.
