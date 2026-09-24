# Worktrees — where a pass runs, and retiring one

## Dispatching a pass

The call and the brief are in [`SKILL.md`](SKILL.md). The agent's own instructions are `~/.claude/agents/implementer.md`; the rules binding every command it runs are [`PASS-RULES.md`](PASS-RULES.md). Editing this file does not change what a pass does.

## Pre-flight's exempt paths

Two path families are exempt from the dirty-tree halt because both are the session's own bookkeeping, not work in progress:

- **`.claude/`** — `scheduled_tasks.lock`, `papercuts.md`, `review-rejected.md`.
- **`.beads/`** — the tracker's export churn. `issues.jsonl` and `interactions.jsonl` are a passive export of a local Dolt database, rewritten by nearly every `bd` command including the `bd show` a pass runs to resolve its own item. Do not stash them and do not commit them to clear the check.

The dirty-tree halt is judged in the checkout the pass will branch from. When that checkout is the primary `~/.claude`, a dirty file there belongs to another concurrent session sharing that index, not to this pass — it is not a halt, and the pass cuts its worktree from `main` regardless.

## Where a pass runs

**Every pass runs in a worktree. No exceptions, however small the change.** The user is usually standing in the primary checkout. A session standing in the item's own worktree dispatches no pass at all — [`SKILL.md`](SKILL.md) has the inline rule.

Which worktree depends on whether the repo is collaborative — check the `origin` owner, not the directory:

**Solo (remote owned by `mcbridemusings`, or no remote).** Cut a throwaway worktree per pass from the primary checkout:

```
git rev-parse --show-toplevel                       # → <repo>
git -C <repo> worktree add -b <branch> ~/.worktrees/<repo-name>/<slug> <default-branch>
CLAUDE_PROJECT_DIR=~/.worktrees/<repo-name>/<slug> bash ~/.claude/hooks/worktree-link-locals.sh
~/.claude/tools/orchestrator-mark ~/.worktrees/<repo-name>/<slug>
```

**That last line is not optional.** `hooks/cross-worktree-write-guard.sh` exempts an
orchestrator in the primary checkout, and a session writing into a worktree carrying its
own session id in `ORCHESTRATOR-SESSION`. An orchestrator sitting in a linked worktree
matches only the second; without the marker every file the pass touches stops and asks.

`<slug>` is the tracker id lowercased; `<branch>` is `<type>/<slug>-<short-title>`. **In a `beads:stealth` repo the id stays out of both:** `<slug>` and `<branch>` are built from the short title alone (`feat/journeys-telemetry-server`), because a merge commit names the branch it merged and carries the id into history the upstream can see. Landing and teardown both happen through `wrap-up <worktree>` — via `go` at the gate for a single pass, or `wrap-up continuous <worktree>` under queue/swarm — never inside the verify loop itself. `~/.claude` lands with `~/.claude/tools/claude-land <worktree>` instead of a merge; [`../wrap-up/SKILL.md`](../wrap-up/SKILL.md) Step C has both routes.

**Collaborative (remote owned by anyone else).** The long-lived thing is the feature, not the pass. Make one worktree for the body of work and keep it, with the same three commands as the solo case, cut from the default branch:

```
git -C <repo> worktree add -b <feature> ~/.worktrees/<repo-name>/<feature-slug> <default-branch>
CLAUDE_PROJECT_DIR=~/.worktrees/<repo-name>/<feature-slug> bash ~/.claude/hooks/worktree-link-locals.sh
~/.claude/tools/orchestrator-mark ~/.worktrees/<repo-name>/<feature-slug>
```

Never `herdr worktree create` here: it skips the link hook, and it opens the feature's herdr workspace before any `dispatch exec` runs, which [`../dispatch/TARGETS.md`](../dispatch/TARGETS.md) §Where the work happens forbids. Under the `workspace` target ([`SKILL.md`](SKILL.md)) the pass runs in this feature worktree itself, and `dispatch exec` opens its workspace. Under the `agent` target, passes cut their throwaway worktrees off *that* branch; `wrap-up` merges each one back into it via Step C. Either way only the feature branch ever becomes a PR.

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

Teardown happens inside `wrap-up` Step C, as part of landing — see [`../wrap-up/SKILL.md`](../wrap-up/SKILL.md) Step C. It is not a step this file's caller performs on its own between a pass returning and the next one dispatching.

---

