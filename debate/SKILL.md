---
name: debate
description: Run two agents through a structured debate on the same subject — independent answers, cross-critique, revision, then one synthesized response.
disable-model-invocation: true
---

# Debate

Two agents answer the same subject independently, critique each other, revise under that critique, and you get one merged answer. The value comes from **independence followed by controlled exchange**: neither side sees the other's work before Round 1 is complete, and nothing is editorialized in transit — responses and critiques are relayed **verbatim**.

Expensive by construction: six agent turns, and the protocol's originator reports ~430k subagent tokens and ~10 minutes for one planning run ([source gist](https://gist.github.com/steveruizok/58c00389504fde07aced87b732d19970)). That cost is why this skill is user-invoked and why Phase 01 gates on your confirmation. Don't run it on anything with a single verifiable answer; say so and answer directly instead.

## Phase 01 — resolve the subject, then gate

There is no argument grammar. Read the whole argument string as intent and resolve it by **checking**, not guessing:

| What you're looking at | Resolves to |
|---|---|
| No argument | the current conversation — the thing this session has been designing |
| `#47`, `47`, `myproj-zb8` | that issue, read from the repo's backend (`bd show myproj-zb8 --json` / `gh issue view 47`) |
| A path that exists | that file's content as the subject |
| A path under `tmp/claude/debates/` | a prior debate — carry its full record forward as prior art |
| Anything else | the text itself, verbatim, as the prompt |

Any of those may be followed by prose adding constraints (`debate tmp/claude/debates/auth-model.md also weigh the migration cost`). There is no separator to look for — the added context is whatever isn't the target.

If the target is vague, glob `<root>/tmp/claude/debates/` and offer the recent records by name. Do not invent a `list` verb for this.

**Then state the resolution back in one line and stop.** *"Debating `tmp/claude/debates/auth-model.md`, adding your migration-cost constraint — go?"* One word from the user launches it. Never spend the run against a guessed subject.

Two tokens are read out of the arguments, in prose, not by position:

- **`dual`** — side B becomes a different vendor. See [Sides](#sides).
- Nothing else. Transport is always the workflow.

## Sides

Default: both sides are `general-purpose` workflow agents — same model, same prompt, same repo.

**Because they are the same model, default mode always assigns complementary emphasis** — one sentence appended to each side's Round 1 prompt and nowhere else, e.g. *"lean conservative and minimal"* vs. *"lean ambitious and thorough."* The core prompt stays identical between sides. Without this the two Round 1 answers converge and the protocol degenerates into agreeing three times.

**`dual` mode never assigns emphasis.** Side B routes through the `delegate` router — a genuinely different system, which is where the divergence comes from. Masking it with "you lean conservative" manufactures a disagreement that isn't the vendor's real position.

Wiring for `dual`: side B's stage is still an `agent()` call, but its prompt instructs the agent to write the round's text to a prompt file, run

```
"$HOME/.claude/skills/delegate/delegate" exec --headless <prompt-file> <outfile>
```

and return the outfile's contents verbatim. `--headless` is required — a workflow agent has no business opening a Terminal window. Gate first with `delegate check`; if it fails, tell the user and fall back to default mode rather than aborting. Read [../delegate/SKILL.md](../delegate/SKILL.md) before touching this; **never call a vendor binary directly**.

Both sides are read-only for the whole debate, in both modes. The deliverable is the synthesis. Apply changes afterward, and only if the user asked for implementation.

## Phase 02 — the protocol

Three rounds, two sides. Each round needs **both** sides of the previous round, so each round is a barrier — that is the one shape where `parallel()` beats `pipeline()`.

### Round 1 — independent responses

Both sides, same prompt:

> You are one of two agents independently working on the same task. Respond to the following prompt as thoroughly and well as you can. You will later see another agent's response and be asked to critique it, so make your reasoning explicit. If the task requires reading the codebase or other research, do that research now. This is a planning task — do NOT modify files.
>
> PROMPT:
> {subject, verbatim, plus whatever context the agents need to do the task — what the repo is, any prior-debate record, the user's added constraints}
>
> {emphasis sentence — default mode only}

### Round 2 — cross-critique

Each side receives the other's Round 1:

> Here is the other agent's response to the same prompt:
>
> {other side's Round 1, verbatim}
>
> Critique it. First VERIFY its factual claims against the source (the codebase, docs, data) where feasible — a critique grounded in checked facts is worth far more than one argued from your own draft. Then identify concrete weaknesses, errors, risks, and omissions, and note anything it does better than your own response. Be specific and adversarial but fair — the goal is to improve the final answer, not to win.

### Round 3 — revise under critique

**The routing is the easy thing to cross up.** Side A receives *B's critique of A*. Side B receives *A's critique of B*. Each side gets the critique written **about its own work**, never its own critique echoed back.

Because the workflow spawns a fresh agent per round, Round 3's prompt re-feeds the whole exchange in order — the prompt, its own Round 1, the other's Round 1, its own critique of theirs, then:

> Here is the other agent's critique of YOUR original response:
>
> {other side's Round 2 critique, verbatim}
>
> You now have the full exchange in context: the prompt, both original responses, your critique of theirs, and their critique of yours. Produce your final, complete response to the original prompt. Incorporate whatever the exchange showed to be right — steal the other agent's good ideas, concede valid criticisms, and defend the choices that survived scrutiny. Your final message IS the deliverable: make it a standalone, complete response to the prompt, not a diff against your earlier draft.

## Transport: the workflow

One `Workflow` call, three phases. `Workflow` has no `SendMessage` — `agent()` always spawns fresh — so the transcript is re-fed each round rather than accumulating in one agent's context. Same information, no carried-over reasoning.

```js
export const meta = {
  name: 'debate',
  description: 'Two agents answer the same subject independently, cross-critique, then revise',
  phases: [{ title: 'Round 1' }, { title: 'Round 2' }, { title: 'Round 3' }],
}

const SIDES = [0, 1]
const other = i => 1 - i
const name = i => (i ? 'B' : 'A')

const speak = (i, body, phase) =>
  agent(args.dual && i === 1 ? args.delegateWrap(body) : body,
        { label: `${phase}:${name(i)}`, phase })

const r1 = await parallel(SIDES.map(i => () => speak(i, args.round1[i], 'Round 1')))
if (r1.some(x => !x)) return { failed: 'Round 1', r1 }

const r2 = await parallel(SIDES.map(i => () =>
  speak(i, args.round2(r1[other(i)]), 'Round 2')))
if (r2.some(x => !x)) return { failed: 'Round 2', r1, r2 }

const r3 = await parallel(SIDES.map(i => () =>
  speak(i, args.round3(r1[i], r1[other(i)], r2[i], r2[other(i)]), 'Round 3')))

return { r1, r2, r3 }
```

- **`args.round1`** is a two-entry array — identical core prompt, differing only by the emphasis sentence in default mode. Build it in the session and pass it as real JSON, never a JSON-encoded string.
- **The barriers are load-bearing.** Round 2 cannot start until both Round 1 answers exist; Round 3 needs both critiques. This is the documented exception to preferring `pipeline()`.
- **`null` means an agent died.** A round with a missing side is not a debate — return early, name the broken round, and synthesize from what survived rather than restarting from scratch. Resume with `resumeFromRunId` if the loss was a transient API error; the returned rounds come back cached.
- **Agents inherit none of this skill's context.** Everything a side needs goes in its prompt.

## Phase 03 — synthesis

You hold both Round 3 answers. Write **one** unified response:

- Merge them — best structure, ideas, and details from each. Not a side-by-side comparison.
- Where the sides converged after debate, present that consensus with confidence. Convergence after adversarial exchange is a real signal, and heavy convergence is normal — report it as such rather than manufacturing disagreement.
- Where they still disagree, don't paper over it: state the disagreement, both positions briefly, and give your own recommendation with reasoning.
- Note in a sentence or two — not a play-by-play — anything notable from the exchange: a serious error one side caught, or a point that flipped under critique.

Do not dump both final answers on the user unless they ask.

## Phase 04 — the record

Write the full debate to `<root>/tmp/claude/debates/<subject-slug>.md`, in order: subject, resolved context, mode (`default` / `dual` + vendor), both Round 1 responses, both Round 2 critiques, both Round 3 finals, synthesis. The rounds are the point — a follow-up debate's most useful material is what was conceded and why, which a synthesis-only record throws away.

Resolve `<root>` with `git rev-parse --show-toplevel` in its own Bash call (fallback: absolute `pwd`), `mkdir -p` the directory, and pass absolute paths everywhere. Follow the shared tmp-file age-pruning policy: when writing a new record, delete debate records older than 30 days from the same directory.

Print the synthesis to chat — the record is a saved copy, not a substitute. Give the record's full absolute path on its own line, no trailing punctuation.
