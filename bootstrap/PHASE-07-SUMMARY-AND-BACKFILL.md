# Phase 07 — Summary + Backfill Offer

Report results, optionally offer a backfill brainstorm, **don't** commit.

## Result table

Mirror the Phase 01 audit table with the action taken per row:

```
Bootstrap result — <project name>

| Piece                  | Before                          | After                         |
|---|---|---|
| CLAUDE.md              | missing                         | created via /init             |
| .claude/CLAUDE.local.md| non-standard at ./CLAUDE.local.md| migrated + .gitignore updated|
| admin runner           | Makefile present, no admin.toml | deferred — run /admin         |
| VitePress docs         | bare docs/                      | migrated to VitePress         |
| docs/CONTEXT.md        | non-standard at ./CONTEXT.md    | migrated + refs updated       |
| docs/adr/              | non-standard at ./decisions/    | migrated (3 files renumbered) |
| docs/PRD.md            | non-standard, substantive       | migrated; restructure offered |
| docs/ROADMAP.md        | missing                         | stub created                  |
| Issue tracker          | gh ok                           | no-op                         |
```

Note deferred decisions:

- *"PRD migrated but format differs from standard — run `/docs` for restructuring offer."*
- *"Run `/admin` to wrap Makefile as admin.toml."*

## Offer Backfill brainstorm

If the audit found existing artifacts being migrated (this wasn't a greenfield bootstrap) **and** the project has substantive code already, offer:

> *"This project already has code and was migrating existing docs. Want to run `/brainstorm` in Backfill mode to retroactively capture vocabulary and decisions from the existing codebase? It'll walk through what's in the code, surface divergent terms, and ask you to confirm / reject — populating `docs/CONTEXT.md` and `docs/adr/` as you go."*

**Don't offer when:**

- This was a true greenfield bootstrap (no existing code beyond a few stubs).
- The user opened with "skip docs" / "don't worry about docs".
- The migrations already populated `docs/CONTEXT.md` and ADRs from existing files.

The user can accept (parent invokes `/brainstorm` — brainstorm picks Backfill mode automatically because the codebase exists), or defer.

## Don't commit

Migrations stage file moves and content changes. The user reviews and commits. Mention the working tree is dirty.
