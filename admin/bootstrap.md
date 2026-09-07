# Bootstrapping and editing admin.toml

## "Black box" — the diagnosis exception

"Black box" governs routine editing, not diagnosis — a black box you are about to declare defective is exactly the case where you open it. A `--dry-run` that omits a step, an unknown-command fallback printing the menu, or a config key that produces no visible effect are all things the tool does on purpose in some path; none of them is evidence on its own.

## Act, don't ask, for standard setup

Creating or editing `admin.toml`, wiring standard commands (build/dev/deploy/test/docs), populating `[urls]`, or writing a thin passthrough to an existing runner (Makefile/justfile/npm) is routine — just do it and validate with `admin check`. No "shall I create it?", no "want me to wire X?", no "commit?" prompts. `admin.toml` is globally gitignored, so its edits are never a commit question anyway.

## Reinstalling after a tool change

Full sequence for any tool change: **edit → commit → push → install**. There is no per-project regeneration step — installing updates the one interpreter every project shares. Installing from an unpushed commit embeds a dirty SHA into `~/.admin/VERSION`.

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

- No `admin.toml` → bootstrap (Phase 2a) by hand — **`admin new` does not exist; it is an unknown-command error.**
- `admin.toml` present → edit + validate (Phase 2b): `admin check`.
- A stale committed `./admin` present (old generated bundle) → delete it; the project runs from PATH now.

### Phase 2a: Bootstrap

1. Write `admin.toml` by hand from [PLAYBOOK.md](PLAYBOOK.md) — pick archetypes from the fleet list, lay commands on the canonical slots. (There is no detector; `admin new` does not exist.)
2. Show user the manifest you wrote.
3. Smoke-run one cheap real command (`admin test`, `admin audit`) after `admin check` passes — proves dispatch reaches the manifest.
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

**A project tracked in beads gets a top-level `tracker = "beads"` in `admin.toml`, not a `[commands.issues]` shell command.** The tool renders a native backlog panel off that flag — a hand-rolled `bd list` command duplicates and fights it. Pair it with `uses_pull_requests = true`/`false` (top-level, same block as `project_name`) so the tool knows whether this repo's issues resolve via PRs or direct commits. See `admin-project-tool`'s own `admin.toml` (`tracker = "beads"`, `uses_pull_requests = false`) for the pattern.

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
## Mental model

- **Archetypes are composable mixins.** `archetypes = ["docker", "apple"]` merges command sets; later archetype wins; manifest `[commands]` wins over all.
- **The tool reads `admin.toml` live.** No generation, no bundling, no artifact.
- **Versioning is global.** The installed tool's version (in `~/.admin/VERSION`, `linked:` when built from the local source checkout) runs every project. Update the tool → all projects move together.
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

Standing rules:

- **`admin check` first, in that exact directory, before any other `admin` command** — it
  is the one verb that reports what the manifest actually offers.
- Bootstrap is manual: write `admin.toml` by hand per [PLAYBOOK.md](PLAYBOOK.md), then
  `admin check`, then smoke-run one cheap command.

**[PLAYBOOK.md](PLAYBOOK.md) is the distilled fleet pattern** (dispatch details, canonical
vocabulary with real usage counts, kind selection, sub-target idioms, standard tables) —
read it before writing or editing any manifest.

Source repo: `~/projects/admin-project-tool/` — Go dispatch/dashboard in `cmd/` (`root.go` holds `dispatchArgs`), Python runtime helpers in `admin_lib/`, archetypes in `archetypes/`.
