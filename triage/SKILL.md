---
name: triage
description: "Pick the next work item from the repo's issue backend (beads or GitHub) and recommend one concrete starting point. Triggers: 'triage', 'what should I work on', 'what's next', start-of-session planning."
---

# Triage

Decide what's worth doing next based on **project phase + issue priority**, recommend one concrete starting point, then implement on the current branch. Reads the resolved issue tracker — beads or GitHub.

**Autonomous-caller note:** when invoked by `implement` (its Phase 01), skip the Phase 08 selection wait, skip the Phase 08 dispatch-row offer, skip the Phase 09 plan-draft question, AND skip Phase 10 (offer wrap-up) — the autonomous caller runs wrap-up itself, and a pass dispatching another pass recurses (`Workflow` is unavailable inside a subagent). Proceed immediately with option 1 at Phase 08 (the top recommendation) and implement directly at Phase 09. Interactive callers wait for the user's selection at Phase 08, see the dispatch-row offer at Phase 08, see the plan-draft question at Phase 09, and see the wrap-up offer at Phase 10.

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

**No URL** → default to the current repo, whichever backend owns its issues (resolve by invoking `issues`; on `github`, name it with `gh repo view --json nameWithOwner -q .nameWithOwner`). If detection resolves no backend, stop and offer `bd init` per `issues`'s detection step 6. If detection fails for another reason, fall back to whatever docs-only signal exists (`README.md`, `docs/CONTEXT.md`). If neither repo nor docs exist, stop.

**The URL table above is GitHub-only.** A beads repo has no web URLs — its filters arrive as arguments (`triage label:auth`, `triage p0`), resolved against the `bd` flags in Phase 02.

## Phases

### Phase 01 — Determine Target Repo and Filters

If URL passed: strip `https://`, parse `owner/repo`, detect type from path + query (`labels`, `q`, `milestone`, `assignee`). Extract milestone number for milestone URLs.

### Phase 02 — Fetch Issues and Read Docs

**Issues** — resolve the backend once by invoking `issues`, then read the list from it.

**`beads`:**

```bash
bd ready --json          # unblocked work only — the candidate set
bd list --status open --json   # everything open, for the "nothing is ready" report
```

`bd ready` already does what Phase 06 approximates on GitHub: it excludes anything with an open blocker. Score only what `ready` returns. If `ready` is empty but `list` is not, say so plainly — the backlog is entirely blocked, and the right next move is unblocking, not picking. `bd ready --explain --json` names each blocker.

Filters map onto the same flags: `--label <name>` (repeatable, AND), `--label-any a,b` (OR), `-t bug`, `-p 1`, `--parent <epic-id>` for the milestone equivalent.

**`github`:**

```bash
# All open / label / search
gh issue list --repo owner/repo --state open [--label X | --search "q" | --milestone N] \
  --json number,title,labels,body,createdAt,comments,assignees,milestone --limit 100

# Project board
gh project item-list <N> --owner <owner> --format json --limit 100
```

GitHub cannot compute a ready queue — Phase 06's blocker handling stays as written.

On auth/repo-not-found errors (or `bd` missing with a `.beads/` present): report and stop.

**Exclude questions.** Drop any issue carrying the `human` label (`bd human list` enumerates them) from the candidate set — a question is a decision to be made, owned by `iron-out`, and nothing gets built *from* one; it closes when answered. `implement` discovers through this skill, so this filter covers it too.

**Docs** (if in local repo): read `README.md` and `docs/CONTEXT.md` — what the project is. There is no roadmap file to read: the tracker's dependency graph is the roadmap, and the issue list above already carries it.

### Phase 03 — Off-load Analysis to a Haiku Sub-Agent

Phases 04, 05, and 06 (project-phase assessment, grouping, scoring/ranking) are all mechanical — pure analysis on data the parent already has. Hand them to a Haiku sub-agent so the issue bodies and comments stay out of parent context.

Brief (treat the rules in Phases 04–06 below as the sub-agent's brief, not the parent's own work):

> "You are receiving: (a) a JSON list of issues — either GitHub's (`number, title, labels, body, createdAt, comments, assignees, milestone`) or beads' (`id, title, status, priority, issue_type, created_at, labels, description, parent, dependency_count, dependent_count, comment_count` — `bd list --json` returns all of these directly). Treat `priority` 0–4 as the beads equivalent of a P0–P4 label, 0 being highest; `parent` is the epic and `dependent_count` is how many issues this one blocks; (b) the contents of `README.md` and `docs/CONTEXT.md` if present.
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

**The dependency graph is the strongest signal.** It is computed from the tracker, so it cannot drift the way a hand-maintained file does.

- Wave 1 (ready, unblocked) is core/foundational features → **early**
- Wave 1 is small and the open work is polish, refactor or incremental → **mature**
- PRD phase numbers, milestones, or "MVP" framing → read literally

**Fallbacks when the graph has no edges wired** — a flat backlog nobody has ironed out yet:

- High feature:bug ratio with foundational features → **early**
- Releases beyond v0.x, mature CI, bug-heavy mix → **mature**
- Recent repo (<90 days, few commits) with feature-heavy issues → **early**

**Conflicts:** prefer the graph over the flat signals. Note the conflict in summary.

**`unclear` rule (load-bearing for autonomous callers):** if the backlog has no dependency edges AND no single fallback signal fires unambiguously, set `unclear` and apply no tilt. Don't guess — `implement` and other autonomous callers depend on deterministic phase output.

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
| In an open milestone (GitHub) or an epic with other open members (beads) | +2 |
| Unblocks 2+ other issues when closed | +1 |
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
**1. Which should I start on?** Answer `1A`, or type `go` to take my pick. Add `skip` to a row to decline just it, or tell me something else.

1A. <option>
1B. <option>
1C. <option>
```

Build 2–4 options, lettered under question 1 per `CLAUDE.md` §Deciding & designing, in this order:

- **1A.** Top scored recommendation — **named** like `SFTP pool hygiene (#297, #295)` or `HLS mutex stall (#286)`. Never bare issue numbers. Then scope + why.
- **1B.** Next-best group / "also worth attention" — same naming.
- **1C.** (Optional) Third meaningfully-different alternative. No need to add a "pick something else" escape — a free-form reply is always open.

Every option gets a named label in plain language; issue numbers in parens after.

**Dispatch row for the top pick (1A).** 1A is a group of 1–3 issues, not a single item — Phase 05 groups issues and Phase 06 ranks groups — so run HANDOFF.md §1's three conditions (open, no `human` label, listed by `bd ready --json`) per member issue, not once for 1A as a whole; run `bd recompute-blocked` once before checking any member, not per member. All members clear: append one more row to the same numbered prompt offering to dispatch the whole group, naming the members (and the count, when there's more than one), with the shape read from HANDOFF.md §2 across the members' edges rather than assumed — members with no edge between them swarm (`implement swarm <ids>`), members with an edge queue in dependency order (`implement <ids>`), and a mixed set gets both — per HANDOFF.md §3's slate-row shape: no new accept word, `go` takes it with the rest of the reply, a per-row `skip` declines just it. Some members clear and some don't: offer a row for only the cleared members, named, and add one line saying which members were held back and which of the three conditions each failed. No member clears: add no row, same one-line non-silent explanation naming which condition failed for each. A single-issue 1A is just the one-member case of this same rule — no separate branch for it. Skip this whole check on a GitHub backend — HANDOFF.md's queries are all `bd`.

Wait for the reply (a number or a free-form override) before implementing.

If the user rejects a presented candidate with a durable reason ("no, we decided against that because X") rather than just picking something else, offer to record it in `.out-of-scope/` per [OUT-OF-SCOPE.md](OUT-OF-SCOPE.md).

### Phase 09 — Implement

- Treat a free-form reply as an override; resolve it to specific issue IDs first.
- Read each chosen issue in full — `bd show <id> --json` on beads, `gh issue view <N>` on GitHub.
- **Verify the claim** (bug issues only). Before exploring further, reproduce the bug from the reporter's steps. Report what happened: confirmed (with the code path it hits), failed to reproduce, or insufficient detail to try. A confirmed repro makes the rest of the implementation much more reliable; on failed/insufficient, stop and check with the user before proceeding rather than implementing a fix for an unconfirmed bug.
- Explore relevant code areas.
- If scope has 4+ issues, ask if user wants a plan drafted to `/private/tmp/claude/<repo-slug>/plans/` first.
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

- No worktrees unless requested; if requested, use `wtree add <number>` (a local helper at `~/bin/wtree`; if missing, fall back to `git worktree add` and note the fallback to the user). Never use `git worktree` directly when `wtree` is available.
- Never auto-commit — ask first.
- Repo not checked out locally → stop, tell user.
- `gh` auth fails → suggest `gh auth login`.
- Don't implement a whole milestone — focused subset; err small.
