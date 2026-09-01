# Backend: beads (`bd`)

**Load this before saying anything about where bead data lives, whether it is backed up, or
whether it reached the remote.** Reasoning about beads storage from `git ls-files`, `.gitignore`,
or a hook listing produces confident wrong answers — see [Never infer sync state from
`git`](#never-infer-sync-state-from-git). Upstream docs: https://beads.gascity.com/, and
https://beads.gascity.com/core-concepts/sync-concepts for sync specifically.

Dolt-backed local issue tracker. Verified against `bd version 1.2.2`. IDs are
`<prefix>-<hash>` — the prefix defaults to the directory name at `bd init` (`bd where --json`
prints it), the suffix is hashed so concurrent agents don't collide. A repo initialised with
`--prefix myproj` produces IDs like `myproj-zb8`. Add `--json` (a global flag) to any read
command for machine output.

`bd list --json` and `bd ready --json` return a bare array; each element carries
`id, title, status, priority, issue_type, owner, created_at, updated_at, dependency_count,
dependent_count, comment_count`. `bd count --json` returns `{"count": N, "schema_version": 1}`;
without `--json` it prints the bare number. `bd where --json` returns `{database_path, path,
prefix}` — use its exit code as the beads-present test.

## Permissions

`~/.claude/settings.json` is tracked, and `~/.claude-work/settings.json` is a symlink to it, so
these entries follow you to a new machine and into the work profile once committed. Without them
every `bd` call prompts, which kills any unattended `implement` / `iterate` / `orchestrate` run.
Add them under `permissions` once:

```jsonc
"allow": [ "Bash(bd *)" ],
"ask":   [ ]
```

**Every `bd` verb runs unprompted, destructive ones included.** There is no `ask` gate on
`bd delete`, `prune`, `purge`, `flatten`, or `admin reset`. Those five were gated until
2026-08-21; Pierce removed them, and the reason is worth carrying: beads writes land in a repo,
git is the undo, and a prompt on every `bd delete` breaks unattended `implement` / `iterate` /
`orchestrate` runs for no safety that git doesn't already provide. Don't reinstate them, and
don't route around the allow by asking in chat first.

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
| **label add / remove** | `bd label add <id> <label>` / `bd label remove <id> <label>` — which label: [`labels.md`](labels.md) |
| set labels wholesale | `bd update <id> --set-labels a,b` |
| audit label drift | `bd label list-all` — anything that is not `human` and has no `area:`/`platform:` prefix is drift |
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
| **search** | `bd search "<text>"` — keyword search across issues |
| **query** | `bd query "<expr>"` — the structured query language, for filters `bd list` can't express |
| **graph** | `bd graph` — render the dependency graph |
| **validate an epic** | `bd swarm validate <epic-id>` (`--verbose` for the issue graph) |
| **flag for a human** | the `human` label; `bd human list \| respond <id> \| dismiss <id> \| stats` |
| **acceptance criteria** | `--acceptance "<check>"` on create/update; `--validate` refuses a body missing required sections |
| **repair blocked flags** | `bd recompute-blocked` |

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

## The graph engine — don't re-implement any of it

`bd` computes structure quality itself. Any skill that needs ordering, validation or hygiene
calls these rather than traversing the graph by hand; a second traversal is free to disagree
with the one beads ships.

```bash
bd doctor --check=conventions   # lint + stale + orphans in one pass
bd orphans                      # broken dependency references
bd lint                         # issues missing required sections
bd stale                        # no recent activity
bd find-duplicates              # semantically similar issues (text analysis or AI)
bd preflight                    # pre-PR: lint, stale, orphans
bd swarm validate <epic-id>     # the big one, below
```

**`bd swarm validate` is the roadmap primitive.** It checks dependency direction
(**requirement-based, not temporal**), orphaned roots, missing dependencies on leaves, cycles,
and disconnected subgraphs — then reports **ready fronts** (waves of parallel work), estimated
worker-sessions, and maximum parallelism.

The direction rule is the one that bites an agent inferring edges from prose:

```text
edge(A blocks B) is valid only if B *requires* A's output.
  "do A before B"       -> temporal. NOT an edge. Drop it.
  "B needs A's schema"  -> requirement. Emit it.
```

A temporal edge is reported as a structural error, so a wrong edge costs more than a missing one.

### ⛔ `bd ready` trusts a flag that can go stale

`is_blocked` is denormalized and maintained by local writes plus a post-pull recompute scoped to
what the merge changed. Skip that recompute — a recompute that failed after its merge committed,
or a conflicted pull resolved by hand — and the flag goes stale; a later pull that merges nothing
never refreshes it. `bd ready` reads the flag, so stale values **silently hide ready work**. Run
`bd recompute-blocked` before any read that orders work.

## `human` — the native HITL surface

An issue carrying the `human` label is one that needs a person. It is not a convention a skill
invents; `bd` ships the queries:

```bash
bd human list          # every issue awaiting a human
bd human respond <id> "<answer>"   # comments and closes in one call
bd human dismiss <id>              # permanently, when the question stopped applying
bd human stats
```

Pair it with `-t decision` (`bd types` ships `decision`, plus `spike`, `story` and `milestone`).
`human` is the only bare label the schema permits — see [`labels.md`](labels.md).

## GitHub sync — beads and GitHub are not exclusive

```bash
bd github sync                     # bidirectional
bd github sync --pull-only         # import an existing GitHub backlog
bd github sync --push-only --issues <id>
bd github sync --parent <id>       # push a bead and its descendants
bd github sync --dry-run
bd github status | bd github repos | bd github pull | bd github push
```

Conflicts: `--prefer-newer` (default), `--prefer-github`, `--prefer-local`. Config via
`bd config` or `GITHUB_TOKEN` / `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_REPOSITORY`.
Operational rules for a mirrored repo — beads is the source of truth, reads never touch `gh` —
are in [`_detect.md`](_detect.md) under Mirror mode.

`bd` also ships `jira`, `linear`, `gitlab` and `ado` command families on the same shape.

## Stealth: beads in a repo that must not carry it

For a work, client, or someone else's repo — beads locally, nothing committed, no collaborator
the wiser:

```bash
bd init --stealth --skip-agents --skip-hooks
bd setup claude --stealth
```

- `--stealth` configures git so beads files are never committed (`.git/info/exclude`, which is
  never pushed). No `.gitignore` diff appears.
- `--skip-agents` writes no `AGENTS.md` into the repo; `--skip-hooks` installs no git hooks.
- `--setup-exclude` is the exclude-file half on its own, for forks.
- Auto-export is **off by default**, so no `.beads/issues.jsonl` is written. Leave it off —
  `bd config set export.auto true` would put a file in the tree.

**The one thing stealth does not hide:** `.beads/` still sits in the working directory. It is
invisible to `git status`, visible to anyone with filesystem access to that checkout.

**In a stealth repo, pull is permitted and push never is.** `bd github sync --pull-only` seeds
your private graph from their backlog — the reason stealth and GitHub coexist. Bare
`bd github sync` is bidirectional and would file a real issue in their tracker for every bead
you own; `bd config` has no key that pins direction, so `hooks/beads-stealth-guard.sh` denies
any `bd github sync` without `--pull-only`, and any `bd dolt push` whose `sync.remote` is not a
`file://` path you own. Scope is the `beads:stealth` label in `~/.claude/domains-map`.

## Grouping: epic or label

Beads has no milestone field — `bd create` has no `--milestone`, `bd list` has no
`--milestone` filter. Two primitives, and the choice between them is not a matter of taste:

- **An epic is a body of work that *completes*.** It has an end state, so `bd epic status`
  reports a fraction and `bd epic close-eligible` closes it once every child is done.
  "M9: Native App", "Auth rewrite", a release — these are epics.
- **A label is a cross-cutting attribute that never completes.** `area:ui`, `platform:ios`,
  `human`. Nothing ever finishes being presentation work. The permitted vocabulary is
  [`labels.md`](labels.md) — and note that a label restating `issue_type` (`enhancement`,
  `bug`) is a duplicate field, not an attribute.

Everything group-aware in `bd` keys off parent-child, not labels: `bd epic status`,
`bd epic close-eligible`, `bd ready --parent`, `bd list --parent`, `bd children`,
`bd list --pretty` (tree), `bd list --no-parent`, and the whole `bd swarm` family, which is
defined as "an epic and its children". Labels only get you filtering — `-l` (AND),
`--label-any` (OR), `--label-pattern`, `--label-regex`.

**Children inherit their parent's labels by default** (`--no-inherit-labels` opts out). So an
epic already gives you the label-style grouping for free. A `milestone:<name>` label *alongside*
an epic of the same name is duplication — drop the label.

Child IDs are hierarchical: a child of `oa-4mm` is `oa-4mm.1`, then `.2`. Membership is
readable straight off the ID, and `id.rsplit('.', 1)[0]` recovers the epic.

```bash
EPIC=$(bd create "M9: Native App" -t epic -d "<what done looks like>" --silent)
bd create "Wire the settings sheet" -t task --parent "$EPIC"
bd ready --parent "$EPIC" --json     # unblocked work inside this epic only
bd epic status                       # rollup across every epic
bd epic close-eligible --dry-run     # then without --dry-run
```

## Bulk import from GitHub

For a whole tracker, not a single issue. `bd import` beats `bd github sync --pull-only` here —
sync establishes an ongoing two-way link, which is wrong when you're migrating *off* GitHub.
Two passes, because children need their epic's real ID:

1. **Epics first.** One `bd create -t epic --silent` per milestone; keep the title→ID map.
2. **Issues as JSONL, one row each**, then a single `bd import file.jsonl`. Set
   `"id": "<epic-id>.<n>"` yourself and add the edge explicitly — `--parent` has no JSONL
   equivalent:

```json
{"_type":"issue","id":"oa-imy.3","title":"…","description":"…","status":"closed",
 "issue_type":"task","labels":["enhancement"],"external_ref":"gh-142","source_system":"github",
 "created_at":"…","updated_at":"…","closed_at":"…","metadata":{"github_url":"…"},
 "dependencies":[{"issue_id":"oa-imy.3","depends_on_id":"oa-imy","type":"parent-child"}]}
```

Verified on 1.2.2: explicit dotted IDs, `status: closed`, preserved `created_at`/`closed_at`,
labels, and `external_ref` all survive the round trip. Rows with no `id` get one generated —
use that for issues with no milestone. Always `bd import --dry-run` first.

Non-negotiables:

- **`external_ref: gh-<n>` on every row.** It is the only link back once the GitHub issues are
  gone, and it's what makes the import verifiable.
- **Verify before deleting anything upstream** — match every GitHub number to exactly one bead
  and compare title, state, epic, and the longest bodies byte-for-byte. Deleting a GitHub issue
  is permanent.
- **Write the `#N → bead-id` map to a file** and keep it; commit references like `#123` in
  history become unresolvable otherwise.
- Drop labels that merely restate the milestone; keep genuinely cross-cutting ones.
- Finish with `bd epic close-eligible` so completed milestones land as closed rollups.

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

**Git hooks do not sync issue data.** The pre-commit hook refreshes `.beads/issues.jsonl` when
`export.auto` is on; post-merge and post-checkout skip JSONL import when `sync.remote` is set.
None of them push Dolt history. `bd dolt push` is the only thing that does, and `bd hooks install`
is never the answer to "the issues didn't reach the remote" (`wrap-up` runs the push).

### Never infer sync state from `git`

Nothing in `git status`, `git ls-files`, or `.gitignore` reports on issue data. All of these are
normal and mean nothing is wrong:

- `.beads/embeddeddolt/` (or `.beads/dolt/`) gitignored — **by design**, per the architecture
  diagram in the beads docs. It is not a missing backup and not a rollback gap.
- `.beads/issues.jsonl` absent and untracked — the export is opt-in (`export.auto`), and it is
  not the sync channel either way.
- `bd hooks list` showing every hook uninstalled — see above; hooks are not the transport.
- **`refs/dolt/data` keeping the same hash across a `bd dolt push`.** It is a Dolt manifest ref,
  not a git content ref, so it does not advance the way a branch does. An unchanged hash is not
  evidence the push did nothing.

`bd dolt push` printing `Push complete.` is the success signal. If you genuinely need to prove
data reached the remote, clone to a scratch dir and run `bd bootstrap`, then `bd list` — that is
the only check that answers the question. Do not go looking for a git-side symptom instead.

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
