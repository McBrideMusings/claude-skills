# Issue Body Template

Use this for every slice published by `to-tickets`. It doubles as a durable spec for AFK agents — file paths and line numbers go stale; types and behavior contracts don't.

```md
## Parent

A reference to the parent issue (omit if no parent).

## Category

bug | enhancement

## Summary

One-line description of what needs to happen.

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

**Reference frame:** `docs/spikes/<slug>/<state>.png` — the frame this slice is built against, plus `docs/spikes/<slug>/index.html` for the clickable version.

**States** — every one this slice must handle, by name:

- `empty` — what shows before any data exists
- `loading` — what shows while fetching
- `error-<condition>` — one entry per distinct failure
- `populated` — the normal case

**Copy** — verbatim, in quotes. `"No sessions yet"`, not "an empty-state message".

**Spacing, color, type** — token names from the design system, never pixel or hex values. `--space-4`, `--color-danger`, `text-sm`. A raw value here is a value that drifts from the system the moment the system changes.

**Interaction** — what changes on each event, stated as a transition: *"pressing Retry moves `error-network` → `loading`"*. One line per event.

Everything above is checkable by looking. "Matches the mockup", "feels responsive", and "looks clean" are not — they're the phrases this section exists to replace.

## Acceptance criteria

- [ ] Specific, testable criterion 1
- [ ] Specific, testable criterion 2
- [ ] Specific, testable criterion 3

Each criterion is independently verifiable. "Triage should work correctly" is not testable; "Running `gh issue list --label needs-triage` returns issues that have been classified" is.

For a UI slice, at least one criterion names a state from Visual acceptance above and says how it's verified — the command that renders it, and what a pass looks like.

## Out of scope

- Things that should NOT be changed in this slice
- Adjacent features that might seem related but are separate

## Blocked by

- Reference to blocking issue (or "None — can start immediately")
```
