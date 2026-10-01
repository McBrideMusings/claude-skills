---
name: implement
description: "Autonomous work on one tracked item at a time, done by this session itself in the checkout it stands in: plan, edit, build green, verify, blind review, gate. `implement <epic>` reads the epic's children and blocking edges from beads and proposes the order to work them in, one at a time, then Verify and Land. Bare `implement` discovers one via `backlog next`."
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

**Bare `implement`, with no argument, picks the item itself and starts.** Run `backlog next`
in its autonomous mode ([`../backlog/next.md`](../backlog/next.md)); it returns every
candidate it scored, ranked. Walk that list in order. Drop an item that hits `backlog next`'s
out-of-scope or redundancy check (Phase 07) without asking the user to confirm the match.
An epic ends the walk and continues as `implement <epic>` below. Otherwise apply the readiness gate ([`HANDOFF.md`](HANDOFF.md) §1);
the first item that clears it is the pass. Never stop to ask which item. When nothing on the
list clears, the run ends: name the first item that reached the gate and the test it failed —
or, when every item was dropped before the gate, each item and the check that dropped it —
and stop.

**Landing happens only through `wrap-up`, never inside `implement` itself.** A pass ends at
the gate with its branch standing. Typing `go` runs `wrap-up` in this checkout, which lands it
(`../wrap-up/SKILL.md`).

**`implement <id> afk` is the unattended pass** — a worker a lead dispatched, with nobody at the
gate. It runs every step below, then skips the gate's hatch and its wait: once verification and
review clear it runs `wrap-up` (bare when standing in the checkout, `wrap-up <worktree>` when
not) with no `go`, and closes the bead with `bd close <id>` after the branch has landed. It
asks the lead nothing. It halts only on the halt conditions below, and then says why in its
own pane and closes nothing. A worker that cannot remove its own worktree leaves it for the
harness to reap. It never runs `git push origin --delete` for a branch it never pushed: a hook stops that command for a person's yes, which nobody is there to give. The mode lives in the argument, which `/clear` drops: any prompt that
re-enters the pass (a relay brief, a resume) restates `afk` in its `implement` line.

## The unit is a slice — an epic becomes a plan

A pass takes **one slice child** — `myproj-25.1`. A Verify/Land child is never worked as a
pass: **Verify is this session's**, via `verify-project`, and `human` stops it until a person
looks; Land is `wrap-up`. Item → pass, and the readiness gate every item clears before it is
ever offered: [`HANDOFF.md`](HANDOFF.md).

**`implement <epic>` proposes a plan and starts nothing until pierce answers;
`implement <epic> walk` skips the slate (§The walk).** The order
comes from beads, never from reading the titles:

```text
~/.claude/skills/implement/epic-plan <repo> <epic-id>     # children, blocks edges, bd ready --parent --limit 0
  -> open slices in dependency order (wave 1 = unblocked now), slices needing a person,
     Verify, Land, done
readiness gate (HANDOFF.md §1) on the first slice          # in chat, before the slate
slate, one row per step, in plan order:
  the first unblocked slice that clears the gate -> "Work <id> here"                 [run]
  a slice that fails the gate  -> what is missing, and who supplies it               [hold]
  every later slice            -> "<id>, after <ids>"                                 [hold]
  `human` slices               -> what pierce has to do or decide                     [hold]
  Verify                       -> "Run <id> here via verify-project" once its blockers
                                  are closed                                          [run | hold]
  Land                         -> "wrap-up <id> after Verify passes"                  [hold]
go -> `implement <epic> walk`: work the [run] row here, then wrap up, relay, and repeat
```

## The walk — one `go`, the whole epic

**`go` on an epic plan is the ask for every ready P1/P2 slice.** `implement <epic> walk` is that
ask already given: it prints the plan as one record line (no slate, no wait) and works the first
[run] row. The `go` and every relay brief in the walk start the next session with this same
command, so the walk is never re-asked.

Each slice is its own pass, run in this order with nobody answering in between:

1. **Implement** — the steps below, to a green build, verification and blind review.
2. **Gate, informational** — print the gate ([`../CHAT-FORMAT.md`](../CHAT-FORMAT.md) §Gate)
   without its closing sentence and do not wait; the walk treats the verified pass as `go`.
3. **Wrap up** — run `wrap-up` in walk mode ([`../wrap-up/SKILL.md`](../wrap-up/SKILL.md)
   Phase 6): it picks every follow-up's disposition itself, lands the slice, and appends one
   line to the epic's notes.
4. **Relay** — `relay` in walk mode ([`../relay/SKILL.md`](../relay/SKILL.md) §Walk mode)
   clears the context and starts `implement <epic> walk` in the same pane. One slice per
   context is the cost control; the brief is how the walk survives it.

The walk stops, and says why in one message that also lists the slices done, the follow-ups
filed and the stop reason, at: a `human` slice; a P3 or lower slice; a slice that fails the
readiness gate; a halt condition below (`BLOCKED`, a build that will not go green, a review
finding that contradicts the item); a blocker `wrap-up` cannot resolve; relay unavailable
(outside herdr, or a linked worktree), in which case it continues in this context instead; or
no ready slice left. The Verify row is a [run] row once its blockers close: the walk runs it
here through `verify-project` and stops at the Land row, which stays [hold].

- **One slice at a time.** Slices in the same wave could run in parallel, but `implement`
  still works them one after another.
- **An epic with no open slice** still gets a plan: its Verify and Land rows are the plan (run
  Verify here, then Land). Never answer "only Verify and Land remain" with no next step.
- **An epic with no children** is not ready for `implement`; offer `backlog spec` to break it
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
- **`.beads/`** — `issues.jsonl` and `interactions.jsonl`, rewritten by nearly every `bd`
  command including the `bd show` that resolves the item itself. Do not stash or commit them
  to clear the check.

In the primary `~/.claude` checkout, a dirty file there belongs to another concurrent session
sharing that index, not to this pass — not a halt.

**Resolve the verification skill now.** `ls` the absolute path of `<repo>/.claude/skills/verify-project/SKILL.md` and print it. Step 4 reads that file; a pass that verified with its own ad hoc check without reading it has not verified.

**No commit-count guard.** One commit on the default branch; as many as the work needs
elsewhere, squashed by `wrap-up`.

## The steps

1. **Plan.** State the files to touch and an objective acceptance check — for a changed value,
   one that compares a specific expected number ([`VERDICTS.md`](VERDICTS.md)). If you cannot, stop
   — an item that needs this is not one that cleared [`HANDOFF.md`](HANDOFF.md) §1's readiness
   gate, and it should not have been offered.
2. **Edit.** Make the change directly, in the checkout you stand in. In an owned repo, a
   feature that needs a design token or component `DESIGN.md` lacks adds it to `DESIGN.md` in
   the same commit, never a follow-up ([`DESIGN.md` checks](VERDICTS.md#design-system-checks)).
3. **Build green.** Run the build, test, lint or typecheck yourself, in the foreground,
   bounded — `<cmd> 2>&1 | tail -40` (add `| grep -E 'error|FAIL' | head -40` first when the
   runner is chatty). Explicit `timeout`, up to 600000; never background it. In a repo with a
   `DESIGN.md`, `dsys check` and the dsys ESLint fragment are part of build-green and a
   nonzero exit fails the step ([`VERDICTS.md`](VERDICTS.md#design-system-checks)).
4. **Verify at the surface.** The project's own `verify-project` skill owns what verification
   means here — read `<repo>/.claude/skills/verify-project/SKILL.md` as a file and follow it
   (never `Skill(verify)`: that is the bundled skill, disabled for model invocation). Write one
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

In a walk, stop after the gate's **Look for:** block; the closing sentence below and its wait
belong to a single pass, not a walk.

Close a single pass's gate with exactly this sentence (from [`../CHAT-FORMAT.md`](../CHAT-FORMAT.md) §Hatch, never reworded):

> Test it and reply with what you find, or type `go` to run wrap-up, or `park` to leave it unlanded.

`go` means run `wrap-up` now, in the checkout this pass worked in — bare `wrap-up` when
standing in it, `wrap-up <worktree>` when not. `park` leaves the branch standing, records
`bd update <id> --notes "parked at gate: <worktree-or-branch>, verified at <sha>"`, and ends
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
- A pass never writes to the tracker — `wrap-up` closes it after landing, once the branch is
  merged or its PR opened.
- A pass never removes a worktree it did not create.

## Read on demand

| Open | When |
| --- | --- |
| [`HANDOFF.md`](HANDOFF.md) | Clearing an item, the readiness gate, offering it as a slate row. |
| [`VERDICTS.md`](VERDICTS.md) | What verification means, `BLOCKED` conditions, asserting a changed value, proving a touched test discriminates. |
