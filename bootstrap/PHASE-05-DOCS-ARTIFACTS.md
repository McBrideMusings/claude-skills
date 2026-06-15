# Phase 05 — Docs Artifacts

Four artifacts under `docs/`: glossary, ADRs, PRD, roadmap. Each has its own create/migrate logic.

## docs/CONTEXT.md (project glossary)

- **Missing** → create from the empty-glossary template below.
- **Standard** → no-op.
- **Non-standard at root `CONTEXT.md`** (Matt Pocock's older convention):
  1. `git mv CONTEXT.md docs/CONTEXT.md` (or `mv` if untracked).
  2. Grep for references to the old path and update them: `grep -r 'CONTEXT.md' --include='*.md' --include='*.toml' --include='CLAUDE.md'`.
- **Non-standard at `GLOSSARY.md` / `docs/glossary.md` / `docs/terms.md`**:
  1. Confirm: *"Found `GLOSSARY.md` — looks like project vocabulary. Rename + move to `docs/CONTEXT.md`?"* (Default: yes.)
  2. Move and update internal references.
  3. If the file's format doesn't match `~/.claude/skills/grill-me/CONTEXT-FORMAT.md` (no `## Language`, `## Relationships`, etc.), leave the content but add standard headings around it. Don't reformat the user's existing entries.
- **Per-context files at `src/*/CONTEXT.md` without a CONTEXT-MAP.md**: multi-context bounded-context pattern. Don't migrate — offer to create `docs/CONTEXT-MAP.md` listing them.

### Empty-glossary template

```md
# {Project Name}

{One-sentence description of what this project is.}

## Language

### Domain

{Project-specific terms get added here as they resolve, by `grill-me` and `improve-codebase-architecture`.}

### Architecture

{Seeded on first run of `improve-codebase-architecture`. Don't seed up front.}

## Relationships

{Filled in as the model matures.}

## Flagged ambiguities

{When terms get used ambiguously and resolved, capture here.}
```

## docs/adr/

- **Missing** → `mkdir -p docs/adr && touch docs/adr/.gitkeep`. No seed ADRs — `grill-me` and `improve-codebase-architecture` create them lazily when their three-conditions test passes.
- **Standard** → no-op.
- **Non-standard at `adr/` / `decisions/` / `docs/decisions/` / `docs/adrs/` / `architecture/decisions/`:**
  1. Confirm the directory holds ADR-shaped files (markdown with date / number / title pattern).
  2. `git mv <old-dir>/* docs/adr/` (or `mv` if untracked), preserving numbering.
  3. Check filenames against the `NNNN-slug.md` convention. If a file is `001-foo.md`, propose renaming to `0001-foo.md` to match four-digit standard. Don't force; offer.
  4. Update internal cross-references (`docs/adr/0001-foo.md` mentions in CLAUDE.md, READMEs, other ADRs).

## docs/PRD.md

- **Missing** → write the thin stub below. Offer to populate via `/docs` Phase 05 if there's substantive conversation context.
- **Standard, stub-only** (just H1 + TODO, or empty sections) → offer `/docs` Phase 05 to populate.
- **Standard, substantive** → no-op; respect existing content.
- **Non-standard at root `PRD.md` / `PRODUCT.md` / `docs/product.md` / `docs/spec.md`:**
  1. Read the file to gauge substantive vs stub.
  2. **Substantive:** `git mv <old-path> docs/PRD.md`, update cross-references. **Don't** reformat — even if it doesn't match the template, the content is the user's. Offer separately: *"Want me to restructure it to match the standard PRD sections? (Problem / Solution / User Stories / etc.)"*
  3. **Stub-only:** delete the old file, write a fresh stub at the standard path.

### Stub

```md
# {Project} PRD

## Problem Statement
TBD

## Solution
TBD

## User Stories
TBD

## Implementation Decisions
TBD

## Testing Decisions
TBD

## Out of Scope
TBD

## Further Notes
TBD
```

## docs/ROADMAP.md

- **Missing** → write the thin stub (Now / Next / Later / Deferred).
- **Standard** (`docs/ROADMAP.md` or `docs/roadmap.md` lowercase) → no-op. Lowercase is the `docs` skill's convention; either spelling is fine.
- **Non-standard at root `ROADMAP.md` / `PLAN.md` / `TODO.md`:**
  1. Read to see if it's actual roadmap content.
  2. **Yes:** `git mv <old-path> docs/ROADMAP.md` (or `docs/roadmap.md` to match if the `docs` skill prefers lowercase locally).
  3. **TODO.md of small tasks** rather than roadmap-shaped content: *"This looks more like a follow-ups list than a roadmap. Want me to move the items into `<repo-root>/tmp/claude/followups.md` instead?"*
- **Non-standard at `docs/roadmap/` (folder):** the `docs` skill's Phase 03 audits this — collapses to `docs/roadmap.md` unless 3+ active initiatives. Defer to docs.

### Stub

```md
# {Project} Roadmap

## Now

## Next

## Later

## Deferred
```

Then proceed to [PHASE-06-ISSUE-TRACKER.md](PHASE-06-ISSUE-TRACKER.md).
