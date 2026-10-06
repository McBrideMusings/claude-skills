# Breaking one issue into tracked work — standard practice

**Every issue you actually work gets broken down in beads, into the fewest children that each
end at something a reviewer or a test can check.** There is no verify bead and no land bead by
default: landing is `wrap-up`, and verification is `verify-project` run after the last slice. How
many children, and how big, is a judgement about the block of code that merges, set out below.

## ⛔ Create the children when work starts. Never in advance.

**The trigger is picking the issue up** — you are about to write code against it in this
session. Not when it is filed, not when it is prioritized, not when it looks likely, not while
sweeping the backlog. An issue nobody has started has **zero** children.

Never create a breakdown for an issue you are not starting now. Never fan a skeleton across a
backlog. Never offer to. If you catch yourself proposing to "retrofit", "pre-populate",
"scaffold ahead", or "set up the structure for the open issues", that is this mistake wearing a
different verb — stop.

Three reasons it is not a style preference:

- **The slices would be guesses.** You learn the real seams by opening the code. Children
  written before that are fiction that has to be deleted and rewritten at pickup, and deleting
  them is work the guess created.
- **It poisons the two queues whose whole value is that they are real.** `bd ready` is supposed
  to answer "what can I start"; `bd human list` is supposed to be what a person actually owes.
  Both stop meaning anything once they fill with hypothetical work.
- **It inflates every count.** Twenty backlog issues become a hundred beads, and the backlog no
  longer says how much is outstanding.

The one adjacent thing that is always fine, and is not this: **wiring dependency edges between
issues that already exist.** `bd dep add <blocked> <blocker>` creates nothing. See practice 1.

The only thing that varies is what leaves the machine, and that is settled by
[`_detect.md`](_detect.md): in a **stealth** repo the breakdown stays local and only the parent
exists upstream; in a **mirror** repo you push the children too. Same structure either way.

## How fine to break it down

**Size the children by what merges, not by what is possible to separate.** Every child costs a
context window: a pass pays the plan, build, verify and review sequence once per child, and
splitting one feature across many windows makes it slower, not more organised. Think about the
block of code that lands on the default branch when the work is done, and cut only where a cut
has its own checkable outcome.

| Repo (`~/.claude/tools/repo-tier`) | What lands | Breakdown |
| --- | --- | --- |
| `owned` — personal | Each change merges straight to the default branch | Small iterative children are fine, **each with an outcome a test or a screenshot can verify**. A step with no verifiable outcome of its own bundles into the step that uses it |
| `collaborative` — work | A pull request, usually one larger feature | The PR is the unit. Children are the coherent chunks a reviewer would read together; a spec that becomes one PR gets few children, not one per file group or per layer |

State no target count. A child that cannot be demoed or tested on its own folds into its
neighbour; two children that always change together are one child.

## The skeleton — built at pickup, in one pass

```
neutrino-25                    parent — from GitHub #25 in a stealth repo, or authored in bd
│                              in a mirror repo. In stealth this is a read-model: a pull
│                              rewrites its title, body, labels, type and priority, so status
│                              is the only field worth editing locally.
├── neutrino-25.1  task        slice 1 — vertical, cuts every layer, ends at a commit
│                              (see the Phase 04 "Slice rules" in ./spec.md)
└── neutrino-25.2  task        slice 2      dep: 25.1
```

A slice bead closes when its work is committed and verified on the branch the epic ships from
(`wrap-up`, at the gate's `go`), not when the PR merges. The parent closes with its last slice.

**Child IDs are the tier marker and they cost nothing.** `bd create --parent neutrino-25`
returns `neutrino-25.1`. So an ID reads as: plain numeric = pulled from their GitHub, dotted =
your breakdown of theirs, hashed (`neutrino-a3f2`) = wholly yours. Nothing else needs to record
which tier a bead is in.

A child created with `--parent` inherits the parent's labels, so slices start with the right
family labels. Add a narrower label with `-l` where the slice touches less than the parent; pass
`--no-inherit-labels` only when the child belongs to a different part entirely, and give it its
own set from `.beads/labels.toml`.

```bash
P=neutrino-25
bd create "Wire the taxonomy parser" -t task --parent "$P"          # → $P.1
bd create "Reject a malformed heading" -t task --parent "$P"        # → $P.2
bd dep add "$P.2" "$P.1"                                            # slice 2 waits on slice 1
bd ready --parent "$P" --limit 0                                    # what is startable now
bd children "$P"                                                    # the tree
```

## Do not retype the parent to `-t epic`

`bd epic status`, `bd epic close-eligible` and the `bd swarm` family need `issue_type: epic` on
the parent. **A pull resets `issue_type`**, so on a mirrored or pulled parent the epic type is
erased silently by the next `bd github sync --pull-only` — the epic vanishes from `epic status`
with no error and no sign on the parent.

Use the commands that do not care about the type. `bd children <id>`, `bd list --parent <id>`
and `bd ready --parent <id> --limit 0` answer what is under this, what is left, and what is startable.
That is the whole question set; the epic family buys a rollup fraction and costs a field that
silently resets.

An epic is still right for a body of work you authored yourself and never pull — a milestone, a
multi-issue effort with no upstream parent. Type those `-t epic` freely.

## When a person has to look: one `human` bead, made when it is known

A verify bead is not part of the skeleton. After the last slice, `verify-project` runs inline and
its result goes in the gate. Create **one** `human` bead for the epic only when something needs
a person that a session cannot stand in for: a real account, a device, a production surface, a
visual sign-off. Write what to look at, and what a pass looks like, in `--acceptance`
(`REPLACES` on write like `--notes` and `--description`, so read it first). Never create it up
front, and never create one for work the tests cover.

```bash
bd human list                    # the agenda: everything awaiting a person
bd human respond <id> "<answer>" # comments and closes in one call
```

Landing has no bead. `wrap-up` writes the PR body and lands the branch.

## Five practices this makes possible

1. **Wire the dependency DAG — it is private by necessity.** GitHub has no dependency field at
   all, so the ordering of a backlog only ever exists in beads. `bd dep add <blocked> <blocker>`
   across the parents, then `bd ready` turns an unordered list into "these three are startable."
   Run `bd recompute-blocked` before any read that orders work; `bd ready` trusts a denormalized
   flag that goes stale after a hand-resolved pull.
2. **Draft in private, publish in one command.** Write the issue as a bead, sharpen it, then
   `bd github push <id>` when it is fit for someone else to read. In stealth that is the only
   way anything reaches their tracker; in mirror mode it is the ordinary push.
3. **Questions are a queue, not a note.** One `human` bead per unanswered question — for the
   client, the maintainer, or yourself. `bd human list` is the agenda for the next conversation
   and `bd human respond` closes it with the answer recorded on the issue.
4. **`-t decision` beads as ADR placeholders.** One open decision bead per unresolved
   architectural question, closed when the record lands in the repo's ADR directory. The bead is
   the reminder; the ADR is the artifact.
5. **`-t spike` for what you do not know yet.** Timeboxed investigation is real work and belongs
   in the graph, but it is rarely anyone else's business — in stealth it never leaves.

## What the guard already enforces

In a stealth repo, `bd github sync --push-only --parent <id>` — the one command that would
publish a whole private subtree — is denied by `hooks/beads-stealth-guard.sh`, because `--parent`
is not `--issues`. Publishing is always per-bead and always named. You cannot leak a breakdown by
forgetting; you can only publish one by typing its ID.
