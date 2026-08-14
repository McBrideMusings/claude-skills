---
name: improve
description: "Front door for making any aspect of a project better — routes to the aspect's owning skill (architecture, security, interface-safety, tests, gui, product, performance, game, docs, layout, claude-md) or surveys all applicable aspects when none is named. `improve workflow` runs the survey fan-out and scoring in a workflow so only surviving findings reach this context. Improvement = opportunities where nothing is broken; defects are `review`. Never uses AskUserQuestion — every choice is plain chat text answered by a typed keyword."
---

# Improve

The hub for opportunity-finding: "nothing is technically broken, but this could be better." Improve holds no aspect knowledge itself except its four native lenses — every other aspect is owned by another skill, and improve **loads the owner, never reimplements its lenses**. Defect-finding is `review`'s front door, not this one.

This file is the **router**. The survey engine — phases, briefs, scoring, merge — lives in [IMPROVE-CORE.md](IMPROVE-CORE.md); load it only once routing has picked survey mode.

## RULE 0 — `AskUserQuestion` is BANNED for the entire lifetime of a survey

**Every question this skill asks — without exception — is plain chat text answered by a typed keyword. The `AskUserQuestion` tool (the arrow-key option selector) is never called at any point in an improve pass.**

It covers every decision point, not just the ones spelled out: the Phase 02 confirm, trimming the aspect list, which aspect to work at the end, and any ambiguity that needs the user to settle it. It binds the sub-files this skill hands off to and every sub-agent spawned during the pass.

**Do this instead.** Print the options as plain chat text — numbered or keyworded — and say what to type. *"Running: architecture, tests, ui, layout. Type `go`, name a subset, or `skip <aspect>`."*

## RULE 1 — effort NEVER decides what gets improved

**How much work a change is — its size, its difficulty, how many files it touches, how long it would "take" — is banned as a reason to skip it, defer it, downgrade it, or rank it lower.** It binds the scorers ([GROUNDING.md](GROUNDING.md)), the Phase 06b ranking, and every sub-agent in the pass.

**Never state or reason from a time estimate.** Naming a change's *shape* as description ("one signature, three call sites") is fine; using size as the *justification* is not. Banned justifications: "not worth it", "low value", "marginal", "too big for now", and "follow-up" whenever the real reason is magnitude.

This rule matters more here than in `review`, because every single thing improve finds already works. "Is it worth it" is the one question that would kill every finding in the report, and it is not improve's question.

## RULE 2 — an opportunity is not a defect

Improve finds things that work today and could be better. If something is wrong *now* — a wrong value, a crash, an unhandled path, an exploitable weakness — it is `review`'s, and it leaves this pass as a one-line `review-territory` pointer, never as a card. The boundary runs through the `security` aspect most sharply: posture gaps are improve's, exploitable-today weaknesses are `review`'s.

## Aspect table

| Aspect | Brief | Owner | Applicability |
| --- | --- | --- | --- |
| `architecture` | [aspects/architecture.md](aspects/architecture.md) | native — [ARCHITECTURE.md](ARCHITECTURE.md) | always |
| `interface-safety` | [aspects/interface-safety.md](aspects/interface-safety.md) | native — [INTERFACE-SAFETY.md](INTERFACE-SAFETY.md) | always |
| `security` | [aspects/security.md](aspects/security.md) | native — [SECURITY.md](SECURITY.md) | always |
| `claude-md` | [aspects/claude-md.md](aspects/claude-md.md) | native — [CLAUDE-MD.md](CLAUDE-MD.md) | a committed `CLAUDE.md` exists |
| `tests` | [aspects/tests.md](aspects/tests.md) | `tdd` audit mode | always — an absent suite is the lead finding |
| `gui` | [aspects/gui.md](aspects/gui.md) | `ui-design` critique mode | UI surface exists |
| `product` | [aspects/product.md](aspects/product.md) | `product-design` orient mode | always |
| `performance` | [aspects/performance.md](aspects/performance.md) | `profiling` | app launchable through an existing entry point |
| `game` | [aspects/game.md](aspects/game.md) | `_domains/game/` cells | `.claude/domain` marker includes `game` |
| `docs` | [aspects/docs.md](aspects/docs.md) | `docs` audit branch | `docs/` + `.vitepress/` exist |
| `layout` | [aspects/layout.md](aspects/layout.md) | `bootstrap` audit branch | always |

**The brief column is what a survey sub-agent gets** — a short file naming exactly what to read and what this aspect asks, so no agent burns a read of a 300-line `SKILL.md` hunting for one section. The owner column is what an *interactive* single-aspect run loads, in full, grilling loop included.

Every delegated owner carries a **"Findings-only invocation"** section stating its own read-only contract — `bootstrap`, `docs`, `profiling`, `tdd`, `ui-design`, and `product-design` (in its `ORIENT.md`). The `game` cells are knowledge files with no such section, so [aspects/game.md](aspects/game.md) *is* their contract.

## Routing

- **One aspect named** (`improve security`, "improve the tests") → load the **owner** in-session and run its audit interactively: native aspects read their own file here; delegated aspects invoke the owning skill via the Skill tool, which keeps its own follow-up flow with the user. No sub-agents, no scoring, no report. IMPROVE-CORE.md is not involved.
- **Several aspects named** (`improve gui tests`) → survey over exactly those, via [IMPROVE-CORE.md](IMPROVE-CORE.md).
- **Nothing named** (bare `improve`) → survey over every applicable aspect, via [IMPROVE-CORE.md](IMPROVE-CORE.md).

## Transport — where the aspects run

Orthogonal to the routing above, and only meaningful in survey mode. The `workflow` token moves **Phases 04–06b only** — the fan-out, the scoring, the filter and merge, the ranking — into a workflow script, so only surviving findings enter this context instead of every aspect report. Applicability, the confirm, the report, and every question stay in the session. `improve workflow`, `improve architecture tests workflow`.

No token → the session transport: [IMPROVE-CORE.md](IMPROVE-CORE.md) exactly as written, Agent-tool sub-agents launched in parallel from this loop. That is the default.

Mechanics: [TRANSPORT-WORKFLOW.md](TRANSPORT-WORKFLOW.md). **RULE 0 holds under both** — the workflow contains no question, because every question in a survey falls outside Phases 04–06b.

## Native aspects

`architecture`, `interface-safety`, `security`, and `claude-md` live here because no other skill owns them.

`interface-safety` asks one question the others don't: can a caller do the obvious thing and get the wrong result? It is the proactive half of the footgun test that `review`'s `contracts` axis runs read-only on a diff.

Interactive runs use the full native files including their grilling loops and, for `claude-md`, the rebuild. Survey sub-agents get the `aspects/` brief, which points at the same file and names which sections stop applying.
