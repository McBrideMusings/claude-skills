---
name: to-spec
description: "Synthesize the current conversation into a product spec written to docs/PRD.md — no interview, just synthesis of what's already been discussed. The single owner of spec/PRD generation; docs and grill-me delegate here. Hands off to /to-tickets."
user_invocable: true
---

# /to-spec — Conversation → spec (PRD.md)

Take the current conversation and codebase understanding and produce a **spec** (the durable product document; you may know it as a PRD), written to `docs/PRD.md`. **This is the single owner of spec generation** — `docs` and `grill-me` delegate here rather than synthesizing themselves.

**Do NOT interview the user.** Just synthesize what's already been discussed. Interviewing is `grill-me`'s job; by the time you reach `to-spec`, that thinking is done and lives in the conversation.

Normal place in the pipeline: `grill-me` → **`to-spec`** → `to-tickets` → `implement`. (`iron-out` also exits here once a foggy effort's questions are all answered; its `to-tickets` output lands back on the same milestone.)

## Stance

Synthesize **from conversation context.** If context is thin — there isn't enough discussed to write a real spec — stop and say: *"Not enough context to synthesize a spec. Run `/grill-me` first, then come back."* Never start a fresh interview from inside `to-spec`.

Read `docs/CONTEXT.md` for vocabulary if present and use those terms throughout. Respect ADRs in `docs/adr/` that touch the scope. Explore the repo first if you haven't, so the spec reflects the real current state.

## Template

Each section is required. Leave a one-line `TBD — open question` placeholder only if context truly doesn't cover it.

```md
# {Project} PRD

## Problem Statement
{The problem from the user's perspective. One paragraph.}

## Solution
{The solution from the user's perspective. One paragraph.}

## User Stories
1. As <actor>, I want <feature>, so that <benefit>
2. ...

(Numbered. Extensive — cover every aspect of the feature. Use the format above; don't paraphrase.)

## Implementation Decisions
- Modules built/modified (use `docs/CONTEXT.md` vocabulary)
- Interfaces affected
- Schema changes, API contracts, architectural decisions

No file paths or code snippets — they go stale. Exception: a type/interface signature, component tree, or call-stack diff (see `../_plan-format.md`) that encodes a decision more precisely than prose — whether it came from a prototype run or was sketched fresh for the spec. Trim to the decision-rich parts.

## Testing Decisions
- What makes a good test here (behavior through public interface, not implementation details — see `/tdd`)
- Which modules to test
- Prior art for similar tests in this codebase, if any

## Out of Scope
{What this spec deliberately doesn't cover.}

## Further Notes
{Anything else load-bearing for someone reading this cold.}
```

## Sketch the seams (one confirmation)

Before finalizing, sketch the **seams** — the public boundaries this feature will be tested at, ideally just one. Prefer existing seams to new ones; use the highest seam possible; the fewer across the codebase, the better. Confirm them in a single question — *"Planning to test this at [seam(s)] — does that match what you had in mind?"* One targeted confirmation, not an interview — then write the Testing Decisions section to match.

## If docs/PRD.md already has content

If `docs/PRD.md` already holds substantive content (more than a stub), ask before overwriting:

- **(a)** Overwrite with the synthesized version.
- **(b)** Append a new section to the existing PRD.
- **(c)** Write to `docs/PRD-{slug}.md` for a feature-scoped spec.

If there's no `docs/` directory yet, write `docs/PRD.md` (create `docs/`); mention that `/docs` can later wire it into a VitePress site.

## Hand off

The spec is the input to slicing. When it's written, tell the user the path (on its own line, no trailing punctuation, so it stays Ghostty-clickable) and name the next step — **run `/to-tickets`** to break the spec into tracer-bullet tickets. Do not auto-invoke it. Don't auto-create a parent issue; optionally offer once — *"Want a parent issue linking to this spec?"* — and don't insist.
