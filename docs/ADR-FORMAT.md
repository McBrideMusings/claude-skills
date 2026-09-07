# ADR Format

`docs/adr/NNNN-slug.md`, numbered sequentially — scan the directory for the highest number
and increment. Create `docs/adr/` when the first ADR is needed.

## What an ADR is

A title and the decision, stated as what is true. Present tense, no preamble.

```md
# ADR-0007: Sessions live in Redis

Session state is written to Redis with a 30-minute TTL. The app servers hold no session
data and any of them can serve any request.
```

**Three sentences is the target and fifteen lines is the ceiling**, including any code or
table the decision cannot be stated without.

## Write what, never why

An ADR records the decision. It does not argue for it, weigh it, or defend it.

No **Rejected** or **Considered Options** section — naming an idea keeps it alive, and the
next reader inherits every bad option the last one thought of. No **Consequences**, no
**Why**, no **Context** preamble, no **Status** field, no date, no ticket id, no author.

Each fact appears exactly once. A "Decision" heading above a decision, or a summary
restating the paragraph under it, is a second copy — cut the heading and keep the sentence.
An ADR under fifteen lines needs no headings at all.

Cross-reference another ADR only where the decision is unreadable without it, by number and
in the sentence. Never a section listing relationships.

## Git is the history

The file states what is true now. `git log -p docs/adr/` states what it used to say.

A decision that reverses an earlier one is rewritten in place, reading as though it had
always said that. A new ADR is for a new subject, never for a changed answer.

## Rewrite on sight

Any ADR you open — whatever you opened it for — gets rewritten when it carries an amendment
or date-stamped block, a ticket id, a sha, a retold incident, a rejected-alternatives list,
a justification, a body over fifteen lines, or two passages that disagree.

Rewrite it the turn you notice: state the decision in its own voice, delete the rest.

## Show it before writing it

Creating or changing an ADR is a slate row carrying the real text, in chat, before any file
is touched:

- **`**Currently:**`** — the existing body in full, when there is one
- **`**Proposed:**`** — the new body in full

**Both go in markdown blockquotes — every line prefixed with `> `.** An ADR contains fenced
blocks, and a fence inside a fence closes the outer one early, leaving the reader unable to
see where the document starts or stops. A `> ` prefix is per-line and the content cannot
close it.

Show the current version whole, however long. Its length is the case for the rewrite.

**Waived only by the user, for a named batch.** When they have said to rewrite a set without
being asked, the slate is skipped for exactly that set and the pass reports what it changed
afterwards instead. A dispatched pass carries the waiver in its own brief — an agent never
infers one, and a brief that both cites this file and omits the waiver means the slate
stands.

## Linking an ADR to code (`applies-to`)

Optional. When an ADR governs specific paths, declare them in frontmatter:

```md
---
applies-to: ["src/checkout/**", "**/*.sql"]
---
```

This builds the reverse map — which decisions constrain this file — that ripgrep cannot
answer. Query it with `python3 ~/.claude/tools/docs-refs.py <path>`; bare prints the full
map, `--validate` exits non-zero on globs matching no tracked file. The same tool reads
`_applies-to_` markers on `docs/CONTEXT.md` terms (`CONTEXT-FORMAT.md`). Projects wired by
`bootstrap` expose these as `admin docs-refs <path>` and `admin docs-validate`.

A repo-wide decision stays unscoped — leave the frontmatter off.

## When to offer an ADR

This test runs in any session — architecture work, implementation, a code review, a decision
made in passing. A qualifying decision becomes a slate row the turn it is made.

All three must hold:

1. **Hard to reverse** — changing your mind later carries real cost
2. **Surprising without context** — a future reader will wonder why it was done this way
3. **A real trade-off** — genuine alternatives existed

Easy to reverse, and you will just reverse it. Unsurprising, and nobody wonders. No
alternative, and there is nothing to record.

What qualifies: architectural shape (monorepo, event-sourced writes), integration patterns
between contexts, technology choices carrying lock-in, ownership and scope boundaries,
deliberate deviations from the obvious path, and constraints invisible in the code
(compliance, a partner API's latency ceiling).
