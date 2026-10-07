---
name: implement
description: "Autonomous work on one tracked item at a time, done by this session itself in the checkout it stands in: plan, edit, build green, verify, blind review, gate. `implement <epic>` reads the epic's children and blocking edges from beads and proposes the order to work them in, one at a time, then runs `verify-project` over the epic. Bare `implement` discovers one via `issues next`. `implement auto [n|all]` runs passes unattended — no gate wait, no follow-up ask, decisions made and recorded — and reports what only a person can finish."
---

# /implement — plan, edit, verify, gate

Control words (`go`, `park`, `implement`, `verify` …) are defined in
[`../CONTEXT.md`](../CONTEXT.md).

One **pass** is one tracked item, worked end to end by this session, in the checkout it
already stands in, ending at a commit. **No subagent runs the pass.** This session plans,
edits, builds, and verifies directly — the one subagent it spawns is a blind `code-reviewer`
pass over the diff, once the build is green.

`implement <issue>` works that item here, in this session and this checkout, and nowhere
else. It never launches another session, pane or agent to do the work.

**Bare `implement`, with no argument, picks the item itself and starts.** Run `issues next`
in its autonomous mode ([`../issues/next.md`](../issues/next.md)); it returns every
candidate it scored, ranked. Walk that list in order. Drop an item that hits `issues next`'s
out-of-scope or redundancy check (Phase 07) without asking the user to confirm the match.
An epic ends the walk and continues as `implement <epic>` below. Otherwise apply the readiness gate ([`HANDOFF.md`](HANDOFF.md) §1);
the first item that clears it is the pass. Never stop to ask which item. When nothing on the
list clears, the run ends: name the first item that reached the gate and the test it failed —
or, when every item was dropped before the gate, each item and the check that dropped it —
and stop.

**Landing happens only through `wrap-up`, never inside `implement` itself.** A pass ends at
the gate with its branch standing. Typing `go` runs `wrap-up` in this checkout, which lands it
(`../wrap-up/SKILL.md`).

**`auto` is the one unattended mode** — `implement auto [n|all]`, `implement <epic> auto
[n|all]`, `implement <id> auto`. Nothing waits for a reply: the gate prints as a record,
`wrap-up` takes its bracketed defaults, `relay` carries the run's count, a decision the item
leaves open is made, recorded on the bead and landed, and everything only a person can
finish goes into one report at the end. Every wait point and what replaces it:
[`AUTO.md`](AUTO.md).

**`implement <id>` on an item whose notes carry `auto parked: <branch>` or `parked at gate:
<branch>`** resumes that branch: switch to it, print the decision or verification note, re-run
step 4 against it, and show the gate. A reply there naming a different answer to the decision is
owner feedback (§The gate): rework the branch to that answer and update the bead's
`auto decided` note.

## The unit is a slice — an epic becomes a plan

A pass takes **one slice child** — `myproj-25.1`. A `human` child is never worked as a pass: it
waits for a person. Verification over the epic is this session's, via `verify-project`, and
landing is `wrap-up`. Item → pass, and the readiness gate every item clears before it is
ever offered: [`HANDOFF.md`](HANDOFF.md).

**`implement <epic>` proposes a plan and starts nothing until pierce answers;
`implement <epic> auto` skips the slate ([`AUTO.md`](AUTO.md)).** The order
comes from beads, never from reading the titles:

```text
~/.claude/skills/implement/epic-plan <repo> <epic-id>     # children, blocks edges, bd ready --parent --limit 0
  -> open slices in dependency order (wave 1 = unblocked now), slices needing a person, done
readiness gate (HANDOFF.md §1) on the first slice          # in chat, before the slate
slate, one row per step, in plan order:
  the first unblocked slice that clears the gate -> "Work <id> here"                 [run]
  a slice that fails the gate  -> what is missing, and who supplies it               [hold]
  every later slice            -> "<id>, after <ids>"                                 [hold]
  `human` slices               -> what pierce has to do or decide                     [hold]
  after the last slice         -> "verify-project over the epic, then the gate"       [hold]
go -> `implement <epic> auto`: work every [run] row here, one pass per context
```

`go` on an epic plan is the ask for every ready slice: it runs `implement <epic> auto`
([`AUTO.md`](AUTO.md)), which works the slices one at a time in plan order. After the last slice,
auto runs `verify-project` over the epic here and stops at the gate.

- **One slice at a time.** Slices in the same wave could run in parallel, but `implement`
  still works them one after another.
- **An epic with no open slice** still gets a plan: run `verify-project` here, then the gate.
  Never answer "nothing remains" with no next step. Close the epic through `wrap-up` even when
  the tree is clean, never with a hand-run `bd close`.
- **An epic with no children** is not ready for `implement`; offer `issues spec` to break it
  down ([`../issues/breakdown.md`](../issues/breakdown.md)).
- `epic-plan` expands a child epic in place, and names blockers outside the epic as `external`
  rather than following them; an external blocker holds its row.

## Commit rule by branch

**On the default branch, commit nothing until `wrap-up` runs.** `wrap-up`'s own commit step
makes the first commit, deliberately — it lets its review and quality checks land in the same
commit as the change, rather than a separate housekeeping commit bolted on after.

**On any other branch, or in a worktree, commit as you go.** Ordinary commits as the plan
progresses are fine. `wrap-up` may squash the unpushed ones into one, or leave them and add a
final commit, before it pushes and lands.

## Pre-flight

On failure, print the reason and stop.

**Refuse a dirty tree:** `git status --short -- . ':(exclude).beads' ':(exclude).claude'` —
those two are exempt, both session bookkeeping rather than work in progress:

- **`.claude/`** — `scheduled_tasks.lock`, `papercuts.md`, `review-rejected.md`.
- **`.beads/`** — tracker state. Under the no-tracked-export standard its JSONL files are
  gitignored and never show here; a repo still tracking them is converted per
  `issues/beads.md` § Turning it off, never stashed or committed to clear the check.

In the primary `~/.claude` checkout, a dirty file there belongs to another concurrent session
sharing that index, not to this pass — not a halt.

**Resolve the verification skill now.** `ls` the absolute path of `<repo>/.claude/skills/verify-project/SKILL.md` and print it. Step 4 reads that file; a pass that verified with its own ad hoc check without reading it has not verified.

**No commit-count guard.** One commit on the default branch; as many as the work needs
elsewhere, squashed by `wrap-up`.

## The steps

1. **Plan.** State the files to touch and an objective acceptance check — for a changed value,
   one that compares a specific expected number ([`VERDICTS.md`](VERDICTS.md)). If you cannot, stop
   — an item that needs this is not one that cleared [`HANDOFF.md`](HANDOFF.md) §1's readiness
   gate, and it should not have been offered. When the change adds or alters a feature of
   something that runs, the plan also names each boundary the feature crosses, the log line
   each one writes, and the state-query field that shows what the feature displays
   ([`../ref/observability/checklist.md`](../ref/observability/checklist.md)); building those is
   part of this item, never a follow-up. In a repo with a `DESIGN.md`, save the `dsys check`
   baseline now, before any edit ([`VERDICTS.md`](VERDICTS.md#design-system-checks)). Then start the pass's dashboard with `dashboard implement`
   ([`../dashboard/kinds/implement.md`](../dashboard/kinds/implement.md)) and push its stage at
   each step below.
2. **Edit.** Make the change directly, in the checkout you stand in. In an owned repo, a
   feature that needs a design token or component `DESIGN.md` lacks adds it to `DESIGN.md` in
   the same commit, never a follow-up ([`DESIGN.md` checks](VERDICTS.md#design-system-checks)).
3. **Build green.** Run the build, test, lint or typecheck yourself, in the foreground,
   bounded — `<cmd> 2>&1 | tail -40` (add `| grep -E 'error|FAIL' | head -40` first when the
   runner is chatty). Explicit `timeout`, up to 600000; never background it. In a repo with a
   `DESIGN.md`, `dsys check` and the dsys ESLint fragment are part of build-green: a `dsys
   check` record the diff added, or an ESLint error, fails the step; a record in the step-1
   baseline does not ([`VERDICTS.md`](VERDICTS.md#design-system-checks)).
4. **Verify at the surface.** The project's own `verify-project` skill owns what verification
   means here — read `<repo>/.claude/skills/verify-project/SKILL.md` as a file and follow it
   (never `Skill(verify)`: that is the bundled skill, disabled for model invocation). For a
   feature, the proof includes checklist §4: the state query shows the planned field with raw
   values, and the log file at the path the control surface reports holds the planned lines
   from this run. Write one
   from the repo's `README.md`, `CLAUDE.md` and `admin.toml` when none exists, naming this
   repo's real surface and commands; keep it out of git via `<repo>/.git/info/exclude`, never
   `.gitignore`. `BLOCKED` conditions and proving a touched test discriminates:
   [`VERDICTS.md`](VERDICTS.md).
5. **Blind review.** Once the build is green, spawn `code-reviewer` once — the one subagent
   this process spawns as a matter of course, and this step is what clears a session that
   otherwise carries a standing instruction not to call the `Agent` tool unasked. It gets the
   diff and the repo's standards,
   never this session's own reasoning about why the diff is correct. Fix every
   `blocking`/`major` finding it returns,
   then re-verify whatever the fix touched — one cycle, not two. `minor` findings, and anything
   still open after that cycle, go to `wrap-up`'s follow-up step rather than a second review
   round.
6. **Commit**, per the branch rule above.

## Bash command rules

An unattended pass never gets a chance to retry past a permission prompt, so none of these
shapes appears in a command this process runs:

1. **`@{u}`, `@{upstream}`, `@{push}`, or any `{…}` git refspec** typed as a bare argument —
   these trigger brace-expansion prompts unconditionally. Use `origin/$(git branch
   --show-current)` or `origin/main` instead.
2. **Compound commands where any sub-command is not allowlisted.** `&&`/`||`/`;` chaining is
   only safe when every piece would individually pass. If uncertain, run the commands
   separately.
3. **`$(…)` or backtick subshell expansion** where the inner command is not already
   allowlisted. Run the inner command first, capture the result, use it in a second call.
4. **`#` comments or newlines inside a single Bash call.**
5. **`cd /path && git <cmd>`** — triggers an "untrusted hooks" prompt. Use `git -C
   /absolute/path <cmd>`.
6. **`cat <file> || echo "not found"` existence-check compounds** — use the Read tool instead.

**Never read a screenshot into this context.** Prove a visual result from text instead — logs,
exit codes, a DOM or text dump the app already emits. If an image must be captured, save it to
a path, assert on it via text or exit code, and name the path in the summary; the one other
subagent this process may reach for is `screenshot-checker`, for a genuine human-eyes-only
check, which keeps the image out of context and returns words.

**Commit messages never attribute the work to Claude, an AI, or any tool** — no
`Co-Authored-By`, no session link, no trailer naming a model; sign as the repo's user and
nothing else. Conventional Commits, imperative, ≤72 characters of prose, item id in trailing
parens — except in a repo labelled `beads:stealth` in `~/.claude/domains-map`, where no tracker id
appears in any commit message, branch name or PR text.

## Halt conditions

- Pre-flight failed.
- The item's text arrived damaged — truncated, duplicated, or naming something that does not
  exist.
- No diff; the build won't go green.
- Verification `BLOCKED` — a closed surface, or a fixture that contradicts the item's own
  model.
- A review finding and the item's own stated criteria contradict each other.

In `auto`, the item-level conditions park the item and the run continues; which ones stop the
whole run is in [`AUTO.md`](AUTO.md) §What ends the run early.

**A `BLOCKED` on a fixture is never a code problem.** The environment's data cannot express
what the criterion asks — a seed row outside the domain the item defines, a fixture predating
the schema. Fix the data or fix the criterion; never edit product code to satisfy data the
item's own model says should not exist. Verify treats doubt as `FAIL`.

## The gate

Once verification and review clear, show the gate: [`../CHAT-FORMAT.md`](../CHAT-FORMAT.md)
§Gate. When the pass changed `DESIGN.md`, the gate carries its diff ([`../CHAT-FORMAT.md`](../CHAT-FORMAT.md)
§Gate). The commands in **Run:**/**Look for:** are the ones already run in step 4 above — never
re-derived, never re-run just to fill the gate. When a recheck command runs inside a worktree
and the project has `admin.toml`, print it as `admin -w <worktree> <task>` when this session
stands outside the worktree, unprefixed when standing inside it — never tell the owner to `cd`
first.

In `auto`, stop after the gate's **Look for:** block; the closing sentence below and its wait
belong to an attended pass.

Close a single pass's gate with exactly this sentence (from [`../CHAT-FORMAT.md`](../CHAT-FORMAT.md) §Hatch, never reworded):

> Test it and reply with what you find, or type `go` to run wrap-up, or `park` to leave it unlanded.

`go` means run `wrap-up` now, in the checkout this pass worked in — bare `wrap-up` when
standing in it, `wrap-up <worktree>` when not. `park` leaves the branch standing, records
`bd update <id> --append-notes "parked at gate: <worktree-or-branch>, verified at <sha>"`, runs
`~/.claude/skills/dashboard/dashboard end implement:<id>`, and ends
the turn — a later session finds the note and resumes at the gate.

**Owner feedback at a gate starts a new round.** If the reply names a located cause with a
small edit, fix it directly; otherwise treat the reply as a new brief and repeat the steps
above against it. Either way: re-verify (re-run what changed, plus anything the fix touched),
re-show the gate.

## Output

One line, once the gate above has been shown or the pass halted:

```
Implement complete: <one-sentence summary>. Halt: <reason | none>.
```

## Notes

- One pass works **one** item; never bundle two.
- A pass never writes to the tracker, except the `auto` notes [`AUTO.md`](AUTO.md) names — `wrap-up` closes it. A slice of an epic that ships as one PR closes at its gate's `go`, once its commit is on the epic's branch; any other item closes after landing, once the branch is merged or its PR opened.
- A pass never removes a worktree it did not create.

## Read on demand

| Open | When |
| --- | --- |
| [`AUTO.md`](AUTO.md) | Any `auto` token: every wait point it replaces, parking, the end-of-run report. |
| [`HANDOFF.md`](HANDOFF.md) | Clearing an item, the readiness gate, offering it as a slate row. |
| [`VERDICTS.md`](VERDICTS.md) | What verification means, `BLOCKED` conditions, asserting a changed value, proving a touched test discriminates. |
