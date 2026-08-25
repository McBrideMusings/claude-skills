---
name: grill-me
description: "One-question-at-a-time design interviews — for new ideas (Shape), existing plans (Grill), or existing codebases (Backfill). Captures resolved vocabulary in docs/CONTEXT.md and offers ADRs as decisions crystallise. Use for brainstorming, thinking a design through, capturing conventions, or any pushback on starting work."
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
- **Multiple choice when possible.** Easier to answer than open-ended. Offer the choices as written-out options in the message body, never as `AskUserQuestion` options. **Format them exactly as `CLAUDE.md` §Deciding & designing specifies — the question is a number, each option is a bolded `1A` / `1B` line naming what physically happens, its case as bullets beneath, the cost as the last bullet.** `CLAUDE.md` names "an interview question" as a covered decision point, so this skill is inside that rule, not beside it. An interview asks question after question, so the number is what keeps two questions' answers apart: never restart the options at `1.` per question, and never letter a question.
- **Recommend an answer, every time — no exceptions.** Never lay out options and stop; that's a bare question with no pick, which is a non-answer. Mark the pick on its own option line — `**1. <what happens> — my pick.**` — rather than appending a preference after the list.
- **Give the best argument for the pick, and the best argument for each alternative.** Not just "option 1 because X" — also the strongest case for 2 and 3, the reason a reasonable person would choose them instead, so the user is weighing real tradeoffs rather than a recommendation with strawmen attached.
- **Codebase over questions.** If the answer is in the repo, go read it.
- **2–3 approaches at real branch points.** When a decision actually has alternatives, lay them out with tradeoffs and your pick.
- **Scope check early.** If the ask describes multiple independent subsystems, flag it before drilling in. Decompose first, grill the first piece.
- **Stress-test with concrete scenarios.** When a domain relationship is in play, invent a specific edge-case scenario and push for a precise answer about the boundary — *"if a Shipment is cancelled after its Invoice is generated, does the Invoice still exist?"* Vague agreement collapses fast against a concrete case; that collapse is the point.
- **Locate before you ask.** Before any question about where something should live or when it should run, name the concrete places in the actual system — file paths in the repo, the named table in the named database file, the specific process at the specific moment ("the daemon, at the point it generates a schedule"). Then write each option as what physically happens: which file gets edited, what value gets written where, which process computes it, when. An option phrased as a bare noun with no location ("the score attaches to the item", "it lives on the model", "column vs. context") is unanswerable and reads as evasion — the human cannot picture it, so they cannot judge it. If you can't write the options in located form, you haven't read enough code to ask yet. Go read it.
- **Never answer your own questions.** This is a live interview — every question waits for *the human*. Recommend an answer (mark one option "— my pick"), but never supply their decision yourself, never roll forward on an answer you imagined they'd give, and never fire the next question as if the last were settled when it wasn't. If the human goes quiet, stop and wait. An agent that answers its own questions has quietly turned the interview into a monologue and defeated the whole point — this is the single failure that breaks a grilling.

## Anti-patterns

- Asking a question whose answer is in the code.
- "What do you think?" with no recommendation.
- Skipping the process for "simple" projects — that's where unexamined assumptions waste the most time.
- Bundling questions together to feel efficient.
- Reaching for the `AskUserQuestion` tool. Every question stays in plain chat — the structured schema breaks the one-at-a-time conversation.
- Answering your own question — supplying the human's side of the interview, or advancing on an assumed answer, instead of waiting for their reply.
- Offering options made of ungrounded nouns — "attaches to X", "lives on Y", "column or context" — with no file, no table, no process, no moment. The human has to reverse-engineer the architecture out of your abstractions before they can even parse the choice.

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
- **Architectural terms** (Module, Seam, Adapter, Depth) — when introduced by `improve` or surfacing naturally in the conversation

If the user uses a term that conflicts with the existing glossary, call it out: *"Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"*

If the user uses vague or overloaded language, propose a precise canonical term: *"You're saying 'account' — do you mean the Customer or the User?"*

If the user states how something works and the code disagrees, surface it: *"Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"*

### ADRs, sparingly

Offer to create an ADR only when **all three** are true:

1. Hard to reverse — cost of changing your mind later is meaningful
2. Surprising without context — a future reader will look at the code and wonder "why on earth?"
3. The result of a real trade-off — genuine alternatives existed

Skip otherwise. See [ADR-FORMAT.md](ADR-FORMAT.md) for the template and qualifiers.

## Assumption-breaking lenses

Two symptoms in an interview are not "ask a better question" problems — they are the interview accepting a frame nobody has examined. Each has a technique that attacks the frame, in [`../lateral/techniques/`](../lateral/techniques/). Read the one file and run its workflow inline, as a stretch of the interview; do not invoke `lateral` as a skill and do not run both in one session.

| What you notice | Lens |
|---|---|
| A requirement is being treated as given — the human says "obviously it has to X", or every option you can write shares an unstated premise | [`inversion`](../lateral/techniques/inversion.md) — flip the assumption and ask what design the opposite implies |
| The effort might be solving the wrong problem — the stated need arrives already shaped as a solution ("we need a dashboard"), or three rounds have refined a mechanism nobody has justified | [`concept-fan`](../lateral/techniques/concept-fan.md) — "what is this a way of doing?", widen, then come back down |

**These stay inside the interview's rules.** The output of a lens is options and a recommendation in the standard format, one question per message, waiting for the human. It is never a verdict, and it never advances on an answer you supplied yourself. `concept-fan` in particular widens the scope — if it lands somewhere the current effort doesn't cover, that is a scope-check finding to surface, not a licence to re-plan the project.

**Don't reach for either on a settled question.** A human who has already justified a constraint is not stuck; inverting it there wastes a turn and reads as contrarianism.

## Domain design lenses

If the effort lives in a domain that has a **design axis**, optionally read it and interrogate with its lenses. Detect the domain via [`../_domains/_detect.md`](../_domains/_detect.md); if `../_domains/<domain>/design.md` exists (today: `game`, `ui`), pull it in. For a game that's MDA (do the mechanics produce the intended experience?) and Burgun's toy/puzzle/contest/game ("where's the ambiguous decision?"); for `ui` it's the motion/frequency/fluid-interaction/typography lenses. Apply them exactly like everything else here — name the structure, surface
tradeoffs, let the human judge. **Never** deliver a fun/good/engaging verdict; the design axis carries that same hard rule. No design axis for the domain → skip silently.

## Product-design elicitation discipline

When the interview is eliciting *what users need* or *what the domain's vocabulary is* — the bread and butter of Shape and Backfill — pull the matching `gui` cell for the discipline that keeps the questions honest, then interrogate with it:

- **User needs / job stories** → [`../gui/layers/user-needs.md`](../gui/layers/user-needs.md): need-not-solution, strip-the-mechanism, the "When" must be picturable, elicit emotional/social jobs, mark confidence (observed/inferred/assumed).
- **Domain terminology** → [`../gui/layers/domain.md`](../gui/layers/domain.md): record synonymy vs polysemy as findings (don't resolve them here), noun harvest marked object/attribute/ instance, stay in the real world. Resolved vocabulary lands in `docs/CONTEXT.md` as usual.

These are the same disciplines the `gui` orchestrator uses; grill-me reads the cells rather than duplicating them. For the full seven-layer treatment (conceptual model, strategy, breadboarding), route to `gui`.

## Terminal state

Shared understanding is the goal, not an artifact. Stop when there are no unresolved branches.

## A question that lands badly

Anger at a question is information about **that question**, not permission to stop asking questions. "I don't care", "stop asking me about this", or plain rage means the question was stupid, inconsequential, or already answered — not that the remaining branches stopped mattering.

Do not exit. Do not re-ask it in different words. Three moves, then carry on:

1. **Answer it yourself.** Take the option you would have recommended, say so in one line, and treat it as settled.
2. **Work out why you asked.** The usual causes, in the order worth checking: the conversation already answered it; the codebase answers it and you didn't look; it turns on a distinction the user doesn't have and doesn't need; or the real choice was a third option you never wrote down. Name which one, in one line.
3. **Continue the interview.** The next question still gets asked. One bad question is a bad question, not a terminal state.

## An instruction is not an answer

Once this skill is loaded, every later message reads as an answer to the current question — including the ones that are orders. A message naming what to build starts that build (`CLAUDE.md`, *"Told to build means build"*). A question that serves the build is still building — sketch it, spike it, ask the one thing you genuinely need. A question that stands in for the build is not.

The test is whether the turn moved toward the thing. Another option set about a decision the user already made does not.

Observed 2026-08-25: "the settings button and the button that says Connected MacBook should be a settings button and a server button" became an options block about persistence, then a component-tree diff, then a committed README — three turns, no code, and the user had to ask why they were being ignored. The interview kept converting input into questions because that is what an interview does.

**Whenever the interview resolves into a stated plan or decision — written down or said in chat — load [`show-shape`](../show-shape/SKILL.md) via the Skill tool first.** A resolved interview is the single most common way a plan reaches the user here, and the format is not optional because the answer arrived as conversation rather than as a file. This is also `implement`'s ambiguity path: a Phase 0.5 objectivity failure routes into this skill (`../implement/SKILL.md:138`), so an autonomous pass that hits a judgment call gets the format through this door.

If a written record is useful at the end, offer it — don't assume:

- Short-lived implementation plan → `/private/tmp/claude/<repo-slug>/plans/`
- Durable product spec → invoke `/to-tickets`, which synthesizes the spec as its Phase 03 and offers to commit it as `docs/PRD.md` before slicing. (`/to-tickets` owns spec generation; don't write the PRD by hand here.)

Glossary entries and ADRs are captured *inline* during the session — no end-of-session sweep needed.

## Never build by hand what another skill owns

"Never chain into another skill" (below) means **never chain into another interview**. It does not mean build things yourself. The moment the conversation asks for an artifact — a prototype, a spec, a diagram, a plan, tickets — **invoke the skill that owns it**, then come back here. Reading a request as a direct instruction and starting to write is the failure this rule exists to stop: skills carry naming, versioning, and format conventions that hand-written output silently breaks, and the cost lands later, on the user, as a file in the wrong place under the wrong name that can't be iterated on.

| The user asks for | Invoke |
| --- | --- |
| a prototype, mockup, variants, "show me a few options" | `spike` |
| a spec or PRD, tickets, or issues from what was decided | `to-tickets` |
| a diagram or a visual explanation | `show-me` / `explain` |
| an ASCII layout sketch for one arrangement | `gui` |

This is not optional and it is not a judgement call. **If a skill's description covers the artifact, that skill builds it** — even when the request is one sentence, even when you can see exactly what to write, and especially when you can, because that is when skipping it feels most reasonable.

Never auto-commit any artifact. Never chain into another *interview* skill — but always hand a build to the skill that owns it, per "Never build by hand what another skill owns" above.
