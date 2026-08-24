---
name: to-tickets
description: "Break a plan, spec, or PRD into independently-grabbable tickets using vertical-slice tracer bullets, published to the repo's issue backend — beads or GitHub. Classifies each slice as HITL (needs human input) or AFK (implement can run it)."
---

# To Tickets

Break a plan into independently-grabbable tickets using **vertical slices** (tracer bullets). Tickets become inputs to `implement` / `iterate`.

**Issue backend:** resolve once via [`../_tracker/_detect.md`](../_tracker/_detect.md) and hold the answer for the whole run — `beads`, `github`, or `local`. Phases 05 and 06 below give the commands for each. If it resolves to `local`, say so and ask how the user wants to track these before publishing anything; a markdown file is a poor home for a dependency-ordered slate, and `/bootstrap` can set up beads in one step.

## Proposal file

Draft slices to `/private/tmp/claude/<repo-slug>/to-tickets.md`. **Resolve `<root>` to an ABSOLUTE path — never write to a cwd-relative `tmp/…`.** The Bash working directory is NOT guaranteed to be the repo root (an earlier `cd` may have left it in a subdirectory), so a bare `/private/tmp/claude/<repo-slug>/…` would land the file under whatever subdir the shell is in, not the repo root. Run `git rev-parse --show-toplevel` in its own Bash call and capture the absolute result as `<root>`; if it errors/empty (not a git repo), use the absolute output of `pwd`. Every `mkdir`/`Write`/path MUST be the absolute `/private/tmp/claude/<repo-slug>/…`; if it doesn't start with `/`, it's the bug. Ensure `tmp/` is in `<root>/.gitignore` (Read it; Edit to add `tmp/` if absent). Run `mkdir -p /private/tmp/claude/<repo-slug>` as a separate Bash call.

```bash
# Step 1
git rev-parse --git-common-dir
# Step 2: dirname → basename of result gives the repo name
```

After writing, tell the user the full path so they can open it — put the path on its own line with **no trailing punctuation** (so Ghostty ⌘-click stays clean). Then ask the Phase 04 questions inline in the conversation — the user should never have to go find information not provided to them.

## Process

### Phase 01 — Gather context

Work from whatever is in the conversation. If the user passes an issue reference (ID, number, URL, path) as an argument, fetch it (`bd show <id> --json` on beads, `gh issue view <N>` on GitHub) and read its full body + comments.

**If the source is a prototype or an explainer**, read `../spike/SKILL.md` § Tickets from a
prototype before writing the slate. The file gets committed — `docs/spikes/` for a prototype
or wireframe, `docs/explainers/` for an explainer — and the slate ends with a teardown issue
that depends on every other issue in it. That last ticket is not optional: without it the
reference outlives its subject and starts contradicting the shipped code.

### Phase 02 — Explore the codebase (if needed)

Use `docs/CONTEXT.md` vocabulary for ticket titles and descriptions. Respect ADRs in `docs/adr/` for the area you're touching.

Look for prefactoring opportunities — changes that make the upcoming implementation easier without changing behavior. "Make the change easy, then make the easy change." Note any found; they belong in the "Out of scope" or a preceding slice, not folded silently into the target slice.

### Phase 03 — Draft vertical slices

Break the plan into **tracer-bullet** tickets. Each slice cuts through ALL layers end-to-end (schema + API + UI + tests). **NOT** a horizontal slice of one layer.

If the source plan implies milestone boundaries (e.g. "MVP vs Post-MVP", explicit phases, or a separate roadmap doc), group slices under `## Milestone: <name>` headings in the proposal file. Phase 05 reads these headings to create real GitHub milestones.

Classify each:

- **HITL** — Human In The Loop. Needs architectural decision, design review, or judgment call.
- **AFK** — Away From Keyboard. Can be implemented and merged autonomously by `implement`.

Prefer AFK over HITL where possible.

Slice rules:

- Each slice delivers a narrow but COMPLETE path through every layer it touches
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over a few thick ones

### Wide refactors — the exception to vertical slicing

A **wide refactor** is one mechanical change — rename a column, retype a shared symbol — whose **blast radius** fans across the whole codebase: a single edit breaks thousands of call sites at once, so no vertical slice can land green. Don't force it into a tracer bullet — sequence it as **expand–contract**, one ticket per stage:

1. **Expand.** Add the new form beside the old so nothing breaks yet. One ticket; it blocks every stage below.
2. **Migrate.** Move call sites onto the new form in batches sized by blast radius (per package, per directory). Each batch is its own ticket, blocked by the expand — CI stays green batch to batch because the old form still exists.
3. **Contract.** Delete the old form once no caller remains. One ticket, blocked by every migrate batch.

If even a single batch can't stay green alone, keep the sequence but let the batches share one integration branch that all block a final integrate-and-verify ticket — green is promised only there. Mark the whole sequence AFK unless a batch needs a judgment call.

### Phase 04 — Quiz the user

Write the full slice breakdown to the proposal file (see "Proposal file" section above), then tell the user the exact path (on its own line, no trailing punctuation, so it stays Ghostty-clickable). After that, present a summary table inline in the conversation and ask the questions below — the user should never need to hunt for information not given to them.

Ask every question in this skill as plain chat prose — never via the `AskUserQuestion` tool / structured-question schema. This is an iterative back-and-forth interview (the user answers in free-form text, may push back, and the loop continues until approval); the chip-picker UI can't carry that, and the proposal table is already in the message.

Per slice show:

- **Title** — short descriptive name
- **Type** — HITL or AFK
- **Blocked by** — which other slices must complete first (numeric refs for now, real issue IDs later)
- **User stories covered** — if the source has them

Ask:

- Does the granularity feel right? (too coarse / too fine)
- Are dependencies correct?
- Should any slices be merged or split further?
- Are HITL / AFK classifications right?

Iterate until approved.

### Phase 05 — Milestones (if grouped)

If the proposal groups slices under `## Milestone: <name>` headings, confirm before publishing:

> "These slices fall into N milestones: <list>. Create them?"

For each confirmed milestone, **reuse existing ones by exact title match** — never create duplicates.

**`beads`** — the milestone equivalent is an epic, and membership is a real parent link:

1. Look for an existing one: `bd list -t epic --status open --json` and match on title.
2. **Exact title match → reuse its ID.**
3. **No match → create it:** `bd create "<name>" -t epic --silent` — capture the printed ID.

**`github`:**

1. List open milestones and check for a name match:
   ```bash
   gh api "repos/{owner}/{repo}/milestones?state=open" --jq '.[].title'
   ```
   (`{owner}` and `{repo}` are auto-resolved by `gh api` from the current repo.)
2. **If a milestone with that exact title exists, reuse it.** Report which were reused vs newly created when done.
3. **If it doesn't exist, create it:**
   ```bash
   gh api "repos/{owner}/{repo}/milestones" -X POST -f title="<name>"
   ```
   Before creating, ask the user whether to set a description or due date (`-f description=...`, `-f due_on=<ISO8601>`). Skip both if they say no.

Skip this phase entirely if the proposal has no milestone groupings.

### Phase 06 — Publish

Publish in **dependency order** (blockers first) so blockers can reference real issue IDs. Use the body template from [TICKET-TEMPLATE.md](TICKET-TEMPLATE.md).

Per slice:

- **`beads`:** `bd create "<title>" -t <task|bug|feature> -p <0-4> --body-file <path> --silent`
  - Capture the printed ID; later slices need it for their blocker edges.
  - Milestone group → `--parent <epic-id>` from Phase 05.
  - **Wire blockers as real edges, not prose:** `bd dep add <id> <blocker-id> -t blocks`. This is the whole reason beads beats a flat list — `triage` and `iterate` read `bd ready`, which only works if the edges exist. A "Blocked by" line left in the body alone is a bug, not a shortcut.
  - Put the acceptance criteria in `--acceptance` rather than burying them in the description; `implement` checks against that field.
  - AFK/HITL becomes a real label: `-l afk` or `-l hitl`.
- **`github`:** `gh issue create --title "<title>" --body "<body>" --milestone "<milestone name>"`
  - `--milestone` only when the slice belongs to a milestone group (omit otherwise). The milestone name must match a title from Phase 05.
  - No labels — there's no GitHub labeling strategy yet. The AFK/HITL split still lives in the proposal as a note for you; it just doesn't become a label.
  - Blockers are prose only (`Blocked by #N` in the body) — GitHub has no dependency edges.

Do NOT close or modify any parent issue.

## Principles for writing good agent briefs

Issues from this skill go into AFK pipelines. The issue body is the contract.

- **Durability over precision.** The issue may sit unstarted for days while files get renamed. Describe interfaces and contracts; don't anchor on file paths or line numbers.
- **Behavioral, not procedural.** Describe **what** the system should do, not **how** to implement it. The agent will explore the codebase fresh and make its own implementation decisions.
- **Complete acceptance criteria.** The agent needs to know when it's done. Concrete, testable, independently verifiable.
- **Explicit scope boundaries.** State what's out of scope. Prevents gold-plating and assumption-drift.

### Good vs bad

> **Good:** *"The `SkillConfig` type should accept an optional `schedule` field of type `CronExpression`"*
>
> **Bad:** *"Open src/types/skill.ts and add a schedule field on line 42"*

> **Good:** *"When a user runs `/triage` with no arguments, they should see a summary of issues needing attention"*
>
> **Bad:** *"Add a switch statement in the main handler function"*
