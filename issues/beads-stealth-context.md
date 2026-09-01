# beads:stealth — injected context

> Beads runs here, nothing about it is committed, and nothing pushes out.

- **Pull is the only permitted direction.** `bd github sync --pull-only` seeds your local graph
  from their backlog — that is what stealth is for. Bare sync is bidirectional and would file a
  GitHub issue for every bead you own.
- **`bd dolt push` needs a `file://` remote you own.** Unset, it adopts the git origin and
  pushes the whole database to their repo. `beads-stealth-guard.sh` denies both mistakes.
- `.beads/` sits in the working directory, invisible to `git status`, readable by anyone with
  filesystem access. Say that limit out loud once.
- Nothing about beads reaches a commit or PR — `AGENTS.md` and git hooks included.

Depth: [_detect.md](_detect.md) § Stealth, [beads.md](beads.md) for the command surface.
