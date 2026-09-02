# CONTEXT.md Format

`docs/CONTEXT.md` is the single source of truth for **all project vocabulary** — domain terms (Order, Customer, Channel) AND architectural terms (Module, Seam, Adapter, Depth, Leverage, Locality). Other skills (`improve`, `diagnose`, `tdd`) read from it.

Create lazily — only when the first term is resolved. If the file doesn't exist when needed, create `docs/CONTEXT.md` then.

## Structure

```md
# {Project Name}

{One or two sentence description of what this project is.}

## Language

### Domain

**Order**:
{A concise description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account

### Architecture

**Module**:
Anything with an interface and an implementation (function, class, package, slice).

**Interface**:
Everything a caller must know to use the module — types, invariants, error modes, ordering, config. Not just the type signature.

**Seam**:
Where an interface lives — a place behaviour can be altered without editing in place.
_Avoid_: boundary, API surface

**Adapter**:
A concrete thing satisfying an interface at a seam.

**Deep / Shallow**:
A module is **deep** when a lot of behaviour sits behind a small interface (high leverage). **Shallow** when the interface is nearly as complex as the implementation.

## Relationships

- An **Order** produces one or more **Invoices**
- An **Invoice** belongs to exactly one **Customer**

## Example dialogue

> **Dev:** "When a **Customer** places an **Order**, do we create the **Invoice** immediately?"
> **Domain expert:** "No — an **Invoice** is only generated once a **Fulfillment** is confirmed."

## Flagged ambiguities

- "account" was used to mean both **Customer** and **User** — resolved: these are distinct concepts.
```

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others as aliases to avoid.
- **Flag conflicts explicitly.** If a term is used ambiguously, call it out in "Flagged ambiguities" with a clear resolution.
- **Keep definitions tight.** One sentence max. Define what it IS, not what it does.
- **Show relationships.** Bold term names, express cardinality where obvious.
- **Only include terms specific to this project's context.** General programming concepts (timeouts, error types, utility patterns) don't belong even if the project uses them extensively. The exception is the architectural vocabulary section, which is seeded by `improve` to keep arch terms consistent across audits.
- **Group terms under subheadings** when natural clusters emerge. The Domain / Architecture split is the default; further sub-clusters fine when there are many terms.
- **Write an example dialogue.** A short conversation that demonstrates how the terms interact naturally and clarifies boundaries between related concepts.

## Linking a term to code (`_applies-to_`)

Optional, opt-in per term. When a term names a concept that lives in specific parts of the tree, add an `_applies-to_` marker line — sibling to the `_Avoid_` line — with glob(s):

```md
**Channel**:
A stream of ordered events for one topic.
_Avoid_: Topic, feed
_applies-to_: src/channels/**, "**/*.channel.ts"
```

This feeds the same reverse map as ADR `applies-to` frontmatter, so `docs-refs src/channels/bus.py` surfaces both the governing ADRs and the governing terms. The lookup is `~/.claude/tools/docs-refs.py` (scans `docs/adr/*.md` and every `CONTEXT.md` live — no index).

Most terms stay unscoped. Add `_applies-to_` only when a term maps cleanly to code; don't force a glob onto an abstract domain word.

## Single vs multi-context repos

**Single context (most repos):** one `docs/CONTEXT.md`.

**Multiple bounded contexts:** a `docs/CONTEXT-MAP.md` lists each context and where it lives:

```md
# Context Map

## Contexts

- [Ordering](./ordering/CONTEXT.md) — receives and tracks customer orders
- [Billing](./billing/CONTEXT.md) — generates invoices and processes payments

## Relationships

- **Ordering → Fulfillment**: Ordering emits `OrderPlaced` events; Fulfillment consumes them to start picking
- **Ordering ↔ Billing**: Shared types for `CustomerId` and `Money`
```

Inference:

- If `docs/CONTEXT-MAP.md` exists → multi-context; read it to find per-context CONTEXT.md files
- If only `docs/CONTEXT.md` exists → single context
- If neither exists → create `docs/CONTEXT.md` lazily when the first term resolves
