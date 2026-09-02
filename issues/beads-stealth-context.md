# beads:stealth — injected context

> Beads runs here, nothing is committed, and only beads you name travel.

- **A bead is private because you never name it in a push.** `bd create` makes one.
- **Publish one:** `bd github push <id>` prompts, then files it. Every unscoped form is denied
  by `beads-stealth-guard.sh`.
- **Refresh theirs:** `GITHUB_TOKEN=$(gh auth token) bd github sync --pull-only`, then
  `bd rename <import-id> <prefix>-<n>`. A pull rewrites mirrored beads; private ones it
  cannot see.
- **Read `bd list`, never `gh issue list`.**
- **Starting an issue — never before — means slices plus a verify and a land bead under it**,
  private, dotted (`neutrino-7.1`). Shape: [breakdown.md](breakdown.md).
- **`bd dolt push` needs a `file://` remote you own**, or it adopts the git origin.

Depth: [_detect.md](_detect.md) § Stealth, [beads.md](beads.md) for verbs.
