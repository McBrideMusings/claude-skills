# Out-of-Scope Knowledge Base

`<repo-root>/.out-of-scope/` stores persistent records of previously-rejected feature requests. Two purposes:

1. **Institutional memory** — why a feature was rejected, so the reasoning isn't lost when the issue closes or goes stale.
2. **Deduplication** — a new issue matching a prior rejection surfaces the previous decision instead of re-litigating it from scratch.

## Directory structure

One file per **concept**, not per issue — multiple issues requesting the same thing group under one file:

```
.out-of-scope/
├── dark-mode.md
├── plugin-system.md
└── graphql-api.md
```

## File format

Readable prose, not a database entry — code samples and examples where they clarify the reasoning:

```markdown
# Dark Mode

This project does not support dark mode or user-facing theming.

## Why this is out of scope

The rendering pipeline assumes a single color palette defined in
`ThemeConfig`. Supporting multiple themes would require a theme context
provider, per-component theme-aware style resolution, and a persistence
layer for user preferences — a significant architectural change that
doesn't align with the project's focus.

## Prior requests

- #42 — "Add dark mode support"
- #87 — "Night theme for accessibility"
```

Name the file with a short, recognizable kebab-case concept name. The reason should be substantive and durable — "this conflicts with the single-palette `ThemeConfig` architecture," not "we're too busy right now" (that's a deferral, not a rejection, and doesn't belong here).

## When to check it

During Phase 07 (before presenting the recommendation), check the top pick and "also worth attention" items against every file in `.out-of-scope/`. Matching is by **concept similarity, not keyword** — "night theme" matches `dark-mode.md`. On a match, surface it in the presentation: "This is similar to `.out-of-scope/dark-mode.md` — rejected before because [reason]. Still feel the same way?" Let the user confirm (drop the candidate, promote the next one), reconsider (delete/update the file, proceed with normal triage), or disagree (related but distinct — proceed normally).

## When to write to it

Only when the user rejects a candidate item with a durable, substantive reason during Phase 08 selection — not when they simply pick something else this session. Check for a matching file first; append to its "Prior requests" list if one exists, otherwise create a new file with the concept name, reasoning, and first prior request.

Don't write here for something dropped because it's **already implemented** — that's a redundancy finding, not a rejection, and recording it here would poison future dedup checks with a false rejection.
