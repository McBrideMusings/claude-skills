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

If `main_commits` is 0, the branch is already up to date. Report that and stop.

### Phase 03 — Choose Strategy

Use **rebase** when ALL of these are true:
- `branch_commits` <= 10
- `merge_commits` == 0 (no merge commits — rebase would flatten them)
- No shared/pushed merge commits that other people depend on

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

If it completes cleanly, report success and skip to Phase 06.

If conflicts occur, **do not resolve yet**. Proceed to Phase 05.

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
- Discover and run the project's automated checks — typically typecheck, then tests, then format/lint. Fix anything the merge broke before moving on.

### Phase 07 — Push

After the merge/rebase is complete, push the branch:

- For **merge**: `git push origin <branch-name>`
- For **rebase**: `git push origin <branch-name> --force-with-lease` (rebase rewrites history, so force is required — `--force-with-lease` refuses if someone else has pushed in the meantime).

No confirmation needed before this push: it only ever targets your own feature branch (never `main` — Phase 01 stops on `main`), and `--force-with-lease` is the safety net.

## Conflict resolution principles

- **Always resolve; never `--abort`.** Once a merge/rebase is in progress, see it through to a resolved, committed state. Don't invent new behavior to force a resolution — where intents are genuinely incompatible, pick the one matching the branch's stated goal and note the trade-off, but never bail out with `--abort` and leave the branch unmerged.
- **Additive changes on both sides**: Keep both additions. If main added lines and the branch added different lines nearby, include all of them in logical order.
- **Same code modified differently**: If main refactored a function and the branch also changed it, prefer main's structural changes and re-apply the branch's behavioral intent on top.
- **Deleted on one side, modified on the other**: If main deleted code that the branch modified, the branch's intent probably still matters — ask the user.
- **Package lock / generated files**: Accept main's version, then regenerate if needed.
- **Ambiguous**: When in doubt, ask. Don't guess on conflicts where both sides have legitimate competing changes to the same logic.
