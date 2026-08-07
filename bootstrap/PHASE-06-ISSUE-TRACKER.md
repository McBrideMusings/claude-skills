# Phase 06 — Issue Tracker

Resolve which issue backend this repo uses, offer to set up beads if it has none, and record the
answer so every downstream skill (`to-tickets`, `triage`, `implement`, `iterate`, `orchestrate`,
`iron-out`, `followups`, `wrap-up`) picks it up without re-deriving it.

## Step 1 — Detect

Run the resolution in [`../_tracker/_detect.md`](../_tracker/_detect.md). It gives one of:

| State | Meaning |
| --- | --- |
| `beads` | `bd where` exits 0 — a beads workspace already exists |
| `github` | GitHub remote + `gh auth status` OK, no beads |
| `local` | neither |
| **blocked** | `.beads/` exists but `bd` is not on PATH |

**Blocked** → stop this phase, tell the user `brew install beads`, record nothing, move on to
Phase 07. Don't guess at a backend when the real one is unreadable.

## Step 2 — Act on the state

### `beads` — already set up

Run `bd github status` once; if its `Status:` line reads `✅ Configured`, note mirror mode in the
record below. Do not test this with `bd config get github.repository` — on an unset key it prints
`github.repository (not set)` and exits 0, so every repo would look configured.

Then apply the **JSONL export standard** below if it isn't already on — this is additive, so it
runs automatically without asking, like every other missing standard artifact in this skill.

### The JSONL export standard — every beads repo gets it

A plain-text copy of the backlog rides along in the repo's commits, so it is readable on
github.com, diffable in PRs, and greppable without `bd` installed. Check `bd config get
export.auto`; if it isn't `true`:

```bash
bd config set export.auto true
bd config set export.git-add true
bd export --output .beads/issues.jsonl
git add .beads/issues.jsonl
```

⛔ **The last two lines are not optional.** `export.auto` alone produces nothing: the pre-commit
hook only refreshes `issues.jsonl` when a `.beads/` path is already staged, so a file that has
never been committed is never written, while `bd config get export.auto` cheerfully reports
`true`. Seed it once by hand and it maintains itself from then on. Full detail:
[`../_tracker/beads.md`](../_tracker/beads.md) § JSONL export.

This does **not** replace the Dolt sync — it is a readable copy, not a backup. Both are on.

### `github` — offer migration

This is a **plain-chat question, not automatic** — moving a repo's tracker of record is a decision
about how the user works, not a missing standard artifact, and `bd init` installs git hooks in
their repo. Ask once:

> This repo tracks issues on GitHub (`<n>` open). Beads adds a real dependency graph and a
> `bd ready` queue that only shows unblocked work. Want to migrate to beads, keeping GitHub as a
> mirror? (yes / beads only, no mirror / no — stay on GitHub)

- **yes** →
  ```bash
  bd init --quiet --skip-agents --prefix <repo-name>
  bd config set github.repository <owner>/<repo>
  bd github sync --pull-only --dry-run
  ```
  Show the dry-run result, then run it for real without `--dry-run`. Pulled issues carry their
  GitHub number as `--external-ref gh-<n>`, so `bd show` still points back. Then apply the JSONL
  export standard above.

  Then **wire the dependencies the import can't see.** GitHub has no dependency edges, so
  "Blocked by #N" lives in issue bodies as prose. Grep the imported descriptions for
  `[Bb]locked by #` / `[Dd]epends on #`, map each `#N` to its bead via the external ref, and add a
  real edge: `bd dep add <id> <blocker-id> -t blocks`. Report how many edges you created and list
  any prose reference you could not resolve — never silently drop one.

- **beads only, no mirror** → same `bd init`, skip the `bd config set`, skip the sync. Existing
  GitHub issues stay where they are; say so plainly rather than leaving the user to discover it.

- **no** → record `github` and move on.

### `local` — offer init

Same question, shorter, since there's nothing to migrate:

> No issue tracker here. Beads works with no remote and no account, and gives a dependency-aware
> ready queue. Run `bd init`? (yes / no — keep using `tmp/claude/followups.md`)

- **yes** → `bd init --quiet --skip-agents --prefix <repo-name>`, then apply the JSONL export
  standard above. If
  `<repo-root>/tmp/claude/followups.md` exists with open items, offer to import them —
  one `bd create "<title>" -t task` per unchecked item — and move each imported item into the
  file's `## Resolved` section with the new bead ID appended, so nothing is tracked twice.
- **no** → record `local`.

`--skip-agents` is deliberate: this repo's agent instructions live in `CLAUDE.md`, and the bd verb
tables live in `_tracker/beads.md`. Don't let `bd init` drop an unasked-for `AGENTS.md` into a
repo the user didn't ask to change.

## Step 3 — Record the answer

Write the resolved backend into the root `CLAUDE.local.md` under an `## Issue tracker` heading,
replacing any existing section:

```md
## Issue tracker
beads (prefix `myproj`) — mirrored to GitHub via `bd github sync`
```

One of these four bodies, **verbatim** — the wording is load-bearing:

- ``beads (prefix <p>) — database syncs to the git origin (`refs/dolt/data`). GitHub Issues mirror: ON via `bd github sync`.``
- ``beads (prefix <p>) — database syncs to the git origin (`refs/dolt/data`). GitHub Issues mirror: OFF.``
- `GitHub issues via gh`
- `Local markdown in <repo-root>/tmp/claude/followups.md (no GitHub remote / gh not authed at bootstrap time)`

⛔ **Never write "local only" or a bare "no GitHub mirror" for a beads repo.** Both read as "keep
the issue data off GitHub," which is the opposite of how beads works — the database always
replicates to the git origin, and that is the point. A later agent read exactly that phrase, took
the routine `refs/dolt/data` push for a leak, and offered to delete the user's only off-machine
copy of 23 issues. Say what is ON and what is OFF, separately, every time. Full rule:
[`../_tracker/beads.md`](../_tracker/beads.md) § Sync.

**If you find an older section using the "local only" phrasing, rewrite it to the wording above** —
even on a repo where nothing else in this phase needed changing.

Step 2 of `_tracker/_detect.md` reads this section and trusts it over auto-detection, so it is how
a repo pins a choice that detection would otherwise get wrong.

## Step 4 — Concurrency note

If the repo is one the user runs `/orchestrate` against, say once: beads' default embedded engine
serves **one writer at a time**, and every worktree shares the main repository's `.beads`. Either
keep tracker writes on the orchestrator or re-init with `bd init --server`. Don't change it for
them — just name it.

Then proceed to [PHASE-07-SUMMARY-AND-BACKFILL.md](PHASE-07-SUMMARY-AND-BACKFILL.md).
