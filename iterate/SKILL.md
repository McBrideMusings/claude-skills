---
name: iterate
description: "Work a repo's ready beads one at a time, unattended: each an `implement <id> auto` pass run by this session in the primary checkout, landed, then the next. The sequential sibling of `swarm` — same focus forms, no worker panes, no swarm space. `iterate`, `iterate epic:cc-12`, `iterate label:client 3`, `iterate the web browser feature`. Use for 'iterate over the epic', 'work through these one at a time', 'implement the epic without a swarm'."
---

# Iterate

`iterate [<focus>] [<n>]` works the focus's ready beads one after another until the focus runs
dry or `<n>` passes are spent (default `all`). This session does every pass itself. It opens no
pane, starts no worker and launches no swarm.

What `iterate` reuses rather than owns:

| Job | Owner |
| --- | --- |
| Resolving the focus (`epic:`, `label:`, a bead id, free text) | [`../implement/SELECTORS.md`](../implement/SELECTORS.md) |
| Choosing the next bead | `next-work --auto` ([`../relay/SKILL.md`](../relay/SKILL.md) §Ending) |
| The pass: readiness gate, plan, edit, build, verify, review, gate, parking | `implement <id> auto` ([`../implement/AUTO.md`](../implement/AUTO.md)) |
| Landing and closing the bead | `wrap-up`, with the project skill's `swarm.md` §Landing where it has one |
| The run-state block and the end report | [`../implement/AUTO.md`](../implement/AUTO.md) §Run state, §The report |
| A fresh context for each bead | [`../relay/SKILL.md`](../relay/SKILL.md) §Auto |

## The checkout

Every pass runs in the primary checkout, on a branch cut from `<default>` for that bead. No
worktree is made.

- **Every pass:** sync `<default>` per the global housekeeping rule (`git stash push -u`,
  `git merge --ff-only origin/<default>`, `git stash pop`), then
  `git switch -c <branch> <default>`. Uncommitted files that are not the pass's own stay
  uncommitted: the pass never commits, discards or works around them.
- `<branch>` is `<type>/<id>-<short-title>`, the name `wrap-up` reads the bead id from.

## Each hop

1. **Pick.** Run `next-work --auto` for the focus. `Next: implement <id>` names the bead.
   `Next: swarm <focus>` names the bead listed first under it. Every `none` or `iron-out` verdict
   ends the run with the report.
2. **Claim.** `bd update <id> --claim`, and `work_set` the bead at stage `plan` where the work
   board exists.
3. **Check out** the bead's branch per §The checkout.
4. **Work the pass** as `implement <id> auto` in the primary checkout. Move the board's stage
   as the pass moves.
5. **Land** through bare `wrap-up`, including when the pass's commits are already on `<default>`: wrap-up then takes its §Already landed path. Never land by hand and skip it. On a repo whose project skill `swarm.md` has a §Landing,
   land the way it says. The checkout ends on `<default>`. A parked pass parks per
   [`../implement/AUTO.md`](../implement/AUTO.md) §Parking an item, then switches back to
   `<default>`, leaving the branch.
6. **Next.** Update the run-state block (`Run: iterate <focus> in <repo>`), drop the bead from
   the board, and relay per [`../relay/SKILL.md`](../relay/SKILL.md) §Auto with
   `Start by: iterate <focus>`. Outside herdr and Wheel the next hop continues in this context.

## Ending

The run ends when `Used` reaches `Limit`, when `next-work --auto` prints a `none` or `iron-out`
verdict, or on any condition in [`../implement/AUTO.md`](../implement/AUTO.md) §What ends the run
early. Print the auto report, clear the work board, and leave the checkout on `<default>`. Close with `iterate: <landed> landed, <parked> parked, focus <focus or ready>`.
