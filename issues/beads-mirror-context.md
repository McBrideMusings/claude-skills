# beads:mirror — injected context

> Beads is the source of truth; GitHub Issues is a lagging copy.

- **Reads never touch `gh issue`.** The mirror lags by design, so `gh issue list` here reports
  a stale backlog as if it were the whole picture. Read `bd` only.
- **Writes push one item, scoped:** `bd github sync --push-only --issues <id>`. Bare
  `bd github sync` is bidirectional across the whole backlog.
- Mirror mode changes no verb table; it appends one push per write.
- **Mutually exclusive with [beads:stealth](beads-stealth-context.md).** If both resolve for one
  repo, stop and say so rather than syncing.

Depth: [_detect.md](_detect.md) § Mirror mode for detection, [beads.md](beads.md) § GitHub sync
for the flags.
