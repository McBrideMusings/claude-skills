# Phase 06 — Issue Tracker Check

Confirm `gh` is authed and the repo has a GitHub remote — otherwise record the fallback so downstream skills know.

## Steps

1. Run `gh auth status` and check `git remote -v | grep github`.
2. **gh authed + GitHub remote** → no-op.
3. **No GitHub remote (or gh not authed)** → record in the root `CLAUDE.local.md` under the "Issue tracker" section:

   ```md
   ## Issue tracker
   Local markdown in `.scratch/<slug>/` (no GitHub remote / gh not authed at bootstrap time)
   ```

   So that `to-tickets`, `triage`, and `implement` pick up the convention later.

Then proceed to [PHASE-07-SUMMARY-AND-BACKFILL.md](PHASE-07-SUMMARY-AND-BACKFILL.md).
