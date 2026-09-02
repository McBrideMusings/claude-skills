# beads:mirror — injected context

> Beads is the truth; GitHub Issues is a copy you push to.

**Edit the bead, then push. Never author on GitHub.**

```bash
bd update <id> --body-file <path>
bd github sync --push-only --issues <id>
```

- **Reads never touch `gh issue`** — the copy lags. Read `bd`.
- **A push writes title, description and status out faithfully.**
- **⛔ Every push invents `type::`/`priority::` labels.** Cleanup in [beads.md](beads.md).
- **⛔ A pull resets labels, `issue_type` and `priority`.** Pull scoped, `--issues <id>`.
- **`area:`/`human` never travel outward.** Apply them with `gh issue edit`.
- **Starting an issue — never before — means slices plus a verify and a land bead under it**,
  pushed like any other. Shape: [breakdown.md](breakdown.md).

Depth: [_detect.md](_detect.md) § Mirror mode, [beads.md](beads.md) § GitHub sync.
