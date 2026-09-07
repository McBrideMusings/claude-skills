## Per-command env injection

Any `[commands.X]` can declare an `env` table. Values support `${VAR:-default}`.

```toml
[commands.deploy]
steps = ["deploy"]
env = { ADMIN_LOCAL = "${DEPLOY_LOCAL:-false}" }

[commands.dev]
steps = ["dev"]
env = { ADMIN_LOCAL = "true" }
```

### DEPLOY_LOCAL → ADMIN_LOCAL (Unraid deploy)

`docker` / `unraid-plugin` archetypes ship this on `deploy`, `logs`, `diff`, `install-template`.

`ADMIN_LOCAL=true` tells SSH/scp/rsync in `admin_lib` to run locally instead of over SSH. `_is_local_host()` checks this before IP comparison.

- **Set `DEPLOY_LOCAL=true`** in `.env` on machines that ARE the Unraid host (bare or in a container on Unraid).
- **Leave unset** on Mac / remote workstation deploying over the network.

Setup for any `docker` project:
1. `.env.example` (committed): `DEPLOY_LOCAL=    # true when on Unraid host`
2. `.env` on Unraid host (gitignored): `DEPLOY_LOCAL=true`

Secondary detection: `_is_local_host()` also matches via `hostname -I`. `DEPLOY_LOCAL` is the explicit escape hatch for when IP comparison fails (e.g., container bridge IP).

---

## File-based log tailing (`[logs]` section)

For tailing log **files** (append-only, rotating, or in-place truncated). Doesn't care what produced them.

```toml
[logs.app]
dev  = "./tmp/app.log"
prod = { path = "/var/log/app.log", host = "${APP_HOST}", user = "${APP_USER:-root}" }
default_env = "dev"

[logs.worker]
local = "./tmp/worker.log"
```

Rules:
- String value = local path. Table = remote (requires `path`, optional `host`/`user`).
- `${VAR}` placeholders resolve at run time.
- `default_env` optional; omit to require `--env`.
- Manifest `[logs]` supersedes archetype-provided `logs` command.

CLI:
```
admin logs                  # TUI picker
admin logs <target>         # follow from end
admin logs <target> --env prod
admin logs <target> --tail 500 | --all | --no-follow
```

Default: follow from end, no history. Handles rotation/truncation via inode/size detection. Remote uses `tail -F`.

**Not for:** live process logs (use archetype shell command), aggregation/filtering, time-based filters.

---

## Logging system (per-command file output)

Every command tees to `tmp/<cmd>[-<sub>].log` (e.g. `admin dev ios` → `tmp/dev-ios.log`). Up to 3 prior runs retained as `.log.1`–`.log.3` (`.1` = most recent).

There is **no auto-injected `logs` picker.** A `logs` command exists only when a project asks for one — either a `[logs]` file-tail section (above) or a `[commands.logs]` the project declares (e.g. a runtime log stream). To read a command's tee'd output, open `tmp/<cmd>.log` directly (see "Check the logs" below). `logs` is freed up for a project to bind to its actual runtime (a server/app log stream), not the tmp/*.log dump.

Configure in `admin.toml`:
```toml
[logging]
enabled = true   # false disables file logging
dir = "tmp"
retain = 3       # 0 = overwrite

[commands.dev]
log_file = "tmp/custom.log"   # override
log_retain = 0
log = false                    # disable for this command
```

`tmp/` is git-ignored via `tmp/.gitignore` (`*`).

### "Check the logs"

1. Identify the most-recent command (ask or infer).
2. `Read` `tmp/<cmd>-<subcmd>.log` directly — don't run `admin logs`.
3. Build problem (didn't launch) → read **top** (first 80 lines).
4. Runtime bug (launched then failed) → read **bottom** (last 80 lines).
5. Previous run at `.log.1`.

---

## Browser console → log file bridge (`[log_bridge]`)

> **Full mechanism, topology, and the complete "nothing is showing up"
> troubleshooting matrix: `references/log-bridge.md`.** Read that before
> explaining the bridge or debugging why it's silent — it answers where the
> listener runs (the admin machine, NOT the prod server), what `hosts` means
> (the browser-page allow-list, not the listener location), and why `admin logs`
> does not pick it up. The section below is just the adoption summary.

Forwards browser `console.*` calls into the same log file the admin process writes. Only fires for `kind = "interactive-shell"` actions.

```toml
[log_bridge]
hosts = ["localhost", "*.dev.piercetower.com"]  # glob patterns matched against browser page hostname
port_range = [9988, 9999]                        # optional; defaults to [9988, 9999]
```

`port_range` is per-machine: set different values in each machine's `admin.toml` (same as `hosts`). Useful when a container only exposes a specific port range (e.g. code-server exposes `3300-3399`).

The server binds `0.0.0.0` unconditionally — anyone on the tailnet can POST. Single-user tailnet / dev tool; intentional.

**Userscript:** `tampermonkey/log-bridge.user.js` in the admin-project-tool repo — one project-agnostic script, no per-project URLs and no machine addresses in it. It is installed by `admin deploy` in that repo (`admin tampermonkey` writes it into a Chromium managed-storage policy), never by hand. Machine-specific values are `${VAR}` placeholders expanded from the environment at deploy time:
- `PROBE_HOSTS` / `@connect` — `${TAILSCALE_HOST_MAC}` and `${TAILSCALE_HOST_UNRAID}`, set in `~/.claude/.env` (always includes `127.0.0.1`)
- `PROBE_PORTS` — union of all port ranges across your machines (edit in the script)

Which pages forward is decided at runtime, not by editing the script: `localhost`/`127.0.0.1`/`0.0.0.0` are always watched, and any other host is opt-in via a single Tampermonkey menu command — **"Log bridge: watch `<host>`"** (a host-labelled toggle that saves an auto-derived glob to `GM` storage). The per-project prod hostname lives only in that project's `admin.toml` `[log_bridge].hosts` (advertised via `/health`), which stays the authoritative final match. Each forwarded entry carries the page `host` (not the full URL — keeps auth tokens out of the log); the listener prints one `client connected: <host> (<browser>)` banner per host.

**Adoption checklist for a new project:**
1. Add `[log_bridge]` to `admin.toml` with the right `hosts` (and `port_range` if non-default).
2. Confirm the dev action is `kind = "interactive-shell"` — bridge only wires in there.
3. Verify `TAILSCALE_HOST_MAC` (or `_UNRAID`) in `~/.claude/.env` is this machine's Tailscale IP and the userscript has been deployed since it was set (`admin tampermonkey-status` in admin-project-tool).
4. Run `admin dev`. For `localhost` it just works; for a prod host, open the page once and click the **"Log bridge: watch `<host>`"** menu command, then reload.
5. `console.log("hello")` in the page, tail the log.

### Bootstrap — "just set up the bridge"

Trigger: "set up the bridge", "just set up the bridge", "wire up the log bridge".
**Do not interrogate.** Infer everything from the repo; ask **at most one** question,
and only when a gate below is genuinely unresolvable. Never ask how the user wants
the streams laid out — default to intermingled. Full copy-paste snippets:
`references/log-bridge.md` §14.

1. **Gate — is there a browser-accessible GUI?** The bridge only captures a
   *browser page's* `console.*`. Infer yes from: a frontend build/dev server
   (vite / next / astro / rollup / webpack / CRA), a `dev`/`start` script that
   serves HTTP, an `index.html` that gets served, or a `docker-compose` service
   publishing an HTTP UI port. Infer **no** for: pure CLI, pure library, a
   backend API with no served UI, or a mobile-only app (no browser → no bridge).
   If a repo has both (e.g. an iOS app *and* a web plugin), the bridge applies to
   the web side only. No GUI → tell the user the bridge doesn't apply and why,
   then stop. Only ask if you truly can't tell whether a GUI is served.

2. **Discover the dev + prod paths (scan, don't ask).** Dev URL/port from the
   vite/wrangler/rollup dev port, a published `docker-compose` port, or a
   `localhost` `*_URL` in `.env` → this is `localhost` (always auto-watched).
   Prod host from a `*_URL` / `*_HOST` / the deploy-target host in `.env` → goes
   in `[log_bridge].hosts`, sourced as `${LOG_BRIDGE_HOSTS}` so no real host
   lands in the committed manifest.

3. **Pick the pattern (no question — use this heuristic):**
   - **Intermingled (DEFAULT).** You own the server/container, so server logs and
     browser console belong in one stream, with separate dev & prod paths. Dev =
     the existing `interactive-shell` dev action (local server / `compose up`
     attached); the bridge auto-attaches scoped to `localhost`. Prod = an
     `interactive-shell` `logs` target running `ssh <host> docker logs -f
     <container>`; the bridge attaches scoped to the prod host, so the prod
     container's server logs and that page's console interleave. → reference §14
     Pattern A.
   - **Isolated per-host.** Pick this **only** when the web component runs *inside
     a third-party app's container you don't control* — a plugin/extension/embed
     (a plugin manifest, "deploy = copy into someone else's plugins dir", e.g.
     stash-reels). You can't tail "your" container, so keep prod-client and
     dev-client in separate streams via per-listener `ADMIN_LOG_BRIDGE_HOSTS`
     (one `logs <app>` scoped to the prod host, one `logs <app>-test` scoped to
     `localhost`); the third-party container's server logs stay a separate
     `docker logs` target. → reference §14 Pattern B.

4. **Always finish with:** `[log_bridge] hosts = ["${LOG_BRIDGE_HOSTS:-localhost}"]`;
   add `LOG_BRIDGE_HOSTS=` to `.env.example` and the real host to `.env`; confirm
   `TAILSCALE_HOST_MAC`/`_UNRAID` in `~/.claude/.env` cover this machine's tailnet IP; tell the
   user the one-time **"Log bridge: watch `<host>`"** menu opt-in is needed for
   the prod page (localhost needs none); `admin check`.

Discovery files live at `/tmp/admin-project-tool/<pid>.json`; stale ones (dead PIDs) are swept on each start.

---

## read-logs.md template

If `.claude/skills/read-logs.md` is missing in the project, copy the body from `references/read-logs-template.md` (in this skill directory) into the new file.
