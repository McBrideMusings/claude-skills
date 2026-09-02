# beads:mirror — injected context

> Beads is the truth; GitHub Issues is a copy you push to.

**Edit the bead, then push. Never author on GitHub.**

```bash
bd update <id> --body-file <path>
bd github sync --push-only --issues <id>
```

- **Reads never touch `gh issue`** — the copy lags by design. Read `bd`.
- **A push writes title, description and status out faithfully.** Beads-first loses nothing.
- **⛔ Every push invents `type::`/`priority::` labels in the repo.** No config disables it;
  delete them after — cleanup in [beads.md](beads.md) § Mirror mode.
- **⛔ A pull resets labels, `issue_type` and `priority`.** Pull only to collect a person's UI
  edit, scoped `--issues <id>`, then re-apply.
- **`area:`/`human` never travel outward.** Apply them with `gh issue edit`.

Depth: [_detect.md](_detect.md) § Mirror mode, [beads.md](beads.md) § GitHub sync.
