---
name: summary
description: "Read a branch in and catch up — diff, commits, PR discussion — to pick up half-finished work. Read-only: writes nothing. To generate a pasteable summary of what was built and why, use `handoff`."
---

# Summary

Catches you up on a branch — your own from a previous session, or someone else's you've just checked out. Read-only: **make no file changes, write no summary file, commit nothing.**

1. **Resolve the branch and base.** `git branch --show-current`, then `git symbolic-ref --short refs/remotes/origin/HEAD` (strip `origin/`; fall back to `main`).
2. **Read the diff.** `git diff <base>...HEAD --stat` first to find the clusters, then `git diff <base>...HEAD` in full. Read the actual changes — the stat alone is not enough to answer a follow-up question about them.
3. **Read the commits.** `git log <base>..HEAD --oneline` for how the work progressed.
4. **Read the PR if there is one.** `gh pr list --head "$(git branch --show-current)" --json number,title,body,url,state,comments --jq '.[0]'` — the body carries acceptance criteria and the comments carry review feedback and decisions already made. No PR is fine; say so and move on.
5. **Read a prior handoff or written summary if one exists** for this branch — check `/private/tmp/claude/<repo-slug>/handoffs/` and `/private/tmp/claude/<repo-slug>/summaries/<repo-basename>/<branch-sanitized>.md`. It holds rationale and rejected approaches the diff can't show.
6. **Report in chat**: what the branch does, the files and areas it touches, decisions visible in the changes, open review comments, and the working-tree state (clean, uncommitted changes, ahead/behind).
7. **Say you're ready** for follow-up work on this branch.

If the current branch is the base branch, or has no divergence from it, say there's nothing to catch up on and stop.

Large diff: read the structure first, then the key files in full. Don't summarize from the stat.
