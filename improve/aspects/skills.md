# Aspect brief: `skills` (native)

Axis tag: `skills`. Applicability: a `skills/` or `.claude/skills/` directory exists.

**Read first:** [../WRITING-SKILLS.md](../WRITING-SKILLS.md) — its "Audit mode" section at the end is your contract. Vocabulary in [../SKILL-GLOSSARY.md](../SKILL-GLOSSARY.md).

Judge whether a skill's **process** will actually run the way it is written. Distinct from `claude-md`, which judges a document that loads every turn; a skill loads on demand and is a procedure, so it fails in ways a document cannot.

**Scope: one skill directory at a time.** A contradiction between two skills co-loaded into the same session is real and common, and it is not this aspect's — it belongs to `audit-session`'s [steering-conflict](../../audit-session/axes/steering-conflict.md) lens, which can see which sources actually landed together. Judge each skill as if it were the only one loaded. Say so when a finding smells cross-skill, and route it.

## The ten axes

Run every one against every skill in scope. Each finding quotes the skill's own line.

| # | Axis | The finding |
|---|---|---|
| 1 | **Hidden reference** | A `.md` in the skill directory that `SKILL.md` never names, or names only through another file. Agents partially read a nested reference — `head -100` on a file reached at two hops returns incomplete content and nothing signals it. Every reference is one hop from `SKILL.md`, with a reason to open it. |
| 2 | **Description clause** | Take the `description` clause by clause and verdict each one: **routing** (which mode, which argument, which sibling owns what), **constraint** (what the skill must never do), or **procedure** (how it does its job). Procedure clauses are the finding — a model that auto-fires on the description can follow the summary instead of reading the body. Length alone is not the finding. |
| 3 | **Emphasis without a gate** | ⛔, HARD BAN, ALWAYS, NEVER, or a paragraph about how badly it went last time, on a step with nothing that detects skipping it. Emphasis is evidence prose already failed. Two escapes, cheapest first: **restate it positively** — a ban names the forbidden behaviour and makes it more available (**Negation**, `../WRITING-SKILLS.md`), so state the target instead and the banned one is never spoken; then, if it must be enforced rather than said, a **gate** — a step that cannot be passed without producing an artifact someone can check (for a `CLAUDE.md`, a hook). |
| 4 | **Ungated phase** | A phase the agent can skip with nothing noticing. Ask of every phase: what does the next phase read that only this one produces? If the answer is nothing, the phase is advisory. |
| 5 | **Unhalted decision point** | A step that says choose, ask, or confirm, in a skill that can run unattended, with no halt and no stated default. Either it halts, or it names what happens when nobody answers. |
| 6 | **Missing escape hatch** | A slate of recommendations that does not close with `go` — and `park` too where the slate proposes next work. Applies to every list of dispositions the skill tells the agent to present. |
| 7 | **Contradiction** | Two lines in one skill that cannot both be obeyed. Read the whole file before judging any clause: `../../audit-session/FIX-MODE.md:19` — "a clause removed in isolation routinely contradicts one three sections down." Quote both halves or it is not a finding. |
| 8 | **Additive drift** | A rule sitting beside the older one it should have replaced or narrowed. Before any guidance was added, one of replace / narrow / move / delete should have been considered. Two rules covering one behaviour is the condition that produces axis 7. |
| 9 | **Retained forensics** | A sha, session id, date, count, or retold incident inside a rule. The rule stays; the evidence goes to the commit message. This is a compress, never a delete — the behaviour is fine, the proof is what costs tokens on every load. One clause of reason is allowed where the agent would otherwise choose wrong. |
| 10 | **Size** | `SKILL.md` body past 500 lines, or a `description` carrying more than routing and constraints. Measure words per section, never line count. |

Axes 3–6 are why this aspect exists separately from `claude-md`. They are process failures; a document cannot have them.

## Aspect-specific rules

- **Read the skill in full before judging it, including its sibling files.** A finding that does not quote this skill's own text is not a finding.
- **A rule stated once in `CLAUDE.md` and restated in a skill is duplication**, and duplication across two files is worse than within one — you cannot see both at once to notice they have drifted. Same test as `claude-md`'s: read the global file first.
- **Never propose cutting a truth rule.** "Only claim what you verified", "flag uncertainty". Those stop invented facts; they are not severity filters.
- **Coupling between these skills is deliberate, not a defect.** They name each other, hard-require each other, and assume herdr, beads and `admin.toml`. Do not file portability findings against the private set. The one carve-out: `skills/_domains/` is a public repo, where naming a private label or a personal host *is* a finding.
- **A gate proposed for axis 3 or 4 is not a finding until its shape is named.** Say what artifact proves the step ran and what reads it. "Add a gate" with no mechanism is the same advisory prose it was meant to replace.

## Where the evidence is

Three things worth running before writing findings, because each answers an axis mechanically:

- Words and lines per `SKILL.md`, and `description` word counts — axis 10.
- Sibling `.md` files versus the ones `SKILL.md` names — axis 1. A file reached only through another file is the finding, not just a file reached through none.
- `git log --follow -p -- <skill>/SKILL.md` — axes 8 and 9. Carry-over across rewrites is the strongest evidence available: survived every rewrite means load-bearing; removed once and added back means the removal was wrong.

Card fields per [../HTML-REPORT.md](../HTML-REPORT.md). Each finding: the **gap**, **evidence** (the quoted line), **fix** (the concrete rewrite), **strength** (`Strong` / `Worth exploring` / `Speculative`).
