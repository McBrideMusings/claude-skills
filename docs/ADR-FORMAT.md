# ADR Format

ADRs live in `docs/adr/` with sequential numbering: `0001-slug.md`, `0002-slug.md`, etc.

Create `docs/adr/` lazily — only when the first ADR is needed.

## Template

```md
# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}
```

That's it. An ADR is a paragraph. The value is recording **that** a decision was made and
**why** — not filling out sections.

## The head of git is the only version

**Never amend an ADR.** No "Amendment" block, no date-stamped revision, no "withdrawn", no
old wording left standing beside the new. Git is the history: `git log -p docs/adr/` answers
what an ADR used to say, and the file answers only what is true now.

A decision that reverses an earlier one is written as if it had always been the decision.
Rewrite the existing ADR in place. Write a *new* ADR only when the subject is new — never
because the answer changed.

## Rewrite on sight

Any ADR you open — whether or not it is what you came for — gets rewritten when it shows
any of:

- an "Amendment", "Update", "Revised", "Superseded" or date-stamped block
- a ticket id, a sha, or a retold incident
- a body over 15 lines, or over three paragraphs
- two passages that disagree with each other

Rewriting means: state the current decision in its own voice and delete the rest. This
happens the turn you notice, not in a later audit.

## Every ADR write is shown before it lands

Creating or changing an ADR is a slate row carrying the real text, in chat:

- **new** — the full proposed body
- **changed** — the current body and the proposed body, both in full, labelled `From:` and `To:`

Never write a file under `docs/adr/` before that row is accepted. The files are short by
construction, so showing one whole costs nothing and "it's a small edit" is not an exemption.

## Optional sections

Only when they add genuine value, and never at the cost of the 15-line ceiling.

- **Considered Options** — one line per rejected alternative, when the rejection is what a
  reader would otherwise re-litigate
- **Consequences** — when a downstream effect is non-obvious

No **Status** field. A deprecated decision is deleted; a superseded one is rewritten.

## Numbering

Scan `docs/adr/` for the highest existing number; increment by one.

## Linking an ADR to code (`applies-to`)

Optional. When an ADR governs specific parts of the tree, declare the paths in frontmatter as glob(s):

```md
---
applies-to: ["src/checkout/**", "src/index/**"]
---
# Local-first index

We index locally so the wiki works offline and reviews in Git.
```

Block-list form also works:

```md
---
applies-to:
  - src/checkout/**
  - "**/*.sql"
---
```

This builds a reverse map — "which decisions constrain this file?" — that ripgrep can't answer. Query it with the shared script (no index, scans `docs/adr/*.md` live):

```
python3 ~/.claude/tools/docs-refs.py src/checkout/timeout.py   # ADRs + terms governing a path
python3 ~/.claude/tools/docs-refs.py                           # full map
python3 ~/.claude/tools/docs-refs.py --validate               # flag globs matching no tracked files
```

The same tool also reads `_applies-to_` markers on `docs/CONTEXT.md` terms (format: `CONTEXT-FORMAT.md`). `--validate` exits non-zero when any `applies-to` glob points at deleted/moved paths. Projects wired by `bootstrap` expose these as `admin docs-refs <path>` and `admin docs-validate`.

Add `applies-to` only when the ADR is genuinely path-scoped. A repo-wide decision ("we use a monorepo") stays unscoped — leave the frontmatter off.

## When to offer an ADR

This test applies in **any** session, not only a `grill-me` interview — architecture work,
implementation, a code review, a stray decision made in passing. A passing decision becomes a
slate row the turn it is made, not a batch swept up later.

All three must be true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will look at the code and wonder "why on earth did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives; you picked one for specific reasons

If a decision is easy to reverse, skip it — you'll just reverse it. If it's not surprising, nobody will wonder why. If there was no real alternative, there's nothing to record beyond "we did the obvious thing."

### What qualifies

- **Architectural shape.** "We're using a monorepo." "The write model is event-sourced, the read model is projected into Postgres."
- **Integration patterns between contexts.** "Ordering and Billing communicate via domain events, not synchronous HTTP."
- **Technology choices that carry lock-in.** Database, message bus, auth provider, deployment target. Not every library — only ones that would take a quarter to swap.
- **Boundary and scope decisions.** "Customer data is owned by the Customer context; other contexts reference by ID only." The explicit no's are as valuable as the yes's.
- **Deliberate deviations from the obvious path.** "Manual SQL instead of an ORM because X." Anything where a reasonable reader would assume the opposite — stops the next engineer from "fixing" something deliberate.
- **Constraints not visible in the code.** "Can't use AWS because compliance." "Response times must be under 200ms because of the partner API contract."
- **Rejected alternatives when the rejection is non-obvious.** Considered GraphQL and picked REST for subtle reasons? Record it — otherwise someone suggests GraphQL again in six months.
