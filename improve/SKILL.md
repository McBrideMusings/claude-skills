---
name: improve
description: "Front door for making any aspect of a project better — routes to the aspect's owning skill (architecture, security, interface-safety, tests, gui, product, performance, game, docs, layout, claude-md, skills) or surveys all applicable aspects when none is named. Every pass ENDS IN FILED TICKETS via `to-tickets`; improve never implements what it finds. `improve workflow` runs the survey fan-out and scoring in a workflow so only surviving findings reach this context. Improvement = opportunities where nothing is broken; defects are `review`. Never uses AskUserQuestion — every choice is plain chat text answered by a typed keyword."
---

# Improve

The hub for opportunity-finding: "nothing is technically broken, but this could be better." Improve holds no aspect knowledge itself except its four native lenses — every other aspect is owned by another skill, and improve **loads the owner, never reimplements its lenses**. Defect-finding is `review`'s front door, not this one.

This file is the **router**. The survey engine — phases, briefs, scoring, merge — lives in [IMPROVE-CORE.md](IMPROVE-CORE.md); load it only once routing has picked survey mode.

**The endpoint is tickets.** Every route through this skill terminates the same way: surviving findings are handed to `to-tickets`, which publishes them to the repo's issue backend as work to implement later. Nothing improve finds gets built in the pass that found it.

## RULE 0 — `AskUserQuestion` is BANNED for the entire lifetime of a survey

**Every question this skill asks — without exception — is plain chat text answered by a typed keyword. The `AskUserQuestion` tool (the arrow-key option selector) is never called at any point in an improve pass.**

It covers every decision point, not just the ones spelled out: the Phase 02 confirm, trimming the aspect list, the Phase 08 publish confirm and any ticket trimming there, and any ambiguity that needs the user to settle it. It binds the sub-files this skill hands off to and every sub-agent spawned during the pass.

**Do this instead.** Print the options as plain chat text — numbered or keyworded — and say what to type. *"Running: architecture, tests, ui, layout. Type `go`, name a subset, or `skip <aspect>`."*

**`go` is the standing accept-all keyword, and every list that ends in recommendations must say so out loud.** That covers the aspect-list confirm above and, equally, the Phase 08 ticket slate: give your pick per item, then *"Type `go` to file these as described, or name the ones to drop."* Never leave a recommended set with no stated way to accept it whole — the user should not have to enumerate back a list they already agree with.

## RULE 1 — effort NEVER decides what gets improved

**How much work a change is — its size, its difficulty, how many files it touches, how long it would "take" — is banned as a reason to skip it, defer it, downgrade it, or rank it lower.** It binds the scorers ([GROUNDING.md](GROUNDING.md)), the Phase 06b ranking, and every sub-agent in the pass.

**Never state or reason from a time estimate.** Naming a change's *shape* as description ("one signature, three call sites") is fine; using size as the *justification* is not. Banned justifications: "not worth it", "low value", "marginal", "too big for now", and "follow-up" whenever the real reason is magnitude.

This rule matters more here than in `review`, because every single thing improve finds already works. "Is it worth it" is the one question that would kill every finding in the report, and it is not improve's question.

## RULE 2 — an opportunity is not a defect

Improve finds things that work today and could be better. If something is wrong *now* — a wrong value, a crash, an unhandled path, an exploitable weakness — it is `review`'s, and it leaves this pass as a one-line `review-territory` pointer, never as a card. The boundary runs through the `security` aspect most sharply: posture gaps are improve's, exploitable-today weaknesses are `review`'s.

## The lateral lens — every aspect runs one divergence technique

An opportunity has no failing input to follow, so an aspect walk goes predictable: the same five findings any competent agent returns for any repo in this language. Each aspect therefore runs exactly one lateral technique against its surface before writing findings — `provocation` for `architecture`, `worst-idea` for `interface-safety`, `analogy` for `product`, and so on.

Mapping, rules, and why `review` has no equivalent: [LATERAL-LENS.md](LATERAL-LENS.md). It generates candidates and changes nothing about what survives — grounding and the Phase 05 citation gate are unchanged.

## RULE 3 — improve writes tickets, never code

**No route through this skill edits a source file, and no route implements a finding.** The deliverable of an improve pass is a set of tickets on the repo's issue backend, each one ready for `implement` / `iterate` / `orchestrate` to pick up later. That holds for a full survey, for a two-aspect survey, and for a single-aspect interactive run.

If the user asks to build a finding during the pass, the answer is: file it, then run `implement <id>`. Filing first is what makes the work resumable by a different session on a different day, and what stops a survey from collapsing into one unplanned refactor while the other ten findings evaporate.

The one thing that reaches the tracker is a finding that **survived scoring** (Phase 05/06). Findings improve dropped do not become tickets; `review-territory` lines do not become tickets — they become a pointer to `/review`.

## Aspect table

| Aspect | Brief | Owner | Applicability |
| --- | --- | --- | --- |
| `architecture` | [aspects/architecture.md](aspects/architecture.md) | native — [ARCHITECTURE.md](ARCHITECTURE.md) | always |
| `interface-safety` | [aspects/interface-safety.md](aspects/interface-safety.md) | native — [INTERFACE-SAFETY.md](INTERFACE-SAFETY.md) | always |
| `security` | [aspects/security.md](aspects/security.md) | native — [SECURITY.md](SECURITY.md) | always |
| `claude-md` | [aspects/claude-md.md](aspects/claude-md.md) | native — [CLAUDE-MD.md](CLAUDE-MD.md) | a committed `CLAUDE.md` exists |
| `skills` | [aspects/skills.md](aspects/skills.md) | native — [WRITING-SKILLS.md](WRITING-SKILLS.md), vocabulary in [SKILL-GLOSSARY.md](SKILL-GLOSSARY.md) | a `skills/` or `.claude/skills/` directory exists |
| `tests` | [aspects/tests.md](aspects/tests.md) | `tdd` audit mode | always — an absent suite is the lead finding |
| `gui` | [aspects/gui.md](aspects/gui.md) | `gui` critique mode | UI surface exists |
| `product` | [aspects/product.md](aspects/product.md) | `gui` orient mode | always |
| `performance` | [aspects/performance.md](aspects/performance.md) | `profiling` | app launchable through an existing entry point |
| `game` | [aspects/game.md](aspects/game.md) | `_domains/game/` cells | `.claude/domain` marker includes `game` |
| `docs` | [aspects/docs.md](aspects/docs.md) | `docs` audit branch | `docs/` + `.vitepress/` exist |
| `layout` | [aspects/layout.md](aspects/layout.md) | `bootstrap` audit branch | always |

**The brief column is what a survey sub-agent gets** — a short file naming exactly what to read and what this aspect asks, so no agent burns a read of a 300-line `SKILL.md` hunting for one section. The owner column is what an *interactive* single-aspect run loads, in full, grilling loop included.

**Improving a skill itself** is the `skills` aspect above — read [WRITING-SKILLS.md](WRITING-SKILLS.md) (vocabulary in [SKILL-GLOSSARY.md](SKILL-GLOSSARY.md), pointer wording in [POINTERS.md](POINTERS.md)) before proposing anything. It carries the invocation/context-load tradeoff, progressive disclosure, description discipline, and the precision pass. Folded in from the standalone `writing-skills` skill on 2026-08-20.

**It judges one skill at a time, on purpose.** A skill that reads perfectly alone can still contradict a second skill loaded into the same session, and no single-file read will ever see it. That failure belongs to `audit-session`'s [steering-conflict](../audit-session/axes/steering-conflict.md) lens, which works from a transcript and can tell which sources actually landed together. Route it there rather than guessing; the meta-audit *pass* is `audit-session` generally, not this skill.

Every delegated owner carries a **"Findings-only invocation"** section stating its own read-only contract — `bootstrap`, `docs`, `profiling`, `tdd`, and `gui` (in its `SKILL.md` for critique and its `ORIENT.md` for orient). The `game` cells are knowledge files with no such section, so [aspects/game.md](aspects/game.md) *is* their contract.

## Routing

- **One aspect named** (`improve security`, "improve the tests") → load the **owner** in-session and run its audit interactively: native aspects read their own file here; delegated aspects invoke the owning skill via the Skill tool, which keeps its own follow-up flow with the user. No sub-agents, no HTML report. IMPROVE-CORE.md is not involved — **except its Phase 08**, which this route still runs: score the findings yourself against [GROUNDING.md](GROUNDING.md), then take the survivors to tickets. The grilling loop is what sharpens a finding into a ticket body worth handing to `implement`; it is not a licence to build the thing.
- **Several aspects named** (`improve gui tests`) → survey over exactly those, via [IMPROVE-CORE.md](IMPROVE-CORE.md).
- **Nothing named** (bare `improve`) → survey over every applicable aspect, via [IMPROVE-CORE.md](IMPROVE-CORE.md).

All three end at **Phase 08 — Ticket the survivors** in [IMPROVE-CORE.md](IMPROVE-CORE.md).

## Transport — where the aspects run

Orthogonal to the routing above, and only meaningful in survey mode. The `workflow` token moves **Phases 04–06b only** — the fan-out, the scoring, the filter and merge, the ranking — into a workflow script, so only surviving findings enter this context instead of every aspect report. Applicability, the confirm, the report, the ticketing, and every question stay in the session. `improve workflow`, `improve architecture tests workflow`.

No token → the session transport: [IMPROVE-CORE.md](IMPROVE-CORE.md) exactly as written, Agent-tool sub-agents launched in parallel from this loop. That is the default.

Mechanics: [TRANSPORT-WORKFLOW.md](TRANSPORT-WORKFLOW.md). **RULE 0 holds under both** — the workflow contains no question, because every question in a survey falls outside Phases 04–06b.

## Native aspects

`architecture`, `interface-safety`, `security`, `claude-md`, and `skills` live here because no other skill owns them.

`interface-safety` asks one question the others don't: can a caller do the obvious thing and get the wrong result? It is the proactive half of the footgun test that `review`'s `contracts` axis runs read-only on a diff.

Interactive runs use the full native files including their grilling loops and, for `claude-md`, the rebuild. Survey sub-agents get the `aspects/` brief, which points at the same file and names which sections stop applying.

Two more files the aspect table does not reach, listed here so nothing in this skill needs two hops to find:

- [HTML-REPORT.md](HTML-REPORT.md) — the fragment contract for the survey report. Read it before writing any report body.
- [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md) — alternative interfaces for a module `architecture` has deepened. Reached from [ARCHITECTURE.md](ARCHITECTURE.md) and [INTERFACE-SAFETY.md](INTERFACE-SAFETY.md) at the moment it applies.
