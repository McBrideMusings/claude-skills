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
// about (e.g. Verify -> SKIP) and inherits a happy path for the rest.
const HAPPY = {
  Tracker: { backend: 'beads', db: '/repo/.beads' },
  Resolve: { found: true, id: 'proj-1', title: 'A thing', body: 'do it' },
  Gate: { pass: true, reason: 'concrete' },
  // `base_sha` must look like a real sha: the script rejects anything else at
  // Locate, and a stub without it halts every case here before it reaches the
  // behaviour under test.
  Locate: {
    files: [{ path: 'a.ts', why: 'the change' }],
    approach: 'edit a.ts',
    base_sha: '25bee4a1c3d5f7908badc0ffee1234567890abcd',
  },
  Edit: { touched: ['a.ts'], summary: 'edited a.ts' },
  Green: { green: true, attempts: 1 },
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
  // once (salvage reusing an earlier phase name) still records each call.
  const callOpts = []
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
  let current = 'Resolve'
  const result = await body(
    args,
    async (prompt, opts) => {
      const p = (opts && opts.phase) || current
      calls.push(p)
      prompts.push({ phase: p, prompt })
      callOpts.push({ phase: p, opts })
      // `in` rather than `??` so a case can stub an explicit `null`/`undefined`
      // return (e.g. simulating a swallowed 529) without it being papered over
      // by the happy-path fallback — `null ?? {}` would silently become `{}`.
      return p in stubs ? stubs[p] : {}
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

const BASE = { resolved: HAPPY.Resolve, repo: '/tmp/repo' }
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

// 1b. cc-rh2q: every `agent()` call in a full pass must pin `model` — an
// unpinned call inherits whatever model the ORCHESTRATOR session runs on, so
// a pass launched from an Opus session silently runs an Opus agent for that
// stage (Locate, historically). This fails loudly the moment a new stage, or
// an edited one, drops `model` from its options object.
check('  ...and the happy path actually makes some calls', clean.callOpts.length > 0, true)
check(
  'every agent() call in a full pass carries a model',
  clean.callOpts.map((c) => `${c.phase}:${Boolean(c.opts && c.opts.model)}`),
  clean.callOpts.map((c) => `${c.phase}:true`),
)

// 2. The pass never closes an item and never lands a branch, whatever it is
//    given. There is no argument that turns either back on — that is the point
//    of removing `land`. A pass with no authority cannot close the wrong thing.
check('no Track stage exists', clean.calls.includes('Track'), false)
// No `landed` key at all, rather than `landed: false`. A caller that reads the
// field would be reading the Wrap agent's claim about itself, and the whole
// point of moving landing out is that this pass has no standing to make it.
check('  ...and reports no landing claim of any kind', 'landed' in clean.result, false)

// 3. The caller needs the worktree path back to run the recheck in it.
check('the worktree comes back', clean.result.worktree, '/tmp/wt')
check('  ...with no worktree, the field is null, never absent', (await run(BASE)).result.worktree, null)

// 4. The recheck recipe is the contract the caller's verify loop runs against.
check('recheck comes back verbatim', clean.result.recheck, [
  { cmd: 'npm test -- a.test.ts', expect: '3 passing' },
])
// A Verify stage that returns no recipe must produce an empty array, never
// undefined — the caller branches on length, and `undefined.length` throws
// inside the loop rather than at the boundary where it could be reported.
const noRecipe = await run(BASE, { Verify: { verdict: 'PASS', evidence: 'looked' } })
check('a missing recipe is [] and not undefined', noRecipe.result.recheck, [])

// 5. SKIP means verification could not reach the surface. Nobody verified it,
//    so the caller is told not to land it.
const skipped = await run(BASE, { Verify: { verdict: 'SKIP', evidence: 'no surface to drive' } })
check('SKIP blocks landing', skipped.result.blockers, ['verification returned SKIP, not PASS'])

// 6. Verified, but nothing was committed — there is no work to land.
const nothing = await run(BASE, { Wrap: { committed: false, landed: false } })
check('an empty commit blocks landing', nothing.result.blockers, ['nothing was committed'])

// 7. A halt before Wrap returns a halt, not a result. The caller distinguishes
//    the two by `ok`, so a halt that reported `ok: true` would read as a pass
//    with no blockers — the one shape that gets broken work merged.
const failedVerify = await run(BASE, { Verify: { verdict: 'FAIL', failures: ['row never rendered'] } })
check('a FAIL halts the pass', failedVerify.result.ok, false)
check('  ...and names the stage it halted on', failedVerify.result.halted_on, 'verify')
check('  ...and never reaches Wrap', failedVerify.calls.includes('Wrap'), false)

// 8. A submodule's tracker is not on any ancestor path of its worktree — the
//    code repo nests inside the tracker repo. A pass launched there used to
//    halt at the Gate with "issue cc-xne does not exist in this tracker"
//    because `bd` fell back to an unrelated database and answered "not
//    found" with exit 0. The database has to be resolved against the
//    ORCHESTRATOR's checkout (`args.repo`), and a beads backend with no
//    `.beads` found anywhere above it halts BEFORE Resolve runs, naming the
//    database — not the issue.
const noDb = await run({ repo: '/tmp/repo', issue: 'proj-1' }, { Tracker: { backend: 'beads' } })
check('a missing tracker database halts before Resolve', noDb.result.ok, false)
check('  ...naming the stage', noDb.result.halted_on, 'resolve')
check('  ...mentioning the beads database, not the issue', /beads database/.test(noDb.result.detail), true)
check('  ...never claiming the issue does not exist', /does not exist/.test(noDb.result.detail), false)
check('  ...and never reaches the Resolve agent', noDb.calls.includes('Resolve'), false)

// 9. When the walk finds the database, every `bd` read in the Resolve prompt
//    carries `--db <path>` — a bare `bd show` resolves from the worktree's
//    own cwd and silently answers from a different database.
const found = await run({ repo: '/tmp/repo', issue: 'proj-1' }, { Tracker: { backend: 'beads', db: '/tmp/repo/.beads' } })
const resolvePrompt = found.prompts.find((p) => p.phase === 'Resolve').prompt
check('the Resolve prompt carries --db from the resolved database', resolvePrompt.includes('--db /tmp/repo/.beads'), true)
check('  ...and no bare `bd show <id> --json` survives alongside it', /(?<!--db \/tmp\/repo\/\.beads )bd show <id> --json/.test(resolvePrompt), false)

// 10. No `repo` and no `cwd` — only `worktree`/`issue`, the shape the bash
//     suite's harness passes — gives the walk no root to start from. It must
//     skip the Tracker call entirely and let Resolve run exactly as before
//     this change, or the bash suite's 48 passing assertions break.
const noRoot = await run({ issue: 'proj-1', worktree: '/wt', branch: 'feat' })
check('with no repo/cwd, no Tracker call is made', noRoot.calls.includes('Tracker'), false)
check('  ...and Resolve still runs', noRoot.calls.includes('Resolve'), true)

// 11. The Tracker stage used to be told, in the same breath, to work
//     exclusively inside the worktree AND to walk up from TRACKER_ROOT — a
//     path outside the worktree by construction (the `.beads` it must find
//     commonly lives one repo up from a submodule checkout). The confinement
//     sentence forbade the exact walk the stage exists to perform. The
//     Tracker prompt must be scoped to TRACKER_ROOT, never to the worktree.
const scoped = await run(
  { repo: '/tmp/repo', worktree: '/tmp/wt', issue: 'proj-1' },
  { Tracker: { backend: 'beads', db: '/tmp/repo/.beads' } },
)
const trackerPrompt = scoped.prompts.find((p) => p.phase === 'Tracker').prompt
check(
  'the Tracker prompt does not confine the agent to the worktree',
  trackerPrompt.includes('Work exclusively inside `/tmp/wt`'),
  false,
)
check('  ...and does confine it to TRACKER_ROOT instead', trackerPrompt.includes('Work exclusively inside `/tmp/repo`'), true)

// 12. The refactor that scopes the Tracker prompt must not silently unscope
//     every other stage's prompt — Locate, in the happy path, still gets the
//     worktree confinement exactly as before.
const locatePrompt = scoped.prompts.find((p) => p.phase === 'Locate').prompt
check('the Locate prompt still confines the agent to the worktree', locatePrompt.includes('Work exclusively inside `/tmp/wt`'), true)

// 13. name-pass.sh generates a per-pass copy naming the item, and the result
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

// 14. A Resolve agent that could not find the item must halt AT resolve, with
//     the checked-and-returned explanation as the detail — never fall through
//     as a fabricated record for Gate to judge.
const notFoundBody = 'bd show proj-9 returned not found; branch carried no id; triage had nothing open'
const notFound = await run(
  { repo: '/tmp/repo', issue: 'proj-9' },
  {
    Tracker: { backend: 'beads', db: '/tmp/repo/.beads' },
    Resolve: { found: false, id: 'proj-9', title: '', body: notFoundBody },
  },
)
check('a not-found item halts', notFound.result.ok, false)
check('  ...naming the resolve stage', notFound.result.halted_on, 'resolve')
check('  ...never reaching Gate', notFound.calls.includes('Gate'), false)
check('  ...with the checked explanation as detail', notFound.result.detail, notFoundBody)

// 15. `a.resolved` without an explicit `found` (the shape every existing
//     caller passes) must still run — the default must not accidentally halt
//     a caller-supplied item.
const preResolved = await run({ resolved: { id: 'proj-1', title: 'A thing', body: 'do it' }, repo: '/tmp/repo' })
check('a pre-resolved item with no explicit found still runs', preResolved.result.halted_on !== 'resolve', true)
check('  ...and reaches Gate', preResolved.calls.includes('Gate'), true)

// 16. Wrap is the only stage that commits. If Edit reports it committed anyway
//     — the exact shape observed on cc-22k round 2, where the Edit stage
//     committed and Verify's `verified_parent` then read the branch head
//     instead of its parent — the pass must halt right there, before Green,
//     Review or Verify ever run on a tree they no longer expect.
const editCommitted = await run(BASE, { Edit: { touched: ['a.ts'], summary: 'edited a.ts', committed: true } })
check('an Edit stage that committed halts the pass', editCommitted.result.ok, false)
check('  ...naming the edit stage', editCommitted.result.halted_on, 'edit')
check('  ...never reaching Green', editCommitted.calls.includes('Green'), false)
check('  ...never reaching Verify', editCommitted.calls.includes('Verify'), false)
check('  ...never reaching Wrap', editCommitted.calls.includes('Wrap'), false)

// 17. Same guarantee at Green: a committed report there halts before Review
//     or Verify run, for the same reason.
const greenCommitted = await run(BASE, { Green: { green: true, attempts: 1, committed: true } })
check('a Green stage that committed halts the pass', greenCommitted.result.ok, false)
check('  ...naming the green stage', greenCommitted.result.halted_on, 'green')
check('  ...never reaching Review', greenCommitted.calls.includes('Review'), false)
check('  ...never reaching Verify', greenCommitted.calls.includes('Verify'), false)
check('  ...never reaching Wrap', greenCommitted.calls.includes('Wrap'), false)

// 18. Prose alone failed to stop stages committing before (the cc-fyt finding
//     this pass exists to fix), so the Edit, Green and Review prompts each
//     carry an explicit no-commit sentence, in the same words every time —
//     naming Wrap as the only stage that commits and `git commit` by name.
const promptRun = await run({ ...BASE, worktree: '/tmp/wt' }, { Verify: WT_VERIFY })
for (const stagePhase of ['Edit', 'Review']) {
  const p = promptRun.prompts.find((x) => x.phase === stagePhase).prompt
  check(`the ${stagePhase} prompt names git commit as forbidden`, p.includes('no `git commit`'), true)
  check(`  ...and names Wrap as the only stage that commits`, /Wrap is the only stage that commits/.test(p), true)
}
// Green carries the same prohibition, worded differently: the external
// implement-workflow.test.sh (cc-rbz) bans the literal words "commit" and
// "wrap-up" from Green's prompt specifically, since Green is the one stage a
// routing instruction toward wrap-up would be dangerous for — so its version
// of this sentence conveys the rule without using either.
const greenP = promptRun.prompts.find((x) => x.phase === 'Green').prompt
check('the Green prompt forbids advancing the branch itself', greenP.includes('do not advance the branch yourself'), true)
check('  ...and names a later stage as the only one that does', /A later stage is the only one that does that/.test(greenP), true)

// 18b. cc-5b8: a stage agent has no `Agent` tool and cannot spawn a
//      subagent, so neither `build-runner` nor `screenshot-checker` is
//      reachable from inside a stage. The Green prompt must run the build
//      itself with output bounded rather than naming a subagent to spawn,
//      and the Verify prompt must not tell the agent to dispatch one for a
//      screenshot either — this is what stops the unreachable instruction
//      from being restored.
check('the Green prompt names no build-runner subagent', greenP.includes('build-runner'), false)
check('  ...and bounds build output itself', greenP.includes('tail -40'), true)
const verifyP = promptRun.prompts.find((x) => x.phase === 'Verify').prompt
check('the Verify prompt names no screenshot-checker subagent', verifyP.includes('screenshot-checker'), false)

// 19. Round 1 deleted the commit sentinel and moved the whole "did a stage
//     commit early" invariant onto Verify's `tree_clean` check — but nothing
//     exercised that check, so a reversal of the halt left every test above
//     still green. The case that matters is `tree_clean: true` paired with a
//     PASS verdict: a stage that commits early and then verifies its own work
//     successfully is exactly the failure this exists to catch, and a case
//     that only pairs `tree_clean: true` with FAIL/BLOCKED would pass even
//     with the halt removed, since the FAIL/BLOCKED branch below it would
//     catch it on its own. BASE (no worktree) is used so `salvage()` returns
//     before making a second 'Verify' call and no verdict_path is required.
const treeCleanPass = await run(BASE, { Verify: { ...HAPPY.Verify, tree_clean: true } })
check('tree_clean:true halts even with a PASS verdict', treeCleanPass.result.ok, false)
check('  ...naming the verify stage', treeCleanPass.result.halted_on, 'verify')
check('  ...with a detail naming an earlier commit', /an earlier stage committed/.test(treeCleanPass.result.detail), true)
check('  ...never the generic FAIL/BLOCKED shape', /^(FAIL|BLOCKED):/.test(treeCleanPass.result.detail), false)
check('  ...and never reaches Wrap', treeCleanPass.calls.includes('Wrap'), false)

// The tree_clean halt runs BEFORE the FAIL/BLOCKED branch, so a BLOCKED
// verdict carrying tree_clean:true — the exact shape the Verify prompt asks
// the stage to return — must still report the tree_clean detail, not the
// generic `BLOCKED: ` shape the branch below it would otherwise produce.
// This pins the ordering: reversing the halt makes this fall through to that
// branch and the detail starts with `BLOCKED: `.
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
// of re-diagnosing the change.
const surfaceDown = await run(BASE, {
  Verify: { verdict: 'BLOCKED', surface_down: true, failures: ['surface unreachable: 127.0.0.1:2024 (from item body)'] },
})
check('a closed surface halts the pass', surfaceDown.result.ok, false)
check('  ...naming "surface", not "verify"', surfaceDown.result.halted_on, 'surface')
check('  ...with a detail naming the unreachable surface', /surface unreachable: 127\.0\.0\.1:2024/.test(surfaceDown.result.detail), true)
check('  ...and never reaches Wrap', surfaceDown.calls.includes('Wrap'), false)
check('  ...and carries the worktree arg passed in', surfaceDown.result.worktree, BASE.worktree)

// The Gate's third test (cc-32bc): an item naming a file outside the repo the
// pass is confined to must halt at Gate, and the halt detail must survive
// carrying the out-of-repo path and the word "split" back to the caller. This
// exists because of a real run, wf_1f0c6156-132 (cc-fyt attempt 1): the item's
// acceptance criteria spanned `~/.claude` and its `claude-skills` submodule, the
// pass did the entire in-repo half correctly — 578,768 subagent tokens, 18
// minutes — and only discovered the unreachable criterion at the very last
// stage, Verify. Catching it here costs one cheap stage instead of a whole pass.
const gateReachability = await run(BASE, {
  Gate: {
    pass: false,
    reason: 'reachability test failed',
    missing: [
      'hooks/subagent-push-guard.sh is outside /tmp/repo — this item spans two repos and must be split',
    ],
  },
})
check('an out-of-repo path halts at gate', gateReachability.result.ok, false)
check('  ...naming the gate stage', gateReachability.result.halted_on, 'gate')
check('  ...with the out-of-repo path in the detail', /subagent-push-guard\.sh/.test(gateReachability.result.detail), true)
check('  ...and the word "split" in the detail', /split/.test(gateReachability.result.detail), true)

// Companion guard: a plain gate failure with no `missing` array (the common
// case — an ambiguous or underspecified item) must still halt at gate with a
// detail containing the reason, and must not blow up or leave a stray
// separator from joining against an undefined array.
const gateNoMissing = await run(BASE, { Gate: { pass: false, reason: 'ambiguous' } })
check('a gate failure with no missing array still halts at gate', gateNoMissing.result.halted_on, 'gate')
check('  ...with the reason in the detail', /ambiguous/.test(gateNoMissing.result.detail), true)
check('  ...and no stray trailing separator', gateNoMissing.result.detail, 'ambiguous')

// A `major` review finding is a real defect in the diff the pass just wrote —
// it must gate landing the way a weak-test verdict does, without halting the
// pass itself: the work still commits, Wrap still runs, but `blockers` is
// non-empty so the caller does not land it.
const majorFinding = await run(BASE, {
  Review: {
    reviewed: true,
    findings: [{ file: 'a.ts', line: 45, severity: 'major', summary: 'title sanitization truncates mid-escape' }],
    files_reviewed: ['a.ts'],
  },
})
check('a major review finding still commits', majorFinding.result.ok, true)
check('  ...and Wrap is called', majorFinding.calls.includes('Wrap'), true)
check('  ...with commit abc1234', majorFinding.result.commit, 'abc1234')
check('  ...but blockers is non-empty', majorFinding.result.blockers.length > 0, true)
check(
  '  ...mentioning the major finding',
  /major finding/.test(majorFinding.result.blockers.join(' ')),
  true,
)

// A `minor` review finding is a note, not a defect — it must not gate
// landing.
const minorFinding = await run(BASE, {
  Review: {
    reviewed: true,
    findings: [{ file: 'a.ts', line: 45, severity: 'minor', summary: 'could be a one-liner' }],
    files_reviewed: ['a.ts'],
  },
})
check('a minor review finding reports no blockers', minorFinding.result.blockers, [])
check('  ...and reports ok', minorFinding.result.ok, true)

// The script owns followups for review findings, not Wrap: a major finding
// must never reach `followups`, however Wrap's own stub behaves, and Wrap
// must never even be shown the major finding's text.
const mixedFindings = await run(BASE, {
  Review: {
    reviewed: true,
    findings: [
      { file: 'a.ts', line: 45, severity: 'major', summary: 'title sanitization truncates mid-escape' },
      { file: 'a.ts', line: 12, severity: 'minor', summary: 'could be a one-liner' },
    ],
    files_reviewed: ['a.ts'],
  },
  Wrap: { ...HAPPY.Wrap, followups: [] },
})
check(
  'the minor finding reaches followups verbatim',
  mixedFindings.result.followups.includes('minor — a.ts:12 — could be a one-liner'),
  true,
)
check(
  'no followup row mentions the major finding',
  mixedFindings.result.followups.some((f) => f.includes('title sanitization truncates mid-escape')),
  false,
)
check(
  '  ...and blockers still mentions the major finding',
  /major finding/.test(mixedFindings.result.blockers.join(' ')),
  true,
)
const mixedWrapPrompt = mixedFindings.prompts.find((p) => p.phase === 'Wrap').prompt
check(
  '  ...and the Wrap prompt never contains the major finding text',
  mixedWrapPrompt.includes('title sanitization truncates mid-escape'),
  false,
)

// Wrap can still invent or echo a major/blocking-labelled row on its own —
// belt-and-braces: a stray one is dropped rather than trusted, while a plain
// observation from Wrap survives untouched.
const wrapPollution = await run(BASE, {
  Review: { reviewed: true, findings: [], files_reviewed: ['a.ts'] },
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
// The mutation gate itself has zero coverage above this point: no case yet
// touches a test path (HAPPY.Edit touches only `a.ts`), so `touchedTests` is
// empty in every case run so far and this whole block of logic never runs.
// Every case below overrides Edit to touch a test file too, to actually reach
// it.
const EDIT_WITH_TEST = { touched: ['a.ts', 'a.test.ts'], summary: 'edited a.ts' }

// 20. `discriminates: null` means the change was removal-only — there was
//     nothing to discriminate, so it must NOT block landing on its own.
const removalNull = await run(BASE, {
  Edit: EDIT_WITH_TEST,
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

// 21. `discriminates: false` still blocks — a test was added and it does not
//     discriminate. This is the case `null` must NOT be confused with.
const removalFalse = await run(BASE, {
  Edit: EDIT_WITH_TEST,
  Verify: {
    ...HAPPY.Verify,
    mutation: { method: 'reverted the fix', command: 'npm test -- a.test.ts', output: 'ok', discriminates: false },
  },
})
check('discriminates:false still blocks', removalFalse.result.blockers.length > 0, true)
check('  ...mentioning that the tests do not discriminate', /do not discriminate/.test(removalFalse.result.blockers.join(' ')), true)

// 22. `discriminates: null` paired with a named, unexercised mechanism in
//     `failures` is the cc-fyt shape — a null must not silently swallow a real
//     gap the change itself reported. This is what makes the `failures`
//     branch inside the null arm discriminate: reverting it makes this case
//     fall through to case 20's happy path and fail.
const removalNullUncovered = await run(BASE, {
  Edit: EDIT_WITH_TEST,
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

// 23. The Verify prompt itself carries the classify-before-choosing-a-method
//     instruction — this is the bulk of the change and is otherwise
//     untested.
const mutationPromptRun = await run({ ...BASE, worktree: '/tmp/wt' }, { Edit: EDIT_WITH_TEST, Verify: WT_VERIFY })
const verifyPrompt = mutationPromptRun.prompts.find((x) => x.phase === 'Verify').prompt
check('the Verify prompt tells the agent to classify the diff before choosing a method', /Classify the production half of the diff before picking a method/.test(verifyPrompt), true)

// 24. cc-rh2q: the Locate halt distinguishes "the agent returned nothing" (a
//     swallowed 529, or any request that errored) from "the agent returned a
//     plan with no files" (a legitimately underspecified brief). Conflating
//     them into one message is what turned five straight 529s into five
//     reports of a bad brief. A null/undefined Locate return must halt with
//     wording naming the agent itself, not the files.
const locateNothing = await run(BASE, { Locate: null })
check('a Locate agent returning nothing halts', locateNothing.result.ok, false)
check('  ...naming the locate stage', locateNothing.result.halted_on, 'locate')
check(
  '  ...blaming the agent, not the brief',
  /returned nothing/.test(locateNothing.result.detail),
  true,
)
check(
  '  ...and never claiming no files were identified',
  /no files identified/.test(locateNothing.result.detail),
  false,
)

// 25. A Locate agent that returned a real plan with an empty `files` array is
//     the other branch — a real answer that legitimately found nothing to
//     change. This must halt with the files-specific wording, not the
//     agent-returned-nothing one, so the two causes stay distinguishable.
const locateNoFiles = await run(BASE, {
  Locate: { files: [], approach: 'n/a', base_sha: HAPPY.Locate.base_sha },
})
check('a Locate plan with no files halts', locateNoFiles.result.ok, false)
check('  ...naming the locate stage', locateNoFiles.result.halted_on, 'locate')
check(
  '  ...naming the missing files, not a failed agent',
  /no files identified/.test(locateNoFiles.result.detail),
  true,
)
check(
  '  ...and never claiming the agent returned nothing',
  /returned nothing/.test(locateNoFiles.result.detail),
  false,
)

// 26. A fix round (`round >= 2`) skips Gate, Locate and Review entirely —
//     round 1 already settled the approach and the files, and the diff
//     Review would read is now the whole branch — but still runs Edit,
//     Green, Verify and Wrap, and carries `round` plus a skip-annotated
//     `review` object in the result.
const round2 = await run(
  { ...BASE, worktree: '/tmp/wt', round: 2, resolved: { ...HAPPY.Resolve, files: ['a.ts'] } },
  { Verify: WT_VERIFY },
)
check('round 2 never calls Gate', round2.calls.includes('Gate'), false)
check('  ...never calls Locate', round2.calls.includes('Locate'), false)
check('  ...never calls Review', round2.calls.includes('Review'), false)
check('  ...still calls Edit', round2.calls.includes('Edit'), true)
check('  ...still calls Green', round2.calls.includes('Green'), true)
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

// 27. A fix round with no `resolved` (or no `worktree`) has nothing to run
//     Edit against — Gate and Locate, which would normally supply that, are
//     both skipped — so it halts at resolve rather than falling through to
//     an agent-resolved item that round 1 never produced.
const round2NoResolved = await run({ repo: '/tmp/repo', round: 2, worktree: '/tmp/wt' })
check('round 2 with no resolved halts', round2NoResolved.result.ok, false)
check('  ...naming the resolve stage', round2NoResolved.result.halted_on, 'resolve')
check('  ...never reaching Edit', round2NoResolved.calls.includes('Edit'), false)

console.log(failures ? `\n${failures} FAILED` : `\nall passed`)
process.exit(failures ? 1 : 0)
