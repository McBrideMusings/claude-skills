---
name: docs
description: "Docs are the standing assumption. Load for a decision worth recording, a new term, documenting a subsystem, or to bootstrap/audit/migrate the docs site."
user_invocable: true
---

# /docs — Project Documentation

**Every repo keeps `docs/CONTEXT.md`, `docs/adr/`, and subsystem docs.** This is not a
finding to make about a repo — it is true of every repo, the same way `issues/SKILL.md` says
beads is the assumption for issue tracking. Every session proposes entries as slate rows the
turn they arise, never writes them silently, and never waits for an audit to notice they're
missing. A repo that genuinely cannot carry part of this says so in its `CLAUDE.local.md`
under a `## Docs` section — no label, no injected line, nothing else grants the exemption.

Beyond that standing background, this skill also owns walking a project from "no docs" to
"VitePress docs site wired into admin + CLAUDE.md", or auditing/migrating an existing one. That
flow is **phased**: detect state, branch to one of Bootstrap / Audit / Migrate, then verify and
commit.

## Standing rules (any session)

These three apply everywhere, in any skill, not only while this skill's phases are running —
load the linked format file when you need the detail, but the rule itself must be reachable in
one hop the turn it's needed.

- **Vocabulary.** A term is a slate row (term, the one-line definition as it will be written,
  displaced aliases, where it's already used) before it reaches `docs/CONTEXT.md` — the write
  happens on `go`, never inline mid-conversation. A changed definition shows `From:` and `To:`
  in full. Audit with `/docs glossary`. Format: [CONTEXT-FORMAT.md](CONTEXT-FORMAT.md).
- **ADR.** The three-conditions test (hard to reverse, surprising without context, a real
  trade-off) applies in any session, not only an interview. A passing decision is a slate row
  the turn it's made, **carrying the full proposed body — and for a change, the current body
  beside it**. **ADRs are never amended:** git holds the history, the file holds only what is
  true now, and any ADR carrying an amendment, a date-stamped revision, a ticket id or more
  than 15 lines gets rewritten the turn you open it. Format: [ADR-FORMAT.md](ADR-FORMAT.md).
- **Subsystem.** A subsystem that crosses a process/host/service boundary (or is the project's
  main job), can't be reconstructed from one file, and carries an invariant or ordering a
  reader would get wrong, is a slate row proposing `docs/<name>.md` — offered the turn it's
  created or first meets the test, never a batch audit. Format:
  [SUBSYSTEM-FORMAT.md](SUBSYSTEM-FORMAT.md).

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

Files this skill reads / writes: `package.json`, `admin.toml`, `CLAUDE.md`, `.gitignore`, anything under `docs/`, this skill.

## Phases

The skill is one ordered workflow. Read [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md) first; it routes to the right downstream phase based on what it finds.

| File | Run when |
|---|---|
| [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md) | Always — first |
| [PHASE-02-BOOTSTRAP.md](PHASE-02-BOOTSTRAP.md) | No `docs/` exists (greenfield) |
| [PHASE-03-AUDIT.md](PHASE-03-AUDIT.md) | `docs/` + `.vitepress/` both exist (aligned setup) |
| [PHASE-04-MIGRATE.md](PHASE-04-MIGRATE.md) | `docs/` exists, no `.vitepress/` (plain markdown to migrate) |
| [PHASE-05-VERIFY.md](PHASE-05-VERIFY.md) | After Phase 02 / 03 / 04 — boot the dev server briefly |
| [PHASE-06-COMMIT.md](PHASE-06-COMMIT.md) | Final phase — stage and commit |
| [PHASE-07-GLOSSARY-AUDIT.md](PHASE-07-GLOSSARY-AUDIT.md) | `/docs glossary` — standalone, skips the rest |

## Findings-only invocation

When another skill (e.g. `improve`'s survey) invokes this for audit-only: run [PHASE-01-STATE-DETECTION.md](PHASE-01-STATE-DETECTION.md), then evaluate [PHASE-03-AUDIT.md](PHASE-03-AUDIT.md)'s mechanical and substantive checklists, plus the organisation checklist in `improve/aspects/docs.md` (forbidden files, missing `applies-to`, dead governed paths, undocumented subsystems, duplicate subsystem docs), as a **report instead of applying them** — each hit becomes a finding ("`config.ts` needs the `.mts` rename", "`checkout.md` has no `applies-to` and governs nothing"). Skip Phases 05–06 entirely. Return the findings structured (finding, evidence, strength, proposed fix). No file writes, no commits, no questions.

## When NOT to use this skill

- Project doesn't use Markdown for docs (Sphinx + RST, hosted platform). VitePress-specific.
- Docs live in a separate repo — run this skill there.
- User explicitly wants a different structure — note the deviation and exit.
