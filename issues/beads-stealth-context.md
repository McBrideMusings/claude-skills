# beads:stealth — injected context

> Beads runs here, nothing is committed, and only beads you name travel.

- **A bead is private because you never name it in a push.** `bd create` makes one.
- **Publish one:** `bd github push <id>` prompts, then files it. Every unscoped form is denied
  by `beads-stealth-guard.sh`.
- **Flatten before you publish.** `bd github push` on an `epic`-typed bead files a GitHub
  milestone plus one issue per child — not the single tracked issue "publish one" implies.
  If you want one issue, the bead must not be typed `epic` when you push it: fold the
  children's substance into the parent's description (a checklist is enough) and `bd delete`
  them first, or push a `feature`/`task` bead that was never split into children at all.
- **Refresh theirs:** `GITHUB_TOKEN=$(gh auth token) bd github sync --pull-only`, then
  `bd rename <import-id> <prefix>-<n>`. A pull rewrites mirrored beads; private ones it
  cannot see.
- **Read `bd list`, never `gh issue list`.**
- **Starting an issue — never before — means slices plus a verify and a land bead under it**,
  private, dotted (`neutrino-7.1`). Shape: [breakdown.md](breakdown.md).
- **`bd dolt push` needs a `file://` remote you own**, or it adopts the git origin.

Depth: [_detect.md](_detect.md) § Stealth, [beads.md](beads.md) for verbs.
