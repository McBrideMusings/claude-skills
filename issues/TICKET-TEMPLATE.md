# Issue Body Template

Use this for every slice published by `issues spec`. It doubles as a durable spec for AFK agents — file paths and line numbers go stale; types and behavior contracts don't.

```md
## Parent

A reference to the parent issue (omit if no parent).

## Category

bug | enhancement

## Summary

One-line description of what needs to happen.

## The request

The person's own words, quoted, with who and when: `Pierce (2026-10-29): "…"`. Nothing else goes
in this section. Words relayed by another session stay quoted as relayed; never paraphrase them.

## Current behavior

What happens now. For bugs: the broken behavior. For enhancements: the status quo this slice builds on.

## Desired behavior

What should happen after this slice is complete. Be specific about edge cases and error conditions.

## Key interfaces

- `TypeName` — what needs to change and why
- `functionName()` — what it currently returns vs what it should return
- Config shape — any new configuration options needed

Reference **types, function signatures, and behavioral contracts**. Do NOT reference file paths or line numbers — they go stale. Exception: a prototype-produced snippet (state machine, reducer, schema, type shape) that encodes a decision more precisely than prose. Trim to the decision-rich parts and note briefly that it came from a prototype.

## Visual acceptance

**Required for any slice that renders something a person looks at. Omit the section entirely otherwise — don't leave it empty.**

**Reference comp:** dsys ref `<ref>` (as printed by `dsys refs add`) — the comp this slice is built against. `dsys refs get <ref>` writes the PNG to scratch.

**States** — every one this slice must handle, by name:

- `empty` — what shows before any data exists
- `loading` — what shows while fetching
- `error-<condition>` — one entry per distinct failure
- `populated` — the normal case

**Copy** — verbatim, in quotes. `"No sessions yet"`, not "an empty-state message".

**Spacing, color, type** — token names from the design system, never pixel or hex values. `--space-4`, `--color-danger`, `text-sm`. A raw value here is a value that drifts from the system the moment the system changes.

**Interaction** — what changes on each event, stated as a transition: *"pressing Retry moves `error-network` → `loading`"*. One line per event.

Everything above is checkable by looking. "Matches the mockup", "feels responsive", and "looks clean" are not — they're the phrases this section exists to replace.

## Cases

1. A specific, testable case, ending with the phrase from **The request** it comes from: `— "anywhere in the window"`
2. …

Every case traces to a quoted phrase in **The request**: each place an "anywhere" reaches, each
item an "every" or "all" names, and each state (the empty one included). A case
the filer thinks of that the words do not cover is not a case: it goes under **Filer's notes**.
These numbered lines are what `implement` drives and what `swarm log landed` checks against the
worker's `## Cases` table, so number them and keep one case per line.

Each case is independently verifiable. "Triage should work correctly" is not testable; "Running `gh issue list --label needs-triage` returns issues that have been classified" is.

For a UI slice, at least one case names a state from Visual acceptance above and says how it's verified — the command that renders it, and what a pass looks like.

## Filer's notes (not cases)

What the filer adds that the person did not say: a suggested design, a platform or surface the
words do not name, related work. Nothing here is checked, and nothing here is built unless the
person confirms it.

## Out of scope

- Things that should NOT be changed in this slice
- Adjacent features that might seem related but are separate

## Blocked by

- Reference to blocking issue (or "None — can start immediately")
```
