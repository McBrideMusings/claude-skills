---
name: to-spec
description: "Synthesize the current conversation into a durable product spec written to docs/PRD.md — no interview, just synthesis of what's already been discussed. Use when the repo wants a committed PRD; docs and grill-me delegate here. Slicing work into tickets is /to-tickets, which synthesizes its own spec and does not need this one."
user_invocable: true
---

# /to-spec — Conversation → committed PRD

Take the current conversation and codebase understanding and produce a **durable product
spec**, written to `docs/PRD.md` and committed with the repo.

**Do NOT interview the user.** Just synthesize what's already been discussed. Interviewing is
`grill-me`'s job; by the time you reach `to-spec`, that thinking is done and lives in the
conversation.

## When this skill is the right one

`to-spec` exists for the case where the **document itself is the deliverable** — a PRD that
lives in `docs/`, gets published to the VitePress site, and is read months later by someone
who wasn't in the session.

**It is not a required step before `to-tickets`.** `to-tickets` synthesizes its own spec from
the same template as Phase 03 of its own run, keeps it in scratch, and slices from it. If the
goal is tickets, go straight there — routing through here just commits a document nobody
reads.

| The user wants | Skill |
| --- | --- |
| a committed PRD in `docs/` | **`to-spec`** |
| tickets on the tracker | `to-tickets` |
| both | `to-spec`, then `to-tickets` (which will reuse the PRD rather than re-synthesize) |

## Stance

Synthesize **from conversation context.** If context is thin — there isn't enough discussed to
write a real spec — stop and say: *"Not enough context to synthesize a spec. Run `/grill-me`
first, then come back."* Never start a fresh interview from inside `to-spec`.

## Template

The spec's shape, the no-file-paths rule, and the seams confirmation all live in
[SPEC-TEMPLATE.md](SPEC-TEMPLATE.md). Read it and follow it — `to-tickets` reads the same file,
so the two stay in step.

## If docs/PRD.md already has content

If `docs/PRD.md` already holds substantive content (more than a stub), ask before overwriting:

- **(a)** Overwrite with the synthesized version.
- **(b)** Append a new section to the existing PRD.
- **(c)** Write to `docs/PRD-{slug}.md` for a feature-scoped spec.

If there's no `docs/` directory yet, write `docs/PRD.md` (create `docs/`); mention that `/docs`
can later wire it into a VitePress site.

## Finish

Tell the user the full absolute path on its own line, with no trailing punctuation, so it stays
Ghostty-clickable. Then stop.

Don't name `/to-tickets` as a required next step — it isn't one. If the user asks for tickets
next, `to-tickets` will pick up `docs/PRD.md` as its source and skip its own synthesis phase.
Don't auto-create a parent issue; optionally offer once — *"Want a parent issue linking to this
spec?"* — and don't insist.
