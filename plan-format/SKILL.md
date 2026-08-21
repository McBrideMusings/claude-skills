---
name: plan-format
description: "How to WRITE DOWN an implementation plan, a design proposal, a PRD's Implementation Decisions section, an `improve` proposed fix, or an architecture-change note — as structured pseudocode rather than prose. Load BEFORE writing any of those, including mid-conversation, whenever the answer will describe what to build: 'make a plan', 'how would you implement this', 'what's your approach', 'here's what I'd do', a numbered slice list, or a proposal weighing options. Supplies the five techniques (file:line labels, type signatures, component trees, call-stack diffs, generic diffs) with worked examples. Not for prose answers with no structural shape."
---

# Plan format — structured pseudocode for plans and proposals

How to *write down* an implementation plan, a design proposal, a PRD's Implementation Decisions section, an `improve` proposed fix, or an `explain` architecture-change note — so it reads as the shape of the code, not a description of it.

**Plain markdown only.** No HTML, no Monodraw, no rendered SVG/mermaid. Every technique below is a fenced text block anyone can read in a terminal or a chat pane.

## Load this whenever a plan is being written — including mid-conversation

The trigger is what the *answer* will be, not what the request looked like. If the reply you are about to write says what to build, in what order, or what changes where, this skill owns its format. That includes the cases that arrive as ordinary conversation:

- "How would you go about implementing it?" → a numbered slice list is a plan.
- "What's your approach?" / "propose something" → a proposal is a plan.
- Answering a design question by describing a mechanism you'd add.
- A worker or dispatch brief reporting *what it intends to change* (findings alone are not a plan; the fix it proposes is).

**Measured, not asserted.** Across 92 plan-shaped replies in 13 months of history: **68.5% carry no fenced block at all**, one carries a ```diff, and **zero** carry a component tree. Adherence to the rule overall is **39.1%**. The failure mode is never deciding this rule applies. It applies.

Reproduce with `python3 ~/.claude/skills/session-audit/adherence.py --rule plan-pseudocode --all-history`. An earlier version of this line said "122 replies, 56.6% bare" — that denominator counted subagent transcripts and harness JSON payloads that can never carry a plan. The corrected figure is worse on shape and better on rate; the reason for the skill is unchanged, because the cause was structural (the format lived at `skills/_plan-format.md`, opened 14 times in 9,243 transcripts).

## When to skip it

A plan already three lines long, or a decision with no structural shape — "which library to use" is a comparison table, not this. Skipping is a judgment you make *after* loading, not a reason to skip loading.

## Techniques

### 1. File labels

`path/to/file.ts:42` inline, next to any claim about existing code. Never invent a line number — only label a file you actually opened.

### 2. Type / interface signatures

Show the actual shape, not a description of it:

```ts
interface SessionState {
  userId: string
  expiresAt: Date
  refresh(): Promise<SessionState>
}
```

Composition and boundaries — what depends on what — matter more than full method bodies. Elide implementation with `...` or a one-line comment; the signature and its relationships are the plan.

### 3. Component trees

Before/after, indentation-based, for refactors that move state or consolidate effects. Only the nodes that move or change need to appear — prune the rest:

```
Before                            After
<Dashboard>                       <Dashboard>
  useEffect(fetchUser)              <UserProvider>
  useEffect(fetchOrders)              <Orders />
  <Orders orders={orders} />          <Profile />
  <Profile user={user} />           </UserProvider>
```

### 4. Call-stack diffs

Before/after call flow as one diff block, not two side-by-side lists — the point is what specifically changes in the chain, not the whole chain restated twice:

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

For any before/after that isn't a full type or component — a config value, a function signature, a schema field — use a fenced ` ```diff ` block with `-`/`+` lines rather than narrating the change in prose ("change the timeout from 30s to 60s").

## Where this gets read from

- `CLAUDE.md` §4 — default technique for any implementation plan or architecture proposal.
- `to-spec`'s Implementation Decisions section — generalizes the prototype-snippet exception to any of the techniques above, not only output copied from a prototype run.
- `explain`'s Architecture / Process archetypes — a text-only alternative to the SVG signature diagram when the point is structural shape, not a rendered visual explanation.
- `improve`'s proposed-fix descriptions — show the shape of the fix, not just name it.

## Skills that load this automatically

These call `Skill(plan-format)` at the point they start writing a plan, so the format arrives without anyone remembering to ask for it:

- [`grill-me`](../grill-me/SKILL.md) — when an interview resolves into a stated plan or decision. This is also `implement`'s ambiguity path: `implement`'s Phase 0.5 objectivity failure routes to `grill-me` (`../implement/SKILL.md:138`), so an autonomous pass that hits a judgment call picks up this format on the way through. `implement` itself stays uninstrumented on purpose — a pass that clears the gate is walk-away work and should not stop to format a plan for a human.
- [`iron-out`](../iron-out/SKILL.md) — when writing the resolved plan onto an issue.
- [`prototype`](../prototype/SKILL.md) — when writing up which approach won and what to build.
