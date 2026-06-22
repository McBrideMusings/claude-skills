---
name: admin
description: "Add/edit/audit a project's admin task runner — edit admin.toml commands, validate with admin check, or migrate inline code to admin_lib. The tool interprets admin.toml at runtime (no generated ./admin)."
---

# /admin — Manifest-Driven Admin Task Runner

**One committed file per project: `admin.toml`** — a short (~5–25 line) manifest declaring archetypes, URLs, and project commands. It is the source of truth, read live.

There is **no generated `./admin` script** (ADR-0006). The installed tool interprets `admin.toml` at runtime:

- Installed entry: `~/.admin/admin`, on PATH as **`admin`**. Run `admin <command>` from anywhere inside a project — it finds `admin.toml` by walking up from `$PWD`.
- Tool verbs: `admin new` (detect stack → write a starter `admin.toml`), `admin check` (parse + resolve + consistency validation), `admin compile` (build a standalone `./admin` zipapp for a box without the tool installed).
- Editing `admin.toml` takes effect immediately — there is nothing to regenerate, no artifact to commit, no drift to audit.

Source repo: `~/projects/admin-project-tool/` (CLI `admin-run`, runtime `admin_lib/`, interpreter `admin_lib/interp.py`, generator internals `gen/`).

## Critical rules

1. **Treat the tool as a black box.** Do NOT read source under `~/projects/admin-project-tool/` (interpreter, archetype, or detector `.py` files) unless the user asks you to debug the tool itself. Only read: the project's `admin.toml` and this skill.

2. **After any commit+push to admin-project-tool, immediately reinstall:** `bash ~/projects/admin-project-tool/install.sh`. Full sequence for any tool change: **edit → commit → push → install**. There is no per-project regeneration step — installing updates the one interpreter every project shares. Installing from an unpushed commit embeds a dirty SHA into `~/.admin/VERSION`.

3. **`admin.toml` is the only source of truth.** A project commits just the manifest; there is no `./admin` file to hand-edit or keep in sync. (If a project still has an old committed `./admin`, it's a stale generated artifact — delete it; `admin` runs from PATH.)

---

## Inline code policy

Every `[actions.*]` with `kind = "python"` is inline code. **Last resort, not default.**

**Forwarding CLI args? Use `kind = "shell-passthrough"`, not python.** `[actions.X] kind = "shell-passthrough"; run = "tool"` runs `tool` with the `admin <cmd> <ARG>...` positional args shlex-quoted and appended, propagating the exit code — the declarative way to wire `admin foo <path>` to an underlying script. Reach for `kind = "python"` only for real dispatch logic (sub-target routing, config reads), never just to thread args through.

**Acceptable** (≤4 logical lines, dispatch-only):
- Parse sub-target args
- Read `_APPLE_CONFIG` / `_SERVER_CONFIG` via `globals().get(...)`
- Single function call per branch

```toml
[actions.logs]
kind = "python"
run = '''
cfg = globals().get("_APPLE_CONFIG") or {}
device_log_attach(get_ios_log_bundle(cfg, prod=args and args[0] == "--prod"), log_file=get_log_file())
'''
```

Note: `kind = "python"` bodies run in a namespace that mirrors the old flat bundle — every `admin_lib` symbol and the `_*_CONFIG` dicts are in scope. Read the log path via `get_log_file()` / `get_log_dir()` (not bare `LOG_FILE`/`LOG_DIR`) — under the interpreter those accessors return the live, post-boot value.

**Not acceptable:** `import` statements, loops, multiple `run_cmd(...)` calls, >4 logic lines, data construction, multi-step workflows. → migrate to `admin_lib/`.

**`run_cmd` signature:** `run_cmd(cmd, shell=True, capture_log=True, formatter=None, pty=False, collect=None)`. Use `pty=True` for long-running interactive processes (dev servers). Do NOT invent kwargs.

### Fixing the collapsing/elided dev-output box (`pty=True` → `interactive-shell`)

If a user complains that `admin dev <target>` shows a collapsing/aligned live output box — lines prefixed with `│`, a `[N lines elided]` marker, a `└─ Running...` footer — while a sibling dev target (e.g. `admin dev cf`) does NOT, the cause is **`pty = true`** on the offending action. The pseudo-TTY makes the wrapped process (`concurrently`, vite, wrangler, etc.) switch into its TTY redraw-and-collapse rendering. Actions declared `kind = "interactive-shell"` run on a plain pipe (non-TTY), so the child streams raw line-by-line and never collapses.

**This is an `admin.toml`-only fix.** Do NOT investigate the interpreter, `run_cmd`, the consumer's dev harness, or `concurrently` — and do NOT explain it as the Claude Code background-task panel. Just compare the broken sub-target against the working siblings in the same `[actions.dev]` block and make it match: replace inline `run = "…"` + `pty = true` with `action = "dev-<name>"`, and add a top-level `[actions.dev-<name>]` of `kind = "interactive-shell"` carrying the same `run` (no `pty`). Then `admin check`.

```toml
# before — collapses output
[actions.dev.local]
run = "bun run dev:local"
pty = true

# after — streams raw, matches `dev.cf` / `dev.devvit`
[actions.dev.local]
action = "dev-local"

[actions.dev-local]
kind = "interactive-shell"
run  = "bun run dev:local"
```

**`admin check` reports** the merged command/action/module counts and any resolution errors (unknown kinds, missing actions referenced by steps, unknown guards, commands colliding with reserved verbs `new`/`check`/`compile`). It does NOT score inline-code complexity — apply the inline policy above by judgment when editing.

When inline code is too heavy, present finding + migration plan to user before proceeding.

---

## Migration playbook (inline → admin_lib)

| Logic type | Destination |
|---|---|
| New sub-target for existing command | archetype template + `admin_lib` fn + config key in `[apple]`/`[server]` |
| Generic wrapper (docker deploy, cross-compile) | `admin_lib/<module>.py` |
| Entirely new command class | new archetype, or extend existing |
| Project-specific one-off | `kind = "shell"` if shell-ish, or ≤4-line dispatch |

Source repo `~/projects/admin-project-tool/`:
- `admin_lib/` — runtime helpers, imported live by the interpreter. Add functions here.
- `admin_lib/interp.py` — the interpreter: one closure factory per action kind (`_FACTORIES`). A new kind needs a factory here AND a `KNOWN_KINDS` entry in `gen/fragments.py`.
- `archetypes/` — archetype definitions and command/action templates.
- `gen/manifest.py` — new config-table keys + validation.
- Config tables (`[apple]`, `[server]`, etc.) are injected into `kind="python"` namespaces as `_*_CONFIG` dicts by `admin_lib/interp.py::build_namespace` — no render step.

After changes: `bash install.sh` (commit+push first), then `admin check` in the project.

---

## Instructions

### Phase 0: Update the tool (when the change needs a tool/archetype edit)

```bash
git -C ~/projects/admin-project-tool status
```
If dirty: show user, offer to commit+push first. Do NOT pull over uncommitted changes. Check the branch; if not `main`, ask before switching.

```bash
git -C ~/projects/admin-project-tool pull origin main
bash ~/projects/admin-project-tool/install.sh
```

`install.sh` installs the interpreter to `~/.admin/admin` and puts `~/.admin` on PATH. There is no `admin-gen` and no per-project regeneration — the reinstall is the whole update.

For pure `admin.toml` edits (no tool change), skip Phase 0 entirely — edits take effect on the next `admin` run.

### Phase 1: Detect state

- No `admin.toml` → bootstrap (Phase 2a): `admin new`.
- `admin.toml` present → edit + validate (Phase 2b): `admin check`.
- A stale committed `./admin` present (old generated bundle) → delete it; the project runs from PATH now.

### Phase 2a: Bootstrap

1. Run `admin new` (or `admin new <dir>`) — detectors pick the archetype and write `admin.toml`. **Don't explore the project yourself to guess.**
2. Show user the generated `admin.toml` and the detector match.
3. Point at any `echo 'TODO: …'` placeholders from the `simple` fallback.
4. Apply standard command ordering (Phase 2c) — archetype defaults are usually wrong.
5. **Populate `[urls]`** — scan the project for URLs and local dev ports, then write a `[urls]` table. Sources (in order): `wrangler.toml` (`port =`), `vite.config*.ts` (port defaults/env vars), `.env.example` (`_URL=` entries), package.json scripts (proxy targets, `--port`), README/docs. Produce entries for every named environment: local dev variants per app, staging/preview, production, and external community URLs (subreddit, app store page, etc.).
6. `admin check` to confirm it resolves.

### Phase 2b: Edit + validate

```bash
admin check .
```
- Resolves clean → nothing to do unless the user asked for a change.
- Resolution error → fix the `admin.toml` (the message names the problem).
- **`[urls]` present?** If missing or sparse, run the URL scan from Phase 2a step 5 and propose additions.

After any `admin.toml` edit, just re-run `admin check` (no regeneration). Heavy inline code → propose a migration plan per the inline policy.

### Phase 2c: Standard command order

**ALWAYS: `build`, `dev`, `deploy` — in that order. Non-negotiable.**

```
build → dev → deploy   |   test, vet, fmt, clean, docs
```

The `docker-unraid` archetype bakes this in as its default `order`. Never reorder these three. `deploy` is always last in the lifecycle group — never before `dev`.

Use `group` + `priority` integers per command. Sort by `(group, priority, name)`; spacers between groups are automatic.

```toml
[commands.build]
desc = "Build"; steps = ["build"]; group = 1; priority = 10

[commands.dev]
desc = "Run dev server"; steps = ["run-dev"]; group = 1; priority = 20

[commands.deploy]
desc = "Deploy"; steps = ["deploy"]; group = 1; priority = 30

[commands.test]
desc = "Run tests"; steps = ["test"]; group = 2; priority = 10
# vet=20, fmt=30, clean=40
```

Group 1 = build/run/ship. Group 2 = quality/housekeeping. Defaults (`group=0, priority=0`) → alphabetical, no spacers (fine for ≤3 commands).

Notes:
- `dev` = run locally (e.g. `go run ./cmd/...`, `npm run dev`).
- `docs` = serve docs locally with hot reload. **Single command, no sub-targets** (e.g. `run = "npm run docs:dev"`). Skip docs build/preview/deploy unless the user explicitly publishes.

Legacy `order = [...]` with `"---"` separator still works but prefer group/priority. When using explicit `order`, the first three entries must be `"build", "dev", "deploy"` — always.

### Phase 3: Env var discovery

If `admin.toml` uses `${VAR}`, run `admin env` and tell the user which vars to export.

### Phase 4: Post-bootstrap files

1. **`.gitignore`** — ensure `tmp/` and `*.local.*` are ignored. Use the glob; don't add literal `CLAUDE.local.md`. (Old generated `./admin` files should be removed, not gitignored.)
2. **`.claude/skills/read-logs.md`** — create if missing using `references/read-logs-template.md`.
3. **`CLAUDE.md` (committed)** — if the project has no root `CLAUDE.md`, invoke `/init` first.
4. **`.claude/CLAUDE.local.md`** — create/update with the dev-process section (Phase 5). Keep thin: admin-specific dev process and machine overrides only.
5. **Project `CLAUDE.md`** — note that `admin.toml` is the source of truth and commands run via `admin <cmd>` (the tool is installed on PATH; nothing is committed but the manifest).
6. **Docs site, if present** — `admin.toml` must have a single `[commands.docs]` shell command (no sub-targets). If shaped wrong, invoke `/docs`.

**Audit checks:**
- Committed `CLAUDE.md` exists at project root (if missing, prompt `/init`)
- `.claude/CLAUDE.local.md` exists (not at project root)
- `.gitignore` has `*.local.*`
- No stale committed `./admin` (delete if present)

### Phase 5: Dev process docs in `.claude/CLAUDE.local.md`

**Native hot reload (Vite, HMR, Next, Air):**
```markdown
## Dev process
`admin dev` runs the dev server with hot reload. Check `/tmp/admin-run.pid` before starting — if present, do not start a second instance; edits are picked up automatically.
```

**No hot reload (compiled binaries, restart needed):**
```markdown
## Dev process
`admin dev` uses `/tmp/admin-run.pid` and SIGUSR1 to rebuild without restarting.

After code changes:
1. Check `/tmp/admin-run.pid` — if running, `admin reload` (do NOT kill+restart)
2. If not running, start with `admin dev`

Never orphan the process. Never run two simultaneously.
```

If `admin dev` is one-shot (compiles and exits), omit this section.

### Phase 6: Commit

Commit `admin.toml` alone — there is no `./admin` to commit alongside it, and no `generator_commit` to keep coherent. (Worktree note: since only `admin.toml` is committed and the interpreter is shared, there's nothing extra to copy between worktrees.)

---

## Mental model

- **Archetypes are composable mixins.** `archetypes = ["docker-unraid", "apple"]` merges command sets; later archetype wins; manifest `[commands]` wins over all.
- **The interpreter reads `admin.toml` live.** No generation, no bundling, no artifact. `admin compile` is the one exception — it packages the interpreter + `admin_lib` + the manifest into a standalone zipapp via stdlib `zipapp`, for a machine without the tool installed.
- **Versioning is global.** The installed tool's version (in `~/.admin/VERSION`) runs every project. Update the tool → all projects move together. `admin compile` freezes a project to a known-good copy when you need a pin.
- **Env vars are runtime.** `${VAR}` / `${VAR:-default}` resolved by `admin_lib.core.resolve_env()` at run time. Never expand when editing the manifest.
- **Python 3.11+ required** (stdlib `tomllib`).
- **Config tables drive archetypes.** `[apple]` / `[server]` tables become `_APPLE_CONFIG` / `_SERVER_CONFIG` dicts in `kind="python"` namespaces. Add keys to configure archetype behavior without inline code.
- **Reserved verbs.** `new`, `check`, `compile` share the `admin <word>` namespace; a manifest may not define a command with one of those names (the CLI errors).

---

## Apple app icons (macOS/iOS) — two gotchas that waste hours

All Apple icons go through the tool's one generator (`admin_lib.icons.generate_icons`,
configured by `[apple.icons]` + the apple archetype's `icons` command, or the
dev-loop banner swap). **Never write a per-project icon script.** Full detail:
admin-project-tool `docs/adr/0007-apple-icon-rendering.md`. The two things that
bite, every time:

1. **Alpha channel → the icon renders INSET/shrunken in the Dock. Opaque RGB (no
   alpha) → FULL-BLEED.** macOS insets any icon whose PNG has *any* sub-255 alpha
   (anti-aliased edges, soft shadow, a transparent margin); a fully-opaque,
   no-alpha icon renders edge-to-edge. It's invisible in a viewer — check
   `Image.open(p).mode` (`RGB`=good, `RGBA`=suspect) / min alpha. The generator
   ALWAYS flattens to RGB; a DEV banner's anti-aliasing is the classic trap.
   You cannot have a transparent macOS "margin" (≈824-in-1024) AND full-bleed —
   the margin is alpha<255. iOS is full-bleed too (system masks the shape).

2. **The Dock hover tooltip = the `.app` FILENAME, not `CFBundleName`.** To name a
   dev variant "Macterm Dev" in the Dock, you must rename the `.app` file —
   set `[apple] mac_dev_product_name = "<Name> Dev"` (the dev loop renames the
   built app → `<Name> Dev.app`, patches `CFBundleDisplayName`, re-signs to keep
   TCC). `CFBundleName`/`CFBundleDisplayName` only drive the menu bar / some
   surfaces; in-app strings (window title, welcome screen) should read
   `Bundle.main`'s `CFBundleDisplayName` so the variant labels itself everywhere.

---

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

`docker-unraid` / `unraid-plugin` archetypes ship this on `deploy`, `logs`, `diff`, `install-template`.

`ADMIN_LOCAL=true` tells SSH/scp/rsync in `admin_lib` to run locally instead of over SSH. `_is_local_host()` checks this before IP comparison.

- **Set `DEPLOY_LOCAL=true`** in `.env` on machines that ARE the Unraid host (bare or in a container on Unraid).
- **Leave unset** on Mac / remote workstation deploying over the network.

Setup for any `docker-unraid` project:
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

Every project gets a built-in `logs` command:
```
admin logs                  # picker
admin logs dev              # filter "dev"
admin logs dev ios          # → tmp/dev-ios.log
```
Args joined with `-` as substring filter on basename.

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

**Userscript:** `tampermonkey/log-bridge.user.js` in the admin-project-tool repo — one project-agnostic script, no per-project URLs in it. Install once via Tampermonkey. Edit the top-of-file constants only for your own machines:
- `PROBE_HOSTS` — your machine's Tailscale IPs (always include `127.0.0.1`)
- `PROBE_PORTS` — union of all port ranges across your machines

Which pages forward is decided at runtime, not by editing the script: `localhost`/`127.0.0.1`/`0.0.0.0` are always watched, and any other host is opt-in via a single Tampermonkey menu command — **"Log bridge: watch `<host>`"** (a host-labelled toggle that saves an auto-derived glob to `GM` storage). The per-project prod hostname lives only in that project's `admin.toml` `[log_bridge].hosts` (advertised via `/health`), which stays the authoritative final match. Each forwarded entry carries the page `host` (not the full URL — keeps auth tokens out of the log); the listener prints one `client connected: <host> (<browser>)` banner per host.

**Adoption checklist for a new project:**
1. Add `[log_bridge]` to `admin.toml` with the right `hosts` (and `port_range` if non-default).
2. Confirm the dev action is `kind = "interactive-shell"` — bridge only wires in there.
3. Verify `PROBE_HOSTS` in the userscript includes this machine's Tailscale IP.
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
   the userscript's `PROBE_HOSTS` includes this machine's tailnet IP; tell the
   user the one-time **"Log bridge: watch `<host>`"** menu opt-in is needed for
   the prod page (localhost needs none); `admin check`.

Discovery files live at `/tmp/admin-project-tool/<pid>.json`; stale ones (dead PIDs) are swept on each start.

---

## Standalone copy (`admin compile`)

For a machine or container without the tool installed, `admin compile` writes a self-contained `./admin` zipapp at the project root that embeds the interpreter + `admin_lib` + the resolved manifest. Run it directly as `./admin <cmd>` there. It's also how you pin a project to a known-good tool version. This is the only thing that produces an `./admin` file — normal projects don't have one.

---

## read-logs.md template

If `.claude/skills/read-logs.md` is missing in the project, copy the body from `references/read-logs-template.md` (in this skill directory) into the new file.
