# Worktrees — where a pass runs, and retiring one

## Dispatching a pass

The call and the brief are in [`SKILL.md`](SKILL.md). The agent's own instructions are `~/.claude/agents/implementer.md`; the rules binding every command it runs are [`PASS-RULES.md`](PASS-RULES.md). Editing this file does not change what a pass does.

## Pre-flight's exempt paths

Two path families are exempt from the dirty-tree halt because both are the session's own bookkeeping, not work in progress:

- **`.claude/`** — `scheduled_tasks.lock`, `papercuts.md`, `review-rejected.md`.
- **`.beads/`** — the tracker's export churn. `issues.jsonl` and `interactions.jsonl` are a passive export of a local Dolt database, rewritten by nearly every `bd` command including the `bd show` a pass runs to resolve its own item. Do not stash them and do not commit them to clear the check.

The dirty-tree halt is judged in the checkout the pass will branch from. When that checkout is the primary `~/.claude`, a dirty file there belongs to another concurrent session sharing that index, not to this pass — it is not a halt, and the pass cuts its worktree from `main` regardless.

## Where a pass runs

**Every pass runs in a worktree. No exceptions, however small the change.** The user is usually standing in the primary checkout.

Which worktree depends on whether the repo is collaborative — check the `origin` owner, not the directory:

**Solo (remote owned by `mcbridemusings`, or no remote).** Cut a throwaway worktree per pass from the primary checkout:

```
git rev-parse --show-toplevel                       # → <repo>
git -C <repo> worktree add -b <branch> ~/.worktrees/<repo-name>/<slug> <default-branch>
CLAUDE_PROJECT_DIR=~/.worktrees/<repo-name>/<slug> bash ~/.claude/hooks/worktree-link-locals.sh
printf '%s' "$CLAUDE_SESSION_ID" > "$(git -C ~/.worktrees/<repo-name>/<slug> rev-parse --absolute-git-dir)/ORCHESTRATOR-SESSION"
```

**That third line is not optional.** `hooks/cross-worktree-write-guard.sh` exempts an
orchestrator in the primary checkout, and a session writing into a worktree carrying its
own session id in `ORCHESTRATOR-SESSION`. An orchestrator sitting in a linked worktree
matches only the second; without the marker every file the pass touches stops and asks.

`<slug>` is the tracker id lowercased; `<branch>` is `<type>/<slug>-<short-title>`. Land by merging into the default branch, then remove the worktree — **from the primary checkout, after the pass returns**, because a session cannot outlive its own working directory. Exception: for `~/.claude`, land with `~/.claude/tools/claude-land <worktree>` run from inside the worktree — never a merge in the primary — then remove the worktree from the primary as usual.

**Collaborative (remote owned by anyone else).** The long-lived thing is the feature, not the pass. Make one herdr worktree for the body of work and keep it:

```
herdr worktree create --workspace <repo-workspace-id> --branch <feature>
```

Targeting `--workspace` is what nests it under the repo in the sidebar instead of detaching it to top level; never `herdr workspace create --cwd`, and never a custom `--label`. Checkouts land under `~/.worktrees/<repo>/<branch>`. Passes cut their throwaway worktrees off *that* branch and merge back into it, and only the feature branch ever becomes a PR.

**The link hook is run by hand and skipping it fails quietly.** Its normal trigger is a Claude session entering the directory, and none ever does — the implementer inherits *this* session's `CLAUDE_PROJECT_DIR`. Without it the worktree has no `admin.toml`, no `.env*`, no `CLAUDE.local.md` and no `.claude/skills/verify-project`. The last one produces a weak verdict that reads exactly like a real one.

**Never `git worktree remove` or `rm -rf` from inside the checkout being removed.** `hooks/no-self-delete-guard.py` blocks it: delete the directory a session runs in and every later hook fails to spawn with `ENOENT`, silently skipping every PreToolUse, PostToolUse and Stop guard for the rest of that session.

**The branch is not yours to delete on a collaborative repo.** Its PR has not merged when the worktree finishes. `tools/git-sweep.sh`, run daily from `hooks/daily-git-sweep.sh`, collects branches proven merged along with any worktree still holding them.

---

## Cross-repo items

**A pass works exactly one repo.** The worktree confinement above is load-bearing, and this section does not lift it — an item that needs two repos gets split, never worked in one pass.

`~/.claude` and `~/.claude/skills` (`claude-skills`) are **two separate repos**: `hooks/`, `tools/`, `tools/tests/` and `CLAUDE.md` live in `~/.claude`, while every skill, including `implement` itself, lives in `claude-skills`. Reading the directory tree does not tell you which repo a path belongs to — check its repo root. Any repo with a nested submodule, or any item whose test lives in a harness repo beside the code repo, has the same shape.

An item touching both is split into one item per repo, wired with a dependency edge, and each half's brief says which repo it owns and names the other half's item id.

The reachability test catches this before dispatch, in chat: an item naming a file, or carrying an acceptance criterion, outside the repo the pass would be confined to is not offered as-is — it is split into one item per repo first ([`HANDOFF.md`](HANDOFF.md) §1).

## Retiring a worktree

Teardown is yours: git refuses to delete a branch a worktree still has checked out, and the pass is standing in it.

```bash
ls $(~/.claude/tools/repo-slug --path <worktree>)/verify/*.json    # every verdict in there, by name
test -f $(~/.claude/tools/repo-slug --path <repo>)/verify/<item>.json   # the copy you made
git -C <worktree> status --short          # must be empty
git log <default>..<branch>               # must be empty — fully merged
pgrep -f "<worktree>" | xargs -r ps -o pid=,comm=   # must be empty — nothing is standing in it
```

```bash
git -C <repo> worktree remove --force <worktree> \
  && git -C <repo> branch -d <branch>
```

**The first two lines are not a formality.** `worktree remove --force` is the last moment the verdict exists. If the copy is missing, make it before removing the worktree. If a `rechecks` entry was appended after the copy was made, re-copy first.

**List the directory; do not just `test -f` the path you expect.** A `test -f` against one exact name passes vacuously when the pass wrote a differently-named file, and `--force` then deletes the only copy. **Any `.json` in there that is not `<item>.json` blocks teardown**: copy it out under a name that includes the item and branch, then decide — never under the name it already has, since two passes in one round can write the same stray name.

**A live process in the worktree forbids teardown exactly as uncommitted work does.** `worktree remove --force` deletes the directory out from under whatever is standing in it, and that process keeps running against a path that no longer exists. A clean, fully-merged tree passes every other check and gives no warning.

**Refuse, do not name-and-remove.** Say which condition fired and which process holds it — worktree, item, pid, command — so the next pass retires it rather than re-deriving why it was skipped.

`pgrep -f` matches the command line, not the working directory: it catches a process launched with the path in its argv and misses a bare shell that `cd`'d in. When it is empty and you still suspect a hold, `lsof +D <worktree>` answers for certain. Quote the path, and use `xargs -r` — without it BSD xargs still runs `ps` once when pgrep found nothing. Never `pgrep -fl`: one npm-exec match can run tens of thousands of characters.

**A gitignored file the pass created is invisible to every check above**, and `hooks/worktree-remove-locals-guard.sh` denies the removal when one exists — `git status --short` reads git's view, so an ignored file leaves it empty. The guard compares the worktree against the primary checkout on the `pattern` names in `~/.config/repo/config.toml` and names what it found. Copy that file to the primary checkout, then re-run the removal.

**No `push origin --delete`.** A pass does not push, so the branch exists only locally; the command fails with `remote ref does not exist` and, chained with `&&`, makes a clean teardown read as a failed one.

**Retire the pass's device too**, if you gave it one — the platform cell has the teardown commands. It survives its pass and holds resources.

---

