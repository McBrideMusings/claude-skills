---
name: lateral
description: "Lateral thinking toolkit router — when you're stuck, going in circles, need fresh ideas, or standard brainstorming keeps producing predictable results, this diagnoses the symptom and applies the right technique from the toolkit (random-stimulus, provocation, inversion, concept-fan, analogy, scamper, six-hats, worst-idea). Triggers include \"lateral thinking\", \"I'm stuck on a creative problem\", \"we're going in circles\", \"need fresh ideas\", \"try a different angle\", \"break out of the box\", \"ideas all feel the same\", \"predictable brainstorm\", and the technique names themselves — \"random stimulus\", \"random word\", \"force-fit\", \"de Bono\", \"po\", \"provocation\", \"invert\", \"flip the assumption\", \"concept fan\", \"what is this a way of doing\", \"forced analogy\", \"scamper\", \"give me variations\", \"six hats\", \"thinking hats\", \"worst idea\", \"reverse brainstorming\". Do NOT use for analytical work like debugging, code review, or implementation tasks."
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

## Routing procedure

1. **Diagnose.** Match the user's symptom to the table. If the symptom is unclear, ask exactly one focused question — do not interrogate. If the user named a technique directly, skip diagnosis and run it.
2. **Pick exactly one technique.** Never route to a second technique in the same pass. If another looks promising, offer it as a next move once the first has finished.
3. **Read `techniques/<technique>.md`** — relative to this file — **and follow it inline.** Do not invoke it as a separate skill; read the file and execute its workflow yourself, including its honesty mechanics. Each technique file links its own reference material under `references/` and a real worked session under `examples/`; read the reference when the workflow says to.
4. **Refuse analytical work** politely. Debugging, code review, and implementation are not creative targets. Suggest an analytical approach instead. Redesigning or ideating about such a process is a valid creative target: "reinvent our code-review ritual" is in scope; "review this PR" is not.

If the target itself is unclear, the chosen technique's own Step 1 will ask for it. Do not ask twice.

## Layout

```
lateral/
  SKILL.md          <- this router; the only file loaded by default
  techniques/       <- the eight technique workflows, one file each
  references/       <- stimulus pools, domain pool, question bank, Po templates, hats guide
  examples/         <- one real worked session per technique
```

## What NOT to do

- **Don't run two techniques in one pass.** Offer the second as a next move.
- **Don't skip the chosen technique's honesty mechanics.** The visible abandonments are the point; a session where everything works is a session that was faked.
- **Don't push the user toward a decision.** These techniques diverge. Convergence belongs to the user.
- **Don't route analytical work anywhere.** Refuse it and say why.

## Provenance

Imported from [danium/lateral-thinking](https://github.com/danium/lateral-thinking) (MIT — see `LICENSE`), restructured from nine top-level skills into this one router plus sub-files. Technique, reference, and example content is unmodified apart from repointed relative links.
