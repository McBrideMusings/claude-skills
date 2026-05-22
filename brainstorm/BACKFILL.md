# Backfill Mode

Backfill is the "we already built it, now let's capture what we learned" pattern. Different starting state from Grill / Shape because you're discovering what's *already true* in the code, not designing what *should be* true. Typically triggered by `bootstrap` after an audit on an existing project, or invoked directly when joining a project mid-stream.

The interview mechanic (one question at a time, recommend an answer) is the same as Grill / Shape — only the starting state differs.

## Recon first (sub-agent)

Spawn a Sonnet sub-agent via the Agent tool to walk the codebase and surface candidates. Brief:

> "Walk this codebase. Return a structured report with three sections:
>
> 1. **Vocabulary candidates** — terms that appear in module names, type names, function names, and comments. For each: (a) how it's used, (b) whether usage is consistent across the codebase, (c) whether multiple names refer to the same concept (divergences).
> 2. **Conventions visible in code** — load-bearing patterns: file organization, naming, error handling style, async style, dependency direction, test patterns. Cite 2–3 file:line examples per convention.
> 3. **Decisions implicit in the code** — anything that looks like the result of a deliberate trade-off: tech choices (database, framework, ORM-vs-raw-SQL), architectural shape (layered / hexagonal / event-sourced), boundary decisions (which module owns what data). For each: visible-from-code-alone, or requires user to confirm intent?
>
> Format: per-item with file:line citations. Under 1500 words."

Keep the raw code reads in the sub-agent's context; the parent gets a compact report.

## Walk findings one question at a time

For each item in the report, ask the user to confirm / refine / reject. Recommend an answer. Capture inline as the user answers.

### Vocabulary that looks settled

> "I see `Order` used 47 times consistently across the API layer, domain types, and tests. Capture as a canonical term in `docs/CONTEXT.md`?"

Default: yes. One question per term.

### Divergences

> "You call this both `Customer` (12 uses) and `Account` (8 uses) — `Customer` in newer code, `Account` in `legacy/`. Which is canonical going forward?"

Then capture the chosen term and list the other as `_Avoid_:` per [CONTEXT-FORMAT.md](CONTEXT-FORMAT.md).

### Conventions

> "All async I/O uses `await`-style; I see no callback APIs. Capture as a convention?"

Most conventions belong in `CLAUDE.md`, not `docs/CONTEXT.md`. CONTEXT is for vocabulary, not coding style. Use judgment.

### Implicit decisions

> "You're using Postgres for the write model and Redis for read caching, with explicit `outbox` table for event publishing. Looks like a deliberate event-sourced-write / cached-read split — was this a real decision? Worth an ADR?"

Apply the three-conditions test from [ADR-FORMAT.md](ADR-FORMAT.md). Don't manufacture ADRs from accidental code shapes.

## Don't fabricate

If the recon flags something that looks deliberate but might be accidental (one isolated use of SHA-1 hashing, a single class using callbacks while everywhere else uses async / await), ask before recording. *"You have one place using X — is this deliberate, an oversight, or migration debris?"* Capture the answer, not the assumption.

## Terminal state

`docs/CONTEXT.md` reflects the language actually in use across the codebase. `docs/adr/` reflects load-bearing decisions visible in the code (or explicitly confirmed by the user). Same artifacts as the other modes; reached by walking backward through existing reality instead of forward through a design.
