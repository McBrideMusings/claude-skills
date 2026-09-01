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
      return stubs[p] ?? {}
    },
    async () => [],
    async () => [],
    () => {},
    (t) => {
      current = t
    },
    async () => ({}),
  )
  return { result, calls, prompts }
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

console.log(failures ? `\n${failures} FAILED` : `\nall passed`)
process.exit(failures ? 1 : 0)
