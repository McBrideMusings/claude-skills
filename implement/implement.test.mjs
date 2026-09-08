// Tests the one thing implement.js decides for itself: whether the work it just
// produced is ready for the caller to land, and what it says when it is not.
//
// A real pass costs roughly 450k tokens, so this logic would otherwise be
// untested and would drift. It has drifted before: the script used to infer
// "swarm worker" from `worktree` being set, which is a fact about the path and
// not about the role, and every pass in a worktree silently stopped closing its
// issue or landing its branch. The pass no longer closes or lands anything —
// these cases pin down what it reports instead, because that report is now the
// only thing standing between a broken change and the caller merging it.
//
// Run:  node skills/implement/implement.test.mjs
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SRC = readFileSync(new URL('./implement.js', import.meta.url), 'utf8').replace(
  /^export const meta/m,
  'const meta',
)

// Evaluates a script's `meta` literal in isolation, with no globals injected
// — this is what proves it is still a pure literal (no `args`, no
// interpolation), the same property name-pass.sh must preserve.
const metaOf = (src) => {
  const body = src.replace(/^export const meta/m, 'const meta')
  const closeIdx = body.indexOf('\n}')
  const literal = body.slice(0, closeIdx + 2)
  return new Function(`${literal}\nreturn meta`)()
}

// Stub returns keyed by phase, so a case overrides only the phase it cares
// about (e.g. Verify -> SKIP) and inherits a happy path for the rest. A stub
// may be a plain object (returned on every call to that phase) or a function
// `(callNumber, prompt) => result`, for a case that needs the fix loop to see
// a different result on its second or third pass through a phase.
const HAPPY = {
  Plan: {
    files: [{ path: 'a.ts', why: 'the change' }],
    approach: 'edit a.ts',
    // `base_sha` must look like a real sha: the script rejects anything else
    // at Plan, and a stub without it halts every case here before it reaches
    // the behaviour under test.
    base_sha: '25bee4a1c3d5f7908badc0ffee1234567890abcd',
  },
  Implement: { touched: ['a.ts'], summary: 'edited a.ts', green: true, attempts: 1 },
  Review: { reviewed: true, findings: [], files_reviewed: ['a.ts'] },
  Verify: {
    verdict: 'PASS',
    evidence: 'drove the CLI, saw the row',
    recheck: [{ cmd: 'npm test -- a.test.ts', expect: '3 passing' }],
  },
  Wrap: { committed: true, pushed: false, landed: false, commit: 'abc1234', branch: 'feat/x' },
}

async function run(args, overrides = {}) {
  const stubs = { ...HAPPY, ...overrides }
  const calls = []
  const prompts = []
  // Every `agent()` call's full options object, in call order — lets a case
  // assert on `model` (or any other option) without adding a bespoke array
  // per option. Keyed by call order, not phase, so a phase called more than
  // once (a fix round retrying Implement, or salvage reusing an earlier
  // phase name) still records each call.
  const callOpts = []
  const callCounts = {}
  // The runtime evaluates the script as an async function body with these
  // globals injected, which is why top-level `return` is legal in it.
  const body = new (async function () {}).constructor(
    'args',
    'agent',
    'parallel',
    'pipeline',
    'log',
    'phase',
    'workflow',
    SRC,
  )
  let current = 'Plan'
  const result = await body(
    args,
    async (prompt, opts) => {
      const p = (opts && opts.phase) || current
      calls.push(p)
      prompts.push({ phase: p, prompt })
      callOpts.push({ phase: p, opts })
      callCounts[p] = (callCounts[p] || 0) + 1
      const stub = p in stubs ? stubs[p] : {}
      // `in` rather than `??` so a case can stub an explicit `null`/`undefined`
      // return (e.g. simulating a swallowed 529) without it being papered over
      // by the happy-path fallback — `null ?? {}` would silently become `{}`.
      return typeof stub === 'function' ? stub(callCounts[p], prompt) : stub
    },
    async () => [],
    async () => [],
    () => {},
    (t) => {
      current = t
    },
    async () => ({}),
  )
  return { result, calls, prompts, callOpts }
}

const RESOLVED = { id: 'proj-1', title: 'A thing', body: 'do it' }
const BASE = { resolved: RESOLVED, repo: '/tmp/repo' }
let failures = 0
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) {
    failures++
    console.log(`FAIL  ${name}\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`)
  } else {
    console.log(`PASS  ${name}`)
  }
}

// In a worktree the pass also demands the Verify stage wrote its verdict file
// and reported the path back, so a worktree stub has to carry one.
const WT_VERIFY = { ...HAPPY.Verify, verdict_path: '/private/tmp/claude/wt/verify/proj-1.json' }

// 1. The happy path: nothing stands in the way, so the caller may land it.
const clean = await run({ ...BASE, worktree: '/tmp/wt' }, { Verify: WT_VERIFY })
check('a clean pass reports no blockers', clean.result.blockers, [])
check('  ...and reports ok', clean.result.ok, true)
check('  ...with rounds: 1', clean.result.rounds, 1)

// 1b. cc-rh2q: every `agent()` call in a full pass must pin `model` — an
// unpinned call inherits whatever model the ORCHESTRATOR session runs on, so
// a pass launched from an Opus session silently runs an Opus agent for that
// stage. This fails loudly the moment a new stage, or an edited one, drops
// `model` from its options object.
check('  ...and the happy path actually makes some calls', clean.callOpts.length > 0, true)
check(
  'every agent() call in a full pass carries a model',
  clean.callOpts.map((c) => `${c.phase}:${Boolean(c.opts && c.opts.model)}`),
  clean.callOpts.map((c) => `${c.phase}:true`),
)

// 2. The pass never closes an item and never lands a branch, whatever it is
//    given. There is no argument that turns either back on. A pass with no
//    authority cannot close the wrong thing.
check('no Track stage exists', clean.calls.includes('Track'), false)
check('  ...and reports no landing claim of any kind', 'landed' in clean.result, false)

// 3. The caller needs the worktree path back to run the recheck in it.
check('the worktree comes back', clean.result.worktree, '/tmp/wt')
check('  ...with no worktree, the field is null, never absent', (await run(BASE)).result.worktree, null)

// 4. The recheck recipe is the contract the caller's verify loop runs against.
check('recheck comes back verbatim', clean.result.recheck, [
  { cmd: 'npm test -- a.test.ts', expect: '3 passing' },
])
const noRecipe = await run(BASE, { Verify: { verdict: 'PASS', evidence: 'looked' } })
check('a missing recipe is [] and not undefined', noRecipe.result.recheck, [])

// 5. missing `args.resolved` halts at resolve before any `agent()` call — the
//    chat session resolves and gates the item now; this pass has nothing to
//    fetch if it wasn't handed one.
const noResolved = await run({ repo: '/tmp/repo' })
check('missing args.resolved halts at resolve', noResolved.result.ok, false)
check('  ...naming the resolve stage', noResolved.result.halted_on, 'resolve')
check('  ...before any agent() call', noResolved.calls.length, 0)

const emptyId = await run({ repo: '/tmp/repo', resolved: { id: '  ', title: 'x', body: 'y' } })
check('an all-whitespace id halts at resolve too', emptyId.result.halted_on, 'resolve')

// 5b. cc-epmq: a string-valued `acceptance` passes a naive `.length` guard (a
// string has one) and used to die four stages later inside Verify's prompt
// on `.map is not a function`. It must halt here instead, before Plan ever
// runs, naming the field — and it must not be silently coerced into a
// one-element array.
const stringAcceptance = await run({
  repo: '/tmp/repo',
  resolved: { ...RESOLVED, acceptance: 'a sentence' },
})
check('a string-valued acceptance halts at resolve', stringAcceptance.result.halted_on, 'resolve')
check('  ...naming the acceptance field', /acceptance/.test(stringAcceptance.result.detail), true)
check('  ...before any agent() call', stringAcceptance.calls.length, 0)

// 5c. cc-epmq: a `files` entry outside `args.repo` is only discovered four
// stages in, when Implement tries and fails to edit it. It must halt at
// resolve instead, naming the offending path — but only when some other real
// repo actually tracks that path. `CLAUDE.md` is genuinely tracked in
// `/Users/pierce/.claude`, the documented trap this check is meant to catch,
// so pointing an unrelated temp repo's brief at it proves the cross-repo
// case without guessing at ownership.
const outsideRepoDir = mkdtempSync(join(tmpdir(), 'implement-outside-repo-'))
try {
  execFileSync('git', ['-C', outsideRepoDir, 'init', '-q'])
  execFileSync('git', ['-C', outsideRepoDir, 'config', 'user.email', 'test@example.com'])
  execFileSync('git', ['-C', outsideRepoDir, 'config', 'user.name', 'Test'])
  const trackedFile = join(outsideRepoDir, 'tracked.ts')
  execFileSync('bash', ['-c', `printf 'x' > '${trackedFile}'`])
  execFileSync('git', ['-C', outsideRepoDir, 'add', 'tracked.ts'])
  execFileSync('git', ['-C', outsideRepoDir, 'commit', '-q', '-m', 'init'])

  const outsideFile = await run({
    repo: outsideRepoDir,
    resolved: { ...RESOLVED, files: ['CLAUDE.md'] },
  })
  check('a files entry outside args.repo halts at resolve', outsideFile.result.halted_on, 'resolve')
  check('  ...naming the offending path', outsideFile.result.detail.includes('CLAUDE.md'), true)
  check('  ...before any agent() call', outsideFile.calls.length, 0)

  // A path tracked nowhere at all is the ORDINARY case of a file this pass
  // hasn't created yet, not evidence of a mis-scoped brief — it must not
  // halt.
  const newFile = await run({
    repo: outsideRepoDir,
    resolved: { ...RESOLVED, files: ['brand-new-file.ts'] },
  })
  check('a files entry tracked nowhere does not halt', newFile.result.halted_on, undefined)
} finally {
  rmSync(outsideRepoDir, { recursive: true, force: true })
}

// 6. SKIP means verification could not reach the surface, and it does not
//    retry — nothing about running Implement again would make the behaviour
//    observable. One round, and the caller is told not to land it.
const skipped = await run(BASE, { Verify: { verdict: 'SKIP', evidence: 'no surface to drive' } })
check('SKIP blocks landing', skipped.result.blockers, ['verification returned SKIP, not PASS'])
check('  ...without retrying', skipped.calls.filter((c) => c === 'Implement').length, 1)
check('  ...and still reaches Wrap', skipped.calls.includes('Wrap'), true)

// 7. Verified, but nothing was committed — there is no work to land.
const nothing = await run(BASE, { Wrap: { committed: false, landed: false } })
check('an empty commit blocks landing', nothing.result.blockers, ['nothing was committed'])

// 8. A halt before Wrap returns a halt, not a result. The caller distinguishes
//    the two by `ok`, so a halt that reported `ok: true` would read as a pass
//    with no blockers — the one shape that gets broken work merged. A `FAIL`
//    that never clears retries up to the cap, then halts and salvages the
//    worktree — the same guarantee the old immediate halt gave, moved to the
//    end of the loop instead of the first round.
const failedVerify = await run(
  { ...BASE, worktree: '/tmp/wt' },
  { Verify: { verdict: 'FAIL', failures: ['row never rendered'], verdict_path: WT_VERIFY.verdict_path } },
)
check('a FAIL verdict on every round halts after the cap', failedVerify.result.ok, false)
check('  ...naming the stage it halted on', failedVerify.result.halted_on, 'verify')
check('  ...after exactly 3 rounds', failedVerify.calls.filter((c) => c === 'Implement').length, 3)
check('  ...and the salvage call was made', failedVerify.calls.filter((c) => c === 'Verify').length, 4)
check('  ...and never reaches Wrap', failedVerify.calls.includes('Wrap'), false)

// 9. Wrap is the only stage that commits. If Implement reports it committed
//    anyway — the exact shape observed on cc-22k round 2, where the Edit
//    stage committed and Verify's `verified_parent` then read the branch head
//    instead of its parent — the pass must halt right there, before Review or
//    Verify ever run on a tree they no longer expect.
const implCommitted = await run(BASE, { Implement: { ...HAPPY.Implement, committed: true } })
check('an Implement stage that committed halts the pass', implCommitted.result.ok, false)
check('  ...naming the implement stage', implCommitted.result.halted_on, 'implement')
check('  ...never reaching Review', implCommitted.calls.includes('Review'), false)
check('  ...never reaching Verify', implCommitted.calls.includes('Verify'), false)
check('  ...never reaching Wrap', implCommitted.calls.includes('Wrap'), false)

// 10. An empty diff with nothing committed is a clean false start, not a
//     defect — it halts the pass rather than letting Verify inspect an
//     unchanged tree.
const emptyTouched = await run(BASE, {
  Implement: { touched: [], summary: '', green: true, attempts: 1, unresolved: ['blocked on a design call'] },
})
check('an empty touched list halts the pass', emptyTouched.result.ok, false)
check('  ...naming the implement stage', emptyTouched.result.halted_on, 'implement')
check('  ...naming what stopped it', /blocked on a design call/.test(emptyTouched.result.detail), true)

// 11. Six failed attempts with no reduction is a halt, not a lie that ships
//     red code.
const notGreen = await run(BASE, {
  Implement: { touched: ['a.ts'], summary: 'edited a.ts', green: false, attempts: 6, remaining: ['still red'] },
})
check('green:false halts the pass', notGreen.result.ok, false)
check('  ...naming the implement stage', notGreen.result.halted_on, 'implement')
check('  ...naming what is still failing', /still red/.test(notGreen.result.detail), true)

// 12. Prose alone failed to stop stages committing before (the cc-fyt finding
//     this pass exists to fix), so the Implement and Review prompts each
//     carry an explicit no-commit sentence, in the same words every time —
//     naming Wrap as the only stage that commits and `git commit` by name.
const promptRun = await run({ ...BASE, worktree: '/tmp/wt' }, { Verify: WT_VERIFY })
for (const stagePhase of ['Implement', 'Review']) {
  const p = promptRun.prompts.find((x) => x.phase === stagePhase).prompt
  check(`the ${stagePhase} prompt names git commit as forbidden`, p.includes('no `git commit`'), true)
  check(`  ...and names Wrap as the only stage that commits`, /Wrap is the only stage that commits/.test(p), true)
}

// 13. cc-5b8: a stage agent has no `Agent` tool and cannot spawn a subagent,
//     so neither `build-runner` nor `screenshot-checker` is reachable from
//     inside a stage. The Implement prompt must run the build itself with
//     output bounded rather than naming a subagent to spawn, and the Verify
//     prompt must not tell the agent to dispatch one for a screenshot either.
const implPrompt = promptRun.prompts.find((x) => x.phase === 'Implement').prompt
check('the Implement prompt names no build-runner subagent', implPrompt.includes('build-runner'), false)
check('  ...and bounds build output itself', implPrompt.includes('tail -40'), true)
const verifyP = promptRun.prompts.find((x) => x.phase === 'Verify').prompt
check('the Verify prompt names no screenshot-checker subagent', verifyP.includes('screenshot-checker'), false)

// 14. Round 1 deleted the commit sentinel and moved the whole "did a stage
//     commit early" invariant onto Verify's `tree_clean` check. The case that
//     matters is `tree_clean: true` paired with a PASS verdict: a stage that
//     commits early and then verifies its own work successfully is exactly
//     the failure this exists to catch. BASE (no worktree) is used so
//     `salvage()` returns before making a second call and no verdict_path is
//     required.
const treeCleanPass = await run(BASE, { Verify: { ...HAPPY.Verify, tree_clean: true } })
check('tree_clean:true halts even with a PASS verdict', treeCleanPass.result.ok, false)
check('  ...naming the verify stage', treeCleanPass.result.halted_on, 'verify')
check('  ...with a detail naming an earlier commit', /an earlier stage committed/.test(treeCleanPass.result.detail), true)
check('  ...never the generic FAIL/BLOCKED shape', /^(FAIL|BLOCKED):/.test(treeCleanPass.result.detail), false)
check('  ...and never reaches Wrap', treeCleanPass.calls.includes('Wrap'), false)

// The tree_clean halt runs BEFORE the BLOCKED branch, so a BLOCKED verdict
// carrying tree_clean:true — the exact shape the Verify prompt asks the stage
// to return — must still report the tree_clean detail, not the generic
// `BLOCKED: ` shape the branch below it would otherwise produce.
const treeCleanBlocked = await run(BASE, {
  Verify: { verdict: 'BLOCKED', tree_clean: true, evidence: 'status --short was empty' },
})
check('tree_clean:true wins ordering over the BLOCKED branch', treeCleanBlocked.result.halted_on, 'verify')
check('  ...reporting the tree_clean detail, not "BLOCKED: "', treeCleanBlocked.result.detail.startsWith('BLOCKED:'), false)

// The normal path: tree_clean:false with a PASS verdict reaches Wrap and
// lands with no blockers, exactly as it does today — the guard that the halt
// above is not over-triggering on every pass.
const treeDirty = await run({ ...BASE, worktree: '/tmp/wt' }, { Verify: { ...WT_VERIFY, tree_clean: false } })
check('tree_clean:false reaches Wrap and reports ok', treeDirty.result.ok, true)
check('  ...with no blockers', treeDirty.result.blockers, [])
check('  ...and Wrap is called', treeDirty.calls.includes('Wrap'), true)

// A verdict naming a closed surface (cc-fmpo.2) halts on 'surface', not
// 'verify' — the caller needs to tell "the environment was never brought up"
// apart from a real BLOCKED so it can start the surface and relaunch instead
// of re-diagnosing the change. BLOCKED never retries.
const surfaceDown = await run({ ...BASE, worktree: '/tmp/wt' }, {
  Verify: { verdict: 'BLOCKED', surface_down: true, failures: ['surface unreachable: 127.0.0.1:2024 (from item body)'] },
})
check('a closed surface halts the pass', surfaceDown.result.ok, false)
check('  ...naming "surface", not "verify"', surfaceDown.result.halted_on, 'surface')
check('  ...with a detail naming the unreachable surface', /surface unreachable: 127\.0\.0\.1:2024/.test(surfaceDown.result.detail), true)
check('  ...and never reaches Wrap', surfaceDown.calls.includes('Wrap'), false)
check('  ...and carries the worktree arg passed in', surfaceDown.result.worktree, '/tmp/wt')
check('  ...without retrying', surfaceDown.calls.filter((c) => c === 'Implement').length, 1)

// 15. A `minor` review finding is a note, not a defect — it must not gate
//     landing, and it must reach `followups` verbatim.
const minorFinding = await run(BASE, {
  Review: { reviewed: true, findings: [{ file: 'a.ts', line: 45, severity: 'minor', summary: 'could be a one-liner' }], files_reviewed: ['a.ts'] },
})
check('a minor review finding reports no blockers', minorFinding.result.blockers, [])
check('  ...and reports ok', minorFinding.result.ok, true)
check(
  '  ...and reaches followups verbatim',
  minorFinding.result.followups.includes('minor — a.ts:45 — could be a one-liner'),
  true,
)

// Wrap can still invent or echo a major/blocking-labelled row on its own —
// belt-and-braces: a stray one is dropped rather than trusted, while a plain
// observation from Wrap survives untouched.
const wrapPollution = await run(BASE, {
  Wrap: {
    ...HAPPY.Wrap,
    followups: ['major — a.ts:45 — title sanitization truncates mid-escape', 'noticed the README is stale'],
  },
})
check(
  "a Wrap-invented 'major —' row is dropped",
  wrapPollution.result.followups.some((f) => f.startsWith('major —')),
  false,
)
check(
  "  ...but Wrap's plain observation survives",
  wrapPollution.result.followups.includes('noticed the README is stale'),
  true,
)

// 16. A first-round `major` finding fails that round: the loop reruns
//     Implement with the failure named, then Review and Verify again. A
//     clean round 2 reports `rounds: 2` with no blockers — only the final
//     round's findings feed `blockers` — and the major finding never leaks
//     into `followups` or the Wrap prompt.
const majorThenClean = await run(BASE, {
  Review: (n) =>
    n === 1
      ? {
          reviewed: true,
          findings: [{ file: 'a.ts', line: 45, severity: 'major', summary: 'title sanitization truncates mid-escape', fix: 'validate before truncating' }],
          files_reviewed: ['a.ts'],
        }
      : { reviewed: true, findings: [], files_reviewed: ['a.ts'] },
})
check('a first-round major finding retries Implement, Review and Verify', majorThenClean.calls.filter((c) => c === 'Implement').length, 2)
check('  ...and reports rounds: 2', majorThenClean.result.rounds, 2)
check('  ...with empty blockers when round 2 is clean', majorThenClean.result.blockers, [])
check('  ...reports ok', majorThenClean.result.ok, true)
check('  ...and Wrap is called exactly once', majorThenClean.calls.filter((c) => c === 'Wrap').length, 1)
check('  ...with model haiku', majorThenClean.callOpts.find((c) => c.phase === 'Wrap').opts.model, 'haiku')
check(
  'no followup row mentions the major finding',
  majorThenClean.result.followups.some((f) => f.includes('title sanitization truncates mid-escape')),
  false,
)
const wrapPromptAfterMajor = majorThenClean.prompts.find((p) => p.phase === 'Wrap').prompt
check('the Wrap prompt never contains the major finding text', wrapPromptAfterMajor.includes('title sanitization truncates mid-escape'), false)

// 17. The round-2 Implement prompt carries the failure forward so the fix has
//     something concrete to act on.
const round2ImplementPrompt = majorThenClean.prompts.filter((p) => p.phase === 'Implement')[1].prompt
check('the round-2 Implement prompt contains "Failures from round 1"', round2ImplementPrompt.includes('Failures from round 1'), true)
check("  ...and the finding's summary", round2ImplementPrompt.includes('title sanitization truncates mid-escape'), true)

// 18. An identical minor finding repeated across rounds is deduplicated
//     rather than reported twice.
const dedupedMinor = await run(BASE, {
  Review: (n) => ({
    reviewed: true,
    findings:
      n === 1
        ? [
            { file: 'a.ts', line: 45, severity: 'major', summary: 'title sanitization truncates mid-escape' },
            { file: 'a.ts', line: 12, severity: 'minor', summary: 'could be a one-liner' },
          ]
        : [{ file: 'a.ts', line: 12, severity: 'minor', summary: 'could be a one-liner' }],
    files_reviewed: ['a.ts'],
  }),
})
check(
  'an identical minor finding across rounds is deduplicated',
  dedupedMinor.result.followups.filter((f) => f.includes('could be a one-liner')).length,
  1,
)

// The mutation gate itself has zero coverage above this point: no case yet
// touches a test path (HAPPY.Implement touches only `a.ts`), so `touchedTests`
// is empty in every case run so far and this whole block of logic never runs.
// Every case below overrides Implement to touch a test file too, to actually
// reach it.
const IMPLEMENT_WITH_TEST = { touched: ['a.ts', 'a.test.ts'], summary: 'edited a.ts', green: true, attempts: 1 }

// 19. `discriminates: null` means the change was removal-only — there was
//     nothing to discriminate, so it must NOT block landing on its own.
const removalNull = await run(BASE, {
  Implement: IMPLEMENT_WITH_TEST,
  Verify: {
    ...HAPPY.Verify,
    mutation: {
      method: 'n/a — removal only',
      command: "grep -rn 'COMMIT_OK' .",
      output: '(no matches)',
      discriminates: null,
    },
  },
})
check('discriminates:null reports no blockers', removalNull.result.blockers, [])
check('  ...and reports ok', removalNull.result.ok, true)

// 20. `discriminates: false` still blocks — a test was added and it does not
//     discriminate. This is the case `null` must NOT be confused with.
const removalFalse = await run(BASE, {
  Implement: IMPLEMENT_WITH_TEST,
  Verify: {
    ...HAPPY.Verify,
    mutation: { method: 'reverted the fix', command: 'npm test -- a.test.ts', output: 'ok', discriminates: false },
  },
})
check('discriminates:false still blocks', removalFalse.result.blockers.length > 0, true)
check('  ...mentioning that the tests do not discriminate', /do not discriminate/.test(removalFalse.result.blockers.join(' ')), true)

// 21. `discriminates: null` paired with a named, unexercised mechanism in
//     `failures` is the cc-fyt shape — a null must not silently swallow a real
//     gap the change itself reported.
const removalNullUncovered = await run(BASE, {
  Implement: IMPLEMENT_WITH_TEST,
  Verify: {
    ...HAPPY.Verify,
    mutation: {
      method: 'n/a — removal only',
      command: "grep -rn 'tree_clean' implement.test.mjs",
      output: '(no matches)',
      discriminates: null,
    },
    failures: ['tree_clean promoted to "the enforcement" but has zero test coverage'],
  },
})
check('discriminates:null with an unexercised replacement mechanism blocks', removalNullUncovered.result.blockers.length > 0, true)
check('  ...naming the unexercised mechanism', /tree_clean/.test(removalNullUncovered.result.blockers.join(' ')), true)

// 22. The Verify prompt itself carries the classify-before-choosing-a-method
//     instruction — this is the bulk of the change and is otherwise untested.
const mutationPromptRun = await run({ ...BASE, worktree: '/tmp/wt' }, { Implement: IMPLEMENT_WITH_TEST, Verify: WT_VERIFY })
const mutationVerifyPrompt = mutationPromptRun.prompts.find((x) => x.phase === 'Verify').prompt
check('the Verify prompt tells the agent to classify the diff before choosing a method', /Classify the production half of the diff before picking a method/.test(mutationVerifyPrompt), true)

// 23. cc-rh2q: the Plan halt distinguishes "the agent returned nothing" (a
//     swallowed 529, or any request that errored) from "the agent returned a
//     plan with no files" (a legitimately underspecified brief). Conflating
//     them into one message is what turned five straight 529s into five
//     reports of a bad brief.
const planNothing = await run(BASE, { Plan: null })
check('a Plan agent returning nothing halts', planNothing.result.ok, false)
check('  ...naming the plan stage', planNothing.result.halted_on, 'plan')
check('  ...blaming the agent, not the brief', /returned nothing/.test(planNothing.result.detail), true)
check('  ...and never claiming no files were identified', /no files identified/.test(planNothing.result.detail), false)

// 24. A Plan agent that returned a real plan with an empty `files` array is
//     the other branch — a real answer that legitimately found nothing to
//     change.
const planNoFiles = await run(BASE, {
  Plan: { files: [], approach: 'n/a', base_sha: HAPPY.Plan.base_sha },
})
check('a Plan with no files halts', planNoFiles.result.ok, false)
check('  ...naming the plan stage', planNoFiles.result.halted_on, 'plan')
check('  ...naming the missing files, not a failed agent', /no files identified/.test(planNoFiles.result.detail), true)
check('  ...and never claiming the agent returned nothing', /returned nothing/.test(planNoFiles.result.detail), false)

// 25. A fix round (`round >= 2`) skips Plan and Review entirely — round 1
//     already settled the approach and the files, and the diff Review would
//     read is now the whole branch — but still runs Implement, Verify and
//     Wrap, and carries `round` plus a skip-annotated `review` object.
const round2 = await run(
  { ...BASE, worktree: '/tmp/wt', round: 2, resolved: { ...RESOLVED, files: ['a.ts'] } },
  { Verify: WT_VERIFY },
)
check('round 2 never calls Plan', round2.calls.includes('Plan'), false)
check('  ...never calls Review', round2.calls.includes('Review'), false)
check('  ...still calls Implement', round2.calls.includes('Implement'), true)
check('  ...still calls Verify', round2.calls.includes('Verify'), true)
check('  ...still calls Wrap', round2.calls.includes('Wrap'), true)
check('  ...reports ok', round2.result.ok, true)
check('  ...and carries round in the result', round2.result.round, 2)
check('  ...with a skip-annotated review object', round2.result.review, {
  findings: 0,
  blocking: 0,
  major: 0,
  skipped: 'fix round',
})

// 26. A fix round with no `resolved`, or no `worktree`, has nothing to run
//     Implement against — Plan, which would normally supply the files, is
//     itself skipped — so it halts at resolve rather than falling through to
//     an agent-resolved item that round 1 never produced.
const round2NoResolved = await run({ repo: '/tmp/repo', round: 2, worktree: '/tmp/wt' })
check('round 2 with no resolved halts', round2NoResolved.result.ok, false)
check('  ...naming the resolve stage', round2NoResolved.result.halted_on, 'resolve')
check('  ...never reaching Implement', round2NoResolved.calls.includes('Implement'), false)

const round2NoWorktree = await run({ repo: '/tmp/repo', round: 2, resolved: { ...RESOLVED, files: ['a.ts'] } })
check('round 2 with no worktree halts at resolve too', round2NoWorktree.result.ok, false)
check('  ...naming the resolve stage', round2NoWorktree.result.halted_on, 'resolve')

// 27. `meta.phases` names exactly the five stages, in order — the shape
// name-pass.sh's line-window guard and the whole rewrite depend on.
check('meta.phases names the five stages in order', metaOf(SRC).phases.map((p) => p.title), [
  'Plan',
  'Implement',
  'Review',
  'Verify',
  'Wrap',
])

// 28. name-pass.sh generates a per-pass copy naming the item, and the result
//    is still a pure `meta` literal — the whole reason this generation
//    exists rather than passing a name at call time.
const scratchDir = mkdtempSync(join(tmpdir(), 'implement-name-pass-'))
try {
  const namePassSh = new URL('./name-pass.sh', import.meta.url).pathname

  const genPath = execFileSync(
    'bash',
    [namePassSh, 'term-88', 'Make the row name its own pass', scratchDir],
    { encoding: 'utf8' },
  ).trim()

  check('prints an absolute path ending in the item id', genPath.startsWith('/') && genPath.endsWith('implement-term-88.js'), true)

  const genSrc = readFileSync(genPath, 'utf8')
  const genMeta = metaOf(genSrc)
  check('meta.name is rewritten to the item id', genMeta.name, 'implement term-88')
  check('meta.description is the item title', genMeta.description, 'Make the row name its own pass')
  check('meta.phases is unchanged from the template', JSON.stringify(genMeta.phases), JSON.stringify(metaOf(SRC).phases))

  // A title with a single quote and an embedded newline must still produce
  // a file whose meta parses: the newline collapses to a space and the
  // quote is escaped for the single-quoted string literal.
  const trickyTitle = "It's a trap\nwith a line break"
  const trickyPath = execFileSync(
    'bash',
    [namePassSh, 'term-89', trickyTitle, scratchDir],
    { encoding: 'utf8' },
  ).trim()
  const trickyMeta = metaOf(readFileSync(trickyPath, 'utf8'))
  check('a quote+newline title still parses', trickyMeta.description, "It's a trap with a line break")

  // The 80-character cut must happen before escaping, not after. A title
  // whose 80th character needs an escape becomes 81 characters once escaped,
  // and cutting *that* to 80 leaves a trailing lone backslash that escapes
  // the literal's own closing quote — the file then fails to parse and the
  // pass dies at load. One case per character that grows under escaping.
  for (const [label, tail] of [["apostrophe", "'"], ['backslash', '\\']]) {
    const boundary = 'a'.repeat(79) + tail
    const boundaryPath = execFileSync(
      'bash',
      [namePassSh, `term-90-${label}`, boundary, scratchDir],
      { encoding: 'utf8' },
    ).trim()
    const boundaryMeta = metaOf(readFileSync(boundaryPath, 'utf8'))
    check(`a title ending in a ${label} at the 80-char cut still parses`, boundaryMeta.description, boundary)
  }
} finally {
  rmSync(scratchDir, { recursive: true, force: true })
}

// 29. cc-tn2a: ~/.claude documents a plain-sentence, no-prefix commit
//    exception to Conventional Commits. The Wrap prompt must name that
//    exception explicitly when the repo being worked is ~/.claude itself,
//    and must still name Conventional Commits for any other repo.
const homeClaudeRun = await run({ ...BASE, repo: '/Users/pierce/.claude' }, {})
const homeClaudeWrapPrompt = homeClaudeRun.prompts.find((p) => p.phase === 'Wrap').prompt
check(
  'the Wrap prompt names the ~/.claude plain-sentence exception when repo is ~/.claude',
  homeClaudeWrapPrompt.includes('plain one-sentence commit message'),
  true,
)

const otherRepoRun = await run(BASE, {})
const otherRepoWrapPrompt = otherRepoRun.prompts.find((p) => p.phase === 'Wrap').prompt
check(
  'the Wrap prompt still names Conventional Commits for any other repo',
  otherRepoWrapPrompt.includes('Conventional Commits'),
  true,
)

console.log(failures ? `\n${failures} FAILED` : `\nall passed`)
process.exit(failures ? 1 : 0)
