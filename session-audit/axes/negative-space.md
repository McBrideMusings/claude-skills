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
     "format lives in `~/.claude/skills/plan-format/SKILL.md`" only works if something reads it.
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
> `~/.claude/skills/plan-format/SKILL.md`.

Audit shape:
- **Obligation:** any plan is pseudocode/call-stack/component-tree, not prose.
- **Trigger:** every turn that presents a plan, an approach, or an option set.
- **Compliance:** count turns containing pseudocode, a call stack, a tree, or `file:line`
  labels, versus turns presenting a plan in prose or a table.
- **Suspected cause, since confirmed:** the format was never loaded. It lived at
  `skills/_plan-format.md`, whose `_` prefix kept it out of the catalog, and nothing pointed
  at it at plan time — 14 tool opens in 9,243 transcripts. The fix was a load trigger, not a
  stronger sentence: it became the `plan-format` skill on 2026-08-20, with `grill-me`,
  `iron-out` and `prototype` loading it at the point they write a plan.

State the suspected cause as a hypothesis with its evidence. Do not assert it.

**This example also carries the trap.** The obvious fix — a `Stop` hook that inspects the
final reply and complains when a plan has no structure — was simulated against the corpus
before being built: it fired 62 times in 13 months at **10% precision** (22 of a 30-sample
were wrap-up summaries, research briefs, and agent reports that merely contained the word
"approach"). Simulate a proposed enforcement hook against the history before writing it.

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
> **Suspected cause:** the format has no load trigger; nothing reads it at plan time.
> **Fix (design call):** point the skills that already fire at it explicitly, or inline the
> three-line skeleton into `CLAUDE.md` so it needs no second file.

Axis tag: `negative-space`.

**Before writing the `Fix:` line, test it against both fix shapes.**
**Enforceable?** — [../HOOKS.md](../HOOKS.md). Name the event and predicate plus simulated fires/precision if a hook could enforce this; if not, say why.
**Right shape?** — [../SKILL-SHAPE.md](../SKILL-SHAPE.md). If the finding is about a skill, walk the ladder (delete → hide/relocate → reword → combine/embed → split/disclose → load trigger) and name the rung.
**Should it have prompted?** — [../PERMISSIONS.md](../PERMISSIONS.md). If the finding involves a permission prompt or denial, pick the shape (allow rule / deny+allow pair / wrapper tool) and name what stays denied.
Say which shape you rejected and why. Prefer the fix that removes the condition over one that guards it.
