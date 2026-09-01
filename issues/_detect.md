# Issue-tracker detection

**Beads is the assumption.** Every repo tracks work in `bd`; a repo without it is one that has
not been migrated yet, not a repo that chose GitHub. Detection exists to confirm that and to
resolve the two things that genuinely vary — mirror mode and stealth — not to pick a side.

Resolve in this order and stop at the first that answers. This is cheap — two shell calls at
most — run it once per invocation and reuse the answer for the rest of the run.

1. **Explicit argument.** If the invocation named a backend (`triage beads`, `to-tickets github`),
   use it. An explicit name overrides everything below — if the user said `beads` and `.beads/` is
   absent, offer `bd init` rather than silently using GitHub.

2. **Project override.** If the repo's root `CLAUDE.local.md` has an `## Issue tracker` section
   naming a backend, trust it. `bootstrap` writes this section; it is how a repo pins an
   exception to the assumption.

3. **Beads.** `bd where` exits 0 (authoritative — it follows `BEADS_DIR` and resolves a
   worktree back to the main repository's `.beads`, which a bare `test -d .beads` does not) →
   **`beads`**, read [`beads.md`](beads.md). This is the expected answer.

   ```bash
   bd where --json
   ```

   It reports `database_path`, `path`, `prefix` and `schema_version` — **never the stealth
   posture.** Stealth is not derivable at runtime; see § Stealth below.

   **`.beads/` exists at the repo root but `bd` is not on PATH → stop and say so.** Tell the user
   `brew install beads`. Never fall through to GitHub — the issues are in the Dolt database and a
   GitHub read would report an empty or stale backlog as if it were the whole picture.

4. **Not migrated yet.** No beads, but `git remote -v` contains a `github.com` remote **and**
   `gh auth status` exits 0 → **`github`**, read [`github.md`](github.md). Say in one line that
   the repo has no beads yet and `bd init` would give it one; then get on with the task. Do not
   stop, and do not migrate mid-task.

5. **Neither** → **stop and say the repo has no tracker.** There is no file-based fallback: a
   markdown list of follow-ups is a tracker nobody maintains, and work filed into one is work
   that never gets picked up again. Offer `bd init` and do nothing else until it exists.

   ```
   This repo has no issue tracker: no .beads/, no authenticated GitHub remote.
   Run `bd init` to start one, or add a GitHub remote. Nothing was filed.
   ```

   A bare `go` in reply means `bd init`.

## Mirror mode (beads + GitHub together)

**The `beads:mirror` label in `~/.claude/domains-map` decides this** when it is present; it is
what gets [`beads-mirror-context.md`](beads-mirror-context.md) injected. With no label, check
once whether the beads database is configured to mirror to GitHub Issues, then write the answer
into the map:

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

## Stealth: beads in a repo that must not carry it

Some repos get beads locally and commit none of it — work, client, and anyone else's repo.

**The `beads:stealth` label in `~/.claude/domains-map` is the source of truth**, and it is the
only thing that is: `bd where --json` does not report the posture, so there is no runtime signal
to fall back on. Read the label first; if it is there, it decides and nothing below runs.

**No label yet** → propose a default from two signals, either of which is sufficient:

- **Path.** Under `~/Work/**` or `~/Freelance/**` → stealth.
- **Owner.** `gh repo view --json owner --jq .owner.login` ≠ `gh api user --jq .login` → stealth.
  No remote at all → stealth. Path alone is not enough: a repo can sit in `~/Projects/` and
  belong to someone else.

Confirm the proposal with the user, then **write the answer into `domains-map`**. The inference
runs once; the label runs forever.

**Initialising a stealth repo:**

```bash
bd init --stealth --skip-agents --skip-hooks
bd dolt remote add origin file:///path/you/own    # required — see below
```

Details of what each flag suppresses are in [`beads.md`](beads.md). Two rules that live here
because they are detection-time decisions, not usage-time ones:

- **Pull is permitted; push never is.** `bd github sync --pull-only` seeds a private local
  graph from the client's GitHub backlog, and that is a legitimate reason to set
  `github.repository` in a stealth repo. Stealth does **not** mean "no GitHub". What it means
  is that nothing travels outward: bare `bd github sync` is bidirectional and would file a real
  issue in their tracker for every bead you own. `bd config` has no key that pins direction —
  the flag is the only control — so `hooks/beads-stealth-guard.sh` enforces it.
- **`sync.remote` must be set before the first `bd dolt push`.** Unset is the state
  `bd init --stealth` leaves behind, and `bd dolt push` fills it from the git origin without
  asking, then pushes the entire database to their remote. A `file://` directory you own takes
  a real push and `bd bootstrap` recovers every issue from it, so redirecting costs no backup.
  The same guard denies a push while `sync.remote` is anything else.
- **Say the limit out loud once.** `.beads/` still sits in the working directory. `git status`
  cannot see it; anyone with filesystem access to that checkout can.

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

| Capability | beads | github |
| --- | --- | --- |
| Dependency graph, blocked/ready computation | native (`bd dep`, `bd ready`) | none — approximate from "Blocked by #N" prose |
| Parent/child hierarchy | native (`--parent`, epics) | milestones + task lists |
| Comment thread | yes | yes |
| Pull requests | **no** — always use `gh pr` | yes |
| Works offline | yes | no |

When a skill needs a capability the resolved backend lacks, say so in one line and degrade to the
nearest thing the table offers — never silently drop the step.
