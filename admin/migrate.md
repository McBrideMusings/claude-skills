# Migrating admin.toml and inline code

## Why `admin.toml` is never committed

`admin-project-tool` is a private repo nobody else can use, so a committed manifest would be dead weight in someone else's checkout. Never ask whether to commit it, never offer to, never add it to a `.gitignore`, and never stage it — including inside a `git add -A`. If it ever shows up in `git status`, the exclusion is missing: add it and move on without asking.

## Inline code policy (continued)

`[actions.X] kind = "shell-passthrough"; run = "tool"` runs `tool` with the `admin <cmd> <ARG>...` positional args shlex-quoted and appended, propagating the exit code — the declarative way to wire `admin foo <path>` to an underlying script.

An acceptable inline `[actions.*]` body, ≤4 logical lines, dispatch-only:

```toml
[actions.logs]
kind = "python"
run = '''
cfg = globals().get("_APPLE_CONFIG") or {}
device_log_attach(get_ios_log_bundle(cfg, prod=args and args[0] == "--prod"), log_file=get_log_file())
'''
```

Note: `kind = "python"` bodies run in a namespace that mirrors the old flat bundle — every `admin_lib` symbol and the `_*_CONFIG` dicts are in scope. Read the log path via `get_log_file()` / `get_log_dir()` (not bare `LOG_FILE`/`LOG_DIR`) — under the interpreter those accessors return the live, post-boot value.

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

## Dispatch history and legacy scripts

Until ADR-0014 (2026-08-31) step 3 was `branch --yes <word>`, so any word typed in a repo
without an `admin.toml` — every fresh clone, since the manifest is never committed —
silently created and checked out a branch by that name. Meeting that behaviour means the
installed binary predates the fix: `bash ~/Projects/admin-project-tool/install.sh`.

**A fully-Python bundled `./admin` is not a foundation to extend — rip it out immediately.** Signature: a `# @bundled admin_lib=...` header, or any large hand-written committed Python script implementing build/dev/deploy logic (predates ADR-0006 and the `admin.toml` interpreter, or was never migrated). The instinct to "just add one more target to what's already there" is wrong even when it technically works — it's exactly how a project ends up with two competing admin systems once `admin.toml` shows up alongside it. The moment you recognize one: stop, migrate the whole project to `admin.toml` in the same pass (Phase 2a bootstrap, hand-port the custom logic per the layout preferences below), delete the old script, commit. Never patch the bundled script "for now" — not even to add one small thing.

## Standalone copy — retired

`admin compile` no longer exists (typing it is an unknown-command error). A found `./admin` file in a repo is a stale artifact of the retired Python tool — delete it.

---
