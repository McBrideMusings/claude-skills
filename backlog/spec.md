# Spec

Break a plan into independently-grabbable tickets using **vertical slices** (tracer bullets). Tickets become inputs to `implement`.

**The source can be loose conversation.** There is no required upstream skill — Phase 03 synthesizes the spec this skill needs, shows it for approval, and slices from that.

**This skill is the single owner of spec synthesis.** `docs`, `grill-me`, `gui` and `backlog shape` all delegate here rather than synthesizing a spec themselves. There is no separate spec skill; the spec is not a committed file — its durable home is the run epic's body (Phase 06), or the single ticket's `## Spec` section when there's no epic — and it is not a prerequisite for this run.

**Issue backend:** resolve once by invoking `issues` and running its detection step, then hold the answer for the whole run — `beads`, `github`, or `local`. Phases 06 and 07 below give the commands for each. If it resolves to `local`, say so and ask how the user wants to track these before publishing anything; a markdown file is a poor home for a dependency-ordered slate, and `/bootstrap` can set up beads in one step.

## Scratch files

This skill writes two files, both disposable, both under `/private/tmp/claude/<repo-slug>/`:

| File | Written by | Holds |
| --- | --- | --- |
| `spec.md` | Phase 03 | the synthesized spec — problem, solution, user stories, testing decisions. Durable copy: the run epic's body (Phase 06), or the single ticket's `## Spec` section when there's no epic |
| `backlog-spec.md` | Phase 05 | the slice breakdown awaiting approval |

**Both scratch files are transitory.** They exist to produce the tickets and die with the tmp
sweep; the tickets — and, for the spec, the epic body or `## Spec` section it's published into
— carry the durable content forward. Never write either into the repo on your own initiative.

Draft slices to `/private/tmp/claude/<repo-slug>/backlog-spec.md`. **Resolve `<root>` to an ABSOLUTE path — never write to a cwd-relative `tmp/…`.** The Bash working directory is NOT guaranteed to be the repo root (an earlier `cd` may have left it in a subdirectory), so a bare `/private/tmp/claude/<repo-slug>/…` would land the file under whatever subdir the shell is in, not the repo root. Run `git rev-parse --show-toplevel` in its own Bash call and capture the absolute result as `<root>`; if it errors/empty (not a git repo), use the absolute output of `pwd`. Every `mkdir`/`Write`/path MUST be the absolute `/private/tmp/claude/<repo-slug>/…`; if it doesn't start with `/`, it's the bug. Ensure `tmp/` is in `<root>/.gitignore` (Read it; Edit to add `tmp/` if absent). Run `mkdir -p /private/tmp/claude/<repo-slug>` as a separate Bash call.

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
**and one screenshot per named state**.

**Whether the slate ends in a teardown issue depends on which kind of prototype it is**, and
that section is the authority. An expiring prototype gets one, and it is not optional there.
A **living** prototype — one whose README declares it the design source of truth, maintained
ahead of the code — never gets one, because the teardown would delete the artifact the next
slate is supposed to cite. Read the README before writing the last ticket; if it does not
say which kind it is, ask in one line before publishing.

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

**Skip this phase entirely when the source is already structured** — and skip the driver-seat
pass below along with it — and say in one line that you're skipping both:

- `docs/PRD.md` or another spec document — read it and slice from it
- an issue body fetched in Phase 01
- drafts handed over by `improve`, or a slate derived from a `spike` prototype

Otherwise synthesize from conversation context, following
[SPEC-TEMPLATE.md](SPEC-TEMPLATE.md), including its seams confirmation. **Do not interview the
user** — synthesize what's already been discussed. Interviewing is `grill-me`'s job; if the
conversation is too thin to write a real spec, stop and say so, and point at `/grill-me`.

Write it to `/private/tmp/claude/<repo-slug>/spec.md` — absolute path, same `<root>` resolution
as the proposal file above. The file is plumbing for later phases; don't show its path.

**Run `lateral driver-seat` over the written spec** before pasting it for approval. Apply its
changes to `spec.md` in place. Its "Driver-seat changes" list goes above the spec's own text in
the single approval message below — the user sees what moved and why before reading the spec
itself.

**Paste the spec's full text in the chat message** — every section, verbatim or faithfully
condensed with nothing omitted — and **ask for approval before slicing**. The user approves
what they can read in chat, never a file they'd have to open:

> *"Spec written. Does this match what you want built, or should I adjust before slicing?"*

Iterate on the spec until approved. Only then continue.

The approved spec is not committed to a file. When there are two or more slices, Phase 06
creates one run epic per run and writes the full spec text into its body — that's its durable
home. When the slate is a single slice, there's no epic; Phase 07 prepends the spec text to
that ticket's body under a `## Spec` heading instead. Either way the scratch `spec.md` dies
with the tmp sweep once the durable copy exists.

### Phase 04 — Draft vertical slices

Break the plan into **tracer-bullet** tickets. Each slice cuts through ALL layers end-to-end (schema + API + UI + tests). **NOT** a horizontal slice of one layer.

If the source plan implies milestone boundaries (e.g. "MVP vs Post-MVP" or explicit phases), group slices under `## Milestone: <name>` headings in the proposal file. Phase 06 reads these headings to create child epics (beads) or milestones (GitHub) nested under the run-level epic/milestone it always creates.

Classify each:

- **HITL** — Human In The Loop. Needs architectural decision, design review, or judgment call.
- **AFK** — Away From Keyboard. Can be implemented and merged autonomously by `implement`.

Prefer AFK over HITL where possible.

Slice rules:

- Each slice delivers a narrow but COMPLETE path through every layer it touches
- A completed slice is demoable or verifiable on its own
- A slice names at least three files it creates or edits, or it delivers a complete user-visible path on its own. A step below that floor merges into the slice it feeds or the slice that consumes it. Two exceptions, each named in the slice's body: a step that several later slices fan out from (a scaffold, a shared module) may stand alone so those slices can swarm; and an expand–contract stage of a wide refactor keeps its own ticket, as the Wide refactors section below already says. The reason: every pass runs eight fixed stages and pays their cost once per slice, so a slice smaller than that cost is slower to run than to fold in.

**Every slice set ends in the same two bookends: a verify ticket and a land ticket.** They are
not optional and not a judgement call — the shape is standard practice for all tracked work and
is specified in [`../issues/breakdown.md`](../issues/breakdown.md). Read it before drafting.

- **Verify** — one per set, blocked by every slice. Its `--acceptance` is what "done" means.
  Label it `human` when a person has to look: always for anything visual, almost always for a
  feature, and for backend or text work only when the tests do not actually cover the claim.
  A `human` verify ticket is HITL by definition.
- **Land** — one per set, blocked by verify. It carries the PR or merge body while it is being
  written: `--design` holds the current draft, `bd comment` holds the log.

On the `beads` backend both are real beads, children of the group's parent. On `github` they are
two more issues — GitHub has no `--design` or `--acceptance`, so the draft body and the
acceptance criteria become `## PR draft` and `## Acceptance` sections instead.

**The bookends belong to the slate this run is filing, and to nothing else.** They close out one
approved spec being published now. They are never added to issues already sitting in the
backlog, and this rule never licenses a pass that walks open issues creating structure for them
— see the ⛔ in [`../issues/breakdown.md`](../issues/breakdown.md).

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

### Phase 06 — Run epic (spec's durable home)

**Runs whenever the slate has two or more slices.** This is where the approved spec gets its
durable home: one run epic per `backlog spec` run, titled from the spec's `# {Project} Spec`
title, carrying the full spec text as its body. A single-slice slate skips this phase entirely
— see the fallback at the end.

For each epic/milestone (run-level, and any milestone-grouped child), **reuse existing ones by
exact title match** — never create duplicates. Keep the run epic and any milestone child epics
as two distinct lookups; don't collapse them, or a second run can reuse a milestone epic as the
run epic and overwrite an unrelated spec.

**`beads`** — the epic type carries both the run epic and, when the proposal groups slices under
`## Milestone: <name>` headings, a child epic per group:

1. Run epic: look for an existing one — `bd list -t epic --status open --json` and match on the
   spec's title.
   - **Exact title match → reuse its ID.**
   - **No match → create it, with the spec as its body:**
     `bd create "<spec title>" -t epic --body-file /private/tmp/claude/<repo-slug>/spec.md --silent`
     — capture the printed ID as `<run-epic-id>`.
2. If the proposal has `## Milestone: <name>` groupings, confirm before publishing:
   > "These slices fall into N milestones: <list>. Create them?"

   For each confirmed milestone, look it up the same way (`bd list -t epic --status open --json`,
   match on title), reuse on an exact match, and otherwise create it as a child of the run epic:
   `bd create "<name>" -t epic --parent <run-epic-id> --silent` — capture each printed ID.

**`github`** — there's no epic type, so the run-level spec rides on a milestone:

1. Run milestone: check for a name match on the spec's title:
   ```bash
   gh api "repos/{owner}/{repo}/milestones?state=open" --jq '.[].title'
   ```
   (`{owner}` and `{repo}` are auto-resolved by `gh api` from the current repo.)
   - **Exact title match → reuse it.**
   - **No match → create it, with the spec as its description:**
     ```bash
     gh api "repos/{owner}/{repo}/milestones" -X POST -f title="<spec title>" -f description="$(cat <<'EOF'
     <full spec text>
     EOF
     )"
     ```
     Report whether it was reused or newly created.
2. If the proposal has `## Milestone: <name>` groupings, confirm before publishing (same
   question as above), then look each up the same way and create any missing ones as plain
   milestones (no parent — GitHub milestones don't nest):
   ```bash
   gh api "repos/{owner}/{repo}/milestones" -X POST -f title="<name>"
   ```
   Before creating, ask the user whether to set a due date (`-f due_on=<ISO8601>`). Skip it if they say no.
   These are the milestones Phase 07 assigns grouped slices to; ungrouped slices in a 2+-slice
   slate get the run milestone instead.
   Report which milestones were reused vs newly created when done.

**One-slice fallback — no epic at all.** When the slate is exactly one slice, skip this phase.
Instead, in Phase 07, prepend the full spec text to that slice's body under a `## Spec` heading
before creating it (both backends): the ticket body becomes `## Spec\n\n<spec text>\n\n<rest of
TICKET-TEMPLATE.md body>`. This is the spec's only durable home for a one-slice run, so it must
be written for whichever backend is in play.

### Phase 07 — Publish

Publish in **dependency order** (blockers first) so blockers can reference real issue IDs. Use the body template from [TICKET-TEMPLATE.md](TICKET-TEMPLATE.md).

Per slice:

- **`beads`:** `bd create "<title>" -t <task|bug|feature> -p <0-4> --body-file <path> --silent`
  - Capture the printed ID; later slices need it for their blocker edges.
  - **Every slice gets a `--parent`:** the milestone group's child epic ID when it belongs to
    one, otherwise the run epic ID from Phase 06 directly. A one-slice slate has no epic at all
    (see Phase 06's fallback) and omits `--parent`.
  - **A UI slice's Visual acceptance block goes in `--design-file <path>`, not the body.** `bd show` renders design separately, so the agent gets the reference frame, the state list, and the copy strings as their own section instead of buried in prose. Write the block to a scratch file and pass the path. Non-UI slices omit the flag.
  - **Wire blockers as real edges, not prose:** `bd dep add <id> <blocker-id> -t blocks`. This is the whole reason beads beats a flat list — `backlog next` and `implement` read `bd ready`, which only works if the edges exist. A "Blocked by" line left in the body alone is a bug, not a shortcut.
  - Put the acceptance criteria in `--acceptance` rather than burying them in the description; `implement` checks against that field.
  - AFK/HITL becomes a real label: `-l afk` or `-l hitl`.
- **`github`:** `gh issue create --title "<title>" --body "<body>" --milestone "<milestone name>"`
  - **Every slice gets `--milestone`:** the milestone group's name when it belongs to one,
    otherwise the run milestone's name from Phase 06. The name must match a title created or
    reused there. A one-slice slate has no milestone at all (see Phase 06's fallback) and omits
    `--milestone`.
  - **GitHub has no design field**, so a UI slice keeps its Visual acceptance block as a `## Visual acceptance` section in the body. Same content, different shape — this is the one place the two backends diverge.
  - **A `docs/spikes/` path in a GitHub issue body does not render as an image.** Cite it as a path in backticks, never as `![](…)` markdown that will show a broken image. The agent opens it from the checkout; that's the consumer that matters.
  - No labels — there's no GitHub labeling strategy yet. The AFK/HITL split still lives in the proposal as a note for you; it just doesn't become a label.
  - Blockers are prose only (`Blocked by #N` in the body) — GitHub has no dependency edges.

The two bookends publish last, after every slice, so their blocker edges can name real IDs:

```bash
V=$(bd create "Verify: <what done looks like>" -t task --parent "<parent>" \
      --acceptance "<criteria>" --silent)         # add -l human when a person must look
L=$(bd create "Land: <PR title>" -t task --parent "<parent>" --silent)
for s in $SLICE_IDS; do bd dep add "$V" "$s" -t blocks; done
bd dep add "$L" "$V" -t blocks
```

Do NOT close or modify any parent issue.

**Post-publish dispatch offer (beads only — GitHub has no labels or dependency edges, so skip this on that backend).** A freshly filed slice is dispatchable by construction: published in dependency order with its blockers wired as real `bd dep add` edges above, so nothing in the first wave is blocked. Only the `afk`-labelled slices are candidates — never `hitl`. Read the shape (swarm vs. sequential queue) off `bd ready --json` per [`../implement/HANDOFF.md`](../implement/HANDOFF.md) §2 rather than asking, and add one slate row to this report naming the count against the filed set, e.g. `Dispatch 4 of 7 filed — the AFK slices; 3 are HITL`, using HANDOFF.md §3's shape (no new accept word — `go` takes it with the rest of the report). Zero AFK slices filed: no row.

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

> **Good:** *"When a user runs `/backlog next` with no arguments, they should see a summary of issues needing attention"*
>
> **Bad:** *"Add a switch statement in the main handler function"*
