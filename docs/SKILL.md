---
name: docs
description: "Bootstrap, audit, or migrate a VitePress docs site (PRD/roadmap/file-map layout). Also synthesizes `docs/PRD.md` content from conversation context. Wires into admin runner and CLAUDE.md. Triggers include: 'bootstrap docs', 'audit docs', 'migrate docs', 'write the PRD', 'draft the PRD', 'fill out the PRD', 'populate PRD.md', 'PRD from context'."
user_invocable: true
---

# /docs — VitePress Documentation Site

Walk the project from "no docs" to "VitePress docs site wired into admin + CLAUDE.md", or audit/migrate an existing setup. The flow is **phased**: detect state, branch to one of Bootstrap / Audit / Migrate / Populate-PRD, then verify and commit.

## Standard layout

**Universal (always created):**

```
docs/
├── .vitepress/config.mts   # note .mts — ESM-only
├── index.md                # home with `layout: home`
├── PRD.md                  # the "what"
├── roadmap.md              # Now / Next / Later / Deferred
└── file-map.md             # repo navigation
```

**Opt-in (heuristic-triggered):** `api.md`, `architecture/`, `guide/`, `development/`. Heuristics in [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md).

## Critical rule: VitePress is a black box

Don't read VitePress `node_modules/` or theme internals. Read its config and your markdown only. Build errors referencing VitePress internals are almost always a markdown gotcha or `.mts` rename.

Files this skill reads / writes: `package.json`, `admin.toml`, `CLAUDE.md`, `.gitignore`, anything under `docs/`, this skill.

## Phases

The skill is one ordered workflow. Read [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md) first; it routes to the right downstream phase based on what it finds.

| File | Run when |
|---|---|
| [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md) | Always — first |
| [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md) | No `docs/` exists (greenfield) |
| [PHASE-03-AUDIT.md](PHASE-03-AUDIT.md) | `docs/` + `.vitepress/` both exist (aligned setup) |
| [PHASE-04-MIGRATE.md](PHASE-04-MIGRATE.md) | `docs/` exists, no `.vitepress/` (plain markdown to migrate) |
| [PHASE-05-POPULATE-PRD.md](PHASE-05-POPULATE-PRD.md) | User asks to write/draft/populate the PRD, or PRD.md exists but is stub-only |
| [PHASE-06-VERIFY.md](PHASE-06-VERIFY.md) | After Phase 02 / 03 / 04 — boot the dev server briefly |
| [PHASE-07-COMMIT.md](PHASE-07-COMMIT.md) | Final phase — stage and commit |

## When NOT to use this skill

- Project doesn't use Markdown for docs (Sphinx + RST, hosted platform). VitePress-specific.
- Docs live in a separate repo — run this skill there.
- User explicitly wants a different structure — note the deviation and exit.
