# Negative-space lens — what the steering required and did not get

The point of this skill. Every other lens finds waste that shows up in a number.
This one finds **the rule that was written, deployed, and silently never obeyed** — which
no cost metric will ever surface, because skipping the work is *cheaper* than doing it.

Distinct from `review`'s negative-space lens: that one asks what obligations a **diff**
creates and leaves unmet. This asks what obligations the **steering documentation** creates
and the **conversation** leaves unmet.

## Method

1. **Enumerate the obligations.** Read global `~/.claude/CLAUDE.md`, the project
   `CLAUDE.md` / `CLAUDE.local.md`, and the `SKILL.md` of every skill `analyze.py` says
   fired. Pull out every clause that mandates an *observable* behaviour — something you
   could confirm or refute by reading a transcript.

   Mandate words: *always, never, every, must, before, end every, unasked, in one line,
   proactively, without being told*.

   An obligation is only auditable if it leaves a trace. "Think carefully" is not
   auditable. "End every coding task with three sections" is.

2. **For each obligation, find its expected trigger.** How many times in this corpus did a
   situation arise where the rule *should* have applied? That denominator is the whole
   finding. A rule that never had an opportunity to fire is not being ignored.

3. **Count compliance.** Search the assistant messages for the trace the rule demands.

4. **Report the ratio, not the impression.** `0 of 23 opportunities` is a finding.
   "It seems like this doesn't happen much" is not.

5. **Ask why it failed.** A rule ignored at scale usually has a cause, and naming it is
   what makes the finding fixable. The usual causes, in the order worth checking:

   - **The rule points at a file that is never loaded.** A `CLAUDE.md` line saying
     "format lives in `~/.claude/skills/_plan-format.md`" only works if something reads it.
     Nothing autoloads a bare `_`-prefixed file. This is the single most common cause and
     it looks exactly like disobedience.
   - **The rule sits below the fold** in a long `CLAUDE.md`, or in a section whose heading
     doesn't match the moment it applies to.
   - **A competing rule wins.** Brevity instructions routinely beat "show a worked
     example"; a caveman/terse mode beats "explain the reasoning".
   - **The trigger is undefined.** The rule says what to do but not *when*, so it never
     resolves to a concrete moment.
   - **It is genuinely being ignored** — the rarest cause. Do not reach for it first.

## Worked example — the one that motivated this lens

`~/.claude/CLAUDE.md` says:

> Plans are structured pseudocode, not prose — types, signatures, call stacks, component
> trees, file:line labels, call-stack diffs. Format and worked examples:
> `~/.claude/skills/_plan-format.md`.

Audit shape:
- **Obligation:** any plan is pseudocode/call-stack/component-tree, not prose.
- **Trigger:** every turn that presents a plan, an approach, or an option set.
- **Compliance:** count turns containing pseudocode, a call stack, a tree, or `file:line`
  labels, versus turns presenting a plan in prose or a table.
- **Suspected cause, to be confirmed:** `_plan-format.md` is never loaded. It is not a
  skill, nothing points at it at plan time, and the `_` prefix keeps it out of the catalog.
  If so the fix is a load trigger, not a stronger sentence.

State the suspected cause as a hypothesis with its evidence. Do not assert it.

## What is not a finding here

- A rule the user broke, or waived in the conversation. Steering is theirs to override.
- A rule with zero trigger opportunities in the corpus. Say "no opportunities", not "ignored".
- "There should be a rule about X." That is a proposal, not negative space. Negative space
  is strictly about **existing** documented obligations.
- Anything you cannot tie to a quoted clause. Quote the clause, with its file and line.

## Finding format

> **`<clause, quoted, ≤15 words>`** — `CLAUDE.md:65`
> Obeyed in **0 of 23** turns that presented a plan (sessions 2026-08-04 → 2026-08-20).
> Example miss: `<session>:<timestamp>` — options given as a prose table.
> **Suspected cause:** `_plan-format.md` has no load trigger; nothing reads it at plan time.
> **Fix (design call):** point `plan`/`grill-me`/`to-spec` at it explicitly, or inline the
> three-line skeleton into `CLAUDE.md` so it needs no second file.

Axis tag: `negative-space`.
