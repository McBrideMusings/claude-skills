# Backend: GitHub (`gh`)

The default for any repo with a GitHub remote and an authed `gh`. IDs are issue numbers (`42`,
written `#42` in prose).

**Which label to attach is never a GitHub question** — the vocabulary is
[`labels.md`](labels.md) (`area:` / `mode:` / `platform:`). GitHub needs each one created with
`gh label create` before first use, and its nine default labels (`enhancement`, `bug`,
`question`, `wontfix`, …) are duplicates of type/status and get deleted on adoption.

## Verb table

| Verb | Command |
| --- | --- |
| **create** | `gh issue create --title "<t>" --body "<b>" --label <l1,l2>` |
| create, body from file | `gh issue create --title "<t>" --body-file <path>` |
| create under a milestone | add `--milestone "<name>"` |
| **list open** | `gh issue list --state open --json number,title,labels,milestone` |
| list by label | `gh issue list --label <label> --json number,title` |
| list by milestone | `gh issue list --milestone "<name>" --json number,title,state` |
| list all incl. closed | `gh issue list --state all --json number,title,state` |
| **ready** (unblocked) | no single query — list, then filter on `blockedBy.totalCount == 0` (see below). GitHub computes the edges; it does not compute the front |
| **blocked** | same list, filtered on `blockedBy.totalCount > 0` |
| **show** | `gh issue view <n> --json number,title,body,labels,state,milestone,comments` |
| **claim** | `gh issue edit <n> --add-assignee @me` (no in-progress state; use a label if the repo has one) |
| **update** | `gh issue edit <n> --title "<t>" --body "<b>" --add-label <l> --remove-label <l>` |
| **close** | `gh issue close <n> --comment "<reason>"` |
| reopen | `gh issue reopen <n>` |
| **comment** | `gh issue comment <n> --body "<text>"` (`--body-file <path>`) |
| **attach media** | add `--attach <path>[#alt text]` (repeatable) to create/edit/comment on issues or PRs — see below |
| **label add / remove** | `gh issue edit <n> --add-label <l>` / `--remove-label <l>` |
| **assign** | `gh issue edit <n> --add-assignee <who>` |
| **count open** | `gh issue list --state open --limit 300 --json number --jq 'length'` |
| **link** (dependency) | native: `gh issue view <n> --json blockedBy,blocking` reads them. **Never** write `Blocked by #N` into a body — that is prose nothing queries |
| **parent / children** | native sub-issues: the GraphQL `parent` and `subIssues` fields on `Issue` |
| **type** | native: the GraphQL `issueType` field on `Issue` |
| **milestone** | `gh api repos/:owner/:repo/milestones -f title="<name>"`; assign with `gh issue edit <n> --milestone "<name>"` |

## Structure lives in GraphQL, not in `gh issue list`

`gh issue list --json` does not expose `issueType`, `parent`, or `subIssues`. Reach them
through GraphQL, in one call per page:

```bash
gh api graphql -f query='
query { repository(owner:"<owner>", name:"<repo>") {
  issues(first:100, states:OPEN) { nodes {
    number title
    issueType { name }
    parent { number }
    subIssues(first:50) { totalCount }
    labels(first:20) { nodes { name } }
  } } } }'
```

`blockedBy` and `blocking` are the exception — they are on `gh issue view <n> --json
blockedBy,blocking` directly.

**GitHub has the primitives but not the engine.** It stores types, parents and edges; it does
not compute ready fronts, detect cycles, find orphans, flag wrong-direction edges, or report
maximum parallelism. Beads does all of that (`bd swarm validate`, `bd ready`, `bd orphans`,
`bd doctor --check=conventions`). That gap is the whole reason beads is the default backend and
why `backlog shape` offers `bd init` on a GitHub-only repo rather than reproducing the graph work
here.

## Attaching media

`gh` v2.99.0+ has a repeatable `--attach <path>[#alt text]` flag that uploads a local image or
video and references it inline. Works on `gh issue create`, `gh issue edit`, `gh issue
comment`, `gh pr create`, `gh pr edit`, `gh pr comment`. PNG, JPEG, GIF, WebP, SVG, MP4, MOV,
WebM. A local path already referenced in the body markdown (e.g. `![alt](./login.png)`) is
rewritten in place with the uploaded asset URL, keeping its alt text; anything attached but not
referenced is appended at the end. Needs write access to the repo. Size limits: 10 MB images/GIFs,
10 MB video on Free plans, 100 MB video on paid plans.

```bash
gh issue comment <n> --body "See the crash:" --attach ./screenshot.png
gh issue create --title "<t>" --body "<b>" --attach './repro.mp4#Crash repro'
```

Use this over describing a UI bug or rendered result in prose — attach the screenshot or
recording instead.

## Multi-line bodies

Never put a multi-line markdown body in a quoted `--body` — a newline followed by `#` trips the
path-validation hook. Use a HEREDOC:

```bash
gh issue create --title "<t>" --body "$(cat <<'EOF'
…
EOF
)"
```

or write the body to a file under `/private/tmp/claude/<repo-slug>/` and pass `--body-file`.

## Ownership

Several skills branch on whether the repo is the user's own:

```bash
gh repo view --json owner --jq .owner.login    # vs
gh api user --jq .login
```

Equal → owned (commit to `main`, close issues freely). Different → collaborative (feature
branches, PRs, and **never** close issues the user doesn't own).

## Pull requests

PR commands (`gh pr list/view/create/comment/review/checks`) are unaffected by tracker detection
— they are always `gh`, on every backend.
