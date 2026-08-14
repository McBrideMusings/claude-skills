# Transport: workflow

An override for **Phases 04 → 05 → 06 → 06b only** — the aspect fan-out, the scoring, the filter and merge, and the ranking. Everything before and after stays exactly where it is.

Selected by the `workflow` token in the arguments: `improve workflow`, `improve architecture tests workflow`. **That token is the human's request for the `Workflow` tool** — do not reach for it otherwise. No token means the session transport, which is [IMPROVE-CORE.md](IMPROVE-CORE.md) unchanged.

## What stays in the session, and why

| Phase | Where | Why |
|---|---|---|
| 00 routing (SKILL.md), 01 applicability | session | reads git state and the repo; cheap, and it decides what the workflow is even given |
| **02 confirm** | **session, always** | it is a question, and a workflow can take no input |
| 03 brief assembly | session | it is string building, and `args` has to be real JSON |
| **04, 05, 06, 06b** | **the workflow** | the fan-out — this is the whole point |
| 07 report, screenshot, hand-off | session | the remaining questions live here |

**RULE 0 is not weakened by this transport.** Nothing inside the workflow asks the user anything, because nothing inside it ever needed to — every question in a survey happens at Phase 02 or Phase 07. If an aspect turns out to need the user, that is a Phase 01 problem (its applicability was wrong) and it gets resolved in the session before launching.

## What it buys

1. **The findings never enter this context until the report.** Today every aspect report — up to eleven at 400 words each — plus a scoring result per finding lands in the parent window before anything is filtered. Under this transport only survivors come back. This is the bigger win, and it is why a bare `improve` on a repo with every aspect applicable benefits most.
2. **The barrier between Phase 04 and Phase 05 disappears.** Today every aspect must return before scoring starts, so `performance` — which launches and profiles the app, the slowest aspect by far — holds up the scoring of `claude-md`'s findings, which were ready in seconds. `pipeline()` scores an aspect's findings the moment *that* aspect returns.

## The script

```js
export const meta = {
  name: 'improve-survey',
  description: 'Run every applicable improve aspect over a repo, score each finding for grounding, merge duplicates, rank the survivors',
  phases: [{ title: 'Aspects' }, { title: 'Score' }, { title: 'Rank' }],
}

const scored = await pipeline(
  args.aspects,
  a => agent(a.brief, { label: a.axis, phase: 'Aspects', model: 'sonnet', schema: FINDINGS }),
  (r, a) => parallel((r?.findings ?? []).map(f => () =>
    agent(SCORE(f, args.grounding), { label: `score:${a.axis}`, phase: 'Score', model: 'haiku', schema: SCORE_RESULT })
      .then(s => ({ ...f, axis: a.axis, score: s?.score ?? 0 })))),
)

const all = scored.flat().filter(Boolean)
const survivors = MERGE_DUPLICATES(all.filter(f => f.score >= 75))
if (!survivors.length) return { survivors: [], top: null, coverage: COVERAGE(args.aspects, scored) }

const top = await agent(RANK(survivors), { label: 'rank', phase: 'Rank', model: 'sonnet', schema: TOP })
return { survivors, top, coverage: COVERAGE(args.aspects, scored) }
```

- **`args.aspects`** is assembled in the session — one entry per aspect that survived Phase 01 and the user's Phase 02 trim. Each entry's `brief` is its `aspects/` file content **plus every forwarded directive Phase 03 requires**: the finding shape, the shape rule, the grounding rule, the boundary rule, the read-only rule, the injection-defense directive, and the 400-word cap. Pass it as real JSON, never a JSON-encoded string.
- **The injection-defense directive is not optional here either.** Workflow agents inherit no more of this skill's context than Agent-tool sub-agents do.
- **`args.grounding`** is [GROUNDING.md](GROUNDING.md)'s content, verbatim, reaching every scorer. It is passed once and referenced by every `SCORE()` call rather than re-read per agent.
- **Models are pinned per stage** exactly as IMPROVE-CORE.md pins them — Sonnet for aspects, Haiku for scoring, Sonnet for the rank. `agent()`'s enum includes `fable`; it is never used.
- **The `≥ 75` filter is Phase 06** and stays in the script so sub-75 findings never travel. Phase 06's inline-scorer clause does not apply — the fan-out ran by definition.
- **`MERGE_DUPLICATES` is plain code, not an agent.** Two findings merge when they name the same file *and* the same change; the merged card carries both axis tags and the union of the evidence. Doing this in JS after the barrier is why the rank stage sits outside `pipeline()`: ranking before the merge would rank the same finding twice.
- **`COVERAGE` is plain code too.** It walks `args.aspects` against `scored` and records, per aspect, one of: `n findings`, `not applicable — <reason>`, `no findings`, or `died`. Phase 07 needs all four kinds distinguishable, and only the script knows which agents returned `null`.

## Reading the result

One `<task-notification>` when the run returns. The return value is `{ survivors, top, coverage }`, straight into context. Hand it to Phase 07 and continue in the session.

`null` entries mean an agent died — an aspect that never ran is not an aspect that found nothing, and `COVERAGE` is what keeps those apart. **Name any dead aspect in the report.** A silently missing aspect reads as a clean bill of health for it.

The tool result gives the persisted script path and a `runId`. A run that lost one aspect to an API error resumes with `resumeFromRunId` — the aspects that already returned come back cached, and only the dead one re-runs. Same session only.
