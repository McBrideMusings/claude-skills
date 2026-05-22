# Phase 03 — Admin Runner

`admin.toml` + the generated `./admin` script.

## Branches

- **Missing** → delegate to the `admin` skill to bootstrap. The admin skill handles archetype detection, regeneration, and wiring. Don't reimplement that logic here.
- **Standard** → no-op. (The `admin` skill audits independently when invoked.)
- **Non-standard:** if there's a `Makefile`, `justfile`, or top-level `package.json` scripts and no `admin.toml`, mention to the user:

  > *"This repo uses {Makefile / justfile / npm scripts} for task running. The `admin` skill can wrap or migrate to admin.toml. Run `/admin` after bootstrap to handle?"*

  Don't force the migration here — admin is its own skill.

Then proceed to [PHASE-04-VITEPRESS-DOCS.md](PHASE-04-VITEPRESS-DOCS.md).
