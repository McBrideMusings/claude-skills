# Auto — passes with nobody at the keyboard

`auto` is implement's one unattended mode. Every place a pass would wait for a reply, it takes
the answer `go` would have given and keeps going. It ends when it reaches its pass limit or runs
out of work, and then prints one report of everything only a person can finish.

## Tokens

| Command | Works | Passes it may take, landed or parked |
| --- | --- | --- |
| `implement auto` | items `issues next` discovers | 5 |
| `implement auto <n>` / `implement auto all` | items `issues next` discovers | `<n>` / no limit |
| `implement <epic> auto [n\|all]` | the epic's slices, in `epic-plan` order | all of them unless `<n>` is given |
| `implement <id> auto` | that one item | 1 |

The mode lives in the argument, which `/clear` drops. The relay brief carries the run's state
across the clear (§Run state).

`implement <id> auto` is what a lead dispatches into a worktree. It lands its own branch through
`wrap-up` — bare when standing in that worktree, `wrap-up <worktree>` when not — which closes the
bead. A worker that cannot remove its own worktree leaves it for the harness to reap. It never
runs `git push origin --delete` for a branch it never pushed: a hook stops that command for a
person's yes, which nobody is there to give. On an item whose notes already carry `auto parked`,
it prints that note and ends: a parked item waits for the user.

## Every wait point, and what auto does instead

| Where a pass waits | What auto does |
| --- | --- |
| Picking the item | Walks the ranked list (`issues next`, or `epic-plan`'s rows for an epic run) through the readiness gate ([`HANDOFF.md`](HANDOFF.md) §1). Drops every candidate whose `bd show <id> --json` notes carry `auto parked`. Never asks which item. |
| The epic plan slate | Prints the plan as one record line and works the first `[run]` row. |
| A sizing merge ([`HANDOFF.md`](HANDOFF.md) §2) | Takes its default pick. |
| An item that fails the readiness gate on a decision | Decides it, records it on the bead, and lands the work (§A decision nobody made). |
| An item that fails on a fact, the `human` label, or the reachability test | Adds it to `Needs you` (§Run state) and takes the next item. |
| Step 1's "if you cannot plan, stop" | Same split: a decision is decided, a missing fact goes to `Needs you`. |
| The gate | Prints it in full, `Run:` and `Look for:` included, as the record. Drops the closing sentence and goes straight to `wrap-up`. |
| `wrap-up`'s follow-up slate | Prints every row with its bracketed default and applies the defaults ([`../wrap-up/SKILL.md`](../wrap-up/SKILL.md) Phase 6 Step A). |
| `wrap-up`'s next-work ask | Relays into the next item ([`../relay/SKILL.md`](../relay/SKILL.md) §Auto). |
| `wrap-up`'s PR offer on a repo that is not `owned` | Opens no PR. Parks the branch with `needs a PR` and adds it to `Needs you`. |
| A step that needs a person's yes | Records it and moves on (§A step only a person can take). |

## Parking an item

Parking leaves finished-or-partial work on a branch that never lands without the user:

1. Commit the work on a branch named the way `wrap-up` reads it —
   `<type>/<slug>-<short-title>` ([`../wrap-up/SKILL.md`](../wrap-up/SKILL.md) Phase 6 Step C).
   On the default branch, `git switch -c` it first. In a worktree, commit on the worktree's own
   branch.
2. `bd update <id> --append-notes "auto parked: <branch> at <sha>. <reason>"`.
3. On the primary checkout, switch back to the default branch, add the row to the run-state
   block, and hand the next item to `relay` §Auto, which continues in this context when it
   cannot clear the pane. A worktree worker has only this one item, so it ends there.

A parked pass counts toward the limit. `implement <id>` (attended) on a parked item resumes the
branch at the gate ([`SKILL.md`](SKILL.md)).

## A decision nobody made

The readiness gate's plan and objectivity tests fail an item that hides a decision: a design
call, a product call, which of two approaches, what "done" looks like. Auto does not skip that
item. It decides:

1. Append the question, the answer you pick, the reason, and the strongest alternative to the
   bead: `bd update <id> --append-notes "auto decided: <question> -> <answer>. Why: <reason>.
   Alternative: <alternative>."` Pick the answer the repo's own docs, ADRs, `CONTEXT.md` and
   neighbouring code point to; when they are silent, pick the one that is cheapest to reverse.
2. Work the pass: plan, edit, build green, verify, blind review. Every step holds.
3. Land it through `wrap-up` like any other pass. The run-state `Landed` row carries the
   decision as `decided: <question> -> <answer>`, so the report names it.

The `auto decided` note and the commit are what make a wrong call cheap to undo: the user reads
the decision in the report and reverts the one commit, or replies with the other answer.

A fact is not a decision. A credential, a device, a measurement only the user can take, or a
value the item needs that nothing in the repo states goes to `Needs you`.

## Human verification parks the item too

When verification reports `BLOCKED` because only a person can check the result — a device, a
look at a screen with no program access, a judgement by eye — park it with the reason `needs
eyes: <what to look at>`.

`BLOCKED` on a fixture that contradicts the item ([`VERDICTS.md`](VERDICTS.md)) is a decision
about the item's model. Decide it per §A decision nobody made.

## A step only a person can take

A permission prompt nobody can answer, a classifier denial, a deploy, an upstream issue to file,
a cable to plug in: auto never waits on one and never hands the user a `!` command mid-run.

- When the step comes **after** landing — a deploy, a restart, a publish — land the pass, skip
  the step, and add the exact command to `Needs you`.
- When the step blocks the pass itself — a denied write the change needs — park what exists
  with the reason `blocked: <command> — <denial text>`.

## What ends the run early

These can be systemic, so the run stops rather than skipping to the next item. It prints the
report with the halt reason as its first line and does not relay:

- pre-flight fails, or the item's text arrived damaged;
- the default branch's build is red before any edit;
- a `fix` from the follow-up slate cannot be applied;
- `wrap-up` cannot land a branch: a merge conflict, a refusal from `land`, a red check.

A pass whose own build will not go green, that produces no diff, or whose review finding
contradicts the item is a per-item failure: park what exists with the reason, and take the next
item.

## Run state

Everything the report needs lives in one block, kept current in this context and copied to the
top of every relay brief ([`../relay/SKILL.md`](../relay/SKILL.md) §Auto):

```markdown
IMPLEMENT AUTO — nobody is at the keyboard; never wait for a reply.
Run: implement [<epic-id>] auto in <repo>. Limit: <n | all>. Used: <landed + parked so far>
Landed: <id> (<sha>[, decided: question -> answer]), …
Parked: <id> <branch> (<needs eyes: what | blocked: command | needs a PR | failed: reason>), …
Needs you: <id or step> — <the exact thing to supply or command to run>, …
```

The first session writes `Limit` from its command: `5` for bare `implement auto`, `all` for an
epic run with no `<n>`. Every pass, landed or parked, adds one to `Used`. Before taking the next
item, a session compares `Used` with `Limit`: equal ends the run with the report. A session
started by relay reads `Limit` and `Used` from the block, never from its own command line.

## The report

The run ends when `Used` reaches `Limit`, when no item on the list clears the gate or can be
decided, or on a halt above. It always prints this report from the run-state block. One line
per item: id, title, and the one thing the user does next. A section with nothing in it prints
`none`.

**Decided for you** — `Landed` rows with `decided:`. Each line names the decision as `question
-> answer` and the commit. Next action: nothing when the answer is right; `git revert <sha>`
through `implement <id>` with the other answer when it is wrong.

**Needs your eyes** — `Parked` rows with `needs eyes:`. Next action: what to look at, then
`implement <id>` to resume at the gate.

**Needs you** — the `Needs you` line, plus `Parked` rows with `blocked:`, `needs a PR` or
`failed:`. Next action: the exact thing to supply or the exact command to run.

**Landed** — each landed pass with its sha.

Close with `auto: <landed> landed, <parked> parked, limit <Limit>`.
