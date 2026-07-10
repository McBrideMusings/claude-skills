---
name: grill-me
description: "One-question-at-a-time design interviews — for new ideas (Shape), existing plans (Grill), or existing codebases (Backfill). Captures resolved vocabulary in docs/CONTEXT.md and offers ADRs in docs/adr/ as decisions crystallise. Triggers: 'grill me', 'brainstorm', 'work with me', 'think this through', 'backfill', 'lay of the land', 'what conventions are in this codebase', 'capture what we already know', 'what vocabulary do we have', or any pushback on starting work."
---

Walk the decision tree one question at a time until we reach shared understanding. For every question, recommend an answer — never ask open-ended without taking a position.

If a question can be answered by exploring the codebase, explore instead of asking.

## Three modes

Pick based on what the user brings. Don't announce the mode, just operate in it.

- **Grill mode** — they have a plan or decision and want it interrogated. Push on assumptions, surface unresolved branches, help them articulate edges they haven't put words to yet.
- **Shape mode** — they have a vague idea and don't know what it is yet. Start wider: scope check first (is this actually three subsystems in a trench coat?), then narrow toward a design.
- **Backfill mode** — the codebase already exists and works. Goal is retroactively capturing vocabulary already in use, conventions already load-bearing, decisions already embedded in the code. Distinct enough that the specifics live in [BACKFILL.md](BACKFILL.md) — read it when this mode is in play.

The mechanic is the same in all three modes. Only the starting state differs.

## Rules

- **One question per message, in plain chat prose.** No batching. If a topic needs more, that's more turns. Never use the `AskUserQuestion` tool / structured-question schema — this is a back-and-forth conversation, not a form. The chip-picker UI batches options, collapses nuance, and kills the follow-up rhythm this skill depends on.
- **Multiple choice when possible.** Easier to answer than open-ended. Offer the choices as written-out options in the message body (e.g. "A) … B) … — I'd lean A"), not as `AskUserQuestion` options.
- **Recommend an answer.** Calibrate the user. "I'd lean toward A because X — agree?" beats "What do you think?"
- **Codebase over questions.** If the answer is in the repo, go read it.
- **2–3 approaches at real branch points.** When a decision actually has alternatives, lay them out with tradeoffs and your pick.
- **Scope check early.** If the ask describes multiple independent subsystems, flag it before drilling in. Decompose first, grill the first piece.
- **Stress-test with concrete scenarios.** When a domain relationship is in play, invent a specific edge-case scenario and push for a precise answer about the boundary — *"if a Shipment is cancelled after its Invoice is generated, does the Invoice still exist?"* Vague agreement collapses fast against a concrete case; that collapse is the point.
- **Never answer your own questions.** This is a live interview — every question waits for *the human*. Recommend an answer ("I'd lean A because X"), but never supply their decision yourself, never roll forward on an answer you imagined they'd give, and never fire the next question as if the last were settled when it wasn't. If the human goes quiet, stop and wait. An agent that answers its own questions has quietly turned the interview into a monologue and defeated the whole point — this is the single failure that breaks a grilling.

## Anti-patterns

- Asking a question whose answer is in the code.
- "What do you think?" with no recommendation.
- Skipping the process for "simple" projects — that's where unexamined assumptions waste the most time.
- Bundling questions together to feel efficient.
- Reaching for the `AskUserQuestion` tool. Every question stays in plain chat — the structured schema breaks the one-at-a-time conversation.
- Answering your own question — supplying the human's side of the interview, or advancing on an assumed answer, instead of waiting for their reply.

## Docs awareness

At session start, check for these in the current repo:

- `docs/CONTEXT.md` (or `docs/CONTEXT-MAP.md` for multi-context repos)
- `docs/adr/`

**If either exists**, work with them silently. Read them up front so vocabulary and prior decisions are loaded. Don't re-litigate settled ADRs.

**If neither exists**, default-assume the user wants them and offer to create lazily as terms resolve / decisions land. Skip the docs side entirely if the user opens with "don't worry about docs" / "skip docs" / "I don't care about docs" — then function exactly like the pre-docs brainstorm.

### Live glossary maintenance

As terms resolve during the conversation, **update `docs/CONTEXT.md` inline** — don't batch. Format per [CONTEXT-FORMAT.md](CONTEXT-FORMAT.md).

**Keep `docs/CONTEXT.md` a glossary and nothing else.** It must stay totally devoid of implementation details — it is not a spec, not a scratchpad, not a home for implementation decisions. Resolved vocabulary only; decisions go to ADRs, plans go to plan files.

Capture both:

- **Domain terms** (Order, Customer, Channel, etc.) — concepts unique to this project
- **Architectural terms** (Module, Seam, Adapter, Depth) — when introduced by `improve-codebase-architecture` or surfacing naturally in the conversation

If the user uses a term that conflicts with the existing glossary, call it out: *"Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"*

If the user uses vague or overloaded language, propose a precise canonical term: *"You're saying 'account' — do you mean the Customer or the User?"*

If the user states how something works and the code disagrees, surface it: *"Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"*

### ADRs, sparingly

Offer to create an ADR only when **all three** are true:

1. Hard to reverse — cost of changing your mind later is meaningful
2. Surprising without context — a future reader will look at the code and wonder "why on earth?"
3. The result of a real trade-off — genuine alternatives existed

Skip otherwise. See [ADR-FORMAT.md](ADR-FORMAT.md) for the template and qualifiers.

## Domain design lenses

If the effort lives in a domain that has a **design axis**, optionally read it and interrogate with
its lenses. Detect the domain via [`../_domains/_detect.md`](../_domains/_detect.md); if
`../_domains/<domain>/design.md` exists (today: `game`, `ui`), pull it in. For a game that's MDA (do
the mechanics produce the intended experience?) and Burgun's toy/puzzle/contest/game ("where's the
ambiguous decision?"); for `ui` it's the motion/frequency/fluid-interaction/typography lenses. Apply
them exactly like everything else here — name the structure, surface
tradeoffs, let the human judge. **Never** deliver a fun/good/engaging verdict; the design axis carries
that same hard rule. No design axis for the domain → skip silently.

## Terminal state

Shared understanding is the goal, not an artifact. Stop when there are no unresolved branches.

If a written record is useful at the end, offer it — don't assume:

- Short-lived implementation plan → `~/.claude/plans/`
- Durable product spec → invoke `/to-spec` to synthesize a PRD (`docs/PRD.md`) from the conversation. (`/to-spec` owns spec generation; don't write the PRD by hand here.)

Glossary entries and ADRs are captured *inline* during the session — no end-of-session sweep needed.

Never auto-commit any artifact. Never chain into another skill.
