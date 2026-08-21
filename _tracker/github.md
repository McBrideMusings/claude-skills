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
| **ready** (unblocked) | *no native equivalent* — read "Blocked by #N" from bodies and filter by hand, or say the backend can't compute it |
| **blocked** | *no native equivalent* — same as above |
| **show** | `gh issue view <n> --json number,title,body,labels,state,milestone,comments` |
| **claim** | `gh issue edit <n> --add-assignee @me` (no in-progress state; use a label if the repo has one) |
| **update** | `gh issue edit <n> --title "<t>" --body "<b>" --add-label <l> --remove-label <l>` |
| **close** | `gh issue close <n> --comment "<reason>"` |
| reopen | `gh issue reopen <n>` |
| **comment** | `gh issue comment <n> --body "<text>"` (`--body-file <path>`) |
| **label add / remove** | `gh issue edit <n> --add-label <l>` / `--remove-label <l>` |
| **assign** | `gh issue edit <n> --add-assignee <who>` |
| **count open** | `gh issue list --state open --limit 300 --json number --jq 'length'` |
| **link** (dependency) | *no native equivalent* — write `Blocked by #N` into the body |
| **milestone** | `gh api repos/:owner/:repo/milestones -f title="<name>"`; assign with `gh issue edit <n> --milestone "<name>"` |

## Multi-line bodies

Never put a multi-line markdown body in a quoted `--body` — a newline followed by `#` trips the
path-validation hook. Use a HEREDOC:

```bash
gh issue create --title "<t>" --body "$(cat <<'EOF'
…
EOF
)"
```

or write the body to a file under `<repo-root>/tmp/claude/` and pass `--body-file`.

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
