# Backend: local markdown

The fallback when there is no beads database and no authed GitHub remote. One file per repo:

```
<repo-root>/tmp/claude/followups.md
```

**Resolve `<repo-root>` to an ABSOLUTE path** — `git rev-parse --show-toplevel` in its own Bash
call, falling back to the absolute output of `pwd` outside a git repo. A cwd-relative
`tmp/claude/followups.md` lands wherever the shell happens to be (a subdir, or a worktree where
the file does not exist) and a later session will not find it. Ensure `tmp/` is in the root
`.gitignore`, then `mkdir -p <root>/tmp/claude` as a separate call.

## Verb table

| Verb | How |
| --- | --- |
| **create** | append a `- [ ] <title>` item with a one-line body under the current date heading |
| **list open** | read the file; every unchecked item above the `## Resolved` heading |
| **ready** | *no equivalent* — the file has no dependency graph; treat every open item as ready |
| **show** | the item's own lines |
| **claim** | *no equivalent* — a single-user file has no assignees |
| **close** | move the item into the `## Resolved` section at the bottom — **never delete it** |
| **comment** | append an indented line beneath the item |
| **label** | a `[tag]` prefix in the title, by convention only |
| **count open** | count unchecked items above `## Resolved` |
| **link** | prose only (`blocked by: <other item's title>`) |

`papercut` keeps its own separate log at `<repo-root>/tmp/claude/papercuts.md`, written only
through `"$HOME/.claude/tools/papercut"` — never hand-edited, and not part of this backend.

## This is a fallback, not a choice

The only reason to use it is that neither beads nor GitHub resolved. If the user is doing real
tracked work here, `bootstrap` should offer `bd init` — a local Dolt database needs no remote and
no account, and gives dependency-aware `bd ready` that this file cannot.
