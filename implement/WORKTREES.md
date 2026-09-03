# Worktrees — where a pass runs, and retiring one

## The breakdown behind a slice

The breakdown in `issues/breakdown.md` puts slices, a Verify bead and a Land bead under every issue at the moment it is picked up, and a pass is the thing that works exactly one slice to a commit. So `implement <parent>` means: break it down now if `bd children <parent>` is empty (in chat, where the slices are visible), then walk the slice children in dependency order, one pass each, landing each before the next.

## Calling `Workflow`

Never edit a generated `implement-<id>.js` directly, and never point `scriptPath` at `implement.js` itself. The generated per-pass copy is disposable — it lands under `$(~/.claude/tools/repo-slug --path <repo>)`, which macOS reaps after three days idle.

**Never `Workflow({name: 'implement'})` and never `workflow('implement', …)`.** Name resolution reads the *project's* `.claude/workflows/`, not `~/.claude/`, so it fails in exactly the place every pass runs — a worktree — with `Workflow "implement" not found. Available: deep-research, code-review`. The absolute path has no registry between it and the file.

**Only this session may call `Workflow` at all.** It is not available inside subagents: a subagent that tries gets `No such tool available`. So the orchestrator is always the chat session, never something it spawned.

**Why staged and not one long agent.** Passes that ran as a single agent averaged ~300 turns, peaked between 243k and 406k context, and were **37% of all token spend** in a measured day. The cost was never the code — it was one context that grew all pass and was re-read every turn. `implement.js` runs one `agent()` per stage, each starting fresh and handing the next a small validated object.

**Editing this file does not change what a pass does.** Stage prompts live in `implement.js`; rules binding every stage live in [`STAGE-RULES.md`](STAGE-RULES.md) — including the Bash command rules, and the two that protect the saving above: a stage runs its own build or test but must bound the output (`2>&1 | tail -40`), and no stage reads a screenshot. Raw build output was the largest single source of growth inside a pass; images were 84% of all tool-result bytes. Neither goes through a `build-runner` or `screenshot-checker` subagent — a stage cannot spawn one at all (tested 2026-09-01, see [`VERDICTS.md`](VERDICTS.md)).

`tools/tests/implement-workflow.test.sh` and `skills/implement/implement.test.mjs` are what hold the script to its contract. Run both after editing it.

## Pre-flight's exempt paths

Two path families are exempt from the dirty-tree halt because both are the session's own bookkeeping, not work in progress:

- **`.claude/`** — `scheduled_tasks.lock`, `papercuts.md`, `review-rejected.md`.
- **`.beads/`** — the tracker's export churn. `issues.jsonl` and `interactions.jsonl` are a passive export of a local Dolt database, rewritten by `bd` commands including the `bd show` a pass runs to resolve its own item. Halting on them means no pass can start after any earlier `bd` command, which is nearly every pass. Do not stash them and do not commit them to clear the check.

The dirty-tree halt is judged in the checkout the pass will branch from. When that checkout is the primary `~/.claude`, a dirty file there belongs to another concurrent session sharing that index, not to this pass — it is not a halt, and the pass cuts its worktree from `main` regardless.

## Where a pass runs

**Every pass runs in a worktree. No exceptions, however small the change.** The user is usually standing in the primary checkout, and an agent committing underneath them is a collision they did not agree to.

Which worktree depends on whether the repo is collaborative — check the `origin` owner, not the directory:

**Solo (remote owned by `mcbridemusings`, or no remote).** Cut a throwaway worktree per pass from the primary checkout:

```
git rev-parse --show-toplevel                       # → <repo>
git -C <repo> worktree add -b <branch> ~/.worktrees/<repo-name>/<slug> <default-branch>
CLAUDE_PROJECT_DIR=~/.worktrees/<repo-name>/<slug> bash ~/.claude/hooks/worktree-link-locals.sh
```

`<slug>` is the tracker id lowercased; `<branch>` is `<type>/<slug>-<short-title>`. Land by merging into the default branch, then remove the worktree — **from the primary checkout, after the workflow returns**, because a session cannot outlive its own working directory. Exception: for `~/.claude`, land with `~/.claude/tools/claude-land <worktree>` run from inside the worktree — never a merge in the primary — then remove the worktree from the primary as usual.

**Collaborative (remote owned by anyone else).** The long-lived thing is the feature, not the pass. Make one herdr worktree for the body of work and keep it:

```
herdr worktree create --workspace <repo-workspace-id> --branch <feature>
```

Targeting `--workspace` is what nests it under the repo in the sidebar instead of detaching it to top level; never `herdr workspace create --cwd`, and never a custom `--label`. Checkouts land under `~/.worktrees/<repo>/<branch>`. Passes cut their throwaway worktrees off *that* branch and merge back into it, and only the feature branch ever becomes a PR.

**The link hook is run by hand and skipping it fails quietly.** Its normal trigger is a Claude session entering the directory, and none ever does — the workflow's stage agents inherit *this* session's `CLAUDE_PROJECT_DIR`. Without it the worktree has no `admin.toml`, no `.env*`, no `CLAUDE.local.md` and no `.claude/skills/verify-project`. The first two fail loudly on the first build; the last one produces a weak Verify verdict that reads exactly like a real one.

**Never `git worktree remove` or `rm -rf` from inside the checkout being removed.** `hooks/no-self-delete-guard.py` blocks it, and the reason is real: delete the directory a session runs in and every later hook fails to spawn with `ENOENT` before reaching its first line, so every PreToolUse, PostToolUse and Stop guard is silently skipped for the rest of that session.

**The branch is not yours to delete on a collaborative repo.** Its PR has not merged when the worktree finishes. `tools/git-sweep.sh`, run daily from `hooks/daily-git-sweep.sh`, collects branches proven merged along with any worktree still holding them.

---

## Cross-repo items

**A pass works exactly one repo.** The worktree confinement above is load-bearing, and this section does not lift it — an item that needs two repos gets split, never worked in one pass.

`~/.claude` and `~/.claude/skills` (`claude-skills`) are **two separate repos**, not one. The second is a git submodule nested inside the first, and its files sit right there in the parent's directory tree — `hooks/`, `tools/`, `tools/tests/` and `CLAUDE.md` live in `~/.claude`, while every skill, including `implement` itself, lives in `claude-skills`. Reading the directory tree does not tell you which repo a path belongs to; check its repo root before assuming a pass confined to one can touch it. Any repo with a nested submodule, or any item whose test lives in a harness repo beside the code repo, has the same shape.

An item touching both is split into one item per repo, wired with a dependency edge, and each half's brief says which repo it owns and names the other half's item id.

The Gate stage's third test (reachability) catches this automatically: an item naming a file, or carrying an acceptance criterion, outside the repo the pass is confined to fails the gate with a `missing` entry naming the out-of-repo path. That costs one cheap stage instead of a whole pass discovering the same thing at Verify, its last stage.

## Retiring a worktree

Teardown is yours because it is **structurally impossible for the pass**: git refuses to delete a branch a worktree still has checked out, and the pass is standing in it. Whatever created a resource retires it.

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

**The first two lines are not a formality.** `worktree remove --force` is the last moment the verdict exists. If the copy is missing, make it now rather than removing the worktree — this is the check that stops a run's evidence disappearing one worktree at a time, each teardown looking perfectly clean as it goes. If a `rechecks` entry was appended after the copy was made, the copy is stale in the same way a missing one is: re-copy before removing.

**List the directory; do not just `test -f` the path you expect.** A `test -f` against one exact name passes vacuously when the pass wrote a differently-named file, and `--force` then deletes the only copy — including a complete `FAIL` verdict naming the exact cause, found only by listing. **Any `.json` in there that is not `<item>.json` blocks teardown**: copy it out under a name that includes the item and branch, then decide. Two passes in one round can both write a same-named stray file, and once copied to the primary checkout they are indistinguishable — so never copy one out under the name it already has.

**A live process in the worktree forbids teardown exactly as uncommitted work does.** `worktree remove --force` deletes the directory out from under whatever is standing in it, and that process keeps running against a path that no longer exists — a bundler or dev server left running inside keeps serving from a path that is now gone, and the failure surfaces later, inside whatever was consuming it, reading as a broken build rather than as teardown. A clean, fully-merged tree passes every other check and gives no warning.

**Refuse, do not name-and-remove.** In a queued or swarmed run this happens unattended, so "removed, and this killed the process" is still an unattended removal — the sentence lands in a report nobody reads until the app is already broken. Deferring costs one worktree's disk; the branch is already merged. Say which condition fired and which process holds it — worktree, item, pid, command — so the next pass retires it rather than re-deriving why it was skipped.

`pgrep -f` matches the command line, not the working directory: it catches a bundler, dev server or watch process launched with the path in its argv, and misses a bare shell that `cd`'d in. When it is empty and you still suspect a hold, `lsof +D <worktree>` walks the tree and answers for certain — slower, and worth it only then. Quote the path (it contains no metacharacters today, but a branch slug can), and use `xargs -r`: without it, BSD xargs still runs `ps` once when pgrep found nothing, with no pids to select on, so what prints depends on the calling terminal rather than on the worktree. Never `pgrep -fl` — an npm-exec process carries its whole inherited environment in the command column, so one match can run tens of thousands of characters.

**A gitignored file the pass created is invisible to every check above, and `hooks/worktree-remove-locals-guard.sh` denies the removal when one exists.** `git status --short` reads git's view, so a file git is told to ignore leaves it empty — a pass-created `admin.toml`, gitignored globally and never committed, passes every teardown check and then `--force` takes the repo's only copy of its build, test and dev commands. The guard compares the worktree against the primary checkout on the `pattern` names in `~/.config/repo/config.toml`, the same list `repo populate` brings in, and names the file it found. Copy that file to the primary checkout, then re-run the removal.

**No `push origin --delete`.** A pass does not push, so its branch exists only locally and there is nothing on the remote to delete — the command fails with `remote ref does not exist` and, chained with `&&`, makes a clean teardown read as a failed one.

**Retire the pass's device too**, if you gave it one — the platform cell has the teardown commands. It survives its pass and holds resources; a long run that skips this ends with one per item still alive.

---

