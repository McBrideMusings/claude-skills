# Breaking one issue into tracked work — standard practice

**Every issue you actually work gets broken down in beads, and every breakdown carries the same
two bookends: a verify bead and a land bead.** This is not a per-project convention to decide
each time. It is how work is tracked in every repo, on both backends.

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

## The skeleton — built at pickup, in one pass

```
neutrino-25                    parent — from GitHub #25 in a stealth repo, or authored in bd
│                              in a mirror repo. In stealth this is a read-model: a pull
│                              rewrites its title, body, labels, type and priority, so status
│                              is the only field worth editing locally.
├── neutrino-25.1  task        slice 1 — vertical, cuts every layer, ends at a commit
│                              (sized to at least three files or a complete user-visible path —
│                              see the Phase 04 "Slice rules" in ../to-tickets/SKILL.md)
├── neutrino-25.2  task        slice 2      dep: 25.1
├── neutrino-25.3  task        VERIFY       dep: every slice
│                              --acceptance holds what "done" means
│                              `human` when a person has to look
└── neutrino-25.4  task        LAND         dep: 25.3
                               --design holds the current PR/merge body draft
                               comments hold the running log
```

**Child IDs are the tier marker and they cost nothing.** `bd create --parent neutrino-25`
returns `neutrino-25.1`. So an ID reads as: plain numeric = pulled from their GitHub, dotted =
your breakdown of theirs, hashed (`neutrino-a3f2`) = wholly yours. Nothing else needs to record
which tier a bead is in.

```bash
P=neutrino-25
bd create "Wire the taxonomy parser" -t task --parent "$P"          # → $P.1
bd create "Verify: parser rejects a malformed heading" -t task --parent "$P" --acceptance "…"
bd create "Land: PR for #25" -t task --parent "$P"
bd dep add "$P.3" "$P.1" ; bd dep add "$P.3" "$P.2"                 # verify waits on the slices
bd dep add "$P.4" "$P.3"                                            # land waits on verify
bd ready --parent "$P"                                              # what is startable now
bd children "$P"                                                    # the tree
```

## Do not retype the parent to `-t epic`

`bd epic status`, `bd epic close-eligible` and the `bd swarm` family need `issue_type: epic` on
the parent. **A pull resets `issue_type`**, so on a mirrored or pulled parent the epic type is
erased silently by the next `bd github sync --pull-only` — the epic vanishes from `epic status`
with no error and no sign on the parent.

Use the commands that do not care about the type. `bd children <id>`, `bd list --parent <id>`
and `bd ready --parent <id>` answer what is under this, what is left, and what is startable.
That is the whole question set; the epic family buys a rollup fraction and costs a field that
silently resets.

An epic is still right for a body of work you authored yourself and never pull — a milestone, a
multi-issue effort with no upstream parent. Type those `-t epic` freely.

## The verify bead

**Exactly one per breakdown, and `human` goes on it by judgement rather than by rule.** Applying
`human` puts it in `bd human list`, which is the native queue of everything genuinely waiting on
a person across every issue in flight — so the label has to mean it.

| Kind of change | `human` |
| --- | --- |
| A feature | almost always — someone uses it before it is done |
| Anything visual | always — unverified until a person looked at the image |
| Backend, text, data | only when the tests do not actually cover the claim |

The last row is the one that needs honesty. "Do the tests cover this" is asked at the moment you
are most motivated to say yes. If the suite proves the behaviour, skip `human`; if it proves the
code runs, do not.

`--acceptance` on the verify bead is often the only written record of what "done" meant. It
**REPLACES** on write like `--notes` and `--description` — read it before you touch it.

```bash
bd human list                    # the agenda: everything awaiting a person
bd human respond <id> "<answer>" # comments and closes in one call
```

## The land bead

It holds the PR or merge body while it is still being written. **`--design` carries the current
draft; `bd comment` carries the log.** `--design` is meant to be superseded, which is what a
draft is. Comments are append-only by construction, so the chronology survives.

`--design` REPLACES with no diff and no warning. Read it with `bd show <id>` before rewriting.

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
