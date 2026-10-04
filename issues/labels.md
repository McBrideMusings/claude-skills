# Labels — every tracker, every repo

Read this before adding a label to any issue, and before inventing a new label anywhere.

## The shape: flat words, as the beads docs recommend

The [beads labels guide](https://github.com/steveyegge/beads/blob/main/docs/core-concepts/labels.md)
recommends plain lowercase words for which part of the system and which domain an issue
touches (`backend`, `auth`, `payments`), hyphen-separated when a label needs two words
(`ui-ux`, `team-infra`). We follow it.

**A family is a label of its own, not a prefix.** Where a repo has a family of parts, the
family name is one label and each member is another, applied together: a Mac-only client
issue is `client` + `mac`, never `client:mac`. `--label client` finds the whole family and
`--label mac` the member.

**Never put a colon in a category label.** Beads reserves the `<dimension>:<value>` shape for
operational state that has exactly one value at a time (`patrol:muted`, `health:failing`).
`bd set-state <id> platform=mac` deletes every other `platform:` label on the bead first, and
`bd state` reads the dimension back as a single value. A category such as "this touches the
Mac and the server" has several values at once, so it never takes that shape.

**A label carries what the tracker's own fields do not.** `bd` has `issue_type`
(task/bug/feature/epic/chore/spike/decision), `priority`, `status` and `parent`. A label named
`bug`, `epic`, `spike`, `enhancement` or `p1` is a second copy of a field, and second copies
drift. So is `afk`: the absence of `human` already says an agent can do it.

## Each repo's vocabulary lives in `.beads/labels.toml`

The same path in every repo, and the repo's beads posture decides who sees it: where `.beads/`
is committed the file is committed with it, and in a stealth repo `.git/info/exclude` lists
`.beads/`, so the file stays private. Nothing about labels goes in `CLAUDE.md`.

```toml
# Every bead carries at least one of these.
required = ["client", "server", "tooling"]

[labels.client]
about = "Any game client work."

[labels.mac]
parent = "client"          # mac never appears without client
about = "Only the Mac client."

[labels.perf]
about = "The complaint is a number: fps, tick time, memory."
```

A label with a `parent` never appears without it, all the way up: a grandchild carries its
parent and its parent's parent. Each `about` is one line saying what the label covers, so the
next agent can pick it without asking.

**Read it before labeling:** `~/.claude/tools/bead-labels list` prints the tree. Choose from
what the issue changes, never from its title alone: one of the `required` labels, the family
members that apply, then a cross-cutting label only where it clearly applies.

**No `.beads/labels.toml` in the repo:** do not label from a guess. Say the repo has no label
list and propose a labeling session: name the repo's parts from its submodules, apps,
services and open beads, put the proposed file to the user as a slate row, and on `go` write
it and relabel every bead against it. `issues shape` runs that session ([shape.md](shape.md)
Phase 0).

## `human` — keep it in every repo's file

Needs a person: a decision, hardware, an account, a manual check. Autonomous passes skip it.
`bd` ships the queries keyed on the literal string, so never rename it:

```bash
bd human list                      # every issue awaiting a person
bd human respond <id> "<answer>"   # comments and closes in one call
bd human dismiss <id>
```

Pair it with `-t decision` when the whole issue is an unmade call. `hitl` maps to `human`.

## What enforces it

| Where | What it checks |
| --- | --- |
| `hooks/beads-label-guard.sh` | Denies a `bd create`, `bd update --set-labels/--add-label/--remove-label` or `bd label add/remove` whose result breaks the file, and prints the vocabulary. A `bd create --parent` is judged with the labels it inherits from the parent. |
| `.beads/hooks/pre-commit` | One block after the `END BEADS INTEGRATION` marker runs `bead-labels check` on the staged `issues.jsonl`. Beads keeps content outside its markers across `bd hooks install`, `--force` included. Stealth repos install no beads git hooks, so only the guard covers them. |
| `bead-labels check` | Every bead in the tracker; `--jsonl <file>` checks an export instead. |
| `issues shape` | Runs the check first and fixes every finding. |
| `review` | Runs the check on beads the branch touched and reports drift as findings. |

The block for a repo's `.beads/hooks/pre-commit`, after the `END BEADS INTEGRATION` line:

```sh
# Bead labels: the staged export must match .beads/labels.toml (~/.claude/tools/bead-labels).
if git diff --cached --name-only | grep -qx .beads/issues.jsonl && [ -x "$HOME/.claude/tools/bead-labels" ]; then
  _bl_tmp=$(mktemp) && git show :.beads/issues.jsonl > "$_bl_tmp"
  "$HOME/.claude/tools/bead-labels" check --jsonl "$_bl_tmp"; _bl_exit=$?
  rm -f "$_bl_tmp"
  if [ $_bl_exit -ne 0 ]; then echo >&2 "bead labels: fix the beads above, run bd export -o .beads/issues.jsonl, and commit again"; exit 1; fi
fi
```

## Changing the vocabulary

A label the work needs but the file lacks is a change to `.beads/labels.toml`, proposed to the
user before it is written. A rename runs `bd label rename <old> <new>` across the tracker in
the same pass, then `bead-labels check` to confirm nothing still carries the old name.

**A label whose name collides with a word the repo already spends on something else gets a
different name.** `admin` in a repo whose task runner is `admin` reads as the task runner;
call the label `ops`. The reader cannot tell, and the reader is who the label is for.

## GitHub

The same names, created with `gh label create` before first use. Delete GitHub's nine default
labels on adoption (`enhancement`, `bug`, `documentation`, `question`, `duplicate`,
`invalid`, `wontfix`, `good first issue`, `help wanted`): each restates a type, status, close
reason or assignee.

```bash
gh label create mac --description "Only the Mac client" --color 1D76DB
gh label create human --description "Needs a person" --color B60205
gh issue edit <n> --add-label client,mac --remove-label enhancement
```

`bd github push` derives `type::`/`priority::` labels from a bead's own fields and GitHub
creates any it lacks; `hooks/beads-github-label-guard.sh` blocks a push that would. See
[`beads.md`](beads.md) § GitHub sync.
