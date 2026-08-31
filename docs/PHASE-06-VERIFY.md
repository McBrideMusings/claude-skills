# Phase 06 — Verify

Boot the dev server briefly to confirm the wiring works.

## Steps

1. **Boot the dev server via a scratchpad script** — the inline `&` + `sleep` + `kill` shape trips the shell guards, so write this to `<scratchpad>/docs-verify.sh` and run it as `bash <absolute-path>`:

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

   `admin docs` writes its terminal output to `tmp/docs.log` (per admin's universal per-command logging — `tmp/<cmd>.log`, and `tmp/<cmd>-<sub>.log` for sub-targets). If the dev server hangs or errors silently, read that file directly rather than re-invoking.

Failures here usually point at one of the gotchas in [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md) — `.mts` rename, `{{ }}` template syntax, missing `layout: home`.

When verify passes, proceed to [PHASE-07-COMMIT.md](PHASE-07-COMMIT.md).
