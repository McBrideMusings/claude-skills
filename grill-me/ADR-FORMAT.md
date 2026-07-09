# ADR Format

ADRs live in `docs/adr/` with sequential numbering: `0001-slug.md`, `0002-slug.md`, etc.

Create `docs/adr/` lazily — only when the first ADR is needed.

## Template

```md
# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}
```

That's it. An ADR can be a single paragraph. The value is in recording **that** a decision was made and **why** — not in filling out sections.

## Optional sections

Only when they add genuine value. Most ADRs won't need them.

- **Status** frontmatter (`proposed | accepted | deprecated | superseded by ADR-NNNN`) — useful when decisions are revisited
- **Considered Options** — only when rejected alternatives are worth remembering
- **Consequences** — only when non-obvious downstream effects need to be called out

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
python3 ~/.claude/tools/docs-refs.py src/checkout/timeout.py   # ADRs governing a path
python3 ~/.claude/tools/docs-refs.py                           # full map
```

Projects wired by `bootstrap` expose the same thing as `admin docs-refs <path>`.

Add `applies-to` only when the ADR is genuinely path-scoped. A repo-wide decision ("we use a monorepo") stays unscoped — leave the frontmatter off.

## When to offer an ADR

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
