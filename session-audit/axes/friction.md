# Friction lens — blocked calls, retries, and the papercut surface

Small, repeated obstructions. Individually trivial; each one costs a turn, and a turn on a
250k context costs real money. This lens is the systematic version of `/papercut review`.

## Method

`analyze.py` reports directly:

- **blocked / rejected tool calls** — with the guard message and a count
- **repeated identical Bash commands**
- **repeated `Read` of the same path**
- **per-tool error counts**
- **hours lost to single calls over 60s**

Then classify each cluster by whose fault it is, because that decides where the fix goes:

**Harness friction** — a guard, a permission prompt, a stale cache, a tool that rejects a
shape the model keeps producing. File with `papercut --repo "$HOME/.claude"`.
The most useful sub-kind: **a guard that fires repeatedly on the same construct.** If the
same guard blocks the same shape N times across a corpus, the steering docs have not
taught the shape it wants. The fix is a documented example, not more care.

**Project friction** — a flaky command, a misleading error, a setup step that isn't written
down. File to the project's papercut log.

**Self-inflicted** — re-reading a file already in context, re-running a command whose output
hasn't changed, re-deriving a fact established earlier. No papercut; this is a discipline
finding and the fix belongs in `CLAUDE.md` or the owning skill.

**Genuine slowness** — builds and test suites. Not a papercut. The finding, if any, is that
it ran in the main context instead of behind `build-runner`; route it to `tool-choice`.

## Rank by turns burned, not by annoyance

`count × 1 turn × average context cost`. A guard that fired 9 times on a 250k context cost
about nine turns of full-window re-read. Say that number.

## What is not a finding

- A guard that fired once and taught the right lesson. That is the guard working.
- An error the model caused and immediately corrected with no retry.
- A permission prompt the user *wants* — some prompts are the point.
- Anything already in the papercut log and unfixed. Say it recurred; don't re-file it.

## Finding format

> **`<guard or failure>` fired `<n>`x across `<m>` sessions.**
> Example: `<session>:<timestamp>` — `<the blocked command, trimmed>`.
> Cost ≈ `<n>` turns ≈ `$<x>`.
> **Class:** `<harness | project | self-inflicted>`.
> **Fix:** `<the shape that would have passed, with a concrete example>`.

Axis tag: `friction`.

**Before writing the `Fix:` line, test it against both fix shapes.**
**Enforceable?** — [../HOOKS.md](../HOOKS.md). Name the event and predicate plus simulated fires/precision if a hook could enforce this; if not, say why.
**Right shape?** — [../SKILL-SHAPE.md](../SKILL-SHAPE.md). If the finding is about a skill, walk the ladder (delete → hide/relocate → reword → combine/embed → split/disclose → load trigger) and name the rung.
Say which shape you rejected and why. Prefer the fix that removes the condition over one that guards it.
