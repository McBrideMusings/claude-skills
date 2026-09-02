# beads:stealth — injected context

> Beads runs here, nothing about it is committed, the database never leaves.

- **Client-visible issues go to `gh issue create` FIRST**, then `bd github sync --pull-only`
  brings them back. `bd create` is the tier that stays: breakdown, edges, notes.
- **Pull only.** Bare `bd github sync` is bidirectional — it files a GitHub issue for every bead.
- **Rename a pulled bead to its issue number** — `bd rename <import-id> <prefix>-<n>`.
  `external_ref` is the sync key, not the ID.
- **`bd dolt push` needs a `file://` remote you own**, or it adopts the git origin and pushes the
  database to their repo. `beads-stealth-guard.sh` denies both.
- `.beads/` is invisible to `git status`, readable by anyone with disk access.

Depth: [_detect.md](_detect.md) § Stealth, [beads.md](beads.md) for verbs.
