---
name: issues
description: Issue tracking. Every repo tracks work in beads — `bd`, never `gh issue` — and git can never tell you whether beads are synced, so git-side signals about `.beads/` are normal. Load before creating, reading, closing or labelling a tracked item.
---

# Issue tracking

**Beads is the assumption, not a finding.** A repo tracks work in `bd` unless
[`./_detect.md`](./_detect.md) says otherwise. You do not need a label, a marker, or an
injected line to know this — it is true of every repo.

| Open | When |
| --- | --- |
| [`./README.md`](./README.md) | Orientation to the whole cell — open when you need who-reads-what across the files. |
| [`./_detect.md`](./_detect.md) | **Always first.** Confirms the backend and resolves the two things that vary: mirror mode and stealth. |
| [`./beads.md`](./beads.md) | `bd` verbs, the Dolt store, mirror mode and `external_ref`. |
| [`./github.md`](./github.md) | The repo has no beads yet and resolved to GitHub: `gh issue` verbs and its own conventions. |
| [`./beads-stealth-context.md`](./beads-stealth-context.md) | Working in a stealth repo and needing the posture rather than the verbs. |
| [`./labels.md`](./labels.md) | Choosing or creating a label on either backend. |

`gh pr …` is exempt from backend resolution — pull requests are GitHub-only on every backend.
