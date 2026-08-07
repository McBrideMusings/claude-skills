# Backend: beads (`bd`)

Dolt-backed local issue tracker. Verified against `bd version 1.1.2`. IDs are
`<prefix>-<hash>` — the prefix defaults to the directory name at `bd init` (`bd where --json`
prints it), the suffix is hashed so concurrent agents don't collide. A repo initialised with
`--prefix myproj` produces IDs like `myproj-zb8`. Add `--json` (a global flag) to any read
command for machine output.

`bd list --json` and `bd ready --json` return a bare array; each element carries
`id, title, status, priority, issue_type, owner, created_at, updated_at, dependency_count,
dependent_count, comment_count`. `bd count --json` returns `{"count": N, "schema_version": 1}`;
without `--json` it prints the bare number. `bd where --json` returns `{database_path, path,
prefix}` — use its exit code as the beads-present test.

## Verb table

| Verb | Command |
| --- | --- |
| **create** | `bd create "<title>" -t <type> -p <0-4> -l <l1,l2> -d "<body>"` |
| create, body from file | `bd create "<title>" --body-file <path>` (`-` for stdin) |
| create, ID only | add `--silent` — prints the ID and nothing else |
| create as child | add `--parent <parent-id>` |
| create with blockers | add `--deps blocks:<id>,discovered-from:<id>` |
| create many | `bd create --file <markdown>` or `--graph <plan.json>` |
| **list open** | `bd list --status open --json` |
| list by label | `bd list -l <label> --json` (AND) / `--label-any <a,b>` (OR) |
| list by type | `bd list -t bug --json` |
| list children | `bd list --parent <id> --json` |
| list all incl. closed | `bd list --all --json` |
| **ready** (unblocked) | `bd ready --json` — add `--explain` for the blocker reasoning |
| ready under an epic | `bd ready --parent <epic-id> --json` |
| **blocked** | `bd blocked --json` |
| **show** | `bd show <id> --json` (`--include-comments` for full threads) |
| **claim** | `bd update <id> --claim` — sets assignee to you + status `in_progress`, idempotent |
| claim next ready | `bd ready --claim` |
| **update** | `bd update <id> -s <status> -p <0-4> -a <who> --title "<t>" -d "<body>"` |
| **close** | `bd close <id> -r "<reason>"` — add `--suggest-next` to see what just unblocked |
| **comment** | `bd comment <id> "<text>"` (`--file <path>` / `--stdin`) |
| **label add / remove** | `bd label add <id> <label>` / `bd label remove <id> <label>` |
| set labels wholesale | `bd update <id> --set-labels a,b` |
| **assign** | `bd update <id> -a <who>` |
| **count open** | `bd count --status open` (`--by-label`, `--by-priority`, `--by-status`) |
| **link** (dependency) | `bd dep add <id> <blocker-id> -t blocks` |
| link, other kinds | `-t parent-child \| discovered-from \| related \| supersedes` |
| unlink | `bd dep remove <id> <blocker-id>` |
| dependency tree | `bd dep tree <id>` |
| **epic** (milestone equivalent) | `bd create "<name>" -t epic` then `--parent <epic-id>` on members |
| epic progress | `bd epic status` (all epics; `--eligible-only` for those whose children are all done) |
| **defer** | `bd defer <id> --until "+2w"` — hidden from `bd ready` until then |
| **external ref** | `--external-ref gh-<n>` on create/update — records the GitHub issue it came from |

## Field mapping from GitHub

| GitHub | beads |
| --- | --- |
| issue number `#42` | ID `<prefix>-<hash>`, e.g. `myproj-zb8` |
| labels | labels (same) |
| milestone | epic (`-t epic` + `--parent`) |
| assignee | assignee |
| `state: open/closed` | `--status open \| in_progress \| blocked \| deferred \| closed` |
| body | `-d/--description`, plus `--design`, `--acceptance`, `--notes` as separate fields |
| "Blocked by #N" in prose | a real edge: `bd dep add <id> <blocker> -t blocks` |
| P0–P4 label convention | `-p 0`–`-p 4` (0 = highest) |

Prefer the structured fields over stuffing everything into the description — `--acceptance` is
what `implement` checks against, and `bd ready` only works if blockers are real edges.

## Priority

`-p 0` critical · `1` high · `2` medium (default) · `3` low · `4` backlog.

## Types

`bug | feature | task | epic | chore | decision`. Aliases: `feat`→`feature`, `adr`/`dec`→`decision`.

## Sync

Issue data moves over the git remote via Dolt, not via git commits.

```bash
bd dolt pull     # before reading, if the repo is shared
bd dolt push     # at the end of a session that wrote
```

`bd init` installs git hooks that handle most of this; an explicit `bd dolt push` at session end
is still the reliable close-out (`wrap-up` does it).

**`bd dolt push` configures a remote if none exists.** On a repo with no `sync.remote` set, it
prints `Configured Dolt remote origin from git origin.` and pushes the issue database to the git
origin under `refs/dolt/data` — it does not fail, and it does not ask. That ref is separate from
git branches and never shows in the GitHub Issues tab, but the issue data does leave the machine.
On a repo the user deliberately kept local, confirm before the first push, and check with
`bd config get sync.remote` (`(not set)` means no remote yet) if you need to know beforehand.

## Mirror mode

If `bd github status` reports `Status: ✅ Configured`, push each write through:

```bash
bd github sync --push-only --issues <id>
```

Full bidirectional reconcile is `bd github sync` (conflict policy `--prefer-newer` by default,
or `--prefer-local` / `--prefer-github`). Preview anything unfamiliar with `--dry-run`.
