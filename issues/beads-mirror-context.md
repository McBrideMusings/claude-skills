# beads:mirror — injected context

> Beads is the source of truth; GitHub Issues is a lagging copy.

- **Reads never touch `gh issue`.** The mirror lags by design, so `gh issue list` here reports
  a stale backlog as if it were the whole picture. Read `bd` only.
- **GitHub owns title and description on a bead with `external_ref`.** A local `bd update
  --description` is destroyed by the next pull, silently. Edit those on GitHub.
- **Writes push one item, scoped:** `bd github sync --push-only --issues <id>`. Bare
  `bd github sync` is bidirectional across the whole backlog.
- **This is the push half only.** A [beads:stealth](beads-stealth-context.md) repo may also
  pull; what it may never do is push.

Depth: [_detect.md](_detect.md) § Mirror mode, [beads.md](beads.md) § GitHub sync.
