# Issue-tracker detection

Every skill that touches issues resolves the backend the same way. Resolve in this order and
stop at the first that answers. This is cheap — three shell calls at most — run it once per
invocation and reuse the answer for the rest of the run.

1. **Explicit argument.** If the invocation named a backend (`triage beads`, `to-tickets github`),
   use it. An explicit name overrides everything below, including a missing marker — if the user
   said `beads` and `.beads/` is absent, offer `bd init` rather than silently using GitHub.

2. **Project override.** If the repo's root `CLAUDE.local.md` has an `## Issue tracker` section
   naming a backend, trust it. `bootstrap` writes this section; it is how a repo pins its choice.

3. **Beads marker.** `bd where` exits 0 (authoritative — it follows `BEADS_DIR` and resolves a
   worktree back to the main repository's `.beads`, which a bare `test -d .beads` does not) →
   **`beads`**, read [`beads.md`](beads.md).

   ```bash
   bd where --json
   ```

   **`.beads/` exists at the repo root but `bd` is not on PATH → stop and say so.** Tell the user
   `brew install beads`. Never fall through to GitHub — the issues are in the Dolt database and a
   GitHub read would report an empty or stale backlog as if it were the whole picture.

4. **GitHub remote.** `git remote -v` contains a `github.com` remote **and** `gh auth status`
   exits 0 → **`github`**, read [`github.md`](github.md).

5. **Neither** → **`local`**, read [`local.md`](local.md).

## Mirror mode (beads + GitHub together)

When step 3 resolved `beads`, check once whether the beads database is configured to mirror to
GitHub Issues:

```bash
bd github status
```

**Read the `Status:` line, not the exit code.** `bd github status` exits 0 whether or not GitHub is
configured, so branching on its exit code always says "configured."

The same trap sits in the other command that answers this question. `bd config get
github.repository` on an unset key prints the literal string `github.repository (not set)` and
exits 0 — non-empty output, success exit. **Match the text `(not set)`; never test for empty
output or a non-zero exit.** Both commands answer correctly when read as text and wrongly when
read as a status code.

- **`Status: ✅ Configured`** (or an `Owner:`/`Repository:` pair with values) → **mirror mode**.
  Beads is the source of truth; GitHub Issues is a copy. After any write (create, close, comment,
  label), push just that item: `bd github sync --push-only --issues <id>`. Read paths still read
  beads only — never `gh issue list` — because the mirror lags by design.
- **`Status: ❌ Not configured`** → **beads only**. Do not touch `gh` for issues at all. Do not
  offer to set up the mirror mid-task; that is a `bootstrap` decision.

Mirror mode does not change which verb table you read — it appends one push per write.

### ⛔ Two different things live on GitHub. Learn them apart before you say a word about either.

| | **GitHub Issues mirror** | **The Dolt remote** |
| --- | --- | --- |
| What it is | each bead copied into a real GitHub issue | the issue *database* stored in the repo |
| Where it lands | the repo's **Issues tab** | `refs/dolt/data` + `refs/heads/__dolt_remote_info__` |
| Turned on by | `bd config set github.repository <owner>/<repo>` | `bd dolt push` — on by default, git origin |
| Governed by | `github.repository` / `bd github status` | `sync.remote` |
| Default | **off** | **on** |
| Is it optional? | yes | **no — it is how beads persists anything** |

**The issue data belonging to the GitHub repo is the entire point of beads.** `.beads/` is
gitignored and disposable; those two refs are the only off-machine copy. Pushing them is the
system working.

⛔ **A project instruction reading "beads — local only, no GitHub mirror" is about the left column
only.** It does not forbid the Dolt remote, has nothing to say about it, and is already satisfied
whenever `bd config get github.repository` prints `(not set)`.

⛔ **`refs/dolt/data` on the origin is never a finding.** Not a leak, not a violation, not a
surprise, not something to mention, and never something to undo. Do not offer to delete it, do not
ask whether the user wants it there, do not report it in an audit. If you are about to write a
sentence containing both "refs/dolt" and any of *leaked / left the machine / undo / revert /
local only*, you have made this exact mistake — stop and read [`beads.md`](beads.md) § Sync.

## Concurrent writers

Beads' default embedded Dolt engine **serves one writer at a time**. `orchestrate` fans out N
worktrees, and all worktrees share the main repository's single `.beads` workspace, so N agents
writing at once will contend. Either keep tracker writes on the orchestrator (workers report, the
orchestrator records) or have the repo run `bd init --server`. Read paths are unaffected.

## Backend capability differences

Not every verb exists on every backend. Where a skill's process depends on one that doesn't:

| Capability | beads | github | local |
| --- | --- | --- | --- |
| Dependency graph, blocked/ready computation | native (`bd dep`, `bd ready`) | none — approximate from "Blocked by #N" prose | none |
| Parent/child hierarchy | native (`--parent`, epics) | milestones + task lists | headings |
| Comment thread | yes | yes | append to entry |
| Pull requests | **no** — always use `gh pr` | yes | no |
| Works offline | yes | no | yes |

When a skill needs a capability the resolved backend lacks, say so in one line and degrade to the
nearest thing the table offers — never silently drop the step.
