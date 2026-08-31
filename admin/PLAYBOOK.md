# admin fleet playbook — how a real manifest is written

Distilled from every `admin.toml` on this machine plus the Go tool's source. Follow this
when bootstrapping or editing a manifest; it reflects what the fleet actually does, not
what any older tool version did.

## The tool, precisely

`~/.admin/admin` is a Go binary (aliased `repo`): a terminal dashboard for the repo you're
in, plus the `admin.toml` runner. `~/.admin/VERSION` says `linked:<source-repo>`; the
source is `/Users/pierce/Projects/admin-project-tool` (Go dispatch in `cmd/`, Python
runtime helpers still in `admin_lib/`, archetypes in `archetypes/`).

**Dispatch order for `admin <word>`** (`cmd/root.go` `dispatchArgs`, ADR-0011 §2 as
amended by ADR-0014):

1. A tool verb: `archetypes`, `branch`, `check`, `populate`, `prs`, `worktree`, `help`,
   `completion`.
2. A command declared in the **current project's** `admin.toml` (found from `$PWD`; a
   manifest that exists but fails to parse blocks here with a hard error).
3. Otherwise: `unknown command "<word>"`, exit 1, nothing touched. The error lists the
   manifest's real commands, or says there is no `admin.toml` here.

Consequences you must act on:

- **`admin <word>` never creates a git ref.** Branches and worktrees come only from the
  reserved verbs `admin branch <input>` and `admin worktree <input>`, which take a name,
  an issue/PR number, a bead id or a GitHub URL. A manifest may not claim either name.
- **There is no `admin new` and no `admin compile`.** Typing either is an unknown-command
  error. Bootstrap = write `admin.toml` by hand from this playbook, then `admin check`.

## Bootstrap procedure (no detector exists)

1. Write `admin.toml` at the repo root by hand: pick archetypes (below), lay out
   commands on the canonical slots, one `[actions.X]` per `[commands.X]` step.
2. `( cd <repo> && admin check )` — must print valid.
3. Smoke-run one cheap real command (`admin test`, `admin audit`) — proves dispatch
   reaches the manifest.
4. `admin.toml` stays uncommitted and out of `.gitignore` (globally excluded). If it
   shows in `git status`, fix the exclusion; never stage it.

## Standardized commands — same name, same meaning, in every repo

This playbook documents ONLY the shared vocabulary. A verb from this table means the
identical thing in every manifest on the machine; anything not in it is repo-specific,
lives at group 2 priority 60+, and never gets promoted into this playbook.

| Verb | Slot | Meaning | Ends with |
| --- | --- | --- | --- |
| `setup` | 1/5 | one-time after a fresh clone: deps, toolchain | a ready working copy |
| `build` | 1/10 | compile/bundle **in the repo**; nothing leaves the tree | an artifact under `dist/`/`build/`/`target/` |
| `dev` | 1/20 | run **from source, here, now**; watches/reloads if the stack can | a process in my terminal until I stop it |
| `start` | 1/25 | launch the **installed** copy (GUI apps with a dev path only) | the app running, not replaced |
| `deploy` | 1/30 | put the built thing **where it actually runs**, make that copy live | the installed/running copy replaced |
| `distribute` | 2/5 | a shippable file for other people/machines (.dmg, .xpi, tarball, release) | a file, not an install |
| `test` | 2/10 | the test suites | pass/fail |
| `vet`/`lint` | 2/20 | static checks: typecheck, lint | pass/fail |
| `fmt` | 2/30 | format the tree in place | formatted files |
| `clean` | 2/40 | remove build outputs | a clean tree |
| `kill` | 2/45 | force-stop anything `dev`/`build` can orphan; free the ports | nothing listening |
| `docs` | 2/50 | serve docs locally with hot reload; one command, no sub-targets | a process in my terminal |

Renames this table forces: local install spelled `install` → `deploy`; toolchain
install → `setup`; `release`/`publish`/`ship` → `distribute`; `run` → `dev` (from
source) or `start` (installed copy). `deploy` never produces a shippable file.
A new top-level name needs a reason no verb above covers — and even then it's
group 2, 60+, in that one repo only.

## `kind = "python"` is retired — convert on sight

The Go tool's catalog dropped `python` and `python-script` (`internal/kinds/catalog.go`
header). A manifest still declaring either fails at dispatch with `unknown kind "python"`,
and one failing action **blocks every command in that manifest** — the fleet had ~31 such
actions when the kind was removed, so expect this in any manifest not touched recently.
Conversion recipe, proven in etv-station:

- The action wraps a script and the python only forwarded args / picked from the script's
  own `--list`: make the script's bare form print the listing plus a `Run: admin <cmd>
  <target>` hint (a list is an answer, not a usage error), and the action becomes
  `kind = "shell-passthrough"` straight to the script.
- The python was a real interactive cascade (`pick_target` menus): move the cascade into
  a shell script with numbered menus and make the action `kind = "interactive-shell"` —
  the kind whose charter is reading the user's keystrokes.
- Env prefixes built with `resolve_env(...)` in python are unnecessary: the script
  inherits the environment, and `${VAR:-default}` belongs in the script or a per-command
  `env` table.

## Choosing `kind` (365 fleet actions)

- `shell` (197) — one-shot: builds, tests, format, clean.
- `shell-passthrough` (49) — a script that owns its own args/output; forwards
  `admin <cmd> <ARGS>` positionally.
- `interactive-shell` (39) — anything holding a TTY or streaming long-running output:
  vite/electron/docker compose up/docs serve. Never `pty = true` on these — pty makes
  wrapped tools collapse their output.
- `python` (31) — ≤4-line dispatch into an archetype/module helper only.
- `multi-target` (24) — the sub-target dispatcher, below.
- `nuke-dev` — pairs with a `[dev_kill]` table (`ports`, `patterns`, `pidfiles`) for the
  `kill` command.

## Sub-target dispatch — two fleet idioms

Verb + sub-target beats hyphenated top-level commands. Idiom 1, `targets` map with
`@alias` (rpg-toolkit, muxarr, term):

```toml
[actions.dev]
kind = "multi-target"
desc = "Run a dev build for the selected target"

[actions.dev.targets]
mac    = "@dev-mac"
docker = "@dev-docker"
```

Idiom 2, per-target subtable with `action` + `urls` (reddit-poker, the richest manifest):

```toml
[actions.dev.local]
desc   = "Devvit local dev harness"
action = "dev-local"
urls   = ["dev-local"]
```

Both keep the flat `[actions.dev-local]` defined alongside so `admin dev-local` also works.

## Standard tables

- `[urls]` — common keys by frequency: `dev`, `prod`, `repo`, `issues` (only when GitHub
  Issues is really the tracker), `docs`, `staging`.
- `[logging] enabled/dir/retain` — tee every command to `tmp/<cmd>.log`, retain 3.
- `hide_commands = [...]` and legacy `order = [...]` for menu control (prefer
  group/priority).
- Env vars: `${VAR:-default}` everywhere; project-prefixed SCREAMING_SNAKE
  (`MUXARR_*`, `ETV_*`) for project-specific values, unprefixed only for fleet-wide
  conventions (`TZ`, `UNRAID_HOST`, `DEPLOY_LOCAL`→`ADMIN_LOCAL`).

## Archetypes actually in use

docs 27 · simple 13 · docker 8 · raylib-game 7 · apple 7 · go-cli 5 · rust 2 ·
unraid-plugin 2 · hugo 2 · rust-tauri 1 · cloudflare-workers 1; several strong manifests
use `archetypes = []` and declare everything locally. Composing two archetypes: read every
`merge:` line from `admin check` and explicitly redeclare collided commands.

## Exemplar worth copying (listing control + logging)

```toml
hide_commands = ["open", "reload"]
order = ["build", "dev", "deploy", "---", "test", "kill", "clean", "docs", "---", "logs", "diff"]

[logging]
enabled = true
dir     = "tmp"
retain  = 3
```
