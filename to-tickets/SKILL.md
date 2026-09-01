---
name: to-tickets
description: "The path from conversation to filed work: synthesize a spec, get it approved, slice it into vertical-slice tracer-bullet tickets, publish to the repo's issue backend (beads or GitHub). The single owner of spec/PRD generation. Classifies slices as HITL or AFK."
---

# To Tickets

Break a plan into independently-grabbable tickets using **vertical slices** (tracer bullets). Tickets become inputs to `implement` / `iterate`.

**The source can be loose conversation.** There is no required upstream skill — Phase 03 synthesizes the spec this skill needs, shows it for approval, and slices from that.

**This skill is the single owner of spec/PRD generation.** `docs`, `grill-me`, `gui` and `iron-out` all delegate here rather than synthesizing a spec themselves. There is no separate spec skill; a PRD is a by-product of this run (Phase 03), not a prerequisite for it.

**Issue backend:** resolve once by invoking `issues` and running its detection step, then hold the answer for the whole run — `beads`, `github`, or `local`. Phases 06 and 07 below give the commands for each. If it resolves to `local`, say so and ask how the user wants to track these before publishing anything; a markdown file is a poor home for a dependency-ordered slate, and `/bootstrap` can set up beads in one step.

## Scratch files

This skill writes two files, both disposable, both under `/private/tmp/claude/<repo-slug>/`:

| File | Written by | Holds |
| --- | --- | --- |
| `spec.md` | Phase 03 | the synthesized spec — problem, solution, user stories, testing decisions |
| `to-tickets.md` | Phase 05 | the slice breakdown awaiting approval |

**Both are transitory.** They exist to produce the tickets and die with the tmp sweep; the
tickets carry the durable content forward. Never write either into the repo on your own
initiative — the one exception is the `docs/PRD.md` copy in Phase 03, which only happens when
the user asks for it.

Draft slices to `/private/tmp/claude/<repo-slug>/to-tickets.md`. **Resolve `<root>` to an ABSOLUTE path — never write to a cwd-relative `tmp/…`.** The Bash working directory is NOT guaranteed to be the repo root (an earlier `cd` may have left it in a subdirectory), so a bare `/private/tmp/claude/<repo-slug>/…` would land the file under whatever subdir the shell is in, not the repo root. Run `git rev-parse --show-toplevel` in its own Bash call and capture the absolute result as `<root>`; if it errors/empty (not a git repo), use the absolute output of `pwd`. Every `mkdir`/`Write`/path MUST be the absolute `/private/tmp/claude/<repo-slug>/…`; if it doesn't start with `/`, it's the bug. Ensure `tmp/` is in `<root>/.gitignore` (Read it; Edit to add `tmp/` if absent). Run `mkdir -p /private/tmp/claude/<repo-slug>` as a separate Bash call.

```bash
# Step 1
git rev-parse --git-common-dir
# Step 2: dirname → basename of result gives the repo name
```

After writing, tell the user the full path so they can open it — put the path on its own line with **no trailing punctuation** (so Ghostty ⌘-click stays clean). Then ask the Phase 05 questions inline in the conversation — the user should never have to go find information not provided to them.

## Process

### Phase 01 — Gather context

Work from whatever is in the conversation. If the user passes an issue reference (ID, number, URL, path) as an argument, fetch it (`bd show <id> --json` on beads, `gh issue view <N>` on GitHub) and read its full body + comments.

**If the source is a prototype or an explainer**, read `../spike/SKILL.md` § Tickets from a
prototype before writing the slate. It gets committed as a directory — `docs/spikes/<slug>/`
for a prototype or wireframe, `docs/explainers/<slug>/` for an explainer — holding the build
**and one screenshot per named state**, and the slate ends with a teardown issue that depends
on every other issue in it. That last ticket is not optional: without it the reference
outlives its subject and starts contradicting the shipped code.

**If the work is UI and there is no prototype yet, stop and say so.** A UI slice needs a
reference frame to cite, and inventing the visual target inside a ticket body is how a slate
ends up unbuildable. Point at `/spike` to build one, or at `/gui sketch` if the question is
only arrangement. Come back after.

### Phase 02 — Explore the codebase (if needed)

Use `docs/CONTEXT.md` vocabulary for ticket titles and descriptions. Respect ADRs in `docs/adr/` for the area you're touching.

Look for prefactoring opportunities — changes that make the upcoming implementation easier without changing behavior. "Make the change easy, then make the easy change." Note any found; they belong in the "Out of scope" or a preceding slice, not folded silently into the target slice.

### Phase 03 — Synthesize the spec

Slicing needs a stated problem, solution, user stories, and testing decisions. Write them now —
skipping this is why a slate ends up with slices nobody can trace to a user story.

**Skip this phase entirely when the source is already structured** and say in one line that
you're skipping it:

- `docs/PRD.md` or another spec document — read it and slice from it
- an issue body fetched in Phase 01
- drafts handed over by `improve`, or a slate derived from a `spike` prototype

Otherwise synthesize from conversation context, following
[SPEC-TEMPLATE.md](SPEC-TEMPLATE.md), including its seams confirmation. **Do not interview the
user** — synthesize what's already been discussed. Interviewing is `grill-me`'s job; if the
conversation is too thin to write a real spec, stop and say so, and point at `/grill-me`.

Write it to `/private/tmp/claude/<repo-slug>/spec.md` — absolute path, same `<root>` resolution
as the proposal file above. The file is plumbing for later phases; don't show its path.
**Paste the spec's full text in the chat message** — every section, verbatim or faithfully
condensed with nothing omitted — and **ask for approval before slicing**. The user approves
what they can read in chat, never a file they'd have to open:

> *"Spec written. Does this match what you want built, or should I adjust before slicing?"*

Iterate on the spec until approved. Only then continue.

#### Committing the spec as `docs/PRD.md`

The spec is transitory by default — it exists to produce the tickets. Copy it into the repo
only when the user asks, or when a `docs/PRD.md` stub already exists (a `/docs` or `/bootstrap`
run creates one), in which case offer once and don't insist:

> *"There's an empty `docs/PRD.md` in this repo — want this spec written there too?"*

If they say yes and `docs/PRD.md` already holds substantive content, ask which: **(a)**
overwrite, **(b)** append a new section, **(c)** write `docs/PRD-{slug}.md` for a
feature-scoped spec. If there's no `docs/` directory, create it, and mention that `/docs` can
wire the file into a VitePress site.

### Phase 04 — Draft vertical slices

Break the plan into **tracer-bullet** tickets. Each slice cuts through ALL layers end-to-end (schema + API + UI + tests). **NOT** a horizontal slice of one layer.

If the source plan implies milestone boundaries (e.g. "MVP vs Post-MVP", explicit phases, or a separate roadmap doc), group slices under `## Milestone: <name>` headings in the proposal file. Phase 06 reads these headings to create real GitHub milestones.

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

### Phase 05 — Quiz the user

Write the full slice breakdown to the proposal file (see "Proposal file" section above), then tell the user the exact path (on its own line, no trailing punctuation, so it stays Ghostty-clickable). After that, present a summary table inline in the conversation and ask the questions below — the user should never need to hunt for information not given to them.

Ask every question in this skill as plain chat prose — never via the `AskUserQuestion` tool / structured-question schema. This is an iterative back-and-forth interview (the user answers in free-form text, may push back, and the loop continues until approval); the chip-picker UI can't carry that, and the proposal table is already in the message.

Per slice show:

- **Title** — short descriptive name
- **Type** — HITL or AFK
- **Blocked by** — which other slices must complete first (numeric refs for now, real issue IDs later)
- **User stories covered** — by number, against the Phase 03 spec. Every user story must be covered by at least one slice; call out any that aren't and say why (out of scope, or a gap you missed).

For a UI slice, also show its **reference frame** — the `docs/spikes/<slug>/<state>.png` it's built against — and the state names it claims to cover.

Ask:

- Does the granularity feel right? (too coarse / too fine)
- Are dependencies correct?
- Should any slices be merged or split further?
- Are HITL / AFK classifications right?
- For UI slices: are the states complete, and is each one screenshotted?

Iterate until approved.

### Phase 06 — Milestones (if grouped)

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

### Phase 07 — Publish

Publish in **dependency order** (blockers first) so blockers can reference real issue IDs. Use the body template from [TICKET-TEMPLATE.md](TICKET-TEMPLATE.md).

Per slice:

- **`beads`:** `bd create "<title>" -t <task|bug|feature> -p <0-4> --body-file <path> --silent`
  - Capture the printed ID; later slices need it for their blocker edges.
  - Milestone group → `--parent <epic-id>` from Phase 06.
  - **A UI slice's Visual acceptance block goes in `--design-file <path>`, not the body.** `bd show` renders design separately, so the agent gets the reference frame, the state list, and the copy strings as their own section instead of buried in prose. Write the block to a scratch file and pass the path. Non-UI slices omit the flag.
  - **Wire blockers as real edges, not prose:** `bd dep add <id> <blocker-id> -t blocks`. This is the whole reason beads beats a flat list — `triage` and `iterate` read `bd ready`, which only works if the edges exist. A "Blocked by" line left in the body alone is a bug, not a shortcut.
  - Put the acceptance criteria in `--acceptance` rather than burying them in the description; `implement` checks against that field.
  - AFK/HITL becomes a real label: `-l afk` or `-l hitl`.
- **`github`:** `gh issue create --title "<title>" --body "<body>" --milestone "<milestone name>"`
  - `--milestone` only when the slice belongs to a milestone group (omit otherwise). The milestone name must match a title from Phase 06.
  - **GitHub has no design field**, so a UI slice keeps its Visual acceptance block as a `## Visual acceptance` section in the body. Same content, different shape — this is the one place the two backends diverge.
  - **A `docs/spikes/` path in a GitHub issue body does not render as an image.** Cite it as a path in backticks, never as `![](…)` markdown that will show a broken image. The agent opens it from the checkout; that's the consumer that matters.
  - No labels — there's no GitHub labeling strategy yet. The AFK/HITL split still lives in the proposal as a note for you; it just doesn't become a label.
  - Blockers are prose only (`Blocked by #N` in the body) — GitHub has no dependency edges.

Do NOT close or modify any parent issue.

## Principles for writing good agent briefs

Issues from this skill go into AFK pipelines. The issue body is the contract.

- **Durability over precision.** The issue may sit unstarted for days while files get renamed. Describe interfaces and contracts; don't anchor on file paths or line numbers.
- **Behavioral, not procedural.** Describe **what** the system should do, not **how** to implement it. The agent will explore the codebase fresh and make its own implementation decisions.
- **Complete acceptance criteria.** The agent needs to know when it's done. Concrete, testable, independently verifiable.
- **Explicit scope boundaries.** State what's out of scope. Prevents gold-plating and assumption-drift.
- **Visual work is described empirically or not at all.** A slice that renders something carries the Visual acceptance block from [TICKET-TEMPLATE.md](TICKET-TEMPLATE.md): every state named, copy verbatim, design tokens instead of raw values, one transition line per interaction, and a reference frame from `docs/spikes/<slug>/`. An agent cannot check "matches the design"; it can check that `empty` renders the string `"No sessions yet"`.

### Good vs bad

> **Good:** *"The `SkillConfig` type should accept an optional `schedule` field of type `CronExpression`"*
>
> **Bad:** *"Open src/types/skill.ts and add a schedule field on line 42"*

> **Good:** *"When a user runs `/triage` with no arguments, they should see a summary of issues needing attention"*
>
> **Bad:** *"Add a switch statement in the main handler function"*
