# Aspect brief: `backlog` (native; the fix is `issues shape`)

Axis tag: `backlog`. Applicability: the repo has a `.beads/` directory. A backlog whose labels,
types and edges have drifted cannot be filtered or ordered, and every agent that files the next
bead copies the drift it sees.

**Read:** [`../../issues/labels.md`](../../issues/labels.md) for what a label may be, and
[`../../issues/shape.md`](../../issues/shape.md) Phase 0 for what a structured backlog looks like.
Everything below is read-only: run the commands, write nothing to the tracker.

## Checks

| Run | A finding when |
| --- | --- |
| `~/.claude/tools/bead-labels path` | it exits 2: the repo has no `.beads/labels.toml`, so no label is checked. One finding, and it leads. |
| `~/.claude/tools/bead-labels check` | it prints anything. Group the output by problem (label not in the file, child without parent, no required label) and give counts with three example ids each. |
| `bd label list-all` | a label carries a colon, restates a type or priority (`bug`, `epic`, `spike`, `p1`), or is `afk`/`hitl`. |
| `grep -n -A8 'END BEADS INTEGRATION' .beads/hooks/pre-commit` | `.beads/hooks/` exists and the label block from `labels.md` is missing after the marker. |
| `bd human list` | it is empty while open beads plainly wait on a person (a decision, a device, an account). |
| `bd doctor --check=conventions`, `bd orphans`, `bd swarm validate` | they report anything. |

## Aspect-specific rules

- **Every finding's fix is the same pass: `issues shape`.** Write it as the remedy line rather than
  inventing per-finding fixes; shape's Phase 0 writes `labels.toml` when it is missing,
  reconciles every label, and wires the pre-commit block.
- Do not relabel, retype or edit any bead. The findings are the deliverable.
- A repo with no `.beads/` is out of this aspect's scope, not a finding.
