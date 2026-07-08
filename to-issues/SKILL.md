---
name: to-issues
description: "Break a plan, spec, or PRD into independently-grabbable GitHub issues using vertical-slice tracer bullets. Classifies each slice as HITL (needs human input) or AFK (iterate can run it). Triggers: 'to issues', 'break this into issues', 'convert this plan to issues', 'split this into work items', 'make tickets from this', 'decompose this plan', 'slice this up into issues'."
---

# To Issues

Break a plan into independently-grabbable issues using **vertical slices** (tracer bullets). Issues become inputs to `iterate` / `iterate-loop`.

**Issue tracker:** default to GitHub via the `gh` CLI. If no GitHub remote exists (`git remote -v | grep github` finds nothing), tell the user and ask them how they want to track issues before proceeding.

## Proposal file

Draft slices to `<root>/tmp/claude/to-issues.md`. **Resolve `<root>` to an ABSOLUTE path — never write to a cwd-relative `tmp/…`.** The Bash working directory is NOT guaranteed to be the repo root (an earlier `cd` may have left it in a subdirectory), so a bare `tmp/claude/…` would land the file under whatever subdir the shell is in, not the repo root. Run `git rev-parse --show-toplevel` in its own Bash call and capture the absolute result as `<root>`; if it errors/empty (not a git repo), use the absolute output of `pwd`. Every `mkdir`/`Write`/path MUST be the absolute `<root>/tmp/claude/…`; if it doesn't start with `/`, it's the bug. Ensure `tmp/` is in `<root>/.gitignore` (Read it; Edit to add `tmp/` if absent). Run `mkdir -p <root>/tmp/claude` as a separate Bash call.

```bash
# Step 1
git rev-parse --git-common-dir
# Step 2: dirname → basename of result gives the repo name
```

After writing, tell the user the full path so they can open it — put the path on its own line with **no trailing punctuation** (so Ghostty ⌘-click stays clean). Then ask the Phase 04 questions inline in the conversation — the user should never have to go find information not provided to them.

## Process

### Phase 01 — Gather context

Work from whatever is in the conversation. If the user passes an issue reference (number, URL, path) as an argument, fetch it (`gh issue view <N>`) and read its full body + comments.

### Phase 02 — Explore the codebase (if needed)

Use `docs/CONTEXT.md` vocabulary for issue titles and descriptions. Respect ADRs in `docs/adr/` for the area you're touching.

Look for prefactoring opportunities — changes that make the upcoming implementation easier without changing behavior. "Make the change easy, then make the easy change." Note any found; they belong in the "Out of scope" or a preceding slice, not folded silently into the target slice.

### Phase 03 — Draft vertical slices

Break the plan into **tracer-bullet** issues. Each slice cuts through ALL layers end-to-end (schema + API + UI + tests). **NOT** a horizontal slice of one layer.

If the source plan implies milestone boundaries (e.g. "MVP vs Post-MVP", explicit phases, or a separate roadmap doc), group slices under `## Milestone: <name>` headings in the proposal file. Phase 05 reads these headings to create real GitHub milestones.

Classify each:

- **HITL** — Human In The Loop. Needs architectural decision, design review, or judgment call.
- **AFK** — Away From Keyboard. Can be implemented and merged autonomously by `iterate`.

Prefer AFK over HITL where possible.

Slice rules:

- Each slice delivers a narrow but COMPLETE path through every layer it touches
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over a few thick ones

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

> "These slices fall into N milestones: <list>. Create them on GitHub?"

For each confirmed milestone, **reuse open milestones by exact title match** — never create duplicates:

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

Publish in **dependency order** (blockers first) so "Blocked by" can reference real issue IDs. Use the body template from [ISSUE-TEMPLATE.md](ISSUE-TEMPLATE.md).

Per slice:

- **GitHub:** `gh issue create --title "<title>" --body "<body>" --milestone "<milestone name>"`
  - `--milestone` only when the slice belongs to a milestone group (omit otherwise). The milestone name must match a title from Phase 05.
  - No labels — there's no GitHub labeling strategy yet. The AFK/HITL split still lives in the proposal as a note for you; it just doesn't become a label.

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
