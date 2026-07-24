---
name: improve
description: "Front door for making any aspect of a project better — routes 'I want to improve something' to the aspect's owning skill, or surveys every applicable aspect when none is named. Aspects: architecture, security (posture), tests, ui, product, performance, game, docs, layout. Improvement = opportunities (nothing is broken); defects are `review`. Triggers: 'improve', '/improve', 'what should I improve', 'where can this project get better', 'improve architecture', 'improve security', 'improve tests', 'find refactor opportunities', 'what's shallow here', 'where can we deepen'."
---

# Improve

The hub for opportunity-finding: "nothing is technically broken, but this could be better." Improve holds no aspect knowledge itself except its two native lenses — every other aspect is owned by another skill, and improve **loads the owner, never reimplements its lenses**. Defect-finding is `review`'s front door, not this one.

## Aspect table

| Aspect | Owner | Applicability |
| --- | --- | --- |
| `architecture` | native — [ARCHITECTURE.md](ARCHITECTURE.md) | always |
| `security` | native — [SECURITY.md](SECURITY.md) (posture; exploits stay with `review`) | always |
| `tests` | `tdd` audit mode | always — an absent suite is the lead finding |
| `ui` | `ui-design` critique mode | UI surface exists |
| `product` | `product-design` orient mode | always |
| `performance` | `profiling` | app launchable through an existing entry point |
| `game` | `_domains/game/design.md` + `review.md` cells, read directly | `.claude/domain` marker includes `game` |
| `docs` | `docs` audit branch | `docs/` + `.vitepress/` exist (absence surfaces via `layout`) |
| `layout` | `bootstrap` audit branch | always |

Each delegated owner has a **"Findings-only invocation"** section in its own `SKILL.md` — the contract for being called from here: no file writes, no commits, no questions (answer what it would normally ask from repo artifacts, mark the unanswerable Assumed/Unknown), return structured findings (finding, evidence, strength, proposed fix). The `game` cells are read under the same discipline: structure and tradeoffs only, never a fun/good verdict.

## Routing

- **One aspect named** (`improve security`, "improve the tests") → load the owner in-session and run its audit interactively: native aspects read their file here; delegated aspects invoke the owning skill (Skill tool), which keeps its own follow-up flow with the user. No subagents, no merged report.
- **Several aspects named** (`improve ui tests`) → survey mode over exactly those aspects.
- **Nothing named** (bare `improve`) → survey mode over every applicable aspect.

## Survey mode

1. **Detect applicability** (cheap, native): check the table's conditions — domain marker, UI surface, docs site, a launchable entry point (`./admin` task or package script).
2. **Confirm — always.** Print the applicable aspect list with what each would run, in plain chat, and wait: the user can trim, pick a subset, or abort. Never fan out without this yes.
3. **Fan out** — one subagent (`general-purpose`) per confirmed aspect, all in one message. Each subagent's prompt: read the owner's `SKILL.md` (or the native/cell files) and execute its Findings-only invocation against this repo, returning structured findings. Aspects whose applicability turns out false up close return "not applicable/not measurable — <reason>" rather than guessed findings.
4. **Merge** into one hermetic HTML report per [HTML-REPORT.md](HTML-REPORT.md) — one section per aspect, one card per finding, and a cross-aspect **Top recommendation**. Write to `<root>/tmp/claude/improve-survey-<slug>.html`.

   **⛔ Resolve `<root>` to an ABSOLUTE path** — run `git rev-parse --show-toplevel` in its own Bash call (fall back to `pwd`'s absolute output); every `mkdir`/`Write`/`open`/printed path is the absolute `<root>/tmp/claude/…`. If a path doesn't start with `/`, that's the bug. Ensure `tmp/` is gitignored; `mkdir -p` as its own call; `open <path>` on macOS; emit the path on its own line with no trailing punctuation.
5. **Summarize inline** (aspect, finding count, top finding each) so the user can react without opening the file, then ask which aspect to work.
6. **Hand off** — the picked aspect loads exactly as the one-aspect route above, its survey findings already in context as the starting point.

`tmp/claude/` is age-pruned with the rest of the account-wide tmp policy; don't keep the report unless the user asks.

## Native aspects

`architecture` and `security` live here because no other skill owns them. Interactive runs use their full files including the grilling loop; survey subagents run their explore/lens pass and return card-shaped findings.
