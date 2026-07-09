---
name: triage
description: "Pick the next work item from GitHub issues, prior-session follow-ups, or an outstanding handoff. Assesses project phase (early vs mature) and recommends one concrete starting point. Triggers: 'triage', 'what should I work on', 'what's next', 'pick next issue', start-of-session planning."
---

# Triage

Decide what's worth doing next based on **project phase + issue priority**, recommend one concrete starting point, then implement on the current branch. Reads three sources: GitHub issues, `<repo-root>/tmp/claude/followups.md`, and `<repo-root>/tmp/claude/handoffs.md`.

**Autonomous-caller note:** when invoked by `implement` (its Phase 01), skip the Phase 08 selection wait AND skip Phase 10 (offer wrap-up) — the autonomous caller runs wrap-up itself. Proceed immediately with option 1 at Phase 08 (top recommendation, or the handoff if one exists). Interactive callers wait for the user's selection at Phase 08 and see the wrap-up offer at Phase 10.

**Don't favor bugs by default.** Early-stage projects should usually push features forward; mature projects with users should usually fix meaningful bugs first. Judge project phase from evidence — don't ask the user.

**Don't create a worktree** unless the user explicitly asks ("use a worktree", "wtree this"). Work on the current branch.

> **Phase vs project phase:** This skill uses "Phase NN — Name" for its own workflow steps AND talks about a project's lifecycle "phase" (early / mature / unclear). Context disambiguates.

## Input

User may pass a GitHub URL:

| URL pattern | What to fetch |
|---|---|
| `github.com/owner/repo/milestone/N` | Issues in milestone N |
| `github.com/owner/repo/issues?labels=X` | Label filter |
| `github.com/owner/repo/issues?q=...` | Search query |
| `github.com/owner/repo/issues` or `github.com/owner/repo` | All open issues |
| `github.com/orgs/owner/projects/N` | Project board items |

**No URL** → default to current repo (`gh repo view --json nameWithOwner -q .nameWithOwner`). Also check `<repo-root>/tmp/claude/followups.md` for prior-session items and `<repo-root>/tmp/claude/handoffs.md` for an outstanding handoff. If detection fails, fall back to docs-only signals (`docs/PRD.md`, `docs/roadmap.md`). If neither repo nor docs exist, stop.

## Phases

### Phase 01 — Determine Target Repo and Filters

If URL passed: strip `https://`, parse `owner/repo`, detect type from path + query (`labels`, `q`, `milestone`, `assignee`). Extract milestone number for milestone URLs.

### Phase 02 — Fetch Issues and Read Docs

**Issues** — pick the right `gh` command:

```bash
# All open / label / search
gh issue list --repo owner/repo --state open [--label X | --search "q" | --milestone N] \
  --json number,title,labels,body,createdAt,comments,assignees --limit 100

# Project board
gh project item-list <N> --owner <owner> --format json --limit 100
```

On auth/repo-not-found errors: report and stop.

**Docs** (if in local repo): read `docs/PRD.md` (what the project is) and `docs/roadmap.md` (Now / Next / Later / Deferred). If neither default path exists, glob `**/PRD.md` and `**/roadmap.md` once before giving up. Use whichever exist; if both, use both as project-phase inputs.

**Followups file** — if `<repo-root>/tmp/claude/followups.md` exists, read its unresolved items. Treat each unresolved item as a singleton candidate that enters Phase 06 scoring alongside GitHub issues (no labels, project-phase tilt applied as if bug/feature). Classify as `bug` if the item names a defect, regression, broken behavior, or starts with "fix"; otherwise classify as `feature`. Items already in the `## Resolved` section are ignored.

**Handoff** — if `<repo-root>/tmp/claude/handoffs.md` exists, hold it for Phase 08 (it becomes the default top option, not a scored item).

### Phase 03 — Off-load Analysis to a Haiku Sub-Agent

Phases 04, 05, and 06 (project-phase assessment, grouping, scoring/ranking) are all mechanical — pure analysis on data the parent already has. Hand them to a Haiku sub-agent so the issue bodies, comments, and roadmap text stay out of parent context.

Brief (treat the rules in Phases 04–06 below as the sub-agent's brief, not the parent's own work):

> "You are receiving: (a) a JSON list of GitHub issues with `number, title, labels, body, createdAt, comments, assignees`; (b) the contents of `docs/PRD.md` and `docs/roadmap.md` if present; (c) the contents of `<repo-root>/tmp/claude/followups.md` if present.
>
> Do three things and return a compact JSON result:
>
> 1. **Assess project phase** per the rules below — `early`, `mature`, or `unclear`, with a one-line evidence summary.
> 2. **Group related issues** per the rules below — label clusters, title prefixes, cross-references.
> 3. **Score and rank** per the rules below, applying phase tilt. Return the top 5 groups/singletons by final score, plus any `priority:critical` items not already in the top 5.
>
> JSON shape:
> ```json
> {
>   \"phase\": \"early|mature|unclear\",
>   \"phase_signal\": \"one-line evidence\",
>   \"top\": [
>     {\"label\": \"named title (#N1, #N2)\", \"issue_numbers\": [N1, N2], \"score\": 7.8, \"scope\": \"...\", \"why\": \"...\"}
>   ],
>   \"critical_outside_top\": [...]
> }
> ```
> No prose explanation — just the JSON."

The parent receives the JSON and proceeds to Phase 07 with it. Don't ask the sub-agent to make the final pick — that's the parent's call in Phase 07.

### Phase 04 — Assess Project Phase (sub-agent brief)

Three buckets: **early** (MVP not done), **mature** (shipped, has users), **unclear**.

**Roadmap is the strongest signal:**

- "Now" lists core/foundational features → **early**
- "Now" empty/small, "Next/Later" is polish/refactor/incremental → **mature**
- PRD phase numbers, milestones, or "MVP" framing → read literally

**Issue-tracker fallbacks (no roadmap):**

- High feature:bug ratio with foundational features → **early**
- Releases beyond v0.x, mature CI, bug-heavy mix → **mature**
- Recent repo (<90 days, few commits) with feature-heavy issues → **early**

**Conflicts:** prefer roadmap (planned > filed). Note the conflict in summary.

**`unclear` rule (load-bearing for autonomous callers):** if no roadmap exists AND no single issue-tracker fallback signal fires unambiguously, set `unclear` and apply no tilt. Don't guess — `implement` and other autonomous callers depend on deterministic phase output.

### Phase 05 — Group Related Issues (sub-agent brief)

Apply in order:

- **Label clusters** — 2+ shared specific labels (ignore generic `bug` / `enhancement` / `good-first-issue`)
- **Title prefixes** — common prefix before `:`, `—`, `-` (e.g. "Dashboard: …")
- **Cross-references** — `#N` mentions in bodies between issues in the set
- **Merge overlapping groups** — 50%+ shared issues
- Ungrouped issues kept individually

### Phase 06 — Score and Rank (sub-agent brief)

**Per-issue score** (type-agnostic):

| Signal | Points |
|---|---|
| `priority:critical` | +3 |
| `priority:high` | +2 |
| `priority:medium` | +1 |
| Stale (age > 30 days, no comments in last 30) | +1 |
| Active discussion (>3 comments in last 30 days) | +1 |
| In roadmap "Now" | +2 |
| In roadmap "Next" | +1 |
| `good-first-issue` AND no priority label | −1 |

Stale and active-discussion are mutually exclusive (one or the other, not both). `good-first-issue` only subtracts when the issue carries no `priority:*` label — a high-priority approachable issue should not be penalized for being approachable.

**Group score** = sum of member scores.

**Project-phase tilt** (applied to group score before sorting):

| Project phase | Group composition | Multiplier |
|---|---|---|
| early | ≥50% feature/enhancement | × 1.3 |
| mature | ≥50% bug | × 1.3 |
| unclear | any | × 1.0 |

Critical/high-priority issues still float on raw score — tilt nudges the long tail, never buries urgent items. Any group containing a `priority:critical` issue ranks at least as high as the top tilted group. If multiple groups contain critical issues, rank them against each other by raw score (no tilt applied between them).

Ungrouped issues rank alongside groups as singletons.

### Phase 07 — Pick a Single Recommendation

Parent consumes the sub-agent's JSON. From the `top` array:

- **Bug groups** — recommend 2–3 issues max (fewer is better; more only if all trivial).
- **Feature groups** — recommend one feature unless tightly coupled (3+ shared labels + cross-refs, obviously one piece of work).
- **Big single issue** — recommend just that one if it fills the session.

Surface up to two "also worth attention" items: the next-highest group from `top`, and any `priority:critical` items from `critical_outside_top`.

**Out-of-scope + redundancy check.** Before presenting, check the top pick and "also worth attention" items:

- **Prior rejection** — if `<repo-root>/.out-of-scope/` exists, read its files and check for a concept match (not just keyword) against each candidate. See [OUT-OF-SCOPE.md](OUT-OF-SCOPE.md) for the format and what to do on a match.
- **Redundancy** — a quick codebase check for whether the top pick's behavior already exists. If it's already implemented, drop it, note why, and promote the next candidate.

Do this only for the items about to be presented, not the full issue list — it's a final check on the recommendation, not a bulk pre-filter.

### Phase 08 — Present

```
## Triage: owner/repo (N open issues)

Phase: <early | mature | unclear>
Signal: <one-line evidence>

### Recommendation
<Group name or issue title> — <issue numbers + titles>
Scope: <e.g., "1 feature", "3 small bugs", "~2 hours">
Why: <one sentence>

### Also worth attention
- <next group/issue> — <reason>
- <critical bug if not in top pick> — <reason>
```

**Then ask in plain chat — never via the `AskUserQuestion` tool.** Present the choices as a numbered list in the message body and wait for the user's reply. The structured-question schema is banned here: the user routinely answers with a free-form override ("actually start on #285", "give me a plan first") that a chip picker can't express, and the recommendation context above already frames the list.

Append this prompt:

```
Which should I start on? Reply with a number, or tell me something else.

1. <option>
2. <option>
3. <option>
```

Build 2–4 numbered options in this order:

1. **If a handoff exists** (`<repo-root>/tmp/claude/handoffs.md`), it is the default top option. `Resume handoff: <first sentence of the handoff's 'What we were working on' field, truncated to ~60 chars>` — then the handoff's `Immediate next step` field (verbatim, per handoff Contract).
2. Top scored recommendation — **named** like `SFTP pool hygiene (#297, #295)` or `HLS mutex stall (#286)`. Never bare issue numbers. Then scope + why. Becomes option 1 if no handoff exists.
3. Next-best group / "also worth attention" — same naming.
4. (Optional) Third meaningfully-different alternative. No need to add a "pick something else" escape — a free-form reply is always open.

Every option gets a named label in plain language; issue numbers in parens after.

**If the user picks the handoff option:** hand control to the `handoff` skill's Resume mode as an interactive caller (per handoff Contract: handoff will confirm before deleting the file on completion). Then implement.

Wait for the reply (a number or a free-form override) before implementing.

If the user rejects a presented candidate with a durable reason ("no, we decided against that because X") rather than just picking something else, offer to record it in `.out-of-scope/` per [OUT-OF-SCOPE.md](OUT-OF-SCOPE.md).

### Phase 09 — Implement

- Treat a free-form reply as an override; resolve it to specific issue numbers first.
- `gh issue view <N>` for each chosen issue.
- **Verify the claim** (bug issues only). Before exploring further, reproduce the bug from the reporter's steps. Report what happened: confirmed (with the code path it hits), failed to reproduce, or insufficient detail to try. A confirmed repro makes the rest of the implementation much more reliable; on failed/insufficient, stop and check with the user before proceeding rather than implementing a fix for an unconfirmed bug.
- Explore relevant code areas.
- If scope has 4+ issues or estimate >4 hours, ask if user wants a plan drafted to `~/.claude/plans/` first.
- Otherwise implement directly.

For groups, mention all related issue numbers in commit messages (`Relates to #12, #15, #18`).

### Phase 10 — Offer Wrap-Up

After Phase 09 produces a working change, don't leave the user dangling — triage is complete, but the session isn't until the work is committed / pushed / tracked. Ask in plain chat — never via the `AskUserQuestion` tool — by appending this numbered prompt and waiting for the reply:

```
Triage's work is done. Wrap up? Reply with a number, or tell me something else.

1. Wrap up now (recommended) — invoke the wrap-up skill to commit, push, file follow-ups, and update tracking.
2. Keep working — stay on the current branch to test, iterate, or extend. No commit, no wrap-up.
3. Just commit — create a commit on the current branch without running the rest of wrap-up, for when the change should be captured but isn't ready for the full close-out.
```

Skip this phase entirely when invoked by an autonomous caller (per the Autonomous-caller note above) — those callers run wrap-up themselves and a second invocation would double-commit.

Skip when Phase 09 produced no diff (nothing to wrap up).

## Rules

- Don't favor bugs over features — let project phase decide tilt.
- No worktrees unless requested; if requested, use `wtree add <number>` (a local helper at `~/bin/wtree`; if missing, fall back to `git worktree add` and note the fallback to the user). Never use `git worktree` directly when `wtree` is available.
- Never auto-commit — ask first.
- Repo not checked out locally → stop, tell user.
- `gh` auth fails → suggest `gh auth login`.
- Don't implement a whole milestone — focused subset; err small.
- Roadmap vs. issues conflict on project phase → prefer roadmap, note it.
