# Docs site — VitePress

Walking a project from "no docs" to "VitePress docs site wired into admin + CLAUDE.md", or
auditing/migrating an existing one. The flow is **phased**: detect state, branch to one of
Bootstrap / Audit / Migrate, then verify and commit.

The standing rules for vocabulary, ADRs and subsystem docs apply in every session, with or
without this flow: [`../../ref/docs/STANDING-RULES.md`](../../ref/docs/STANDING-RULES.md).

## Standard layout

**Universal (always created):**

```
docs/
├── .vitepress/config.mts   # note .mts — ESM-only
├── index.md                # home with `layout: home`
└── file-map.md             # repo navigation
```

**Opt-in (heuristic-triggered):** `api.md`, `architecture/`, `guide/`, `development/`. Heuristics in [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md).

**Config starting point:** [references/vitepress-config.md](references/vitepress-config.md) — open whenever writing or rewriting `docs/.vitepress/config.mts`.

## Critical rule: VitePress is a black box

Don't read VitePress `node_modules/` or theme internals. Read its config and your markdown only. Build errors referencing VitePress internals are almost always a markdown gotcha or `.mts` rename.

Files this flow reads / writes: `package.json`, `admin.toml`, `CLAUDE.md`, `.gitignore`, anything under `docs/`, this directory.

## Phases

One ordered workflow. Read [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md) first; it routes to the right downstream phase based on what it finds.

| File | Run when |
|---|---|
| [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md) | Always — first |
| [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md) | No `docs/` exists (greenfield) |
| [PHASE-03-AUDIT.md](PHASE-03-AUDIT.md) | `docs/` + `.vitepress/` both exist (aligned setup) |
| [PHASE-04-MIGRATE.md](PHASE-04-MIGRATE.md) | `docs/` exists, no `.vitepress/` (plain markdown to migrate) |
| [PHASE-05-VERIFY.md](PHASE-05-VERIFY.md) | After Phase 02 / 03 / 04 — boot the dev server briefly |
| [PHASE-06-COMMIT.md](PHASE-06-COMMIT.md) | Final phase — stage and commit |
| [PHASE-07-GLOSSARY-AUDIT.md](PHASE-07-GLOSSARY-AUDIT.md) | `bootstrap glossary` — standalone, skips the rest |

## Findings-only invocation

When another skill (e.g. `improve`'s survey) invokes this for audit-only: run [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md), then evaluate [PHASE-03-AUDIT.md](PHASE-03-AUDIT.md)'s mechanical and substantive checklists, plus the organisation checklist in `improve/aspects/docs.md` (forbidden files, missing `applies-to`, dead governed paths, undocumented subsystems, duplicate subsystem docs), as a **report instead of applying them** — each hit becomes a finding ("`config.ts` needs the `.mts` rename", "`checkout.md` has no `applies-to` and governs nothing"). Skip Phases 05–06 entirely. Return the findings structured (finding, evidence, strength, proposed fix). No file writes, no commits, no questions.

## When NOT to use this flow

- Project doesn't use Markdown for docs (Sphinx + RST, hosted platform). VitePress-specific.
- Docs live in a separate repo — run this flow there.
- User explicitly wants a different structure — note the deviation and exit.
