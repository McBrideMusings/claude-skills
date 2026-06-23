# Archetype: `cloudflare-workers` (Cloudflare Workers, wrangler)

Load when `admin.toml` has `archetypes = [… "cloudflare-workers" …]`. Wrangler-based
Worker: `dev` runs `wrangler dev`, `deploy` runs `wrangler deploy`.

## Dev output must stream raw (not `pty = true`)

`wrangler dev` (and `concurrently`/vite wrappers) collapse into a TTY
redraw-and-elide box under a pseudo-TTY. Declare the dev action
`kind = "interactive-shell"` (plain pipe, raw line-by-line) — NOT `pty = true`.
This is the canonical *working* example referenced by the main SKILL.md
"collapsing/elided dev-output box" fix. Pattern:

```toml
[actions.dev.cf]
action = "dev-cf"

[actions.dev-cf]
kind = "interactive-shell"
run  = "bunx wrangler dev"
```

## cwd-relative config

wrangler resolves `wrangler.toml`/`vite.config` relative to cwd. Use
`cd /abs/path && bunx wrangler …` in the action `run` rather than a `--cwd` flag
that may not exist.

## Privacy

Account IDs, zone IDs, route hostnames, tokens live in `.env` (gitignored) /
wrangler secrets — referenced as `${VAR}`, never hardcoded in committed config.
