---
name: lateral
description: "Lateral thinking toolkit — diagnoses what kind of stuck you are and runs one technique inline (random-stimulus, provocation, inversion, concept-fan, analogy, scamper, six-hats, worst-idea). User-invoked only."
disable-model-invocation: true
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

## Other skills read `techniques/` directly

This router is user-invoked (`disable-model-invocation: true`), so nothing auto-fires it. The techniques still reach work through three hosts that read the files here on demand — they do **not** invoke this skill, and they do not copy its content:

| Host | Techniques it reads | Where |
|---|---|---|
| `improve` | the five generators — provocation, random-stimulus, analogy, scamper, worst-idea | [`../improve/LATERAL-LENS.md`](../improve/LATERAL-LENS.md), forwarded to every survey aspect |
| `grill-me` | the two reframers — inversion, concept-fan | its "Assumption-breaking lenses" section |
| `prototype` | scamper, random-stimulus | UI.md Phase 03, when the variant set collapses onto one axis |

`six-hats` has no host: it converges a decision, and every host above diverges. It stays here.

**Any change to a technique file changes those hosts too.** Keep the workflows self-contained — a host reads one `techniques/*.md` and nothing else from this skill unless that file names it.

## What NOT to do

- **Don't run two techniques in one pass.** Offer the second as a next move.
- **Don't skip the chosen technique's honesty mechanics.** The visible abandonments are the point; a session where everything works is a session that was faked.
- **Don't push the user toward a decision.** These techniques diverge. Convergence belongs to the user.
- **Don't route analytical work anywhere.** Refuse it and say why.

## Provenance

Imported from [danium/lateral-thinking](https://github.com/danium/lateral-thinking) (MIT — see `LICENSE`), restructured from nine top-level skills into this one router plus sub-files. Technique, reference, and example content is unmodified apart from repointed relative links.
