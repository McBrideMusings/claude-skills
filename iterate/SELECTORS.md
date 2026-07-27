# Resolving the work group (SCOPED mode only)

If a selector is present, resolve it to an **ordered list of concrete items** *before* the loop, then freeze it. Print the resolved queue for the user so they see exactly what will be worked and in what order. Each item is one of two kinds:

- **Issue item** — carries a GitHub issue number. Fed to a pass as `/implement <n> continuous`.
- **Local item** — a followup or papercut with no issue number. Fed to a pass as `/implement continuous item:"<one-line description>" source:"<where it came from>"` (see implement Phase 0).

Selector forms (all match against **open** work only; dedupe by issue number / by text):

| Selector | Resolution |
|---|---|
| `133 134 135` (bare numbers) | Exactly those issues, in the order given. |
| `#133-140` or `133-140` (range) | Every integer in the inclusive range that is an **open** issue; skip numbers that are closed/missing and note them. |
| `label:<name>` (quote if it has spaces) | `gh issue list --label "<name>" --state open --json number,title` → ordered ascending by number. |
| `milestone:<name>` | `gh issue list --milestone "<name>" --state open --json number,title` → ordered ascending by number. |
| `followups` | Read `<repo-root>/tmp/claude/followups.md`; each unresolved entry is one **local item**. `<repo-root>` = absolute `git rev-parse --show-toplevel`. |
| `papercuts` | Read `<repo-root>/tmp/claude/papercuts.md`; each entry is one **local item**. |

Multiple selectors may be combined (e.g. `iterate 133 label:RN`); union them, dedupe, preserve first-seen order.

**Freeze the queue.** The list is fixed at resolution time. Newly-added matching issues that appear mid-run are **not** picked up — a scoped run is deterministic and finite by design. If the user wants a moving target, that's a second `iterate` run.

**Verify before freezing.** For issue items, confirm each is open (`gh issue view <n> --json number,state`); drop and note any that are closed/missing. If the resolved queue is empty, halt: *"No open items matched <selector> — nothing to iterate."*
