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

**The disposition is beads-first, everywhere the two are paired: edit the bead, then push.**
Not edit-on-GitHub-then-pull. A push carries title, description and status out of beads
faithfully, so nothing is lost going that way; a pull silently resets `issue_type`, `priority`
and the whole label set (see the ⛔ notes below), so it is for collecting a human's GitHub-UI
edit, not for routine round-tripping. Read
[`beads-mirror-context.md`](beads-mirror-context.md) for the working loop, and
[`beads.md`](beads.md) § Mirror mode for the `::`-label cleanup a push requires.

**Beads is canonical everywhere except repos other people file issues in.** In your own repos
you are the only author, so the beads-first disposition applies without qualification — file in
`bd`; where a mirror is configured, push. GitHub Issues there is a copy, never a second place
to look, and never a place to author.

**Freelance and job repos invert it: GitHub is canonical and beads runs stealth.** Their
contributors author on GitHub, so GitHub holds the truth and a push-only posture would
overwrite it. Beads is a private local graph, and only the beads you name by ID ever leave it:
publish one with `bd github push <id>`, pull their edits back, keep your own breakdown
unpushed. These are the same repos § Stealth already routes by path and owner, and its
two-tier table is how you work them.

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

- **Scope is the line, not direction.** `bd github sync --pull-only` seeds a private local
  graph from the client's GitHub backlog, and that is a legitimate reason to set
  `github.repository` in a stealth repo. Stealth does **not** mean "no GitHub", and it does not
  mean "no push". It means nothing travels outward that you did not name.

  `bd github push <id> [<id>...]` — the documented short spelling of
  `bd github sync --push-only --issues <ids>` — sends exactly the beads on the command line and
  nothing else. `hooks/beads-stealth-guard.sh` turns it into a confirmation prompt rather than
  a denial, because the failure mode it guards is a mistyped ID, which is public the moment it
  lands. The unscoped forms it denies outright: bare `bd github sync` (bidirectional),
  `--push-only` with no `--issues`, and `bd github push` with no IDs. Each of the three files a
  real issue in their tracker for every bead you own. `bd config` has no key that pins
  direction or scope — the flags are the only control, which is why the hook requires them.
  `--dry-run` writes nothing in either direction and is always allowed, never prompted.
- **`sync.remote` must be set before the first `bd dolt push`.** Unset is the state
  `bd init --stealth` leaves behind, and `bd dolt push` fills it from the git origin without
  asking, then pushes the entire database to their remote. A `file://` directory you own takes
  a real push and `bd bootstrap` recovers every issue from it, so redirecting costs no backup.
  The same guard denies a push while `sync.remote` is anything else.
- **Two tiers of issue, and nothing in the database marks them apart.** Stealth forbids
  publishing the *database*, not collaborating. A bead is private for exactly one reason: you
  have never named it in a push. There is no flag, no field, no config key — the tier is
  decided by what you type, which is why no hook can enforce it and why the guard bounds reach
  instead.

  | | Create it with | How it travels |
  | --- | --- | --- |
  | **Client-visible** — a bug or request they should act on | `gh issue create`, then `bd github sync --pull-only` — **or** `bd create` then `bd github push <id>` | either way it ends up a bead carrying `external_ref` |
  | **Yours** — task breakdown, dependency edges, notes on their code | `bd create`, and never push it | never travels; this tier is the reason beads is here at all |

  **Promotion is one command.** `bd github push <id>` on a private bead files the GitHub issue,
  stamps `external_ref`, and from then on that bead is mirrored. That is the whole mechanism
  for "I drafted it locally and now they should see it" — there is no separate publish verb.

  For updates to something already mirrored, the choice is which side you author on.
  `bd update <id>` then `bd github push <id>` keeps beads canonical and pushes title,
  description and status out faithfully. `gh issue edit` then a scoped pull is the other
  direction and is **lossy** — see the pull-overwrite entries below. Priority and dependencies
  are beads-only fields GitHub cannot hold, so they never travel in either direction.

  **The ID shape names the tier at a glance.** A pulled bead renamed to `neutrino-7` is
  mirrored; a hashed `neutrino-a3f2` from `bd create` is yours until you push it.

- **Rename every pulled bead to its GitHub issue number, in the same breath as the pull.**
  `bd github sync --pull-only` does not assign a hash ID. It assigns the import-path form
  `<prefix>-<epoch_ms>-<batch_counter>-<hash8>` — `neutrino-1788274151270-5-9a129200` for issue
  #7 — which is neither documented `issue_id_mode` (`hash` and `counter` are the only two) and
  carries 33 characters into every branch name, every `bd show` and every `--deps` argument.

  ```bash
  bd rename neutrino-1788274151270-5-9a129200 neutrino-7   # <prefix>-<github issue number>
  ```

  **The ID is not the sync key** — `external_ref` and `source_system` are, and `bd rename` does
  not touch either. Verified on `bd 1.2.2`: after renaming all five neutrino beads, an unscoped
  `bd github sync --pull-only --dry-run` proposed zero creations, and a real
  `bd github pull neutrino-7` updated in place with the count still at 5. A broken link would
  have re-created each issue as a new bead.

  The convention pays twice. One number then means one thing across the bead, the branch, the PR
  and the issue. And since `bd create` still emits a hash, **the ID shape alone names the tier**:
  numeric came from their GitHub and a pull rewrites its title and description; hashed
  (`neutrino-a3f2`) is yours and has not travelled. Pushing a hashed bead promotes it —
  rename it to its new issue number in the same breath, so the shape keeps telling the truth.

- **⛔ A pull overwrites the bead's title and description from GitHub, silently.** `bd update
  <id> --description "…"` followed by `bd github sync --pull-only` reported `0 created, 1
  updated` and left GitHub's body in place; the local text was gone with no warning and no
  conflict. This is a reason not to pull casually — **not** a reason to author on GitHub. Under
  the beads-first disposition you edit the bead and push, and a push writes title and
  description out faithfully. Status is safe from either side; closing on GitHub propagates
  down, setting `status: closed` and `closed_at`.

- **⛔ A pull also overwrites `labels`, `issue_type` and `priority` — not just title and
  description.** GitHub holds no type or priority, so a pull resets them to defaults and
  replaces the bead's label set with GitHub's. Measured on `bd 1.2.x` across seven mirrored
  beads: after `gh issue edit` + `bd github sync --pull-only --issues <id>`, every `area:`
  label was gone (two beads came back carrying only GitHub's stale `bug`, one carrying
  nothing), two beads had the wrong `issue_type` and three the wrong `priority`. No warning,
  no conflict. Only dependencies, parent, and beads with **no** `external_ref` survive a pull.

  So the edit-on-GitHub-then-pull loop is lossy for every field GitHub cannot hold. This is
  the reason the disposition is beads-first: authoring in beads and pushing never crosses this
  path at all.

  When you do pull — to collect a person's GitHub-UI edit — reduce what it costs first:
  **make GitHub carry the label set**, creating the `area:`/`human` labels there and applying
  them with `gh issue edit`, so a pull rewrites labels with the same values instead of wiping
  them. Type and priority have no GitHub representation and reset regardless, so scope the
  pull with `--issues <id>` and re-apply those two afterwards.

- **⛔ A push invents `type::`/`priority::` labels in their repo and pushes no `area:` label.**
  It applies both to the issue and leaves the issue's stale labels in place. That matters more
  here than in your own repos, because the labels appear in a tracker other people read.
  Reconcile GitHub labels with `gh issue edit`, never with a push, and run the repo-wide
  cleanup afterwards — the measurement and the one-line command are in
  [`beads.md`](beads.md) § Mirror mode.

- **A bare `--pull-only` can silently miss an upstream body edit.** After `gh issue edit`, four
  consecutive bare `bd github sync --pull-only` runs — one of them with `--prefer-github` —
  each exited 0 and left the bead stale. Only the scoped form,
  `bd github sync --pull-only --issues <bead-id>`, refetched it. A close on the same issue came
  down on the first bare try. **Exit 0 from a pull is not evidence the pull saw anything**, so
  when a specific upstream edit needs to land, scope it with `--issues`. Why the unscoped path
  misses it is not established — do not repeat a cause for this you cannot cite.
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

Beads' default embedded Dolt engine **serves one writer at a time**. a swarmed `/implement` fans out N
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
