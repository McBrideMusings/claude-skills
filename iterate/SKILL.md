---
name: iterate
description: "Work a repo's ready beads one at a time, unattended: each an `implement <id> auto` pass run by this session in one kept worktree, landed, then the next. The sequential sibling of `swarm` — same focus forms, no worker panes, no swarm space. `iterate`, `iterate epic:cc-12`, `iterate label:client 3`, `iterate the web browser feature`. Use for 'iterate over the epic', 'work through these one at a time', 'implement the epic without a swarm'."
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
| Landing and closing the bead | `wrap-up <worktree>`, with the project skill's `swarm.md` §Landing where it has one |
| The run-state block and the end report | [`../implement/AUTO.md`](../implement/AUTO.md) §Run state, §The report |
| A fresh context for each bead | [`../relay/SKILL.md`](../relay/SKILL.md) §Auto |

## The worktree

Every pass runs in one linked worktree, `~/.worktrees/<repo>/iterate-<focus>`, kept between
passes, so installed dependencies and built packages carry from one bead to the next. It is named
for what it iterates over: `<focus>` is the focus as typed, lowercased, every run of characters
outside `a-z0-9` made one `-` (`epic:oa-ne0` gives `iterate-epic-oa-ne0`; a bare `iterate` gives
`iterate-ready`). Two iterate runs on different focuses keep two worktrees, and the primary
checkout stays free for other work. The session itself
stays in the primary checkout and reaches the worktree with absolute paths, `git -C <worktree>`
and `admin -w <worktree>`.

- **First pass:** `git -C <repo> worktree add -b <branch> <worktree> <default>`, then the project
  skill's `swarm.md` first-build steps (submodules, install), once.
- **Every later pass:** `git -C <worktree> status --short` must print nothing. Then
  `git -C <worktree> switch -c <branch> <default>`. A dirty worktree ends the run, reported under
  `Needs you` with the paths `status` printed.
- `<branch>` is `<type>/<id>-<short-title>`, the name `wrap-up` reads the bead id from.

## Each hop

1. **Pick.** Run `next-work --auto` for the focus. `Next: implement <id>` names the bead.
   `Next: swarm <focus>` names the bead listed first under it. Every `none` or `iron-out` verdict
   ends the run with the report.
2. **Claim.** `bd update <id> --claim`, and `work_set` the bead at stage `plan` where the work
   board exists.
3. **Check out** the bead's branch per §The worktree.
4. **Work the pass** as `implement <id> auto` with `<worktree>` as its checkout: every edit,
   build, test and verify runs there. Move the board's stage as the pass moves.
5. **Land** through `wrap-up <worktree>`, including when the pass's commits are already on `<default>`: wrap-up then takes its §Already landed path. Never land by hand and skip it. On a repo whose project skill `swarm.md` has a §Landing,
   land the way it says. Step C's teardown keeps the worktree: in place of removing it, run
   `git -C <worktree> switch --detach <default>`, then `git -C <repo> branch -d <branch>`. A
   parked pass parks per [`../implement/AUTO.md`](../implement/AUTO.md) §Parking an item, then
   switches the worktree back to `<default>` detached, leaving the branch.
6. **Next.** Update the run-state block (`Run: iterate <focus> in <repo>`), drop the bead from
   the board, and relay per [`../relay/SKILL.md`](../relay/SKILL.md) §Auto with
   `Start by: iterate <focus>`. Outside herdr and Wheel the next hop continues in this context.

## Ending

The run ends when `Used` reaches `Limit`, when `next-work --auto` prints a `none` or `iron-out`
verdict, or on any condition in [`../implement/AUTO.md`](../implement/AUTO.md) §What ends the run
early. Print the auto report, clear the work board, and remove the worktree with
`git -C <repo> worktree remove <worktree>` once `git -C <worktree> status --short` prints nothing
(a dirty one stays and goes under `Needs you`). Close with `iterate: <landed> landed, <parked> parked, focus <focus or ready>`.
