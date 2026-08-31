---
name: lateral
description: "Lateral thinking when idea generation is stuck — every option feels the same, a constraint feels unbreakable, or the stated need is the wrong problem. Runs exactly one technique. Never for debugging, review, or implementation."
---

# Lateral

## What this does

Being stuck has shapes. Ideas that all feel the same is a different problem from a constraint that feels unbreakable, which is different again from suspecting you are solving the wrong problem. Each shape has a technique that fits it.

This skill diagnoses the symptom, picks exactly one technique, and runs it inline. It is a router, not a technique of its own.

## Decision table

| Symptom | Technique |
|---|---|
| Ideas all feel the same; brainstorm output is predictable | `random-stimulus` |
| A constraint or rule feels unbreakable | `provocation` |
| Requirements assume things nobody has questioned | `inversion` |
| We might be solving the wrong problem | `concept-fan` |
| The solution works but feels derivative | `analogy` |
| We have one idea and need variations | `scamper` |
| A decision is being made too fast / everyone agrees | `six-hats` |
| Everything feels timid, safe, cautious | `worst-idea` |

## RULE 0 — stay narrow, and stand down when you were fired at nothing

This skill is model-invocable, so it can arrive uninvited. **Being loaded is not evidence it applies.** Before anything else, check the target against the one thing this does: generating ideas that do not already exist.

**Stand down in one line and hand the turn back** — no technique, no decision table, no offer — when the work is analytical: debugging, code review, implementation, research, a factual lookup, or any task with a correct answer to be found rather than options to be invented. Debugging, code review, and implementation are not creative targets. *Redesigning* such a process is a valid target ("reinvent our code-review ritual" is in scope; "review this PR" is not).

Also stand down when the caller is not actually stuck. A first pass at a problem is not stuck. Stuck has a symptom, and the symptom is in the table below — if none of them is present, say so and stop.

## Routing procedure

1. **Diagnose.** Match the user's symptom to the table. If the symptom is unclear, ask exactly one focused question — do not interrogate. **If a technique was named — by the user or by a calling skill (`lateral <technique>`) — skip diagnosis entirely and run that one.** A caller that names a technique has already diagnosed; re-deciding overrides a decision made with more context than you have.
2. **Pick exactly one technique.** Never route to a second technique in the same pass. If another looks promising, offer it as a next move once the first has finished.
3. **Read `techniques/<technique>.md`** — relative to this file — **and follow it inline.** Do not invoke it as a separate skill; read the file and execute its workflow yourself, including its honesty mechanics. Each technique file links its own reference material under `references/` and a real worked session under `examples/`; read the reference when the workflow says to.

If the target itself is unclear, the chosen technique's own Step 1 will ask for it. Do not ask twice.

## Layout

```
lateral/
  SKILL.md          <- this router; the only file loaded by default
  techniques/       <- the eight technique workflows, one file each
  references/       <- stimulus pools, domain pool, question bank, Po templates, hats guide
  examples/         <- one real worked session per technique
```

## Other skills invoke this with a technique already named

Three hosts use these techniques. Each has already diagnosed by the time it calls, so each invokes `lateral <technique>` and RULE 0's step 1 runs that one without re-deciding. None of them copies the content:

| Host | Techniques it reads | Where |
|---|---|---|
| `improve` | the five generators — provocation, random-stimulus, analogy, scamper, worst-idea | [`../improve/LATERAL-LENS.md`](../improve/LATERAL-LENS.md) maps aspect → technique, forwarded to every survey aspect |
| `grill-me` | the two reframers — inversion, concept-fan | its "Assumption-breaking lenses" section |
| `spike` | scamper, random-stimulus | UI.md Phase 03, when the variant set collapses onto one axis |

`six-hats` has no host: it converges a decision, and every host above diverges. It stays here.

**Any change to a technique file changes those hosts too.** Keep the workflows self-contained — a host reads one `techniques/*.md` and nothing else from this skill unless that file names it.

## What NOT to do

- **Don't run two techniques in one pass.** Offer the second as a next move.
- **Don't skip the chosen technique's honesty mechanics.** The visible abandonments are the point; a session where everything works is a session that was faked.
- **Don't push the user toward a decision.** These techniques diverge. Convergence belongs to the user.
- **Don't route analytical work anywhere.** See RULE 0.

## Provenance

Imported from [danium/lateral-thinking](https://github.com/danium/lateral-thinking) (MIT — see `LICENSE`), restructured from nine top-level skills into this one router plus sub-files. Technique, reference, and example content is unmodified apart from repointed relative links.
