# Spend lens — where the tokens went, and which of it bought nothing

## The shape of the bill, before you look at anything else

In every corpus measured so far, **cache-read is 80%+ of spend** — context re-sent on every
turn. Output is a rounding error: ratios of 200–400 re-read tokens per token produced are
normal. So the lever is *what sits in the window*, never *how much the model writes*.

Three places the money actually is, in order:

1. **The fixed preamble** — system prompt, `CLAUDE.md`, skill catalog, plugin surface, hooks.
   Paid on every single turn of every session, forever. `analyze.py` reports the median
   first-turn context. At N turns/month, 1,000 preamble tokens costs `N × 1500 / 1e6` per
   month; compute N from the corpus.
2. **Turns at very high context.** A turn at 500k pays ~$0.75 in cache-read before the model
   writes a word. `analyze.py`'s context-band table shows the distribution. 15–25% of spend
   sitting above 500k is common and is nearly always avoidable.
3. **Turn count on a fat context.** Every tool call re-pays the whole window. A session
   averaging 280k pays ~$0.42 per `git status`.

## What to look for

- **Preamble that is larger than the work.** Compare median first-turn context against what
  the sessions actually did.
- **Context that never gets shed.** A long session that entered a 400k+ band and stayed
  there. Ask what pinned it: a giant file read whole, a build log, a screenshot, an
  un-summarised search dump.
- **Sub-agent share.** Counter-intuitive result to expect: sub-agents are usually 9–16% of
  spend while being 40–50% of turns, because workers run at half the orchestrator's context.
  **Low sub-agent share is a finding, not a virtue** — it means the conductor did work that
  a cheap worker should have.
- **Tool cost concentration.** `analyze.py` attributes spend to the turn that issued each
  tool. `Bash` dominating is normal; `Bash` dominating *and* mostly being `grep`/`cat` that
  a sub-agent could have absorbed is a finding.
- **Model tier.** Mechanical work on the expensive tier.

## Efficiency is not the same as frugality

A session that spent a lot and produced a landed, verified change is efficient. A session
that spent little and produced a wrong answer twice is not. **Say which you are looking at.**
Never file "this session was expensive" as a finding on its own — pair every spend claim
with what it bought.

The failure mode this lens must avoid is recommending less work. The recommendation is
always *the same work at lower context*, never *less work*.

## What is not a finding

- Raw cost with no counterfactual. If you cannot name a cheaper path that gets the same
  outcome, there is no finding.
- List-price dollars presented as a bill. They are a ranking unit; say so every time.
- Wall-clock. That is the `friction` lens, and most of it is the user being away.

## Finding format

> **`<what>` cost `$<x>` (`<pct>`% of the corpus).**
> Mechanism: `<e.g. 68k preamble × 55,363 turns>`.
> Cheaper path that gets the same outcome: `<specific>`.
> Recovers ≈ `$<y>`/month at `<N>` turns/month.

Axis tag: `spend`.

**Before writing the `Fix:` line, test it against both fix shapes.**
**Enforceable?** — [../HOOKS.md](../HOOKS.md). Name the event and predicate plus simulated fires/precision if a hook could enforce this; if not, say why.
**Right shape?** — [../SKILL-SHAPE.md](../SKILL-SHAPE.md). If the finding is about a skill, walk the ladder (delete → hide/relocate → reword → combine/embed → split/disclose → load trigger) and name the rung.
Say which shape you rejected and why. Prefer the fix that removes the condition over one that guards it.
