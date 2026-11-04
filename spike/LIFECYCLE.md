# Lifecycle — done, what gets stored, tickets

## When done

**Load [`show-shape`](../show-shape/SKILL.md) via the Skill tool before writing up which version won and what to build from it.** The verdict is a plan — it says what the real implementation should look like — and it is worth more when it carries the winning version's actual signatures and call shape than when it says "version B felt better".

The **answer** is the only thing worth keeping. Record it in the place that owns it, with the question it was answering and which variant won — if the user is around, that's a quick conversation; if not, leave `NOTES.md` in `/private/tmp/claude/<repo-slug>/spikes/<slug>/` with the verdict blank:

| The answer is | It goes in |
| --- | --- |
| A look: a token, a type step, a component rule | `DESIGN.md`, then `dsys export` |
| A winning image comp or mockup screenshot | `dsys refs add` ([COMP.md](COMP.md)), cited by the tickets |
| A decision with a reason | an ADR in `docs/adr/` |
| Work to build | tickets ([below](#tickets-from-a-spike)) |

Then delete the whole topic directory (and, for a throwaway route, the worktree).

## Nothing is kept

`/private/tmp/claude/<repo-slug>/spikes/` is age-pruned and a spike is never copied into a repo:
not to `docs/spikes/`, not to a home directory. A prototype kept beside the code becomes a second
source of truth for the design that `DESIGN.md` already owns, and it drifts from both the code and
`DESIGN.md`. When a user asks to keep one, record its answer as the table above says and explain that.

**Never invent a second word for the store.** Everything this skill writes goes in
`/private/tmp/claude/<repo-slug>/spikes/`. Not `prototypes/`, not `mockups/`, not `artifacts/` —
the tool is `spike`, so the directory is `spikes`, everywhere, no exceptions.
(`explain` owns the parallel directory, `/private/tmp/claude/<repo-slug>/explainers/`.)

## Tickets from a spike

When `issues spec` (or any other pass) turns a spike into tickets, each UI slice cites its winning
comp or mockup screenshot by dsys ref in the ticket's design field. The ref is created with
`dsys refs add <bead-id> <image.png>` once the ticket exists ([COMP.md](COMP.md)). No frame is committed
to the project, and no teardown ticket exists, because nothing was committed to tear down. A slice
that rendered through the interactive rung cites the ref of the comp or mockup it was refined from, or states
its behaviour in the ticket's acceptance criteria.

## A repo that still has `docs/spikes/`

Such a directory holds prototypes this skill no longer writes or maintains. Remove them, and fold
what they decided into `DESIGN.md` first (`dsys init --from-code` drafts it from the code; the
prototype's own notes supply the decisions the code does not show). Ideally purge the directory from
git history too, so old builds and screenshots stop appearing in clones: `git filter-repo --path
docs/spikes --invert-paths` rewrites every commit and needs a force-push, so ask the user before
running it, and never run it on a repo the user does not own.
