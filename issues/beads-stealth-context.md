# beads:stealth — injected context

> Beads runs here, nothing is committed, and only beads you name travel.

- **A bead is private because you never name it** — in a push, or in any PR, commit or
  comment text. `bd create` makes one.
- **Publish one:** `bd github push <id>` prompts, then files it. `beads-stealth-guard.sh`
  denies every unscoped form. Flatten an epic first, and refresh theirs pull-only:
  [beads.md](beads.md) § Stealth.
- **Read `bd list`, never `gh issue list`.**
- **Starting an issue — never before — means slices plus a verify and a land bead under it**,
  private, dotted (`neutrino-7.1`). Shape: [breakdown.md](breakdown.md).
- **`bd dolt push` needs a `file://` remote you own**, or it adopts the git origin.

Depth: [_detect.md](_detect.md) § Stealth, [beads.md](beads.md) for verbs.
