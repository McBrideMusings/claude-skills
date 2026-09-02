# beads:mirror — injected context

> Beads is the source of truth. GitHub Issues is a copy you publish to.

**Edit beads, then push. That is the disposition everywhere the two are paired.** A change
starts as a `bd` write and reaches GitHub because you pushed it — not the reverse.

```bash
bd update <id> --body-file <path>          # or --priority, -t, label add/remove
bd github sync --push-only --issues <id>   # publish that one item
```

- **Reads never touch `gh issue`.** The copy lags by design, so `gh issue list` reports a stale
  backlog as if it were the whole picture. Read `bd`.
- **A push writes title, description and status from the bead** — so beads-first loses nothing
  on the way out.
- **⛔ Delete the `::` labels a push invents.** Each push creates and applies `type::<type>` and
  `priority::<level>` in the repo — second copies of fields beads already owns, in a prefix
  scheme that is neither ours nor beads'. No config disables it. After a push:
  `gh label list --json name --jq '.[].name' | grep -E '^(type|priority)::' | xargs -r -I{} gh label delete {} --yes`
  (deleting a label removes it from every issue in one call).
- **A push does not carry `area:`/`human`.** Apply those to GitHub with `gh issue edit`, or
  leave GitHub unlabelled — never expect a sync to move them.

## Pulling

Not forbidden, not routine. Pull to collect an edit a person made in the GitHub UI.

**⛔ A pull overwrites labels, `issue_type` and `priority` from GitHub, which holds no type or
priority at all** — so they reset to defaults and the bead's label set becomes GitHub's. Scope
it (`--issues <id>`) and re-apply those three fields afterwards. Details and the measurement
are in [_detect.md](_detect.md) § Mirror mode.

## Unsettled: repos with other contributors

The beads-first disposition is for repos you alone write to. Where other people file and edit
issues — multi-contributor and freelance work — their edits only exist on GitHub, so a
push-only posture silently overwrites them. **That case is not decided.** Do not apply
beads-first there and do not invent a rule for it; ask.

Depth: [_detect.md](_detect.md) § Mirror mode, [beads.md](beads.md) § GitHub sync.
