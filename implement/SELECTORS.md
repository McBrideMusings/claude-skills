# Selectors — resolving a scope

Shared table: any skill that needs to resolve a named scope of issues into a concrete list —
`issues shape`'s Scope section, a batch of followups, a range of numbers — uses this table
rather than inventing its own syntax, because a selector means the same thing everywhere.

Resolve the issue backend once — invoke `issues` and run its detection step — before resolving
any selector — the commands below are given per backend.

Selector forms (all match against **open** work only; dedupe by issue ID / by text):

| Selector | `beads` | `github` |
|---|---|---|
| `133 134 135` / `myproj-zb8 myproj-7b9` (bare IDs) | Exactly those issues, in the order given. | Same. |
| `#133-140` or `133-140` (range) | *No equivalent* — beads IDs are hashed, not sequential, so a numeric range is meaningless. Say so and ask for explicit IDs or a label. | Every integer in the inclusive range that is an **open** issue; skip numbers that are closed/missing and note them. |
| `label:<name>` (quote if it has spaces) | `bd list -l "<name>" --status open --json` → ordered by priority, then created. | `gh issue list --label "<name>" --state open --json number,title` → ordered ascending by number. |
| `epic:<id>` or `epic:<name>` | `bd list --parent <epic-id> --status open --json`; resolve a name through `bd list -t epic --json` first. `bd ready --parent <epic-id> --limit 0 --json` for the unblocked subset. | Sub-issues of that issue: the GraphQL `subIssues` field on `Issue` (see `../issues/github.md`). |
| `milestone:<id>` or `milestone:<name>` | A bead of bd's built-in `milestone` type; resolve a name through `bd list -t milestone --json`. Its scope is what its `blocks` edges reach, transitively, each parent standing for its children: the `waves` and `person` rows of `~/.claude/skills/implement/epic-plan --json <repo> <id>` (its `done` rows are closed, so out of scope), never a `bd list` filter. | `gh issue list --milestone "<name>" --state open --json number,title` → ordered ascending by number. |
| `ready` | `bd ready --limit 0 --json` → only unblocked work, in the backend's own priority order. Run `bd recompute-blocked` first; `bd ready` reads a denormalized flag that goes stale after a hand-resolved merge and will silently hide ready work. **Prefer this selector on beads.** | No single query — list, then filter on `blockedBy.totalCount == 0`. GitHub stores the edges but computes no front. |
| free text — `the web browser feature`, `related to the client` | A focus, not a filter: it drops nothing. Run `issues next focus="<text>"` ([`../issues/next.md`](../issues/next.md), autonomous-caller mode) over the open set; its relevance scoring ranks the beads in the focus first. The caller then narrows the ranked set (ready only, human only, and so on). Anything that is not one of the other forms is free text. Combined with another selector, it ranks that selector's result. | Same. |
| `followups` | Issues labelled `followup` on the resolved backend. There is no local followups file. | Same. |
| `papercuts` | Read the path `"$HOME/.claude/tools/papercut" --path` prints; each entry is one **local item**. | Same. |

`implement`, `swarm` and `issues iron-out` resolve their focus argument through this table and carry no selector rows of their own. `issues shape` shares the forms except free text, which it routes to charting a foggy effort.

Multiple selectors may be combined (e.g. `label:RN followups`); union them, dedupe, preserve
first-seen order.

**Freeze the scope.** The list is fixed at resolution time. Newly-added matching issues that
appear mid-pass are **not** picked up — a scoped run is deterministic and finite by design. If
the user wants a moving target, that is a second run.

**Verify before freezing.** Confirm each issue item is open (`bd show <id> --json` /
`gh issue view <n> --json number,state`); drop and note any that are closed/missing. If the
resolved scope is empty, halt: *"No open items matched <selector> — nothing to do."*
