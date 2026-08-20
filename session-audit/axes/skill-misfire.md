# Skill-misfire lens — fired when it shouldn't have, or fired and added nothing

The mirror of `skill-miss`. A skill loading costs 6–8k tokens of permanent context, and
every later turn re-reads it. A skill that fires and contributes nothing is pure loss, and
it is invisible unless someone looks.

## Method

For each entry in `analyze.py`'s **SKILLS FIRED**, read the turns after the call and
classify:

**Unwanted auto-fire** — the model invoked it; the user's request didn't call for it. The
skill's description is over-broad. Highest-value finding here, because it recurs silently.

**No-op fire** — it fired, and the work that followed is indistinguishable from what would
have happened without it. Either the skill added nothing, or the model ignored it after
loading. Both are findings; say which.

**Redundant re-fire** — the same skill loaded more than once in one session. Its content
was already in context; the second load bought nothing. `analyze.py` gives the count.

**Wrong-mode fire** — the right skill, the wrong branch: a full survey where a single-aspect
run was asked for, a workflow transport where inline was cheaper.

**Cascade** — a skill fired mainly because another skill's routing told it to, and neither
was needed. Report the chain, not the leaf.

## Price every misfire

A load is ~6–8k tokens, and it is re-read on every subsequent turn in that session. So:

```
cost ≈ load_tokens × turns_remaining_in_session × $1.50 / 1e6
```

A misfire at turn 5 of a 300-turn session is expensive; the same misfire at turn 290 is
noise. Rank by that, not by count.

## What is not a finding

- The user typed the skill's name. Their call, not a misfire.
- A skill that fired, was correct, and was simply not needed *in hindsight*. The test is
  whether it was reasonable at the moment of firing, on the information then available.
- A skill that fired and produced a short answer. Short is not the same as useless.

## Finding format

> **`<skill>` fired `<n>`x, `<k>` of them `<unwanted|no-op|redundant|wrong-mode>`.**
> `<session>:<timestamp>` — fired on *"<quoted request>"*, which asked for `<X>`.
> Load cost ≈ `<tok>` tok × `<turns>` remaining turns ≈ `$<x>`.
> **Cause:** description claims `<over-broad clause, quoted>`.
> **Fix:** narrow to `<proposed clause>`, or set `disable-model-invocation: true`.

Axis tag: `skill-misfire`.

**Enforceable?** Before writing the `Fix:` line, answer the hook question — see [../HOOKS.md](../HOOKS.md). If a hook could enforce this deterministically, name the event and predicate plus its simulated fires/precision; if not, say why (trigger needs judgment, or a load trigger removes the condition instead).
