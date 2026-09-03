# Spec template

The shape of the spec `backlog spec` Phase 03 synthesizes before slicing. It is written to
scratch and thrown away; its text becomes the run epic's body (beads) or the run milestone's
description (GitHub), published in Phase 06 — or, when the slate is a single slice with no
epic, the `## Spec` section prepended to that ticket's body in Phase 07.

Every section is required. Leave a one-line `TBD — open question` placeholder only if the
conversation truly doesn't cover it.

```md
# {Project} Spec

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

## Testing Decisions
- What makes a good test here (behavior through public interface, not implementation details — see `/tdd`)
- Which modules to test
- Prior art for similar tests in this codebase, if any

## Out of Scope
{What this spec deliberately doesn't cover.}

## Further Notes
{Anything else load-bearing for someone reading this cold.}
```

## No file paths or code snippets

They go stale. Describe interfaces and contracts instead.

Exception: a type/interface signature, component tree, or call-stack diff (see
[`../show-shape/SKILL.md`](../show-shape/SKILL.md)) that encodes a decision more precisely
than prose — whether it came from a prototype run or was sketched fresh. Trim to the
decision-rich parts.

## Sketch the seams (one confirmation)

Before finalizing, sketch the **seams** — the public boundaries this feature will be tested
at, ideally just one. Prefer existing seams to new ones; use the highest seam possible; the
fewer across the codebase, the better.

Confirm them in a single question — *"Planning to test this at [seam(s)] — does that match
what you had in mind?"* One targeted confirmation, not an interview. Then write the Testing
Decisions section to match.

## Vocabulary

Read `docs/CONTEXT.md` if present and use those terms throughout. Respect ADRs in
`docs/adr/` that touch the scope. Explore the repo first, so the spec reflects the real
current state.
