# Phase 01 — State Detection

For each piece of the standard layout, classify into one of: `missing`, `standard`, or `non-standard at <path>`. Build the audit table that downstream phases consume.

## Probe these candidates

| Standard path | Also look for (non-standard) |
|---|---|
| `CLAUDE.md` (root) | `AGENTS.md`, `.claude/CLAUDE.md` |
| `CLAUDE.local.md` (root) | `.claude/CLAUDE.local.md`, `.claude.local.md` |
| `admin.toml` | (admin skill handles detection — Makefile, justfile, package.json scripts as substitutes; a bare `./admin` with no `admin.toml` is a stale artifact) |
| `docs/` + `.vitepress/config.mts` | bare `docs/` (no VitePress), `documentation/`, `wiki/` |
| `docs/CONTEXT.md` | `CONTEXT.md` (root), `GLOSSARY.md`, `docs/glossary.md`, `docs/terms.md`, per-context `src/*/CONTEXT.md` without a map |
| `docs/adr/` | `adr/`, `decisions/`, `docs/decisions/`, `docs/adrs/`, `architecture/decisions/` |
| `docs/PRD.md` | `PRD.md` (root), `PRODUCT.md`, `PROD-REQS.md`, `docs/product.md`, `docs/spec.md` |
| `docs/ROADMAP.md` | `ROADMAP.md` (root), `TODO.md`, `docs/roadmap/` (folder), `PLAN.md` |

Also probe:

- `.git/` exists
- GitHub remote: `git remote -v | grep github`
- **`.gitignore` coverage.** Ask git, don't read the file — a pattern can arrive from a parent `.gitignore`, `.git/info/exclude`, or the global `~/.config/git/ignore`, and grepping misses all three:
  ```
  git check-ignore -q tmp/claude/x.md   # scratch
  git check-ignore -q .env              # secrets
  git check-ignore -q CLAUDE.local.md   # local notes
  ```
  A non-zero exit means not covered. Also check whether anything already slipped through: `git ls-files tmp/ .env`
- **Legacy planning docs** the `docs` skill knows how to clean up: `PHASE_*.md`, `FUTURE_FEATURES.md`, `PROJECT_PLAN.md`, `tasks/` — flag in summary, defer action to [PHASE-04-VITEPRESS-DOCS.md](PHASE-04-VITEPRESS-DOCS.md)

## Report the state table BEFORE doing anything

```
Bootstrap audit — <project name>

| Piece                  | State                                          |
|---|---|
| CLAUDE.md              | standard / missing / non-standard at AGENTS.md |
| CLAUDE.local.md (root) | missing / non-standard at .claude/CLAUDE.local.md|
| .gitignore             | tmp/ not covered; .env not covered; 2 files tracked under tmp/ |
| admin runner           | standard / missing                             |
| VitePress docs         | non-standard: bare docs/ without VitePress     |
| docs/CONTEXT.md        | non-standard at ./CONTEXT.md                   |
| docs/adr/              | non-standard at ./decisions/ (3 ADRs)          |
| docs/PRD.md            | non-standard at ./PRD.md (substantive content) |
| docs/ROADMAP.md        | missing                                        |
| Issue tracker          | gh ok                                          |
```

Then proceed to [PHASE-02-CLAUDE-FILES.md](PHASE-02-CLAUDE-FILES.md). The user can skip / accept / redirect each migration as the walk proceeds.
