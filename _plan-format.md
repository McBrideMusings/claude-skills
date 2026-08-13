# `_plan-format.md` — structured pseudocode for plans and proposals

Not a skill (leading `_`, no `SKILL.md`). A shared reference for how to *write down* an implementation
plan, a PRD's Implementation Decisions section, an `improve` proposed fix, or an `explain`
architecture-change note — so it reads as the shape of the code, not a description of it.

**Plain markdown only.** No HTML, no Monodraw, no rendered SVG/mermaid. Every technique below is a
fenced text block anyone can read in a terminal or a chat pane.

## When to reach for this

Use it when the shape carries information prose can't compress: what calls what, what a type looks
like, what moves where. Skip it for a plan that's already three lines, or a decision with no
structural shape (e.g. "which library to use" — that's a `.compare` table, not this).

## Techniques

### 1. File labels

`path/to/file.ts:42` inline, next to any claim about existing code. Never invent a line number —
only label a file you actually opened.

### 2. Type / interface signatures

Show the actual shape, not a description of it:

```ts
interface SessionState {
  userId: string
  expiresAt: Date
  refresh(): Promise<SessionState>
}
```

Composition and boundaries — what depends on what — matter more than full method bodies. Elide
implementation with `...` or a one-line comment; the signature and its relationships are the plan.

### 3. Component trees

Before/after, indentation-based, for refactors that move state or consolidate effects. Only the
nodes that move or change need to appear — prune the rest:

```
Before                            After
<Dashboard>                       <Dashboard>
  useEffect(fetchUser)              <UserProvider>
  useEffect(fetchOrders)              <Orders />
  <Orders orders={orders} />          <Profile />
  <Profile user={user} />           </UserProvider>
```

### 4. Call-stack diffs

Before/after call flow as one diff block, not two side-by-side lists — the point is what specifically
changes in the chain, not the whole chain restated twice:

```diff
 handleSubmit()
-  validate(form)
-  saveDraft(form)
+  validate(form)
+  await saveDraft(form)
+  trackEvent('submit')
   navigate('/success')
```

### 5. Generic diff syntax

For any before/after that isn't a full type or component — a config value, a function signature, a
schema field — use a fenced ` ```diff ` block with `-`/`+` lines rather than narrating the change in
prose ("change the timeout from 30s to 60s").

## Where this gets read from

- `CLAUDE.md` §4 — default technique for any implementation plan or architecture proposal.
- `to-spec`'s Implementation Decisions section — generalizes the prototype-snippet exception to any
  of the techniques above, not only output copied from a prototype run.
- `explain`'s Architecture / Process archetypes — a text-only alternative to the SVG signature diagram
  when the point is structural shape, not a rendered visual explanation.
- `improve`'s proposed-fix descriptions — show the shape of the fix, not just name it.
