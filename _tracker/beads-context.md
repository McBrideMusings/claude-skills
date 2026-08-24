# tracker:beads — injected context

> Issue backend is beads, not GitHub Issues. Use `bd`, never `gh issue`.

This repo's issue backend is **beads**, not GitHub Issues. `gh issue` here is wrong and
will either fail or file into the wrong place.

- Work items are `bd` commands against the local `.beads/` store.
- `bd ready` is the queue; claim before starting so a parallel worker does not double up.
- The store is a tracked file, so an item you create is a commit like any other.

Depth: [beads.md](beads.md) for the command surface, [labels.md](labels.md) for the label
vocabulary. There is deliberately no cell for `tracker:github` — it is the default and a
cell would spend tokens restating what is already assumed.
