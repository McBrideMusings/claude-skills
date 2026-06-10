# Phase 06 — Verify

Boot the dev server briefly to confirm the wiring works.

## Steps

1. **Boot the dev server:**

   ```bash
   npm run docs:dev &
   DEV_PID=$!
   sleep 4
   kill $DEV_PID 2>/dev/null
   wait $DEV_PID 2>/dev/null
   ```

   Look for `Local: http://localhost:NNNN/` in the output.

2. **If project deploys docs**, also run `npm run docs:build` and confirm it exits clean.

3. **If `admin.toml` is wired**, run `admin docs` briefly and confirm VitePress + HMR boot.

Failures here usually point at one of the gotchas in [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md) — `.mts` rename, `{{ }}` template syntax, missing `layout: home`.

When verify passes, proceed to [PHASE-07-COMMIT.md](PHASE-07-COMMIT.md).
