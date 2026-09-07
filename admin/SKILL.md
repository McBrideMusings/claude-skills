---
name: admin
description: "Add/edit/audit a project's admin task runner, AND diagnose a misbehaving `admin` command. Load BEFORE concluding an admin feature is missing, broken, or inert — a deploy that skipped a step, a --dry-run showing less than expected. The tool interprets admin.toml at runtime (no generated ./admin)."
---

# /admin — Manifest-Driven Admin Task Runner

**One file per project: `admin.toml`** — a short (~5–25 line) manifest declaring archetypes, URLs, and project commands. It is the source of truth, read live.

**`admin.toml` is NEVER committed, in any repo, ever.** Globally gitignored. [`migrate.md`](migrate.md) has why, and the fix if it shows up in `git status`.

**No generated `./admin` script** (ADR-0006) — the installed tool interprets `admin.toml` live: `~/.admin/admin`, on PATH as **`admin`**. Tool verbs: `admin check`, `branch`, `prs`, `populate`, `worktree`, `archetypes`. **`admin new`/`compile` no longer exist.**

## Dispatch — `admin <word>` is a command or an error

`admin <word>` dispatches: (1) a tool verb; (2) a command declared in the **current directory's** valid `admin.toml`; (3) otherwise `unknown command "<word>"`, exit 1, nothing touched. History: [`migrate.md`](migrate.md).

**A bare word never creates a git ref.** Only `admin branch <input>` / `admin worktree <input>` do — each takes a name, an issue/PR number, a bead id or a GitHub URL.

## Critical rules

1. **Treat the tool as a black box.** Only read the project's `admin.toml` and this skill — exception: before calling a feature missing/broken/inert, read the source and quote the line. [`migrate.md`](migrate.md) has why.

2. **After any commit+push to admin-project-tool, immediately reinstall:** `bash ~/projects/admin-project-tool/install.sh` — [`bootstrap.md`](bootstrap.md) Phase 0.

3. **`admin.toml` is the only source of truth.** A project commits nothing for admin — not the manifest, not a `./admin` file.

4. **Act, don't ask, for standard setup.** Stops only for a genuine fork: heavy inline code, or a tool/archetype change. [`bootstrap.md`](bootstrap.md) has what's routine.

5. **A fully-Python bundled `./admin` is not a foundation to extend — rip it out immediately.** [`migrate.md`](migrate.md) has the signature.

---

## Inline code policy

Every `[actions.*]` with `kind = "python"` is inline code. **Last resort, not default.**

**Forwarding CLI args? Use `kind = "shell-passthrough"`, not python.** `kind = "python"` is for real dispatch logic only, never to thread args through.

**Acceptable** (≤4 logical lines, dispatch-only): parse sub-target args, read a `_*_CONFIG` via `globals().get(...)`, one function call per branch. Worked example, the runtime-namespace note, and `run_cmd`'s signature: [`migrate.md`](migrate.md).

**Not acceptable:** `import`, loops, multiple `run_cmd(...)` calls, >4 logic lines, multi-step workflows → migrate to `admin_lib/`.

---

## Read on demand

| Open | When |
| --- | --- |
| [`bootstrap.md`](bootstrap.md) | Writing or editing `admin.toml` — Phase 0 through Phase 6, the standard command layout, archetype docs. |
| [`services.md`](services.md) | `[launchd]` always-on services — macOS, Linux, or remote over SSH. |
| [`logging.md`](logging.md) | Env injection, `[logs]` tailing, per-command file logging, `[log_bridge]`. |
| [`migrate.md`](migrate.md) | Inline code → `admin_lib`, the `pty` fix, legacy bundled `./admin`. |

`archetypes/` and `references/` are unchanged; [`bootstrap.md`](bootstrap.md) says when to open them.
