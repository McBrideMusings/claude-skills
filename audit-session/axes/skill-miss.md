# Skill-miss lens — the skill that should have fired and didn't

## Method

1. From `analyze.py`, take **SKILLS FIRED**. `none` in a substantial session is itself a
   lead, not a clean result.
2. From `--dump-user-messages`, take what the user actually asked for.
3. For each user request, ask: does a skill in the catalog own this job? Check the live
   catalog — `ls ~/.claude/skills/*/SKILL.md` plus the compiled-in skills, which never
   appear in a directory listing (`verify`, `plan`, `whiteboard`, `coding-standards`, and
   roughly two dozen more).
4. A miss needs three things: the request matched a skill's documented trigger, the skill
   did not fire, and the work was then done ad hoc.

## Two kinds, report them separately

**Named miss** — the user said the skill's name or an obvious synonym and it still didn't
fire. This is the severe kind: the routing failed at the easiest possible input.

> Session opened with *"Can you do a skill audit analysis"*. `skill-audit` was in the
> catalog and matched by name. It never fired; 20 turns of bespoke analysis followed.

**Silent miss** — the request matched a skill's trigger phrasing without naming it, and the
work got done by hand instead.

## Why it missed — check before writing the finding

- **The skill is hidden.** `disable-model-invocation: true` means the model *cannot* reach
  it; only the user typing its name can. A "miss" on a hidden skill is not a routing bug —
  it is the design working. The finding, if any, is that hiding it was wrong.
- **The description doesn't carry the trigger.** The user's phrasing appears nowhere in it.
- **A competing skill's description is broader** and swallowed the request.
- **The skill fired later** — a delayed fire is still worth noting but is a different, milder
  finding than never firing.

Always resolve which of these it was. "Should have used X" without a cause is unfixable.

## Cost the miss

Ad-hoc work that duplicates a skill has a price. Use `analyze.py` tool costs to state it:
turns spent, dollars, tools used. A miss that cost three turns is a note; one that cost
forty is the headline.

## What is not a finding

- A skill that would have been *marginally* applicable. The bar is: a competent reader of
  the description would have fired it.
- The user explicitly steering away from a skill.
- A miss on a skill whose trigger genuinely didn't match — that is a description problem,
  and it belongs here only if you say so in those terms.

## Finding format

> **`<skill>` did not fire** on `<n>` matching requests (`<m>` of them named it outright).
> First: `<session>:<timestamp>` — *"<quoted request, ≤12 words>"*.
> Cost of the ad-hoc path: `<turns>` turns, `$<x>`.
> **Cause:** `<hidden / description gap / competing skill / delayed>` — evidence.
> **Fix:** `<add trigger phrasing / unhide / narrow the competitor>`.

Axis tag: `skill-miss`.

**Before writing the `Fix:` line, test it against both fix shapes.**
**Enforceable?** — [../HOOKS.md](../HOOKS.md). Name the event and predicate plus simulated fires/precision if a hook could enforce this; if not, say why.
**Right shape?** — [../SKILL-SHAPE.md](../SKILL-SHAPE.md). If the finding is about a skill, walk the ladder (delete → hide/relocate → reword → combine/embed → split/disclose → load trigger) and name the rung.
**Should it have prompted?** — [../PERMISSIONS.md](../PERMISSIONS.md). If the finding involves a permission prompt or denial, pick the shape (allow rule / deny+allow pair / wrapper tool) and name what stays denied.
Say which shape you rejected and why. Prefer the fix that removes the condition over one that guards it.
