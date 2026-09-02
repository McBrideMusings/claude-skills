---
name: issues
description: Issue tracking. Every repo tracks work in beads — `bd`, never `gh issue` — and git can never tell you whether beads are synced, so git-side signals about `.beads/` are normal. Load before creating, reading, closing or labelling a tracked item.
---

# Issue tracking

**Beads is the assumption, not a finding.** A repo tracks work in `bd` unless
[`./_detect.md`](./_detect.md) says otherwise. You do not need a label, a marker, or an
injected line to know this — it is true of every repo.

| Open | When |
| --- | --- |
| [`./README.md`](./README.md) | Orientation to the whole cell — open when you need who-reads-what across the files. |
| [`./_detect.md`](./_detect.md) | **Always first.** Confirms the backend and resolves the two things that vary: mirror mode and stealth. |
| [`./breakdown.md`](./breakdown.md) | **Standard practice.** Breaking one issue into slices plus the two bookends every breakdown carries — a verify bead and a land bead. Open before slicing any issue into tracked work. |
| [`./beads.md`](./beads.md) | `bd` verbs, the Dolt store, mirror mode and `external_ref`. |
| [`./github.md`](./github.md) | The repo has no beads yet and resolved to GitHub: `gh issue` verbs and its own conventions. |
| [`./beads-stealth-context.md`](./beads-stealth-context.md) | Working in a stealth repo and needing the posture rather than the verbs. |
| [`./beads-mirror-context.md`](./beads-mirror-context.md) | The repo mirrors beads to GitHub Issues: what reads and writes may touch. |
| [`./labels.md`](./labels.md) | Choosing or creating a label on either backend. |

`gh pr …` is exempt from backend resolution — pull requests are GitHub-only on every backend.

## Starting an issue means breaking it down — and only then

**When you pick an issue up**, create its children in `bd`: the vertical slices, then a
**verify** bead and a **land** bead, wired with `bd dep add`. Standard practice on both backends
and in every repo — [`./breakdown.md`](./breakdown.md) is the shape, and it is not a decision to
re-take per project. Stealth and mirror differ only in whether the children get pushed.

**⛔ Never create children for an issue nobody has started.** The trigger is picking it up, not
filing it, prioritizing it, or sweeping the backlog. Do not retrofit a breakdown across open
issues, do not scaffold one ahead of the work, and do not offer to — slices written before the
code is open are guesses, and they poison `bd ready` and `bd human list`, whose only value is
that everything in them is real. Wiring `bd dep add` edges between issues that already exist is
not this and is always fine.

## Which tracker — decide before you file, not after

**The tracker is chosen by the code that has to change, never by the directory you are standing
in.** `bd` writes to whatever repo you happen to be in, so filing is silently wrong by default:
the bug you hit while working repo A goes into A's tracker even when the fix lives in B, where
nobody working B can see it.

Ask one question: **which repo holds the file that closes this issue?**

| The fix edits | Files in |
| --- | --- |
| Claude Code itself, its hooks, its skills, its agents, its commands, `~/.claude/CLAUDE.md`, `settings.json` | `bd -C ~/.claude` — **never an individual repo**, however you came to notice it |
| A machine, a service, a deployment, a fleet host's config | `bd -C ~/Systems` |
| The product you are working on | that repo |

A repo's own `CLAUDE.md` or `CLAUDE.local.md` may name further destinations — a project whose
backend runs on a host you administer separates *the product* from *that host's configuration*,
and they are two different trackers. Read it before filing.

**Filing in the wrong place is not a small error.** It puts the issue where the person who can
fix it will never look, and it distorts the receiving repo's counts and every `bd ready`. When
you find one already misfiled, move it — create in the right tracker with a `Moved from <repo>
(<old-id>)` line, close the original naming the new id — without asking.

**Labels get reconciled to [`./labels.md`](./labels.md) on sight, without asking.** A label that
is off-schema is drift, not a local convention: delete it, or map it onto the schema. This is
never a question to put to the user.
