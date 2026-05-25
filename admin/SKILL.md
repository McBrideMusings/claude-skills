---
name: admin
description: "Add/edit/audit the project's admin task runner — admin.toml commands, regenerating ./admin, or migrating inline code to admin_lib."
---

# /admin — Manifest-Driven Admin Task Runner

Two committed files per project:

- **`admin.toml`** — short (~5–25 line) manifest declaring archetypes, URLs, and project commands. **Source of truth.**
- **`./admin`** — generated, self-contained Python script. Never hand-edit; regenerate.

Generator: `~/projects/admin-project-tool/admin-gen` with modes:
- bootstrap (no args), `--regenerate`, `--audit` (exit 0 clean / 2 drift)

## Critical rules

1. **Treat the generator as a black box.** Do NOT read source under `~/projects/admin-project-tool/` or detector/archetype `.py` files unless the user asks you to debug the generator itself. Only read: the project's `admin.toml`, the generated `./admin` (for display/debug), and this skill.

2. **After any commit+push to admin-project-tool, immediately reinstall:** `bash ~/projects/admin-project-tool/install.sh`. Full sequence for any generator change: **edit → commit → push → install → regen project**. Installing from an unpushed commit embeds a dirty SHA.

3. **`admin.toml` is the source of truth.** Hand-edits to `./admin` are drift. `[inline] file = "admin_inline.py"` is itself a migration target — the audit flags it.

---

## Inline code policy

Every `[commands.*]` with `kind = "python"` is inline code. **Last resort, not default.**

**Acceptable** (≤4 logical lines, dispatch-only):
- Parse sub-target args
- Read `_APPLE_CONFIG` / `_SERVER_CONFIG` via `globals().get(...)`
- Single function call per branch

```toml
[commands.logs]
kind = "python"
run = '''
cfg = globals().get("_APPLE_CONFIG") or {}
device_log_attach(get_ios_log_bundle(cfg, prod=args and args[0] == "--prod"), log_file=LOG_FILE)
'''
```

**Not acceptable:** `import` statements, loops, multiple `run_cmd(...)` calls, >4 logic lines, data construction, multi-step workflows. → migrate to `admin_lib/`.

**Audit severities:**
- Moderate (4–8 lines or loops/imports): "wrap in admin_lib"
- Migrate required (>8 lines): "migrate to admin_lib or archetype"
- `[inline] file = ...`: always flagged

When flagged, present finding + migration plan to user before proceeding.

---

## Migration playbook (inline → admin_lib)

| Logic type | Destination |
|---|---|
| New sub-target for existing command | archetype template + `admin_lib` fn + config key in `[apple]`/`[server]` |
| Generic wrapper (docker deploy, cross-compile) | `admin_lib/<module>.py` |
| Entirely new command class | new archetype, or extend existing |
| Project-specific one-off | `kind = "shell"` if shell-ish, or ≤4-line dispatch |

Source repo `~/projects/admin-project-tool/`:
- `admin_lib/` — bundled into `./admin`. Add functions here.
- `archetypes/` — archetype definitions and command templates.
- `gen/manifest.py` — new config table keys.
- `gen/render.py` — emit `_CONFIG` dicts from manifest tables.

After changes: `bash install.sh --force`, then regen the project.

---

## Instructions

### Phase 0: Update the generator (always first)

```bash
git -C ~/projects/admin-project-tool status
```
If dirty: show user, offer to commit+push first. Do NOT pull over uncommitted changes.

Check branch is `main`. If not, ask before switching.

```bash
git -C ~/projects/admin-project-tool pull origin main
bash ~/projects/admin-project-tool/install.sh
```

Generator binary is `~/projects/admin-project-tool/admin-gen` (ignore `~/.admin/init-admin`):
```bash
~/projects/admin-project-tool/admin-gen --audit      . --force-dirty
~/projects/admin-project-tool/admin-gen --regenerate . --force-dirty
~/projects/admin-project-tool/admin-gen              .   # bootstrap
```

### Phase 1: Detect state

- Neither `admin.toml` nor `./admin` → bootstrap (Phase 2a)
- Both exist → audit/regenerate (Phase 2b)
- Only `./admin` (v1) → bootstrap and warn it'll be overwritten (until `--from-existing` ships)
- Only `admin.toml` → `--regenerate`

### Phase 2a: Bootstrap

1. Run `admin-gen .` — detectors pick the archetype. **Don't explore the project yourself to guess.**
2. Show user the generated `admin.toml` and the detector match.
3. Address any inline-code warnings.
4. Point at any `echo 'TODO: …'` placeholders from the `simple` fallback.
5. Apply standard command ordering (Phase 2c) — archetype defaults are usually wrong.

### Phase 2b: Regenerate / Audit

```bash
admin-gen --audit . --force-dirty
```
- Exit 0 clean → nothing to do unless user asked for a change.
- Exit 2 drift → show diff, ask: regenerate (drops hand-edits) or keep drift.
- Inline warnings → present + propose migration plan.

After `admin.toml` edits: `admin-gen --regenerate . --force-dirty`.

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
- `docs` = serve docs locally with hot reload. **Single command, no sub-targets** (e.g. `run = "npm run docs:dev"`). Skip docs build/preview/deploy unless user explicitly publishes.

Legacy `order = [...]` with `"---"` separator still works but prefer group/priority. When using explicit `order`, the first three entries must be `"build", "dev", "deploy"` — always.

### Phase 3: Env var discovery

If `admin.toml` uses `${VAR}`, run `./admin env` and tell user which vars to export.

### Phase 4: Post-generation files

1. **`.gitignore`** — ensure `tmp/` (generator handles this) and `*.local.*` are ignored. Use the glob; don't add literal `CLAUDE.local.md`.
2. **`.claude/skills/read-logs.md`** — create if missing using `references/read-logs-template.md`.
3. **`CLAUDE.md` (committed)** — if the project has no `CLAUDE.md` at the root, invoke `/init` to bootstrap one before writing the local sibling. This keeps shared project context in the committed file so `CLAUDE.local.md` can stay thin.
4. **`.claude/CLAUDE.local.md`** — create/update with dev process section (Phase 5). Keep this file thin: admin-specific dev process and machine-specific overrides only. Anything teammates would benefit from belongs in the committed `CLAUDE.md`.
5. **Project `CLAUDE.md`** — update any `admin.sh` / v1 references to `./admin`; mention `admin.toml` is source of truth.
6. **Docs site, if present** — `admin.toml` must have single `[commands.docs]` shell command (no sub-targets); project `CLAUDE.md` should have a `## Documentation` section with an update-when table. If anything shaped wrong, invoke `/docs` — that skill owns the docs convention.

**Audit checks:**
- Committed `CLAUDE.md` exists at project root (if missing, prompt user to run `/init`)
- `.claude/CLAUDE.local.md` exists (not at project root — old wrong location)
- `.gitignore` has `*.local.*` (migrate literal `CLAUDE.local.md` entries to glob)
- Move any root `CLAUDE.local.md` content into `.claude/CLAUDE.local.md`

### Phase 5: Dev process docs in `.claude/CLAUDE.local.md`

**Native hot reload (Vite, HMR, Next, Air):**
```markdown
## Dev process
`./admin dev` runs the dev server with hot reload. Check `/tmp/admin-run.pid` before starting — if present, do not start a second instance; edits are picked up automatically.
```

**No hot reload (compiled binaries, restart needed):**
```markdown
## Dev process
`./admin dev` uses `/tmp/admin-run.pid` and SIGUSR1 to rebuild without restarting.

After code changes:
1. Check `/tmp/admin-run.pid` — if running, `./admin reload` (do NOT kill+restart)
2. If not running, start with `./admin dev`

Never orphan the process. Never run two simultaneously.
```

If `./admin dev` is one-shot (compiles and exits), omit this section.

### Phase 6: Commit

Ask user to commit `admin.toml` + `./admin` together so `generator_commit` SHA stays coherent.

**Worktree sync:** If this work was done in a git worktree (child branch), copy the updated `admin.toml` and `./admin` to the main worktree as well so they stay in sync. The main worktree won't get these files from a merge until the branch lands, but `./admin` is gitignored in some projects or may be stale in between. After committing in the worktree, copy both files to the main worktree path — for example:

```bash
cp admin.toml <main-worktree-path>/admin.toml
cp admin <main-worktree-path>/admin
```

Ask the user for the main worktree path if it isn't obvious from context (typically the bare checkout root or the path listed by `git worktree list`).

---

## Mental model

- **Archetypes are composable mixins.** `archetypes = ["docker-unraid", "apple"]` merges command sets; later archetype wins; manifest `[commands]` wins over all.
- **Env vars are runtime.** `${VAR}` / `${VAR:-default}` passed through as literals, resolved by `admin_lib.core.resolve_env()` at run time. Never expand at generation.
- **`generator_commit`** = repo SHA of `admin-project-tool` at last regen. Audit compares SHAs to detect generator drift.
- **Python 3.11+ required** (stdlib `tomllib`). Generated script has a runtime guard.
- **Config tables drive archetypes.** `[apple]` / `[server]` tables become `_APPLE_CONFIG` / `_SERVER_CONFIG` dicts. Add keys to configure archetype behavior without inline code.

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
3. Regenerate.

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
./admin logs                  # TUI picker
./admin logs <target>         # follow from end
./admin logs <target> --env prod
./admin logs <target> --tail 500 | --all | --no-follow
```

Default: follow from end, no history. Handles rotation/truncation via inode/size detection. Remote uses `tail -F`.

**Not for:** live process logs (use archetype shell command), aggregation/filtering, time-based filters.

---

## Logging system (per-command file output)

Every command tees to `tmp/<cmd>[-<sub>].log` (e.g. `./admin dev ios` → `tmp/dev-ios.log`). Up to 3 prior runs retained as `.log.1`–`.log.3` (`.1` = most recent).

Every `./admin` has a built-in `logs` command:
```
./admin logs                  # picker
./admin logs dev              # filter "dev"
./admin logs dev ios          # → tmp/dev-ios.log
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
2. `Read` `tmp/<cmd>-<subcmd>.log` directly — don't run `./admin logs`.
3. Build problem (didn't launch) → read **top** (first 80 lines).
4. Runtime bug (launched then failed) → read **bottom** (last 80 lines).
5. Previous run at `.log.1`.

---

## Browser console → log file bridge (`[log_bridge]`)

Forwards browser `console.*` calls into the same log file the admin process writes. Only fires for `kind = "interactive-shell"` actions.

```toml
[log_bridge]
hosts = ["localhost", "*.dev.piercetower.com"]  # glob patterns matched against browser page hostname
port_range = [9988, 9999]                        # optional; defaults to [9988, 9999]
```

`port_range` is per-machine: set different values in each machine's `admin.toml` (same as `hosts`). Useful when a container only exposes a specific port range (e.g. code-server exposes `3300-3399`).

The server binds `0.0.0.0` unconditionally — anyone on the tailnet can POST. Single-user tailnet / dev tool; intentional.

**Userscript:** `tampermonkey/log-bridge.user.js` in the admin-project-tool repo. Install via Tampermonkey. Edit the top-of-file constants:
- `PROBE_HOSTS` — your machine's Tailscale IPs (always include `127.0.0.1`)
- `PROBE_PORTS` — union of all port ranges across your machines
- `HOSTNAME_PREFILTER` — coarse guard; probing only fires on matching page hostnames

**Adoption checklist for a new project:**
1. Add `[log_bridge]` to `admin.toml` with the right `hosts` (and `port_range` if non-default).
2. Confirm the dev action is `kind = "interactive-shell"` — bridge only wires in there.
3. Regenerate `./admin`.
4. Verify `PROBE_HOSTS` in the userscript includes this machine's Tailscale IP.
5. Run `./admin dev`, open the page, `console.log("hello")` in DevTools, tail the log.

Discovery files live at `/tmp/admin-project-tool/<pid>.json`; stale ones (dead PIDs) are swept on each start.

---

## v1 projects (no `admin.toml`)

A v1 `./admin` is a bundled single file with `# @bundled` header but no manifest. Don't hand-audit — regenerate from scratch (overwrites) until `--from-existing` ships.

---

## read-logs.md template

If `.claude/skills/read-logs.md` is missing in the project, copy the body from `references/read-logs-template.md` (in this skill directory) into the new file.
