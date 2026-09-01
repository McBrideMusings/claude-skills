# beads:stealth — injected context

> Beads runs here, nothing about it is committed, the database never leaves.

- **Client-visible issues go to `gh issue create` FIRST**, then `bd github sync --pull-only`
  brings them back as beads. `bd create` is for the tier that stays: your task breakdown,
  dependency edges, notes on their code.
- **Pull is the only permitted sync direction.** Bare `bd github sync` is bidirectional and
  would file a GitHub issue for every bead you own.
- **`bd dolt push` needs a `file://` remote you own**, or it adopts the git origin and pushes
  the whole database to their repo. `beads-stealth-guard.sh` denies both mistakes.
- `.beads/` is invisible to `git status`, readable by anyone with filesystem access.

Depth: [_detect.md](_detect.md) § Stealth, [beads.md](beads.md) for the command surface.
