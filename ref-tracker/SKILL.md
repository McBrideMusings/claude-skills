---
name: ref-tracker
description: Issue tracking — which backend this repo uses, beads or GitHub, and its verbs. Load before creating, reading, closing or labelling a tracked item.
---

# Tracker knowledge

| Open | When |
| --- | --- |
| [`../_tracker/_detect.md`](../_tracker/_detect.md) | **Always first.** Resolves which backend this repo uses before any tracker verb runs. A bare `gh issue list` on a beads repo silently reports an empty backlog — the issues are in a database `gh` cannot see. |
| [`../_tracker/beads.md`](../_tracker/beads.md) | The repo resolved to beads: `bd` verbs, the Dolt store, mirror mode and `external_ref`. |
| [`../_tracker/github.md`](../_tracker/github.md) | The repo resolved to GitHub: `gh issue` verbs and its own conventions. |
| [`../_tracker/beads-context.md`](../_tracker/beads-context.md) | Working in a beads repo and needing the store's shape rather than its verbs. |
| [`../_tracker/labels.md`](../_tracker/labels.md) | Choosing or creating a label on either backend. |

`gh pr …` is exempt from backend resolution — pull requests are GitHub-only on every backend.
