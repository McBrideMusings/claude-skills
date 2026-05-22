# Phase 05 — Populate PRD (Content Synthesis)

Synthesize the content of `docs/PRD.md` from the current conversation context. **Do NOT interview the user.** Different problem from `brainstorm` — that's where interviews happen.

## When this phase runs

- User invokes with content phrasing: "write the PRD", "draft the PRD", "fill out the PRD", "populate PRD.md", "PRD from context".
- Phase 02 finishes and the PRD.md it just stubbed is empty — offer to populate now.
- Phase 03 detects PRD.md exists but is empty / stub-only — offer to populate.
- Phase 04 finishes migration with an empty PRD — offer to populate.

## Stance

Synthesize **from conversation context.** If context is thin: tell the user *"Not enough context to synthesize. Run `/brainstorm` first, then come back."* Don't start a new interview from inside `docs`.

Read `docs/CONTEXT.md` for vocabulary if present; use those terms throughout. Respect ADRs in `docs/adr/` that touch the scope.

## Template

Each section is required. Leave a one-line `TBD — open question` placeholder if context truly doesn't cover that section.

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

No file paths or code snippets — they go stale. Exception: a prototype-produced snippet (state machine, reducer, schema, type shape) that encodes a decision more precisely than prose. Trim to the decision-rich parts.

## Testing Decisions
- What makes a good test here (behavior through public interface, not implementation details — see `/tdd`)
- Which modules to test
- Prior art for similar tests in this codebase, if any

## Out of Scope
{What this PRD deliberately doesn't cover.}

## Further Notes
{Anything else load-bearing for someone reading this cold.}
```

## If PRD.md already has content

If `docs/PRD.md` already has substantive content (more than a stub), ask before overwriting:

- **(a)** Overwrite with the synthesized version.
- **(b)** Append a new section to the existing PRD.
- **(c)** Write to `docs/PRD-{slug}.md` for a feature-scoped PRD.

Don't auto-create a parent issue. Optionally at the end: *"Want me to create a parent issue linking to this PRD?"* — but only offer once and don't insist.
