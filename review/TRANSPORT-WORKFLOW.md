# Transport: workflow

An override for **Phases 04 → 04b → 05 → 05b → 06 → 06b → 06c only** — the lens fan-out, the best-practice verification, the scoring, the reproduction gate, the filter, and fix authoring. Everything before and after stays exactly where it is.

Selected by the `workflow` token in the arguments: `review workflow`, `review repo workflow`, `review dual workflow`. **That token is the human's request for the `Workflow` tool** — do not reach for it otherwise. No token means the session transport, which is [REVIEW-CORE.md](REVIEW-CORE.md) unchanged.

## What stays in the session, and why

| Phase | Where | Why |
|---|---|---|
| 00 routing, 01/01a/01r scope | session | reads git state and may have to ask; a workflow can take no input |
| 03c intent | either | one agent, one round; run it in the session when its table is wanted in chat, or as the workflow's first stage when it isn't |
| **04, 04b, 05, 05b, 06, 06b, 06c** | **the workflow** | the fan-out — this is the whole point |
| 07 report, disposition offers | session | RULE 0's typed-keyword questions live here |

**RULE 0 is not weakened by this transport.** Nothing inside the workflow asks the user anything, because nothing inside it ever needed to — every question in a review pass happens before Phase 04 or after Phase 06. If a lens turns out to need the user, that is a Phase 03-shaped problem (find the spec, confirm the scope) and it gets resolved in the session before launching.

`review dual`'s cross-vendor delegate runs in a Terminal window through the `dispatch` router, **outside** the workflow, concurrently with it. Reconcile the two afterwards exactly as REVIEW-CORE.md says.

## What it buys

1. **The barrier between Phase 04 and Phase 05 disappears.** Today every lens must return before scoring starts, so the slowest lens holds up the scoring of the fastest one's findings. `pipeline()` starts scoring a lens's findings the moment *that* lens returns.
2. **The findings never enter this context until the report.** Today nine-plus lens reports at up to 400 words each, plus a scoring result per issue, all land in the parent window before anything is filtered. Under this transport only the surviving findings come back. This is the bigger win, and it is why `review repo` — the context-heaviest mode there is — benefits most.

## The script

```js
export const meta = {
  name: 'review-lenses',
  description: 'Run every review lens over a diff, score each finding, verify the behavior claims, propose fixes for survivors',
  phases: [{ title: 'Lenses' }, { title: 'Score' }, { title: 'Verify' }, { title: 'Fix' }],
}

const scored = await pipeline(
  args.lenses,
  lens => agent(lens.brief, { label: lens.axis, phase: 'Lenses', model: 'sonnet', schema: FINDINGS }),
  (r, lens) => parallel((r?.findings ?? []).map(f => () =>
    agent(SCORE(f, args.falsePositives), { label: `score:${lens.axis}`, phase: 'Score', model: 'haiku', schema: SCORE_RESULT })
      .then(s => ({ ...f, axis: lens.axis, score: s?.score ?? 0 })))),
)

const candidates = scored.flat().filter(Boolean)

// Phase 05b — strictly sequential: every finding shares one scratch worktree.
const verdicts = []
for (const f of candidates.filter(f => QUALIFIES(f) && f.score > 0)) {
  verdicts.push(await agent(VERIFY(f, args.scope), { label: `verify:${f.axis}`, phase: 'Verify', model: 'sonnet', schema: VERDICT }))
}
const graded = APPLY_VERDICTS(candidates, verdicts.filter(Boolean))

const survivors = graded.filter(f => f.score >= 75 && f.tier !== 3)
if (!survivors.length) return []

const fixed = await agent(FIXES(survivors, args.intent, args.scope), { label: 'fixes', phase: 'Fix', model: 'sonnet', schema: FIXES_RESULT })
return survivors.map(f => ({ ...f, ...(fixed?.byId?.[f.id] ?? {}) })).filter(f => !f.retracted)
```

- **`args.lenses`** is assembled in the session, one entry per lens that REVIEW-CORE.md Phase 04 says should run — the `axes/` files that survived gating, the always-on non-scored one, and any platform/domain lens detected. Each entry's `brief` is that file's content **plus every forwarded directive Phase 04 already requires**: the writing-style rules verbatim, `IS_DRAFT`, the spec source, the exact diff scope, the under-400-words cap, and the injection-defense directive. Pass it as real JSON, never a JSON-encoded string.
- **The injection-defense directive is not optional here either.** Workflow agents inherit no more of this skill's context than Agent-tool subagents do.
- **Models are pinned per stage** exactly as REVIEW-CORE.md pins them — Sonnet for lenses, Haiku for scoring. `agent()`'s enum includes `fable`; it is never used.
- **The `≥ 75` filter is Phase 06** and stays in the script so sub-75 findings never travel. Phase 06's inline-scorer clause does not apply — the fan-out ran by definition.
- **The verify loop is a `for`, not a `parallel()`, and that is deliberate.** Every finding shares one scratch worktree, so two concurrent verifiers would reset the tree out from under each other. It is the one stage in this script that must not fan out. Its agent needs Bash; it creates, resets, and removes the worktree exactly as Phase 05b specifies, and it must clean up even when it throws.
- **`args.intent`** is the Phase 03c table, passed as real JSON. Each lens entry's `brief` already carries it or does not, per the Phase 04 table in [REVIEW-CORE.md](REVIEW-CORE.md) — the workflow forwards briefs, it does not decide which lenses see intent. It reaches the Fix stage separately so the fix author can quote the postcondition a fix restores.
- **The Fix stage runs once, after the filter — never inside `pipeline()`.** A fix stage that started early would be writing fixes for findings that had not been filtered yet, which is the exact configuration the split exists to remove. `retracted` findings — ones the fix author concluded were not real — are dropped here and never reach Phase 07.

## Phase 04b, which does not fit the pipeline

The best-practice lens emits *flags* needing live doc lookups, and it is gated off for most diffs. Two options, in order of preference:

1. **Leave it in the session.** If the best-practice lens is gated off — the common case — there is nothing to do. If it ran, hold its flags out of the workflow's return and verify them in the session against live docs, then score them there.
2. **Give it its own stage** with WebSearch/WebFetch available to the agent, between the lens stage and the score stage, for that one lens only.

Do not let a flag reach the report unverified because the transport made verification awkward. An unverified flag is not a finding.

## Reading the result

One `<task-notification>` when the run returns; the return value is the surviving findings array, straight into context. Hand it to Phase 07 and continue in the session.

`null` entries mean an agent died — a lens that never ran is not a lens that found nothing. **Name any dead lens in the report**; a silently missing axis reads as a clean bill of health for that axis.

The tool result gives the persisted script path and a `runId`. A run that lost one lens to an API error resumes with `resumeFromRunId` — the lenses that already returned come back cached, and only the dead one re-runs. Same session only.
