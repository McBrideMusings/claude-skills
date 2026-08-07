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
configured. `bd config get github.repository` is not a usable test either: on an unset key it
prints the literal string `github.repository (not set)` on stdout and still exits 0, so "produced
output" means nothing here.

- **`Status: ✅ Configured`** (or an `Owner:`/`Repository:` pair with values) → **mirror mode**.
  Beads is the source of truth; GitHub Issues is a copy. After any write (create, close, comment,
  label), push just that item: `bd github sync --push-only --issues <id>`. Read paths still read
  beads only — never `gh issue list` — because the mirror lags by design.
- **`Status: ❌ Not configured`** → **beads only**. Do not touch `gh` for issues at all. Do not
  offer to set up the mirror mid-task; that is a `bootstrap` decision.

Mirror mode does not change which verb table you read — it appends one push per write.

**Mirror mode is about GitHub *Issues*, and nothing else.** It is unrelated to `sync.remote`, the
Dolt remote that carries the issue database itself. Beads points `sync.remote` at the repo's git
origin by default, so a "beads only, no GitHub mirror" repo still replicates its database over
that origin under `refs/dolt/data` — separate from git branches, invisible in the GitHub Issues
tab. Don't read one as evidence of the other.

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
