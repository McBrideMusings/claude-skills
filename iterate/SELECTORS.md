# Resolving the work group (SCOPED mode only)

If a selector is present, resolve it to an **ordered list of concrete items** *before* the loop, then freeze it. Print the resolved queue for the user so they see exactly what will be worked and in what order. Each item is one of two kinds:

Resolve the issue backend once via [`../_tracker/_detect.md`](../_tracker/_detect.md) before resolving any selector — the commands below are given per backend.

- **Issue item** — carries an issue ID (a GitHub number, or a beads ID like `myproj-zb8`). Fed to a pass as `/implement <id> continuous`.
- **Local item** — a followup or papercut with no issue ID. Fed to a pass as `/implement continuous item:"<one-line description>" source:"<where it came from>"` (see implement Phase 0).

Selector forms (all match against **open** work only; dedupe by issue ID / by text):

| Selector | `beads` | `github` |
|---|---|---|
| `133 134 135` / `myproj-zb8 myproj-7b9` (bare IDs) | Exactly those issues, in the order given. | Same. |
| `#133-140` or `133-140` (range) | *No equivalent* — beads IDs are hashed, not sequential, so a numeric range is meaningless. Say so and ask for explicit IDs or a label. | Every integer in the inclusive range that is an **open** issue; skip numbers that are closed/missing and note them. |
| `label:<name>` (quote if it has spaces) | `bd list -l "<name>" --status open --json` → ordered by priority, then created. | `gh issue list --label "<name>" --state open --json number,title` → ordered ascending by number. |
| `milestone:<name>` | Milestones are epics: find it with `bd list -t epic --json`, then `bd list --parent <epic-id> --status open --json`. | `gh issue list --milestone "<name>" --state open --json number,title` → ordered ascending by number. |
| `ready` | `bd ready --json` → only unblocked work, in the backend's own priority order. **Prefer this selector on beads** — it is the one thing a flat tracker can't give you. | *No equivalent.* |
| `followups` | Read `<repo-root>/tmp/claude/followups.md`; each unresolved entry is one **local item**. `<repo-root>` = absolute `git rev-parse --show-toplevel`. | Same. |
| `papercuts` | Read `<repo-root>/tmp/claude/papercuts.md`; each entry is one **local item**. | Same. |

Multiple selectors may be combined (e.g. `iterate 133 label:RN`); union them, dedupe, preserve first-seen order.

**Freeze the queue.** The list is fixed at resolution time. Newly-added matching issues that appear mid-run are **not** picked up — a scoped run is deterministic and finite by design. If the user wants a moving target, that's a second `iterate` run.

**On beads, order the frozen queue by dependency.** A blocker must come before what it blocks or the later pass will start against unfinished ground. After resolving the queue, check each item's blockers (`bd show <id> --json` → `dependency_count`, or `bd dep tree <id>`) and topologically sort. If an item's blocker is *outside* the frozen queue and still open, drop that item and say which blocker held it back — don't silently work something that isn't ready.

**Verify before freezing.** For issue items, confirm each is open (`bd show <id> --json` / `gh issue view <n> --json number,state`); drop and note any that are closed/missing. If the resolved queue is empty, halt: *"No open items matched <selector> — nothing to iterate."*
