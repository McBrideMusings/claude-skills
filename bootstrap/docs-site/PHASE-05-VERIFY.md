# Phase 05 — Verify

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

3. Run `bun run docs:dev` briefly in a dev-server pane and confirm VitePress + HMR boot.
   Read output from that pane; use a log file only when the project's script explicitly writes one.


Failures here usually point at one of the gotchas in [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md) — `.mts` rename, `{{ }}` template syntax, missing `layout: home`.

When verify passes, proceed to [PHASE-06-COMMIT.md](PHASE-06-COMMIT.md).
