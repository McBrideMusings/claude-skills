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

## Permissions — per machine, not synced

`~/.claude/settings.json` is deliberately gitignored (see `~/.claude/CONTRIBUTING.md` — the repo is
default-deny with an allowlist, and per-machine settings stay local). So these entries do **not**
follow you to a new machine or into the `~/.claude-work` profile, and without them every `bd` call
prompts, which kills any unattended `implement` / `iterate` / `orchestrate` run. Add them under
`permissions` on each machine:

```jsonc
"allow": [ "Bash(bd *)" ],
"ask":   [ "Bash(bd delete:*)", "Bash(bd prune:*)", "Bash(bd purge:*)",
           "Bash(bd flatten:*)", "Bash(bd admin reset:*)" ]
```

`ask` wins over `allow`, so the five destructive verbs still surface a prompt. Everything else —
every read, every `create`/`update`/`close`, `dolt push`, `export` — runs without one.

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

### ⛔ Pushing the database to `origin` is the design. Never treat it as a leak.

**`bd dolt push` configures the git origin as the Dolt remote if none is set, then pushes.** It
prints `Configured Dolt remote origin from git origin.`, writes the issue database under
`refs/dolt/data`, and creates a `__dolt_remote_info__` branch. It does not fail and it does not
ask, **because that is beads working correctly** — "data travels with the repo" is the whole
portability model. `.beads/` is gitignored and disposable; the durable copy is those refs. A clone
rehydrates its local database from them. Deleting them destroys the only off-machine copy.

So, with no hedging:

- Seeing `refs/dolt/data` or `refs/heads/__dolt_remote_info__` in `git ls-remote` **is not a
  finding.** Do not report it, do not flag it, do not ask about it. Say nothing.
- **Never** `bd config unset sync.remote`, and **never** delete either ref.
- Run `bd dolt push` at session end as `wrap-up` prescribes. No confirmation needed, first push
  included.
- `bd` auto-committing `sync.remote` into `.beads/config.yaml` (commit message `bd: update
  sync.remote`) is also correct. It is the repo's own address in its own repo — not a secret, not
  a deploy target to strip.

**"No GitHub mirror" in a `CLAUDE.md` / `CLAUDE.local.md` never means "no beads data on GitHub."**
It means the GitHub *Issues* mirror — `bd github sync` / `github.repository` — is off, so nothing
appears in the Issues tab. Verify with `bd config get github.repository`; `(not set)` is the
compliant state. These are two unrelated mechanisms, and reading a line about one as a rule about
the other has already cost real time.

## JSONL export — on by default in this setup

Separate from sync, and **not** a substitute for it. The Dolt refs remain the source of truth and
the only real backup; `bd export --help` says outright that JSONL "does not capture Dolt branches,
commit history, working-set state, or non-issue tables." What the export buys is a plain-text
copy of the backlog committed alongside the code: readable on github.com, diffable in PRs,
greppable without `bd` installed.

**Standing convention: every beads repo here has it on.** `bootstrap` turns it on at init; if you
find a beads repo without it, turn it on.

```bash
bd config set export.auto true
bd config set export.git-add true
bd export --output .beads/issues.jsonl   # one-time seed — see below
git add .beads/issues.jsonl
```

### ⛔ `export.auto: true` does nothing until the file is already tracked

Verified on `bd 1.1.2`. Setting the config and committing produces **no file at all**. Run the
hook with `--verbose` and it says why:

```
pre-commit: skipping JSONL export — no staged .beads paths
auto-export: skipping — running as git hook
```

The pre-commit hook only refreshes `issues.jsonl` when the commit already stages something under
`.beads/`, and the interval-based auto-export deliberately stands down inside a git hook. So the
file that does not exist is never staged, is therefore never written, and the setting looks broken
while reporting `true` from `bd config get`.

**Break the loop once with an explicit `bd export` + `git add`.** After that first commit it is
self-maintaining: every later commit picks up a fresh `issues.jsonl` automatically, staged by the
hook, even when the commit is otherwise unrelated to issues. Confirmed — a commit touching only
`README.md` came out as `.beads/issues.jsonl | 1 +` and `README.md | 1 +`.

`bd config set export.auto true` writes a flat `export.auto:` key beside any existing `export:`
map in `config.yaml`. It looks wrong and reads back correctly; leave it alone.

### Pull before reading, push after writing

Issue state travels between machines through Dolt, and nothing in git brings it along. So a
session that touches issues brackets its work:

```bash
bd dolt pull     # before the first read — another machine may have moved the backlog
bd dolt push     # after the last write
```

`wrap-up` does both. The `issues.jsonl` in the commit is a by-product of that, never the carrier —
a clone that only has the JSONL and never pulls has a stale, read-only picture.

## Mirror mode

If `bd github status` reports `Status: ✅ Configured`, push each write through:

```bash
bd github sync --push-only --issues <id>
```

Full bidirectional reconcile is `bd github sync` (conflict policy `--prefer-newer` by default,
or `--prefer-local` / `--prefer-github`). Preview anything unfamiliar with `--dry-run`.
