---
name: repo-cleanup
description: "Judge every local branch, worktree and stash in a repo and decide which can be deleted — including the ones a mechanical cleanup tool has to hold because they carry uncommitted changes, by reading those changes and saying whether they are work or noise. Deletes locally on approval; never touches a remote."
disable-model-invocation: true
user_invocable: true
---

# Repo cleanup

A mechanical cleanup tool (herdr's ⇧X panel, `git-delete-merged-branches`, a shell alias) can
only clear the branches whose worktrees are clean. Every branch with an uncommitted file sits at
`held` forever, because the tool cannot know whether that file is a fix worth keeping or a stray
`console.log`. This skill reads them and says which.

**Three rules, and they do not bend:**

- **Local only.** Never `git push --delete`, never `gh pr close`, never touch `refs/remotes/*`.
  A deleted local branch is recoverable; a deleted remote branch is somebody else's problem.
- **Delete is the default; archiving needs a reason you can state.** Do not create
  `archive/*` tags as routine cover. `remove.sh` already dumps uncommitted work to a
  three-day undo directory under `/private/tmp`, and that is enough for anything you
  judged to be noise. If a branch genuinely deserves preservation, it deserves a commit
  on a real branch — raise it as a `decide`, not a tag.
- **Never delete anything the user did not approve in this session.** No verdict is
  self-executing, including the obvious ones.

## Step 1 — survey

```bash
bash ~/.claude/skills/repo-cleanup/collect.sh > /private/tmp/claude/<repo-slug>/repo-cleanup.json
```

Get `<repo-slug>` from `~/.claude/tools/repo-slug --path`. One JSON document covers every
branch: upstream state (`gone` / `tracking` / `none`), whether the tip is an ancestor of the
remote default, unique commit count and subjects, how many of those commits have **no
patch-equivalent upstream** (`unlanded_commits`), the worktree path, the dirty file list with a
diffstat, the newest PR for that head ref, and the stash list.

Read the JSON with `jq`, not by dumping it — 30 branches is a lot of context.

`unlanded_commits: 0` with `unique_commits > 0` is the squash-and-rebase case: the work is in
the default branch under different shas. Treat it as merged.

## Step 2 — classify each branch

Work down the tiers. First match wins.

| Tier | Condition | Verdict |
| --- | --- | --- |
| 1 | `protected: true` (default branch, or checked out in the main worktree) | `keep`, never listed |
| 2 | Clean worktree AND (`merged_into_base` OR PR state `MERGED` OR `unlanded_commits: 0`) | `delete` |
| 3 | Clean worktree, `upstream_state: gone`, no unlanded commits | `delete` |
| 4 | Dirty worktree, branch itself qualifies under tier 2 or 3 | read the diff → `delete` or `decide` |
| 5 | Clean worktree, unlanded commits, no merged PR | `keep` — say why in one line |
| 6 | Dirty worktree AND unlanded commits | `decide` |

A branch with **no upstream and no unique commits** is a branch someone created and never used:
`delete`, tier 2.

## Step 3 — read the held changes

For every tier-4 and tier-6 branch:

```bash
bash ~/.claude/skills/repo-cleanup/collect.sh diff <branch>
```

Over ~400 lines, read the diffstat and the first hunks of the largest files rather than the
whole thing. **Judge the content, never the filename.** A change in a source file can be
noise; a change in a config file can be the whole point.

**Noise — fold into `delete`, no conversation:**

- Regenerable output: lock files with no dependency change behind them, build artifacts,
  snapshot updates, generated types, formatter-only reflows.
- Debug leftovers: a `console.log`, a commented-out block, a hardcoded test value, a
  temporarily bumped timeout, a disabled test.
- Accidents: an editor's trailing-whitespace pass, a stray file from another branch's work,
  an empty file, a `.DS_Store`.
- A revert of the branch's own committed work — someone undoing themselves before walking away.
- Anything already present in the default branch. Check before assuming it is unique.

**Work — `decide`, and it goes to the user:**

- A behaviour change: a condition, a bound, an error path, a new call.
- A fix that names a real symptom, especially one on a branch whose PR already merged
  without it — that is a fix that never shipped.
- Anything referencing an issue, ticket, or TODO id.
- Anything you cannot confidently place in the noise list. **Uncertainty resolves to
  `decide`, always.**

## Step 4 — the report

One table, most-deletable first, then the slate. Keep it to one line per branch:

```
#  branch                            author   state           held changes      verdict
1  pierce/cf-preview-tier            you      merged          clean             delete
2  darren/fix-mtt-failing-tests      darren   remote gone     2f, formatter     delete
3  worktree-issue-1374-ws-reconnect  alex     merged          3f, real fix      decide
```

Then, for each `decide` row only, the options — and they are **shaped by that branch's state**,
which is the whole reason this is a conversation rather than a rule:

- **Branch already merged.** The held change is a fix that never shipped. Options: extract it
  onto a fresh branch off the current default and open a PR; drop it; or show more diff.
- **Branch unmerged, PR open.** Options: commit onto the branch and push so the PR carries it;
  extract; drop.
- **Branch unmerged, no PR, work looks finished.** Options: commit and push the branch as-is;
  commit and open a PR; extract only the held part and delete the rest.
- **Branch unmerged, work looks half-done.** Options: commit as a `wip:` on the branch and
  keep the branch; extract to a patch the user names a home for; drop.

Give your pick for each. Never invent a fifth outcome to avoid asking.

Stashes get the same treatment on the same slate — `collect.sh stash <n>` for the patch,
same noise/work test, same verdicts. A stash whose parent branch is on the delete list is
called out, since its context is about to disappear.

Orphan worktrees (`orphan_worktrees` in the JSON: detached or prunable) get one line and a
`prune` verdict.

Close with, and never with any other accept word:

> Type `go` to apply my picks, or answer per row (`3 extract, 7 keep, rest go`).

## Step 5 — execute

```bash
bash ~/.claude/skills/repo-cleanup/remove.sh branch <name> <name> ...
bash ~/.claude/skills/repo-cleanup/remove.sh stash 3 1
bash ~/.claude/skills/repo-cleanup/remove.sh prune-worktrees
```

`remove.sh` refuses the default branch and the main checkout's branch, removes the worktree
before the branch, resolves stash indices to shas before dropping any (dropping renumbers the
rest), and writes every uncommitted diff it is about to destroy into the undo directory. Report
that directory's path in your summary.

Anything the user chose to keep — a commit, an extraction, a PR — you do by hand afterwards,
following the repo's own branching rules. Do not fold it into `remove.sh`.

## Re-running

The survey is cheap and read-only. Run it again after executing to confirm the counts moved,
and report the before/after branch count as two numbers.
