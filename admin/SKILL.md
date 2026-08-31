---
name: admin
description: "Add/edit/audit a project's admin task runner, AND diagnose it when an `admin` command misbehaves. Load this BEFORE concluding an admin feature is missing, broken, unwired, or inert, and before explaining why a deploy, build, or task did or didn't do something: an `admin deploy` that skipped a step, a `--dry-run` that showed less than expected, a config key with no visible effect, an unknown-command fallback printing the menu. The tool interprets admin.toml at runtime (no generated ./admin)."
---

# /admin — Manifest-Driven Admin Task Runner

**One file per project: `admin.toml`** — a short (~5–25 line) manifest declaring archetypes, URLs, and project commands. It is the source of truth, read live.

**`admin.toml` is NEVER committed, in any repo, ever.** It is globally gitignored (`~/.config/git/ignore`) and excluded per-repo where needed (`.git/info/exclude`), so it leaves no trace in a repo at all — not in `.gitignore`, not in `git status`. `admin-project-tool` is a private repo nobody else can use, so a committed manifest would be dead weight in someone else's checkout. Never ask whether to commit it, never offer to, never add it to a `.gitignore`, and never stage it — including inside a `git add -A`. If it ever shows up in `git status`, the exclusion is missing: add it and move on without asking.

There is **no generated `./admin` script** (ADR-0006). The installed tool interprets `admin.toml` at runtime:

- Installed entry: `~/.admin/admin`, on PATH as **`admin`**. Run `admin <command>` from anywhere inside a project — it finds `admin.toml` by walking up from `$PWD`.
- Tool verbs: `admin new` (detect stack → write a starter `admin.toml`), `admin check` (parse + resolve + consistency validation), `admin compile` (build a standalone `./admin` zipapp for a box without the tool installed).
- Editing `admin.toml` takes effect immediately — there is nothing to regenerate, no artifact to commit, no drift to audit.

Source repo: `~/projects/admin-project-tool/` (CLI `admin-run`, runtime `admin_lib/`, interpreter `admin_lib/interp.py`, generator internals `gen/`).

## Critical rules

1. **Treat the tool as a black box.** Do NOT read source under `~/projects/admin-project-tool/` (interpreter, archetype, or detector `.py` files) unless the user asks you to debug the tool itself. Only read: the project's `admin.toml` and this skill.

   **The one standing exception: before telling the user a feature is missing, broken, unwired, or inert, read the source and quote the line.** "Black box" governs routine editing, not diagnosis — a black box you are about to declare defective is exactly the case where you open it. A `--dry-run` that omits a step, an unknown-command fallback printing the menu, or a config key that produces no visible effect are all things the tool does on purpose in some path; none of them is evidence on its own. Saying "this doesn't work" without a quoted line is how a working feature gets rebuilt, or a correct config gets deleted for looking inert.

2. **After any commit+push to admin-project-tool, immediately reinstall:** `bash ~/projects/admin-project-tool/install.sh`. Full sequence for any tool change: **edit → commit → push → install**. There is no per-project regeneration step — installing updates the one interpreter every project shares. Installing from an unpushed commit embeds a dirty SHA into `~/.admin/VERSION`.

3. **`admin.toml` is the only source of truth.** A project commits nothing at all for admin — not the manifest, not a `./admin` file. (If a project still has an old committed `./admin`, it's a stale generated artifact — delete it; `admin` runs from PATH.)

4. **Act, don't ask, for standard setup.** Creating or editing `admin.toml`, wiring standard commands (build/dev/deploy/test/docs), populating `[urls]`, or writing a thin passthrough to an existing runner (Makefile/justfile/npm) is routine — just do it and validate with `admin check`. No "shall I create it?", no "want me to wire X?", no "commit?" prompts. The ONLY thing that stops for a decision is a genuine design fork: heavy inline code that should migrate to `admin_lib` (present finding + migration plan first), or a tool/archetype change (Phase 0 commit+push+install). `admin.toml` is globally gitignored, so its edits are never a commit question anyway.

5. **A fully-Python bundled `./admin` is not a foundation to extend — rip it out immediately.** Signature: a `# @bundled admin_lib=...` header, or any large hand-written committed Python script implementing build/dev/deploy logic (predates ADR-0006 and the `admin.toml` interpreter, or was never migrated). The instinct to "just add one more target to what's already there" is wrong even when it technically works — it's exactly how a project ends up with two competing admin systems once `admin.toml` shows up alongside it. The moment you recognize one: stop, migrate the whole project to `admin.toml` in the same pass (Phase 2a bootstrap, hand-port the custom logic per the layout preferences below), delete the old script, commit. Never patch the bundled script "for now" — not even to add one small thing.

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

**It also fails on a config-table `${VAR}` that no environment value satisfies**, naming the dotted key and the variable — `apple.development_team = ${IOS_DEVELOPMENT_TEAM} — IOS_DEVELOPMENT_TEAM is not set and the reference has no default`. A variable exported as the empty string reports the same way (`set but empty`): since ADR-0013 an empty value counts as unset everywhere, so `${VAR}` errors rather than resolving to `""`, and `${VAR:-default}` takes the default. `${VAR:-}` stays a legal deliberate empty. Command and action `run` strings are deliberately out of scope — an `interactive-shell` body resolves through `resolve_computed`, which hands an unresolvable `${VAR}` to the shell so shell-locals keep working. When check fails this way, no `ok:` line prints; fix the manifest or the environment rather than reading past it.

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

### Phase 2c: The standard layout

**Every `admin.toml` in every project has the same three lifecycle verbs, in this order, and everything else lives below them.**

```
build → dev → deploy        ← group 1, always these three, always this order
────────────────────────    ← automatic spacer
everything else             ← group 2, alphabetical-ish by priority
```

#### The three verbs and exactly what each one means

| Verb | Means | Ends with |
|---|---|---|
| **`build`** | Compile/bundle the thing **in the repo**. Nothing leaves the working tree. | An artifact under `.build/`, `dist/`, `target/`, `build/` |
| **`dev`** | Run it **from source, here, now**, for me to look at. Watches/reloads if the stack can. | A process running in my terminal until I stop it |
| **`deploy`** | Put the built thing **where it actually runs** — this machine or its host — and make that copy live. | The real installed/running copy replaced: `/Applications/X.app`, `~/go/bin/x`, the plugin dir, the container on the host, the Worker |

**`deploy` installs. It does not produce a shippable file.** This is the standard across the whole fleet. A project that spells local install `install` is the outlier — rename it to `deploy`.

**A file for other people or other machines is `distribute`, and it is NOT one of the three.** `.dmg`, `.xpi`, a tarball, a GitHub release upload, a published package — that is `distribute`, in group 2. Never `deploy`, never `release`, never `publish`.

Two more names that are not free to invent:
- **`setup`** — one-time after a fresh clone (resolve deps, install toolchain). Group 1, priority 5, above `build`. Not `install`, not `bootstrap`.
- **`start`** — build then launch the *installed* thing without replacing it. Optional; only add it when the app is a GUI that also has a `dev` from-source path.

Never reorder `build`/`dev`/`deploy`. `deploy` is always last in group 1 — never before `dev`. The `docker` archetype bakes this in as its default `order`.

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

Group 1 = build/run/install. Group 2 = everything else. Defaults (`group=0, priority=0`) → alphabetical, no spacers (fine for ≤3 commands).

Canonical slots — use these numbers so every project's menu lines up:

| Group | Priority | Command |
|---|---|---|
| 1 | 5 | `setup` (only if a fresh clone needs one) |
| 1 | 10 | **`build`** |
| 1 | 20 | **`dev`** |
| 1 | 25 | `start` (only for a GUI app with an installed copy) |
| 1 | 30 | **`deploy`** |
| 2 | 5 | `distribute` |
| 2 | 10 | `test` |
| 2 | 20 | `vet` / `lint` |
| 2 | 30 | `fmt` |
| 2 | 40 | `clean` |
| 2 | 45 | `kill` (any project with a server or other long-running process `dev` can leave orphaned) |
| 2 | 50 | `docs` |
| 2 | 60+ | project-specific (`logs`, `snapshot`, `reload`, …) |

Notes:
- `docs` = serve docs locally with hot reload. **Single command, no sub-targets** (e.g. `run = "npm run docs:dev"`). Skip docs build/preview/deploy unless the user explicitly publishes.
- `kill` — standard, not project-specific, for any project whose `dev`/`build` can leave something running that outlives the command: a dev server, a Docker container, a background watcher, anything bound to a port. Force-stops it (`pkill`/`docker stop`/free the port), so a crashed or detached `admin dev` doesn't leave a zombie process squatting on a port the next `admin dev` needs. Skip it only for projects with nothing long-running to leave behind (a pure CLI, a static build). Real examples across the fleet: `steps = ["kill-dev"]` (kill stray dev processes + free ports), `steps = ["docker-down", "kill-dev"]` (stop a dev container and stray Electron/Vite), `steps = ["kill-local"]` (kill local servers only, never touch remote).

Legacy `order = [...]` with `"---"` separator still works but prefer group/priority. When using explicit `order`, the first three entries must be `"build", "dev", "deploy"` — always.

### Personal preferences (pierce) — read before laying out any `admin.toml`

The tool itself enforces almost none of this — no naming convention, no menu shape, no archetype-composition rule. These are standing preferences, not tool constraints, and getting them wrong is the single most common reason a manifest needs correcting after the fact.

**Prefer verb + sub-target dispatch over one top-level command per target.** If several things build/dev/deploy under the same conceptual verb and differ only in *which* thing (a native client for two platforms, a binary vs a Docker image, two Docker images), express them as `admin build <target>` — matching how the `apple` archetype's own `build mac|ios|tv` already works — never as separate top-level commands (`build-ios`, `build-go`, `deploy-agent`, `deploy-web`, `deploy-server`, …). A menu with a dozen narrowly-named top-level commands is the exact "what are all these, why do we have all these, I'm confused" complaint — the fix is collapsing them back under `build`/`dev`/`deploy` with sub-targets, not defending the sprawl. Only fall back to separate top-level commands when the targets are genuinely heterogeneous enough that no single dispatcher/archetype can express them together (e.g., a Go binary + Docker images living beside a completely separate Xcode client) — and even then, question whether the two really belong in the same `admin.toml` at all (see the multi-app note below) before reaching for a pile of hyphenated commands.

**Composing more than one archetype needs an explicit collision check, every time — never assume the merge "just worked."** Two archetypes can both define `build`/`dev`/`deploy`/`reload`; the later one in the `archetypes = [...]` list silently wins for any name they share, and `admin check` prints `merge: command 'X' from 'Y' overridden by archetype 'Z'` for every collision — read every line of that output, not just the "ok" summary. A collision means the *other* archetype's version of that command, and everything unique to it (a stray `open`/`logs`/`run-args`, a bogus "prod" URL health-check with nothing behind it), is still present and now confusing since the thing it was for got silently dropped. If a project genuinely needs pieces of two archetypes, either accept the override and remove the now-orphaned unique commands from the losing archetype explicitly, or don't compose them at all — one archetype cleanly beats two composed sloppily. **This is a proven, working pattern across the fleet, not just theory** — `term-wheelhouse` (`go-cli` + `apple`), `etv-station` (`rust` + `docker`), `wedding` (`hugo` + `cloudflare-workers`), and `charcoal` (`rust` + `rust-tauri`) all compose two archetypes cleanly by **explicitly redeclaring every command the merge would otherwise collide on** in the manifest's own `[commands.*]` — that's what "accept the override and remove the orphaned bits" looks like in practice.

**`project_name` always names the whole project/repo, never one app or component living inside it** — even when that component is the only thing currently wired into `admin.toml`. A repo called "Open Assistant" that currently only builds one sub-app (say, a companion iOS client) still has `project_name = "Open Assistant"`; the sub-app's own name belongs in `ios_scheme`/`mac_scheme`/wherever the archetype config actually wants it, never smuggled into the project identity.

**Before inventing an app identifier (bundle ID, package name, image name, anything reverse-DNS-shaped), check for an existing personal namespace convention already in use elsewhere in the same repo or fleet, and match it.** Don't derive an identifier from the current app/feature's own name (`com.hermescompanion.app` for an app called Hermes Companion) — check other targets in the same project, or other projects on this machine, for the real convention (e.g. `com.piercemakes.*`) and use that, asking only if none is found anywhere.

**One `admin.toml` per thing the user actually wants to build right now.** Wiring in every buildable component of a repo "for completeness" is not the default — if the user names one specific app/target, wire only that, and say so rather than silently including the rest. Removing something later because it was never asked for reads as churn; ask what's actually wanted before the first draft, or keep the first draft minimal and let the user ask for more.

**`[urls]` commonly carries `repo` beyond `dev`/`prod` — add `issues` only when the project actually uses that tracker.** `repo` pointing at the GitHub page is fine as a standard addition whenever a GitHub remote exists (`admin open repo`, no separate lookup needed). `issues` is conditional, not automatic — only add it for a project that actually files/works GitHub Issues; skip it for a project tracked some other way (beads, a local followups file, nothing at all), since a URL to an empty or unused issue tracker is worse than no entry.

**A project-specific env var (a mount source, a deploy target host, an app-specific port) is prefixed with the project's own uppercase name, not a generic shared prefix.** `ETV_STATION_APPDATA`, `PLEX_HOME_APPDATA`, `STASH_DEPLOY_TARGET` — the pattern is `<PROJECT>_<PURPOSE>`, so the var is self-documenting about which project it belongs to when it shows up in a shell history or a `.env` shared across several projects' worth of exports. Reserve the fleet-wide unprefixed names (`UNRAID_HOST`, `UNRAID_USER`, `PROD_URL`) for the handful of keys that really are shared tool convention, not project identity — don't invent a new unprefixed generic name for something that's really just this one project's concern.

**A known bad-manifest pitfall: `[commands.X]` cannot carry `run`/`kind`/`targets` directly — only `desc`, `steps`, and log overrides.** Those belong on a separate, matching `[actions.X]` block; putting them on the command entry itself passes `admin check`'s file-exists test but fails resolution with `commands.X: invalid keys [...]`. Easy mistake to make by analogy with a project's own build scripts, and easy to miss if `admin check` isn't re-run after editing. Always re-run `admin check` after any manifest edit, not just after wiring new commands.

### Phase 2d: Audit + normalize an existing manifest

**Offer this unprompted the first time a session touches `admin.toml`, or when an `admin` command surprises the user** (the wrong thing happened, or a verb didn't exist). One line: "`admin.toml` here uses `install` for the local install — the fleet standard is `deploy`. Want me to normalize it?" Then wait.

Checklist, in order:

1. **Do `build`, `dev`, `deploy` all exist?** A missing one is usually mis-named, not absent — find what does the job and rename it.
2. **Does `deploy` install, or does it build a shippable file?** If it builds a `.dmg`/`.xpi`/tarball/release, that command is `distribute` (group 2), and the local-install command — often called `install` — becomes `deploy`.
3. **Is there an `install`?** Two cases: it installs the built app locally → rename to `deploy`; it installs dev toolchain/deps → rename to `setup`.
4. **Any `release` / `publish` / `ship`?** → `distribute`.
5. **Any `run`?** If it runs from source → `dev`. If it launches the installed copy → `start`.
6. **Are group/priority on the canonical slots above?** Fix the numbers so the printed menu matches every other project.
7. **`admin check`**, then update the project's own docs in the same pass — a rename that leaves `CLAUDE.md`, `CLAUDE.local.md`, and `.claude/skills/*` naming the old verb sends the next session down a path that no longer exists. Grep the repo for the old verb before finishing.

Renaming a command is free — `admin.toml` is globally gitignored and there is no generated artifact — but the docs referencing it are not. Step 7 is the part that actually costs something if skipped.

### Phase 3: Env var discovery

If `admin.toml` uses `${VAR}`, run `admin env` and tell the user which vars to export.

### Phase 4: Post-bootstrap files

1. **`.gitignore`** — ensure `tmp/` and `*.local.*` are ignored. Use the glob; don't add literal `CLAUDE.local.md`. (Old generated `./admin` files should be removed, not gitignored.)
2. **`.claude/skills/read-logs.md`** — create if missing using `references/read-logs-template.md`.
3. **`CLAUDE.md` (committed)** — if the project has no root `CLAUDE.md`, invoke `/init` first.
4. **`CLAUDE.local.md` (repo root)** — create/update with the dev-process section (Phase 5). Keep thin: admin-specific dev process and machine overrides only. Root, not `.claude/` — Claude Code only auto-loads a local file at the repo root.
5. **Project `CLAUDE.md`** — note that `admin.toml` is the source of truth and commands run via `admin <cmd>` (the tool is installed on PATH; nothing about admin is committed, the manifest included).
6. **Docs site, if present** — `admin.toml` must have a single `[commands.docs]` shell command (no sub-targets). If shaped wrong, invoke `/docs`.

**Audit checks:**
- Committed `CLAUDE.md` exists at project root (if missing, prompt `/init`)
- `CLAUDE.local.md` exists at the project root (not inside `.claude/`)
- `.gitignore` has `*.local.*`
- No stale committed `./admin` (delete if present)

### Phase 5: Dev process docs in root `CLAUDE.local.md`

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

**Nothing from admin gets committed** — `admin.toml` is globally gitignored and there is no `./admin` or `generator_commit` to keep coherent. Commit only the OTHER files this pass touched (docs, `CLAUDE.md`, `CLAUDE.local.md`). Do not ask about the manifest. (Worktree note: `admin.toml` is per-checkout and the interpreter is shared, so there's nothing to copy between worktrees.)

---

## Mental model

- **Archetypes are composable mixins.** `archetypes = ["docker", "apple"]` merges command sets; later archetype wins; manifest `[commands]` wins over all.
- **The interpreter reads `admin.toml` live.** No generation, no bundling, no artifact. `admin compile` is the one exception — it packages the interpreter + `admin_lib` + the manifest into a standalone zipapp via stdlib `zipapp`, for a machine without the tool installed.
- **Versioning is global.** The installed tool's version (in `~/.admin/VERSION`) runs every project. Update the tool → all projects move together. `admin compile` freezes a project to a known-good copy when you need a pin.
- **Env vars are runtime.** `${VAR}` / `${VAR:-default}` resolved by `admin_lib.core.resolve_env()` at run time. Never expand when editing the manifest.
- **Python 3.11+ required** (stdlib `tomllib`).
- **Config tables drive archetypes.** `[apple]` / `[server]` tables become `_APPLE_CONFIG` / `_SERVER_CONFIG` dicts in `kind="python"` namespaces. Add keys to configure archetype behavior without inline code.
- **Reserved verbs.** `new`, `check`, `compile` share the `admin <word>` namespace; a manifest may not define a command with one of those names (the CLI errors).

---

## Archetype-specific docs (load on demand)

Archetype-specific gotchas live in **`skills/admin/archetypes/<name>.md`**, NOT in
this file — so only the relevant ones apply to a given project. When you start
work, read the doc for **each archetype in the project's `admin.toml`**
(`archetypes = [...]`):

| Archetype | Doc | Highlights |
| --- | --- | --- |
| `apple` | `archetypes/apple.md` | app-icon **alpha → inset** gotcha; Dock name = `.app` filename (rename); `[apple.icons]` |
| `rust-tauri` | `archetypes/rust-tauri.md` | macOS bundle inherits the apple icon-alpha rule |
| `docker` | `archetypes/docker.md` | `deploy image｜files｜all`; `[deploy]` mirror dir; `[docker_run]` creates the container; **`deploy` installs the Unraid template — three silent no-ops make it look missing**; `DEPLOY_LOCAL`→`ADMIN_LOCAL` |
| `unraid-plugin` | `archetypes/unraid-plugin.md` | `DEPLOY_LOCAL`→`ADMIN_LOCAL` |
| `cloudflare-workers` | `archetypes/cloudflare-workers.md` | dev streaming (`interactive-shell`); cwd-relative wrangler |
| `hugo` | `archetypes/hugo.md` | static site |
| `rust` | `archetypes/rust.md` | cargo |
| `go-cli` | `archetypes/go-cli.md` | go toolchain |
| `firefox-extension` | `archetypes/firefox-extension.md` | webextension / `.xpi` |
| `stash-plugin` | `archetypes/stash-plugin.md` | stash plugin |
| `forge-engine` | `archetypes/forge-engine.md` | — |
| `simple` | `archetypes/simple.md` | generic shell, no specifics |

Discovered a new archetype-specific gotcha? Add it to that archetype's file
(create it if missing) — **never inline here**, so it doesn't load for every
project.

---

## Always-on user services (`[launchd]`) — macOS launchd, Linux systemd --user, or remote over SSH

A project with a process that should be alive at login (on this machine, or as
standing infra on another one) declares `modules = ["launchd"]` plus a
`[launchd]` table, and wires a `service` command. **Do not write a
per-project shell script that generates a plist/unit and drives
`launchctl`/`systemctl`, and do not write one that pushes a binary over SSH and
installs it remotely** — that is what this module replaced (`admin_lib/launchd.py`).
It is a module, not an archetype: a Go supervisor, a Python daemon and a shell
script all register identically, so it composes with whatever stack archetype
the project already uses. The config table is called `[launchd]` for historical
reasons but drives all three targets — the same table, same verb names, works
unmodified on macOS or Linux.

```toml
modules = ["launchd"]

[launchd]
label       = "com.example.myserver"      # required
program     = "~/go/bin/myserver"         # required, absolute after ~ expansion — the INSTALLED path
source      = "server/myserver"           # optional — a freshly built binary elsewhere; `install`
                                           # atomically swaps it into `program` before touching the service
args        = ["-wait-for-lock"]
stdout      = "${HOME}/.myserver/out.log"
stderr      = "${HOME}/.myserver/err.log"
working_dir = "${HOME}"
throttle    = 10
# also: env, inherit_path (default true), inherit_home (default true),
#       keep_alive (true), run_at_load (true), process_type ("Background", macOS only),
#       nice, start_interval

[commands.service]
desc = "Manage the service (install|uninstall|status|restart|stop|start)"
steps = ["service"]
group = 3
priority = 1

[actions.service]
kind = "python"
run  = '''
launchd_service(globals().get("_LAUNCHD_CONFIG") or {}, args)
'''
```

Three things worth knowing before you debug something here:

- **`install` is deliberately not always a re-registration.** macOS 13+ Background
  Task Management records every launchd item and posts an "App Background
  Activity" notification the first time it sees one, keyed on the plist being
  installed rather than the process starting — so a `deploy` that rewrote an
  identical plist and did `bootout` + `bootstrap` produced a notification on
  every deploy. `install` renders the plist and compares it with what is on disk:
  identical and already loaded → `launchctl kickstart -k` only, no write, no new
  BTM record. It writes and re-registers only on a genuine change, a missing
  plist, or an unloaded agent. A `service install` that prints "restarted …
  (plist unchanged)" is working correctly, not skipping work. The Linux side
  mirrors this with `systemctl --user`; there is no BTM equivalent to worry
  about, but a byte-identical unit still skips the rewrite.
- **`source` triggers an atomic binary swap, not a plain copy.** Overwriting a
  file a running daemon has mapped corrupts the running image (macOS refuses to
  spawn the new file — `OS_REASON_CODESIGNING`; Linux hits `ETXTBSY`). With
  `source` set, `install` stops the service, writes the new binary to a sibling
  temp path (its own inode), ad-hoc re-signs it on macOS, and renames it into
  place — and skips the whole thing if the source is byte-identical to what's
  already installed and loaded, so a redeploy of unchanged code doesn't bounce
  a live process. Without `source`, `program` is assumed already built in place
  (the historical behavior — unaffected by this key existing).
- **`inherit_path` writes the invoking shell's PATH into the plist/unit.**
  launchd hands an agent `/usr/bin:/bin:/usr/sbin:/sbin` and nothing else, so a
  process that shells out to anything from Homebrew or a language toolchain
  starts fine and then fails on its first real unit of work. Leave it on unless
  the program genuinely needs a pinned PATH.

`${VAR}` placeholders resolve at run time and nest, so `${GOPATH_BIN:-${HOME}/go/bin}`
means what it reads. A default is only expanded when it is actually used.

Note `admin service install` is also usually a step inside `deploy`, since a
deploy replaces the binary the agent is running.

### Remote install over SSH — `service_deploy_remote`

For pushing the same service to another machine (a home-lab box, a VPS) rather
than running it here: call `service_deploy_remote(cfg, host, dist_dir, binary)`
from a `deploy` action. It arch-detects the host, picks the matching binary out
of a `[go_dist]`-built matrix (`<binary>-<os>-<arch>` + `VERSION`), and pushes
it plus a portable POSIX-sh installer
(`admin_lib/resources/install_service_remote.sh`) over scp — no Python or the
admin tool needs to be installed on the remote host. That installer duplicates
a small slice of the launchd/systemd rendering logic in shell rather than
importing `admin_lib.launchd`, on purpose: the remote host is not assumed to
have the tool.

```toml
[actions.deploy]
kind = "python"
run  = '''
host = args[1] if len(args) > 1 else None
if host:
    build_go_dist(globals().get("_GO_DIST_CONFIG") or {})
    service_deploy_remote(globals().get("_LAUNCHD_CONFIG") or {}, host,
                           dist_dir="dist", binary="myserver")
else:
    launchd_service(globals().get("_LAUNCHD_CONFIG") or {}, ["install"])
'''
```

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

## Standalone copy (`admin compile`)

For a machine or container without the tool installed, `admin compile` writes a self-contained `./admin` zipapp at the project root that embeds the interpreter + `admin_lib` + the resolved manifest. Run it directly as `./admin <cmd>` there. It's also how you pin a project to a known-good tool version. This is the only thing that produces an `./admin` file — normal projects don't have one.

---

## read-logs.md template

If `.claude/skills/read-logs.md` is missing in the project, copy the body from `references/read-logs-template.md` (in this skill directory) into the new file.
