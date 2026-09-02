# beads:stealth — injected context

> Beads runs here, nothing is committed, and only beads you name travel.

- **Two tiers, unmarked in the database.** A bead is private because you never name it in a
  push. `bd create` makes one.
- **Publish one:** `bd github push <id>` prompts, then files it. Unscoped forms — bare
  `bd github sync`, `--push-only` without `--issues`, `push` with no IDs — send *every* bead
  you own, and `beads-stealth-guard.sh` denies all three.
- **Refresh theirs:** `GITHUB_TOKEN=$(gh auth token) bd github sync --pull-only`, then
  `bd rename <import-id> <prefix>-<n>`. A pull rewrites mirrored beads; private ones it
  cannot see.
- **Read `bd list`, never `gh issue list`.**
- **`bd dolt push` needs a `file://` remote you own**, or it adopts the git origin.

Depth: [_detect.md](_detect.md) § Stealth, [beads.md](beads.md) for verbs.
