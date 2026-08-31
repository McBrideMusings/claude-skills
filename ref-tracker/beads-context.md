# tracker:beads — injected context

> Use `bd`, not `gh issue`. Gitignored Dolt store; git never shows sync.

`gh issue` here will fail or file into the wrong place.

- Work items are `bd` commands against the local `.beads/` store.
- `bd ready` is the queue; claim before starting so a parallel worker does not double up.
- **The store is a gitignored Dolt database, never a tracked file.** Issue data reaches the
  remote through `bd dolt push`, not through any git commit.
- **`git` cannot tell you whether beads are synced or backed up.** Every alarming git-side
  signal is normal here. Read beads.md before saying otherwise.

Depth: [beads.md](beads.md) for the command surface and the sync rules, [labels.md](labels.md)
for the label vocabulary. Upstream: https://beads.gascity.com/core-concepts/sync-concepts.
No cell for `tracker:github` — it is the default.
