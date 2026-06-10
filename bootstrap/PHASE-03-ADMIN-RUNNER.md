# Phase 03 — Admin Runner

`admin.toml` only. The `admin` tool is installed once at `~/.admin/admin`, on PATH as `admin`, and interprets `admin.toml` at runtime — it finds the manifest by walking up from `$PWD`. Nothing is generated or committed besides `admin.toml`.

## Branches

- **Missing** → delegate to the `admin` skill to bootstrap. The admin skill runs `admin new` to detect the stack and write a starter `admin.toml`, then validates with `admin check`. Don't reimplement that logic here.
- **Standard** → no-op. (The `admin` skill audits independently when invoked.)
- **Non-standard:** if there's a `Makefile`, `justfile`, or top-level `package.json` scripts and no `admin.toml`, mention to the user:

  > *"This repo uses {Makefile / justfile / npm scripts} for task running. The `admin` skill can wrap or migrate to admin.toml. Run `/admin` after bootstrap to handle?"*

  Don't force the migration here — admin is its own skill.

Then proceed to [PHASE-04-VITEPRESS-DOCS.md](PHASE-04-VITEPRESS-DOCS.md).
