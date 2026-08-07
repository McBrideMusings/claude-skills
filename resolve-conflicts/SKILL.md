---
name: resolve-conflicts
description: Merge or rebase a branch with origin/main, intelligently choosing strategy based on branch complexity and resolving any conflicts.
---

# Resolve Conflicts

Bring a branch up to date with `origin/main`. Automatically choose merge vs rebase based on branch complexity, and resolve conflicts.

Every confirmation in this skill (before committing a merge, on ambiguous conflicts) is a plain-chat question — never use the `AskUserQuestion` tool / structured-question schema. These are in-the-moment yes/no confirms whose context is the surrounding work, not a standalone menu.

## Input

The user may specify a branch name as an argument. If omitted, use the current branch.

If the user specifies a branch that is not currently checked out, check it out first.

## Phases

### Phase 01 — Setup

- **Check for a merge/rebase already in progress FIRST**, before fetching or merging anything. A second `git merge` on top of an unfinished one compounds the mess:
  ```
  git rev-parse --git-dir            # then Read <git-dir>/MERGE_HEAD, <git-dir>/rebase-merge, <git-dir>/rebase-apply
  ```
  If any exists, stop and report which — the user finishes or aborts it, not you.
- **Require a clean working tree**: `git status --porcelain` must be empty. Uncommitted work gets swept into the merge commit or lost to a conflict resolution. If dirty, stop and list the files — never stash or discard on the user's behalf.
- Run `git fetch origin main`
- Determine the target branch (argument or current branch)
- If the target branch is `main`, stop and tell the user — nothing to merge

### Phase 02 — Analyze Divergence

Run these to understand the branch shape:

- `git log --oneline origin/main..HEAD` — commits on the branch not in main
- `git log --oneline HEAD..origin/main` — commits on main not in the branch
- `git log --merges --oneline origin/main..HEAD` — merge commits on the branch

Count the results. You need three numbers:
- **branch_commits**: commits ahead of main
- **main_commits**: commits main is ahead of the branch
- **merge_commits**: merge commits on the branch

**Sanity-check `branch_commits` before trusting it — the branch may not be based on `main`.** Stacked branches are common: cut `08` off `05` and `git log origin/main..HEAD` counts 05's commits as yours, inflating the number that then decides the strategy in Phase 03. Confirm what the branch actually sits on:

```
git log --oneline --first-parent origin/main..HEAD        # whose commits are these?
git branch --contains $(git rev-list --max-parents=0 origin/main..HEAD | tail -1)
```

If commits belong to another feature branch, say so and count only the ones authored for *this* branch. A wrong base silently corrupts every downstream decision.

If `main_commits` is 0, the branch is already up to date. Report that and stop.

### Phase 03 — Choose Strategy

Use **rebase** when ALL of these are true:
- `branch_commits` <= 10
- `merge_commits` == 0 (no merge commits — rebase would flatten them)
- **The branch's commits are not already published where others build on them.** Check rather than guess — this is the condition that costs a force-push and someone else's afternoon when you get it wrong:
  ```
  git ls-remote --heads origin <branch>                    # pushed at all?
  git rev-list --count origin/<branch>..HEAD               # unpushed commits only?
  gh pr list --head <branch> --json number,reviews         # open PR? reviewed?
  git branch -r --contains origin/<branch>                 # other branches built on it?
  ```
  Never pushed, or pushed with nothing depending on it → rebase is fine. Pushed **and** carrying an open PR with submitted reviews, or another branch contains it → **merge**, because rebasing rewrites what a reviewer already read.

Use **merge** otherwise. Merge is the safe default.

Tell the user which strategy you chose and why, then proceed.

### Phase 04 — Attempt the Merge/Rebase

**Rebase path:**
```
git rebase origin/main
```

**Merge path:**
```
git merge origin/main --no-edit
```

If conflicts occur, **do not resolve yet**. Proceed to Phase 05.

### A clean merge is NOT a correct merge — verify before believing it

git reports success when neither side touched the same *lines*. It knows nothing about whether the two changes make sense together. Two branches that fix the same problem in different places, or in the same file at a distance, merge clean and produce broken code.

Observed: `main` and a feature branch each fixed the same flaky test — different mechanism, non-overlapping lines. git merged both happily and left duplicate declarations of three symbols. Zero conflicts reported; the file did not compile.

So on a clean merge, **do not skip to Phase 06 on the strength of the exit code**:

1. **Run the project's build/typecheck** (look for a `check` script — most repos have one). This is the cheapest detector of a semantic conflict and it is not optional.
2. **Read the diff of what came in** against what your branch already did — `git diff HEAD@{1} --stat` for the shape, then the full diff of any file BOTH sides touched. Ask specifically: did the other side solve a problem my branch also solved?
3. Anything broken → fix it now, as part of the merge, and say so.

Only once that passes does a clean merge earn the label. Then continue to Phase 06.

### Phase 05 — Conflict Resolution Plan (present before acting)

When conflicts are detected:

1. List all conflicted files with `git diff --name-only --diff-filter=U`
2. Read each conflicted file in full
3. For each conflict, analyze both sides:
   - What does the **branch** side intend? (Read the branch's version between `<<<<<<<` and `=======`)
   - What does **main** side intend? (Read main's version between `=======` and `>>>>>>>`)
   - What is the surrounding context — does one side's change depend on the other?
   - **Research intent, not just the diff.** Check the commit messages that introduced each side (`git log -p <commit>` or `git blame`), and — where relevant — the originating PR or issue. Understanding *why* a change was made resolves more conflicts correctly than comparing the two hunks alone.

4. **Present a conflict resolution plan to the user.** Format:

   ```
   ## Conflict Resolution Plan

   ### <filename> (N conflicts)

   **Conflict 1** (lines X-Y)
   - Branch side: <what the branch changed and why>
   - Main side: <what main changed and why>
   - Recommendation: <how to resolve — keep both, prefer one side, combine>
   - Confidence: <high / medium / low>

   **Conflict 2** ...

   ### <next filename> ...
   ```

   For low-confidence resolutions, explicitly flag them and explain the ambiguity.

5. **Wait for the user to approve the plan** (or adjust individual resolutions).

6. Once approved, execute the resolutions:
   - Use the Edit tool to remove conflict markers and apply the agreed resolution
   - `git add <resolved-files>`
   - For rebase: `git rebase --continue` (repeat steps 1-6 if more conflicts appear on subsequent commits)
   - For merge: `git diff --check` to verify no markers remain, then ask the user before committing. Commit message: `Merge origin/main into <branch-name>`

### Phase 06 — Verify

- Run `git diff --check` to confirm no conflict markers remain
- Run `git log --oneline -5` to show the result
- **Run the project's checks — and on the conflicted-merge path, run them BEFORE committing.** Look for a single entry point first (`check` in package.json, a Makefile target, `just`/`task`); most repos have one that chains typecheck → lint → tests. Falling back to "typecheck, then tests, then lint" separately is the exception, not the plan.

  Ordering matters: a conflicted merge is not committed until Phase 05 step 6, so failures found now are fixed *in* the merge commit rather than trailing it. A clean merge is already committed by git, so its failures become a follow-up commit — still fix them here, before the push.

  **A failing check is a stop.** Do not push, and do not describe the merge as done. Fix it, or surface it and hand back.

### Phase 07 — Push

After the merge/rebase is complete and Phase 06's checks pass, push the branch:

- For **merge**: `git push origin <branch-name>`
- For **rebase**: `git push origin <branch-name> --force-with-lease` (rebase rewrites history, so force is required — `--force-with-lease` refuses if someone else has pushed in the meantime).

**Confirm before pushing — one plain-chat line, wait for a yes.** A feature branch is not private: it may carry an open PR, reviewers, and CI. Pushing publishes the merge you just resolved, and a force-push additionally rewrites what a reviewer may already be reading. "It's only a feature branch" does not make it an internal action, and this does not get to opt out of the global never-send-on-my-behalf rule.

Say what will happen and let the user answer: *"Merge resolved and checks pass. Push to `<branch>`? (force-with-lease, rewrites 3 commits)"* — `push` / `hold`.

Never push when Phase 06's checks are failing. A red build is a stop, not a footnote to mention after the push lands.

## Conflict resolution principles

- **Resolve rather than abort — but abort when the merge's premise is wrong.** Default hard to seeing it through: don't `--abort` because the conflicts look tedious, span many files, or need a judgement call. Where intents are genuinely incompatible, pick the one matching the branch's stated goal and note the trade-off.

  The exception is narrow and real: **abort when continuing would encode a mistake, not resolve one.** Concretely — the two sides turn out to have built the same thing independently and one should be dropped rather than merged; you are merging the wrong base (see Phase 02); or resolving demands a decision only the user can make and guessing would silently pick a winner. In those cases `--abort`, restore the branch, and surface what you found with a recommendation. Discovering the merge shouldn't happen is a legitimate outcome; grinding through it to avoid the word "abort" is not.
- **Additive changes on both sides**: Keep both additions. If main added lines and the branch added different lines nearby, include all of them in logical order.
- **Same code modified differently**: If main refactored a function and the branch also changed it, prefer main's structural changes and re-apply the branch's behavioral intent on top.
- **Deleted on one side, modified on the other**: If main deleted code that the branch modified, the branch's intent probably still matters — ask the user.
- **Generated files: never hand-merge — take one side, then regenerate.** Lockfiles are the obvious case, but the class is wider and the others conflict just as often: checked-in baselines and snapshots (`*-baseline.json`, `__snapshots__/`), generated schemas (`schema.sql`), API/type codegen, bundled or minified output. A hand-resolved generated file is wrong even when it looks right, because it no longer matches what its generator produces. Take `main`'s copy, re-run the generator, commit the result. If you can't identify the generator, say so rather than merging it by hand.
- **Ambiguous**: When in doubt, ask. Don't guess on conflicts where both sides have legitimate competing changes to the same logic.
- **Repeated merges: offer `git rerere`.** A long-lived branch merged against a moving `main` re-presents the same conflicts every time, and re-resolving them by hand is both wasted effort and a chance to resolve differently than last time. If the branch has merged `main` more than once, mention `git config rerere.enabled true` — git then replays your previous resolution automatically. Suggest it; don't set a user's git config unasked.
