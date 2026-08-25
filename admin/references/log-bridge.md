# The `[log_bridge]` browser-console bridge — complete reference

This is the authoritative, exhaustive explanation of how the admin-project-tool
log bridge works, end to end. It exists so the mechanism never has to be
re-explained or re-derived. If a question about the bridge comes up — "why is
nothing showing up", "where does it run", "does `admin logs` pick it up" — the
answer is in here. Read this top-to-bottom once; after that the troubleshooting
matrix at the bottom resolves almost everything.

Everything below is drawn from the source in `~/Projects/admin-project-tool`:
`admin_lib/log_bridge.py`, `admin_lib/log_server.py`, `admin_lib/keybindings.py`,
`admin_lib/interp.py`, `gen/manifest.py`, and `tampermonkey/log-bridge.user.js`.

---

## 1. What it does, in one sentence

When you run a long-running dev action under `admin`, the bridge runs a tiny
HTTP server on **the machine where `admin` is running**; a Tampermonkey
userscript in your **browser** ships every `console.log/info/warn/error/debug`
call from the page to that server, which appends them — labelled `[client]` —
into the **same log file and stdout** the admin process is already writing, so
server-side and browser-side logs interleave in one stream.

## 2. The mental model — read this before anything else

Three misconceptions cause ~all of the confusion. Kill them now:

1. **The listener runs where `admin` runs — NOT on the app/prod server.**
   You run `admin dev` on your Mac → the HTTP listener opens on your Mac. The
   Stash/Unraid/prod host (e.g. `piercetower.com`, `100.114.249.118`) does **not**
   run the listener unless you literally run `admin` *on that host*. "I started
   the bridge on the server" is almost always the bug: nothing on the server
   listens, and the userscript isn't probing the server.

2. **`[log_bridge].hosts` is an allow-list of browser *page* hostnames — NOT
   where the listener binds or lives.** It answers "which pages am I allowed to
   collect console logs from?" The listener always binds `0.0.0.0` on the admin
   machine and advertises this `hosts` list at `/health`; the userscript only
   forwards a page if that page's hostname matches one of these globs.

3. **The browser and the listener must be able to reach each other.** The
   userscript (in the browser) probes a fixed set of `PROBE_HOSTS` (your Mac's
   `127.0.0.1` + tailnet IPs) on ports `9988–9999`. So either the browser is on
   the **same machine** as `admin` (`127.0.0.1` works, zero setup), or the
   browser is on a device that can reach the admin machine's **tailnet IP** (and
   that IP is one of the `TAILSCALE_HOST_*` values the userscript was deployed
   with).

## 3. Topology

```
            ┌─────────────────────────── your Mac (where `admin dev` runs) ───────────────────────────┐
            │                                                                                          │
  browser   │   admin process (interactive-shell action)                                               │
  (any      │     │                                                                                    │
  device    │     ├─ wrapped dev process ──stdout──▶ tee ──▶ tmp/<cmd>.log ──▶ your terminal           │
  that can  │     │                                            ▲                                        │
  reach the │     └─ start_log_bridge(get_log_file())          │ append + echo to stdout                │
  Mac)      │           │                                      │                                        │
   │        │           ▼                                      │                                        │
   │  GET /health   ThreadingHTTPServer on 0.0.0.0:<9988-9999> ┘                                        │
   ├───────────────────▶  (advertises [log_bridge].hosts, project, pid, port)                          │
   │                      │                                                                             │
   │  POST /log  ─────────┘  writes discovery file /tmp/admin-project-tool/<pid>.json                  │
   │  (console batches)                                                                                 │
   └────────────────────────────────────────────────────────────────────────────────────────────────┘
        ▲
        │ Tampermonkey userscript patches page console.*, buffers entries,
        │ probes PROBE_HOSTS × PROBE_PORTS, forwards to the first listener
        │ whose /health `hosts` glob-match this page's hostname.
```

## 4. Components (file → responsibility)

| File | Responsibility |
|---|---|
| `gen/manifest.py` | Parses + validates `[log_bridge]` (`hosts` required non-empty string list; `port_range` optional `[start, end]`, start < end; unknown keys error). |
| `admin_lib/interp.py` | At boot, if `[log_bridge]` present, resolves `${VAR}` in `hosts` and calls `configure_log_bridge({...hosts, port_range, project})`. Also defines `_make_interactive_shell`, the only action factory that reaches the bridge. |
| `admin_lib/log_bridge.py` | Lifecycle: `configure_log_bridge`, `log_bridge_enabled`, `start_log_bridge(log_path)`, `stop_log_bridge`. Port allocation, discovery-file write, stale sweep, `ADMIN_LOG_BRIDGE_HOSTS` override. |
| `admin_lib/log_server.py` | The HTTP server: `GET /health`, `POST /log`. Appends client entries to the log file + echoes to stdout. Connect banner. |
| `admin_lib/keybindings.py` | `run_with_keybindings(...)` — the runner for `interactive-shell` actions. Calls `start_log_bridge(get_log_file())` on entry and `stop_log_bridge()` in its `finally`. **This is the only caller of `start_log_bridge`.** |
| `tampermonkey/log-bridge.user.js` | Browser side: console patch, candidacy gate, listener discovery, host-match, batched forwarding, status dot. |

## 5. The two gates — BOTH must be true for the listener to start

The listener starts only when **both** of these hold:

1. **Enabled by config.** `admin.toml` has a `[log_bridge]` table with a
   non-empty `hosts` list. `configure_log_bridge` stores it; `log_bridge_enabled()`
   returns `bool(cfg["hosts"])`. No `[log_bridge]` table → permanently disabled,
   `start_log_bridge` is a no-op for every command.

2. **Run via an `interactive-shell` action.** Only `_make_interactive_shell`
   → `run_with_keybindings` calls `start_log_bridge`. A `kind = "shell"`,
   `kind = "python"`, `kind = "shell-passthrough"`, `docker-dev`, etc. action
   never starts the bridge. **`admin logs` (the `[logs]`/file-tailer command)
   does NOT start the bridge either** — see §11.

If `hosts` is set but your dev action isn't `interactive-shell`, the port never
opens. If the action is `interactive-shell` but there's no `[log_bridge]`, the
port never opens. Silent in both cases (by design — no error, just nothing).

## 6. End-to-end flow

**Startup (admin side):**
1. `admin <interactive-shell cmd>` boots; interp calls `configure_log_bridge`.
2. `run_with_keybindings` calls `start_log_bridge(get_log_file())`.
3. If disabled or already running → return immediately (idempotent).
4. Otherwise: ensure `/tmp/admin-project-tool/` exists, sweep stale discovery
   files (dead PIDs), allocate the first free port in `port_range` by binding
   `0.0.0.0:<port>`.
5. Start a `ThreadingHTTPServer` on `0.0.0.0:<port>` (daemon thread).
6. Print `[log-bridge] listening on port <port>  hosts=[...]`.
7. Write `/tmp/admin-project-tool/<pid>.json` = `{port, hosts, project, pid,
   started_at, log_path}`. Register `stop_log_bridge` via `atexit`.

**Discovery + forwarding (browser side):**
8. Userscript runs at `document-start` on every page (`@match *://*/*`).
9. **Candidacy gate:** `localhost`/`127.0.0.1`/`0.0.0.0` are always candidates;
   any other hostname is a candidate only if it matches a glob you saved via the
   Tampermonkey menu command **"Log bridge: watch `<host>`"**. Non-candidate →
   the script returns immediately: no console patch, no probe, no status dot.
10. On a candidate page it patches `console.*` and buffers entries
    `{timestamp, level, message, host}` (host only — never the full URL, to keep
    auth tokens out of the log).
11. `findTarget()` probes every `PROBE_HOSTS × PROBE_PORTS` combination in
    parallel with `GET /health` (500 ms timeout each). The first responder whose
    advertised `hosts` glob-match `location.hostname` wins.
12. No match → status dot stays grey, buffer discarded (nobody listening).
13. Match → dot turns green; every 1000 ms the buffer is flushed as a JSON array
    to `POST http://<host>:<port>/log`.

**Receipt (admin side):**
14. `POST /log` → `append_log_bridge_entries`: on first contact from a host it
    writes one banner `[log-bridge] client connected: <host> (<user-agent>)`,
    then formats each entry as `<ts> [client] [<level>] <msg>` and **both**
    appends to the log file and writes to stdout. Returns `{written: N}`.
15. Because client lines hit the same stdout/file as the wrapped dev process,
    they interleave **in arrival order** (not re-sorted by timestamp).

## 7. Port allocation & multiple listeners

- Default range `9988–9999` (override per-machine with `port_range`). Each
  `admin` process grabs the first free port, so several projects/processes
  coexist, each on its own port, each with its own discovery file.
- The userscript probes the whole port range and picks the first listener whose
  `hosts` match the page — so two listeners advertising **different** host sets
  don't cross-contaminate. If two listeners advertise the **same** host, "first
  responder wins" and which one is non-deterministic.
- **`ADMIN_LOG_BRIDGE_HOSTS`** (env var, comma-separated): a manual override that
  narrows the advertised `hosts` for **one** listener at start time. The tool
  never sets it; you set it to split two same-project listeners by host (e.g. one
  advertising the live host, one advertising `localhost`). Read once in
  `start_log_bridge`; absent → use `admin.toml` `hosts` verbatim.

## 8. What gets written, and where

- **Log file:** `get_log_file()` — the current command's tee file
  `tmp/<cmd>[-<sub>].log`. Client lines are appended there alongside server lines.
- **stdout:** the same lines are echoed live, so your terminal shows the
  interleave in real time.
- **Format:** `<ISO-timestamp> [client] [<level>] <message>`. Timestamp is the
  browser's `new Date().toISOString()` (or server `now()` if absent).
- **Privacy:** entries carry `host` only, never the full page URL (avoids leaking
  query-string auth tokens). Legacy clients that sent `url` get the host parsed
  out server-side.
- **Bind exposure:** the server binds `0.0.0.0` unconditionally — anyone on the
  tailnet can `POST /log`. This is a deliberate single-user dev-tool tradeoff,
  not a bug.

## 9. Config schema (`admin.toml`)

```toml
[log_bridge]
hosts = ["localhost", "*.dev.piercetower.com"]  # REQUIRED, non-empty.
                                                #   Globs matched against the
                                                #   browser PAGE hostname.
                                                #   "*" matches one DNS label.
port_range = [9988, 9999]                        # optional; default [9988, 9999].
                                                #   Per-machine (set per host).
```

- `hosts` supports `${VAR}` / `${VAR:-default}` (resolved at boot via `resolve_env`).
- `"*"` in a glob matches exactly one DNS label (no dots): `myapp-*-web.example.net`.
- Validation errors (from `admin check`): missing/empty `hosts`, non-string host,
  malformed `port_range`, or any unknown key under `[log_bridge]`.

## 10. Userscript setup (`tampermonkey/log-bridge.user.js`)

One project-agnostic script, installed by `admin deploy` in admin-project-tool
(`admin tampermonkey` embeds it in a Chromium managed-storage policy) — never by
hand. Machine addresses are `${VAR}` placeholders expanded from the environment
at deploy time, so the committed file carries none:

- `PROBE_HOSTS` — where listeners might run: always `127.0.0.1`, plus
  `${TAILSCALE_HOST_MAC}` and `${TAILSCALE_HOST_UNRAID}` from `~/.claude/.env`.
  The browser must be able to reach these.
- `PROBE_PORTS` — the union of every machine's `port_range` (default 9988–9999);
  edited in the script.
- `@connect` headers carry the same `${VAR}` placeholders (Tampermonkey CORS
  allow-list).

Per-page forwarding is decided at runtime, not by editing the script:
- `localhost`/`127.0.0.1`/`0.0.0.0` → always watched, zero setup.
- Any other host (e.g. `piercetower.com`) → **one-time opt-in**: open the page,
  run the Tampermonkey menu command **"Log bridge: watch `<host>`"** (it saves an
  auto-derived glob to `GM` storage), then reload. The final authority is still
  the listener's `/health` `hosts` — the page must match there too.

Status dot (bottom-right of the page): grey = searching / no matching listener;
green = connected (tooltip shows `host:port (project)`).

## 11. Relationship to `admin logs` (and why plugin/docker don't pick it up)

`admin logs` and `[logs]` are a **file/stream tailer** (see SKILL.md `[logs]`
section): they tail a file, run a command, or `docker logs -f` a container, and
render through the shared `LogFormatter`. They are a **completely separate
subsystem** from the bridge:

- `admin logs plugin` runs e.g. `node scripts/logs.mjs --follow`. It never calls
  `start_log_bridge`, opens no port, and collects no browser logs.
- `admin logs docker` streams `docker logs -f`. Same — no bridge.

The `[logs]` **file-tailer subsystem** never starts the bridge. But a `[commands.logs]`
*command* whose step routes to an `interactive-shell` **action** does — the bridge
attaches to any interactive-shell action, whatever it's named. So a `logs` target
that runs `ssh <host> docker logs -f` (or parks on `tail -f /dev/null`) as an
interactive-shell action hosts the bridge and intermingles `[client]` lines with
that stream. That is the basis of the wiring patterns in §14. The thing that does
**not** exist is the `[logs]` *tailer* itself growing bridge support.

## 12. Behavioral contracts (from the tests)

`tests/test_log_bridge.py` pins: `configure` enables only with non-empty `hosts`;
`configure(None)` clears; port allocation returns a port in range and raises when
the range is exhausted; the stale sweep removes discovery files for dead PIDs
(`_pid_alive` = `os.kill(pid, 0)`); start/stop is a full lifecycle; start is a
no-op when unconfigured; start is idempotent (second call while running does
nothing).

## 13. Troubleshooting matrix — "nothing is showing up"

Work top to bottom; the first failing row is almost always it.

| Check | How to verify | If wrong |
|---|---|---|
| `[log_bridge]` exists with non-empty `hosts` | grep `admin.toml`; `admin check` | Add it. No table = permanently disabled. |
| Dev action is `kind = "interactive-shell"` | inspect the `[actions.*]` that `admin dev` runs | A `shell`/`python`/`docker-*`/`logs` action never starts the bridge. Convert per SKILL.md. |
| `admin` is running on the SAME machine the userscript probes | did you run `admin dev` on your Mac, or "on the server"? | Run it where the listener should live (your Mac). The prod host doesn't run it. |
| Listener actually opened a port | look for `[log-bridge] listening on port N hosts=[...]` in the admin output; `ls /tmp/admin-project-tool/` | If absent, one of the two gates above failed. |
| Browser can reach the listener | is the browser on the same machine (127.0.0.1), or a device that can reach the Mac's tailnet IP? | Move the browser, or set the reachable tailnet IP in `TAILSCALE_HOST_MAC`/`_UNRAID` and redeploy. |
| Userscript probes the right host:port | `TAILSCALE_HOST_*` in `~/.claude/.env` is the listener machine's IP; `PROBE_PORTS` covers `port_range` | Fix `.env` / `PROBE_PORTS`, then `admin deploy` in admin-project-tool. |
| Page is a candidate | localhost auto; other hosts need the menu opt-in | Run "Log bridge: watch `<host>`", reload. Grey dot + no opt-in = not forwarding. |
| Page hostname matches `[log_bridge].hosts` | compare the page hostname to the globs (also shown at `/health`) | Fix the glob; remember `*` = one label only. |
| Status dot is green | bottom-right of the page | Grey = no matching listener found (recheck the rows above). |
| Logs are `console.*` (not network/other) | the bridge only forwards console calls | Nothing else is captured by design. |

Quick manual probe of a running listener (from the admin machine):
`curl -s localhost:<port>/health` → should return the `hosts`/`project`/`pid` JSON.

## 14. Standard wiring patterns (bootstrap)

Two patterns cover almost every project. SKILL.md's "Bootstrap" section chooses
between them without interrogating the user. Both source the prod host from `.env`
(`${LOG_BRIDGE_HOSTS}`) so no real host lands in the committed manifest, and both
scope the localhost path with `ADMIN_LOG_BRIDGE_HOSTS` so dev and prod never
cross-contaminate (§7). The difference is whether **server logs and client console
share one stream**.

### Pattern A — intermingled (DEFAULT: you own the server/container)

The bridge-hosting process **is** the server / log stream, so server stdout and
browser console interleave in one file. Dev and prod are separate paths. No inline
Python — per-command `env` sets the localhost scope declaratively.

```toml
[log_bridge]
hosts = ["${LOG_BRIDGE_HOSTS:-localhost}"]   # prod host from .env; localhost is auto-watched

[commands.dev]
desc  = "Dev server — server + browser console intermingled (tmp/dev.log)"
steps = ["dev-run"]
env   = { ADMIN_LOG_BRIDGE_HOSTS = "localhost" }   # scope this bridge to the localhost page

[actions.dev-run]
kind = "interactive-shell"        # interactive-shell => bridge attaches
run  = "docker compose up"        # or your local dev server; its stdout shares the log file

[commands.logs]
desc  = "Logs: prod (container logs + browser console intermingled)"
steps = ["logs-prod"]

[actions.logs-prod]
kind = "interactive-shell"        # interactive-shell => bridge attaches; inherits global hosts (prod)
run  = "ssh ${DEPLOY_HOST} 'docker logs -f --tail 200 <container>'"
```

- `admin dev` → local server stdout + the `localhost` page's console in `tmp/dev.log`.
- `admin logs prod` → remote container logs + the prod page's console in `tmp/logs-prod.log`.
- `${DEPLOY_HOST}` is expanded by the shell from `.env` at run time (no `resolve_env` needed for a `run` string).

### Pattern B — isolated per-host (web component inside a third-party container)

Use only for a plugin/extension/embed running inside an app's container you don't
control (e.g. stash-reels in someone else's Stash). You can't make "your server" an
admin process, so the bridge listeners are standalone parks (client console only),
split by host, and the third-party container's server logs are a separate target.

```toml
[log_bridge]
hosts = ["${LOG_BRIDGE_HOSTS:-localhost}"]

[commands.logs]
desc  = "Logs: <app> | <app>-test | server"
steps = ["logs-dispatch"]

[actions.logs-dispatch]
kind = "python"
run = '''
target = args[0].lower() if args else "<app>"
set_log_context("logs", target)
if target == "<app>":                         # live client → tmp/logs-<app>.log (inherits prod host)
    run_command("logs-bridge"); return
if target == "<app>-test":                    # localhost client → tmp/logs-<app>-test.log
    os.environ["ADMIN_LOG_BRIDGE_HOSTS"] = "localhost"
    run_command("logs-bridge"); return
if target == "server":                        # third-party container logs (no bridge)
    host = (os.environ.get("DEPLOY_HOST") or "").split(":", 1)[0]
    sys.exit(run_cmd("ssh " + host + " 'docker logs -f --tail 200 <container>'"))
err("unknown logs target: " + target); sys.exit(1)
'''

[actions.logs-bridge]
kind = "interactive-shell"        # park: keeps the bridge alive; host scope set by the caller
run  = "tail -f /dev/null"
```

Dev (`admin dev <app>-test`) follows the same idea: a Python dispatch does the
prep, sets `os.environ["ADMIN_LOG_BRIDGE_HOSTS"] = "localhost"`, then
`run_command`s an `interactive-shell` watch action so the dev session itself hosts
a localhost-scoped bridge.

### Choosing without asking

Pattern **B** iff the project builds something that installs into a third-party
runtime — a plugin manifest / `pluginId`, or a deploy that copies into another
app's plugins dir. Everything else → Pattern **A**.

## 15. Things people get wrong (the short list)

- "The bridge runs on the prod server." No — it runs where `admin` runs.
- "`hosts` is where the listener lives." No — it's the page allow-list.
- "`admin logs plugin` shows client logs." No — different subsystem; not wired.
- "It should just work on `piercetower.com`." Non-localhost pages need the
  one-time Tampermonkey menu opt-in **and** a matching `hosts` glob.
- "Lines are sorted by timestamp." No — interleaved in arrival order.
