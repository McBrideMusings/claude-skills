export const meta = {
  name: 'implement',
  description: 'One tracked item, worked end to end to a commit',
  whenToUse: 'Called by /implement for every pass it runs — once, N times in series, or N at once. Not invoked directly by a human, and never by name: the caller runs name-pass.sh to generate a per-pass copy of this file and passes that copy\'s absolute path as scriptPath.',
  phases: [
    { title: 'Plan', detail: 'find the files and settle the approach' },
    { title: 'Implement', detail: 'make the change, then build and fix until it compiles and tests pass' },
    { title: 'Review', detail: "read this pass's whole diff for defects" },
    { title: 'Verify', detail: 'check the behaviour at the surface' },
    { title: 'Wrap', detail: 'format the touched files and commit' },
  ],
}

// ---------------------------------------------------------------------------
// Why this is a workflow and not one long agent.
//
// A pass that ran as a single agent averaged ~300 turns and grew one context
// that never shrank — every grep miss, every raw build log, every dead end
// stayed in it for the rest of the run. Each stage below starts fresh instead
// and hands the next one a small validated object: Plan's search history dies
// at the end of Plan; Implement's build output is bounded to its last ~40
// lines before any of it lands in context.
//
// A stage agent has no `Agent` tool and `ToolSearch` cannot reach one either,
// so no stage can spawn a subagent. That is why the Implement prompt below
// tells the stage to run its own build behind `| tail -40` instead of naming
// `build-runner`, why Verify forbids reading a screenshot instead of naming
// `screenshot-checker`, and why STAGE-RULES.md says the same. Do not restore
// either.
//
// Each stage prompt below is the whole of that stage's brief, and no stage
// prompt mentions a later stage — there is nothing to run ahead into.
// STAGE-RULES.md carries only what is true for every stage; SKILL.md is the
// document a human reads end to end.
// ---------------------------------------------------------------------------

const SKILLS = '/Users/pierce/.claude/skills'
const RULES = `${SKILLS}/implement/STAGE-RULES.md`

// Wrap is the only stage that commits. Implement carries `committed` in its
// result schema, and the script halts the pass the instant it reports a true
// self-report — the weaker backstop, which catches the partial case where a
// stage commits some files and leaves others dirty. What actually makes the
// invariant hold is Verify's `tree_clean` check: it reads `git status
// --short` at the same moment it reads HEAD, using a DIFFERENT agent than
// the one that would have committed, and returns BLOCKED instead of writing
// a false `verified_parent` when the tree is already clean. There is no
// PreToolUse hook for this: `git commit` is not a session-boundary act like
// push, merge, worktree lifecycle, or tracker writes, and
// `hooks/landing-guard.sh` can see that its caller is a subagent but not
// which stage is calling — so no unfakeable rule can be written there.

const a = args || {}
const dir = a.worktree || a.repo || a.cwd
// Root of the REPO the item is scoped to — not the worktree stages edit in
// (that's `dir`, below). Reads `a.repo` first and must NOT become `dir`:
// item briefs and the Verify stage's `verify-project` lookup name paths in
// primary-checkout terms, so rooting either at the worktree
// (`/Users/pierce/.worktrees/<repo>/<id>`) would resolve against a directory
// that does not hold the repo's own `.claude/skills/verify-project`.
const REPO_ROOT = a.repo || a.cwd || dir
const model = a.model || 'sonnet'
// Which launch of this item this is. `1` (the default) runs every stage. `2`
// and up is a fix round relaunched by the caller's own verify loop after a
// FAIL it saw in its own recheck: round 1 already settled the approach and
// the files, and the diff Review would read is now the whole branch rather
// than just this round's fix — so Plan and Review are skipped and Implement
// is handed round 1's files directly. See SKILL.md's "The verify loop" for
// the caller side of this contract. This is a different counter from the
// in-pass fix loop below, which runs inside every launch regardless of round.
const round = a.round || 1

// This pass NEVER lands and NEVER writes the tracker. It ends at a commit on
// its own branch, and the caller — the chat session that launched it —
// reviews the result, verifies it, lands it, and closes the item.
//
// A linked worktree shares the primary checkout's object store, so the caller
// already has every commit this pass makes. There is nothing to push.

// Every agent starts outside the working directory, so say so once, here.
const where = (d) =>
  d
    ? `Work exclusively inside \`${d}\` — every command either runs with \`git -C ${d}\` or inside a \`( cd ${d} && … )\` subshell. You did not start there. Never leave the Bash working directory somewhere it did not start.`
    : ''

const WHERE = where(dir)

const RULES_AND_ASK = `Read \`${RULES}\` — the rules every stage of this pass obeys, including its Bash command rules. What follows is the whole of your job; finish it, and do not read another implement document to find more of it.

**Nobody is watching this run. Never call \`AskUserQuestion\` and never end your stage on a question** — the session that started this pass is blocked on it. A decision your prompt does not settle goes into the object you return, as a halt or an unresolved note, and the script decides.`

const commonFor = (d) => `${where(d)}

${RULES_AND_ASK}`

const COMMON = commonFor(dir)

// --- schemas ---------------------------------------------------------------

const PLAN = {
  type: 'object',
  required: ['files', 'approach', 'base_sha'],
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'why'],
        properties: {
          path: { type: 'string' },
          why: { type: 'string' },
          anchors: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    approach: { type: 'string' },
    // The commit the pass starts from. Read before a single line is edited, so
    // the Review stage can diff against it no matter what has been committed by
    // the time it runs. See the Review stage for why that matters.
    base_sha: { type: 'string' },
    risks: { type: 'array', items: { type: 'string' } },
    build_command: { type: 'string' },
    test_command: { type: 'string' },
    // ~/.claude/skills sat detached 33 commits behind origin/main for over an
    // hour on 2026-09-07 while a five-stage rewrite of this very file landed
    // on origin/main from a worktree — the checkout every session loads was
    // never fast-forwarded, so 36 of that day's 39 passes launched the stale
    // eight-stage script from disk at roughly double the cost of the
    // five-stage one. The SessionStart hook prints a "behind origin/main"
    // line at session start, hundreds of turns before a pass is ever
    // dispatched, so nothing acts on it. Plan checks it instead, since Plan
    // already runs git commands on round 1 and the pass halts on the result
    // right after Plan returns — before Implement ever starts spending the
    // budget a stale checkout would otherwise waste.
    skills_behind: { type: 'number' },
    skills_update_command: { type: 'string' },
    // Per-item cumulative totals, summed from prior passes' workflow records.
    // The stub harnesses used by both test suites return `{}` for a phase
    // they do not recognize, so these come back `undefined` there — every
    // reader below coerces to 0 rather than trusting the field, so neither
    // suite's stub can trip the halt or corrupt the logged total.
    prior_passes: { type: 'number' },
    prior_minutes: { type: 'number' },
    prior_tokens: { type: 'number' },
  },
}

// The union of what used to be two stages' schemas: write the code, then
// build and fix it until it is green, all in one agent. `touched`/`summary`
// answer what changed; `green`/`attempts` answer whether it builds.
const IMPLEMENT = {
  type: 'object',
  required: ['touched', 'summary', 'green', 'attempts'],
  properties: {
    touched: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    green: { type: 'boolean' },
    attempts: { type: 'number' },
    diffstat: { type: 'string' },
    notes: { type: 'array', items: { type: 'string' } },
    unresolved: { type: 'array', items: { type: 'string' } },
    remaining: { type: 'array', items: { type: 'string' } },
    extra_files_touched: { type: 'array', items: { type: 'string' } },
    // True only if this stage committed or merged anyway, despite the
    // instruction not to. It exists so the script can halt on the report
    // rather than let a commit this stage made reach Verify unnoticed — see
    // the halt right after this schema is used.
    committed: { type: 'boolean' },
  },
}

const REVIEW = {
  type: 'object',
  required: ['reviewed', 'findings'],
  properties: {
    reviewed: { type: 'boolean' },
    files_reviewed: { type: 'array', items: { type: 'string' } },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'severity', 'summary'],
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          severity: { type: 'string', enum: ['blocking', 'major', 'minor'] },
          summary: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
    note: { type: 'string' },
  },
}

// `mutation` is what makes an added test count as evidence.
//
// Without it the schema said a test's EXISTENCE was the claim, and a pass could
// return `{verdict: "PASS", evidence: "added three tests"}`. Observed
// 2026-08-16: a worker landed three tests that each rebuilt the production
// logic inside the test body and asserted on their own copy — one said so in a
// comment, "Replicate the padding logic from the fix". Reverting the fix commit
// and re-running them printed `ok  powerhour/internal/tui/dashboard  0.283s`.
// They passed against the exact bug they were written to catch.
//
// So a test now has to be shown failing without the change. The agent runs the
// revert and reports the output; the script decides what a missing report costs.
//
// `discriminates` has three states, not two. `true` is evidence the test would
// have caught the regression. `false` is a blocker — a test was added and it
// does not discriminate. `null` means there was no behaviour to reverse in the
// first place: a removal-only change (deleted production code, comment- or
// doc-only edits) restores exactly the deleted code when reversed, so the
// retained tests pass exactly as they did before — `false` by construction,
// on every removal, whether or not anything is actually wrong. Observed
// 2026-09-01, run wf_1c7f6439-4e8 (cc-fyt round 1): a change deleted the
// `COMMIT_OK` sentinel and its six tests, and promoted `tree_clean` to "the
// enforcement" in prose — with zero test coverage of `tree_clean` itself. The
// mutation report read `false`, with a correct, self-consistent explanation of
// why reverting a deletion changes nothing the retained tests check, and it
// nearly landed on the strength of that explanation. `null` exists so a
// removal-only change stops manufacturing a `false` that means nothing, and so
// the one time the gate is pointing at something real does not read as the
// same noise it produces on every ordinary deletion.
const MUTATION = {
  type: 'object',
  required: ['method', 'command', 'output'],
  properties: {
    method: { type: 'string' },
    command: { type: 'string' },
    output: { type: 'string' },
    discriminates: { type: ['boolean', 'null'] },
    tests: { type: 'array', items: { type: 'string' } },
  },
}

// `verdict_path` is the only thing in the returned object that separates a verdict
// that was written down from one that was not. A Workflow script has no filesystem
// access, so the script that knows the path is the one thing that cannot stat it —
// the agent has to carry the fact back. Without the field a PASS can arrive with
// convincing inline evidence while no verdict directory exists at all, and
// nothing in the returned object says so.
//
// Not `required`: a pass with no worktree is never told to write a file, and a
// required field there would force the agent to invent a path. The script enforces
// it where the prompt asks for it.
const VERDICT = {
  type: 'object',
  required: ['verdict'],
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL', 'BLOCKED', 'SKIP'] },
    evidence: { type: 'string' },
    failures: { type: 'array', items: { type: 'string' } },
    mutation: MUTATION,
    verdict_path: { type: 'string' },
    // True when `git status --short` on the worktree came back empty at the
    // moment this stage read HEAD for `verified_parent`. A clean tree here
    // means the work is already committed — an earlier stage committed
    // despite being told not to — so the sha about to be written under
    // `verified_parent` would be HEAD-of-the-work, not its parent, and the
    // field's name would be false the instant it is written. The script halts
    // on this rather than trusting the prose that asks Verify to catch it.
    tree_clean: { type: 'boolean' },
    // True when the reachability preflight (below) found a host:port or URL
    // the item names as closed. The script reads this to distinguish a real
    // BLOCKED — something wrong in the code — from an environment that was
    // never brought up, which halts on 'surface' instead of 'verify' so the
    // caller starts the surface rather than re-diagnosing the change.
    surface_down: { type: 'boolean' },
    // How the CALLER re-checks this work. This pass's own verdict is a
    // first-pass filter, not the authority: the caller re-runs these commands
    // itself, in its own context, and only its result decides whether the
    // branch lands. A recipe that names no command leaves the caller inventing
    // one, which is how a verification that never happened reads as a pass.
    recheck: {
      type: 'array',
      items: {
        type: 'object',
        required: ['cmd', 'expect'],
        properties: {
          cmd: { type: 'string' },
          expect: { type: 'string' },
        },
      },
    },
  },
}

// Paths this pass would call tests. Deliberately generous: a false positive
// costs one extra check, a false negative costs the whole gate.
const TEST_PATH = /(^|[/\\])tests?[/\\]|(^|[/\\])spec[/\\]|_test\.|\.test\.|\.spec\.|_spec\.|(^|[/\\])test_[^/\\]*$|Tests?\.(swift|kt|cs)$/i

const LANDED = {
  type: 'object',
  required: ['committed'],
  properties: {
    committed: { type: 'boolean' },
    pushed: { type: 'boolean' },
    landed: { type: 'boolean' },
    commit: { type: 'string' },
    branch: { type: 'string' },
    followups: { type: 'array', items: { type: 'string' } },
    // Rows for the repo's shared index files (a file map, a changelog, a
    // component registry) that the worker was told not to edit. They come back
    // HERE, in the returned object, and are never written to a file: the verdict
    // file already exists by this point and belongs to the Verify stage. A Wrap
    // agent told to put them "in the verdict file" writes a fresh JSON holding
    // nothing else, destroying the verdict it never read. Observed on iptv-mac
    // 7 of 12 passes across four rounds lost their verdict that way, and a PASS
    // with no verdict file on disk is not a pass — so the pass was deleting the
    // evidence it had just produced.
    index_entries: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'entry'],
        properties: { file: { type: 'string' }, entry: { type: 'string' } },
      },
    },
    summary: { type: 'string' },
  },
}

const halt = (stage, detail) => ({ ok: false, halted_on: stage, detail, item: a.item || a.issue, worktree: a.worktree })

// A halt before Wrap must not also destroy the work that provoked it.
//
// Wrap is the only stage that commits, so for a worker in a worktree a halt
// used to mean the whole implementation stayed uncommitted and then died with
// the worktree at teardown. Observed three times in one swarm (stash-mobile,
// 2026-08-16): each worker implemented correctly, verified live, caught a real
// defect in its own work, reported FAIL, and lost every line of it. The
// orchestrator's stranded-worker recovery was the only thing that saved any of
// it, and only because it happened to look.
//
// Worktree passes only. In a worktree an unrequested commit is a rescue, not a
// surprise — the branch is disposable and nobody else is standing in it. In the
// primary checkout the human is standing there, so leave the tree as it is.
const salvage = async (stage, outcome) => {
  if (!a.worktree) return
  await agent(
    `You are salvaging work in the git worktree at \`${a.worktree}\` on branch \`${a.branch || (a.resolved && a.resolved.branch) || 'the checked-out branch'}\`.

The ${stage} stage just returned ${outcome} for this item and the pass is halting. The implementation is still there and it is NOT yours to fix, judge, or improve — your only job is to make sure it survives, because this worktree is deleted after the round and an uncommitted change dies with it.

Commit every source change in the tree. Then stop.

- Wrap is the only stage that normally commits; you are the other one, because you exist to rescue work a halt would otherwise strand, e.g. \`git -C ${a.worktree} commit -m "..."\`.
- Stage the files the pass actually changed. Never \`git add -A\`.
- Do not commit gitignored local files linked into the worktree — \`admin.toml\`, \`.env*\`, \`CLAUDE.local.md\`, \`.mcp.json\`, anything under \`.claude/skills/\`.
- Write a commit message that says plainly this work halted at ${stage} and names the outcome above, so nobody reading the log mistakes it for finished work. Conventional Commits, and no mention of Claude, AI, or any assistant.
- If the tree is already clean and the work is committed, do nothing and say so.
- **You run no \`git push\` at all**, to any branch, and no \`gh pr create\`. The commit is already visible to the orchestrator — a linked worktree shares the primary checkout's object store — so there is nothing a push would accomplish.

Return one sentence: the sha you committed, or that there was nothing to commit.`,
    { phase: stage, label: 'salvage', model, effort: 'low' },
  )
}

// --- resolve the item (no agent involved) -----------------------------------
//
// The chat session resolves and gates the item before ever calling this
// script — the four cleared-item queries and the plan/objectivity/reachability
// tests all run in chat, on the item text, before a worktree exists to strand.
// So this stage is not an agent call at all: `args.resolved` IS the item, and
// a launch that omits it, or gives it an empty id, has nothing to work from.
if (
  !a.resolved ||
  a.resolved.id === undefined ||
  a.resolved.id === null ||
  `${a.resolved.id}`.trim() === ''
) {
  return halt('resolve', `args.resolved is required and must carry a non-empty id — got ${JSON.stringify(a.resolved)}`)
}

// A wrong brief cost a full pass before anything here checked one: a
// string-valued `acceptance` passed the `.length` guard building Verify's
// prompt (a string has one) and died four stages later on `.map`. Nothing
// validated `args.resolved` at launch, so the shape check runs here, before
// `item` is built and before any agent() call.
//
// It checks types and nothing else, because types are all a workflow script
// can check. There is no filesystem and no shell here — no `child_process`,
// no dynamic `import()`, which the runtime rejects outright — so a question
// like "is this path tracked in the repo this pass is confined to" cannot be
// answered from inside this file at all. That one is HANDOFF.md §1's
// reachability test, run in chat before a worktree exists, where a real
// shell can run `git ls-files`.
const isStringArray = (x) => Array.isArray(x) && x.every((e) => typeof e === 'string')
if (typeof a.resolved.id !== 'string') {
  return halt('resolve', `args.resolved.id must be a string — got ${typeof a.resolved.id}: ${JSON.stringify(a.resolved.id)}`)
}
for (const field of ['title', 'body', 'branch']) {
  const v = a.resolved[field]
  if (v !== undefined && typeof v !== 'string') {
    return halt('resolve', `args.resolved.${field} must be a string — got ${typeof v}: ${JSON.stringify(v)}`)
  }
}
for (const field of ['acceptance', 'files']) {
  const v = a.resolved[field]
  if (v !== undefined && !isStringArray(v)) {
    return halt(
      'resolve',
      `args.resolved.${field} must be an array of strings — got ${typeof v}: ${JSON.stringify(v)}. No coercion: a single string is not turned into a one-element array.`,
    )
  }
}

// A fix round has no Plan stage to fall back on — it relies entirely on what
// round 1 already produced. `a.resolved` carries the item (with `body`
// replaced by the failure list) and `a.resolved.files` carries round 1's
// files; `a.worktree` is where Implement will make the fix. A missing
// worktree means the caller did not pass what its own verify loop's relaunch
// line is supposed to pass, and there is nothing here to recover from that.
if (round >= 2 && !a.worktree) {
  return halt('resolve', `round ${round} requires both resolved and worktree from the previous round — got resolved=true worktree=false`)
}

const item = { ...a.resolved, id: `${a.resolved.id}`.trim() }

// A tracked item routinely needs several passes, and nothing used to report
// the running total — a 25-minute pass announcement read as the whole cost
// of the work even on an item's fifth 25-minute pass. The history lives in
// `~/.claude/projects/*/*/workflows/wf_*.json`, keyed by `workflowName`; Plan
// scans it and reports the totals as fields (see below) rather than this
// script running a second agent to do it, since Plan already runs on round 1
// and already runs git commands of its own.
const formatTokens = (n) => {
  if (!n) return '0'
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`
  return `${n}`
}

// --- Plan --------------------------------------------------------------
// Read-only, and deliberately a separate context: the search history — every
// grep miss, every file opened and discarded — dies here instead of riding
// along for the rest of the pass.

phase('Plan')

let plan
if (round === 1) {
  plan = await agent(
    `${COMMON}

Work out **where** this change goes and **what** it should be. Stop before writing any of it — you have no edit tools; do not attempt one.

Item:
${JSON.stringify(item, null, 2)}

Find every file that must change and settle the approach. For each file give an \`anchors\` list — the function, type or symbol names the edit will target — so the next stage can open the file and go straight to the right place instead of re-reading it whole.

Also report the project's real build and test commands. Prefer an \`admin\` task when the repo has an \`admin.toml\`; otherwise the raw command.

**Also check whether \`~/.claude/skills\` is behind.** Run \`git -C ${SKILLS} fetch --quiet\`, then \`git -C ${SKILLS} rev-list --count HEAD..origin/main\`. Report the count as \`skills_behind\`. If it is non-zero, also report the command that brings the checkout up to date as \`skills_update_command\` — \`git -C ${SKILLS} merge --ff-only origin/main\` unless you find the repo actually wants something else (a detached HEAD that needs re-pointing at a branch first, for instance).

**Also sum this item's prior passes.** Scan \`~/.claude/projects/*/*/workflows/wf_*.json\` for records whose \`workflowName\` names this item's id, \`${item.id}\`. Sum \`durationMs\` (converted to minutes) and \`totalTokens\` across every matching record, and count how many records matched. Report these as \`prior_passes\`, \`prior_minutes\`, \`prior_tokens\` — all zero if nothing matches.

**Report \`base_sha\`: the output of \`git -C ${dir || '.'} rev-parse HEAD\`, run now, before anything has been edited.** A later stage uses it as the earliest point the review's diff may start from, and it is only truthful if you read it before the first edit. Return the full 40-character sha and nothing else in that field.

\`files\` must be complete and it must be minimal. If it is wrong the next stage re-explores and this stage's whole purpose is lost.`,
    { agentType: 'Explore', phase: 'Plan', model, schema: PLAN },
  )

  if (!plan) {
    return halt('plan', 'Plan agent returned nothing — likely a failed or overloaded request, not a bad brief')
  }
  if (!plan.files || !plan.files.length) {
    return halt('plan', 'no files identified for the change')
  }
  if (!/^[0-9a-f]{7,40}$/.test(plan.base_sha || '')) {
    return halt('plan', `no usable base_sha — got ${JSON.stringify(plan.base_sha)}; the Review stage has nothing to diff against`)
  }
  log(`plan: ${plan.files.length} files — ${plan.files.map((f) => f.path).join(', ')}`)
} else {
  // Round 1 already found the files and settled the approach; re-deriving
  // both from a Plan agent that only sees the failure list would rediscover
  // what round 1 already knew, at the cost of another full exploration pass.
  // `a.resolved.files` is `r.files` from the round-1 result — see SKILL.md's
  // "The verify loop" — an array of plain path strings, not `{path, why}`
  // objects. The Implement prompt template reads `f.path` and `f.why`, so
  // those strings are wrapped here rather than left for it to guess at.
  const files = (a.resolved.files || []).map((p) =>
    typeof p === 'string' ? { path: p, why: 'touched by the previous round; fix the failures listed in the item body' } : p,
  )
  plan = { files, approach: 'fix the failures listed in the item body; touch nothing else' }
  log(`round ${round}: skipping Plan — reusing ${plan.files.length} files from the previous round — ${plan.files.map((f) => f.path).join(', ')}`)
}

// A round-1 Plan only ever halts here — never before it runs — since the
// checkout-behind and per-item-history checks above are Plan's own fields,
// not a separate agent call. A fix round's manually-built `plan` (above)
// carries neither field, so both default harmlessly to 0.
const skillsBehind = typeof plan.skills_behind === 'number' ? plan.skills_behind : 0
if (skillsBehind > 0) {
  return halt(
    'skills-stale',
    `~/.claude/skills is ${skillsBehind} commit(s) behind origin/main — run \`${plan.skills_update_command || `git -C ${SKILLS} merge --ff-only origin/main`}\` before launching another pass`,
  )
}

const priorPasses = typeof plan.prior_passes === 'number' ? plan.prior_passes : 0
const priorMinutes = typeof plan.prior_minutes === 'number' ? plan.prior_minutes : 0
const priorTokens = typeof plan.prior_tokens === 'number' ? plan.prior_tokens : 0

log(`pass ${priorPasses + 1} of item ${item.id} · ${priorMinutes.toFixed(1)} min · ${formatTokens(priorTokens)} tokens so far`)

// --- the in-pass fix loop ----------------------------------------------
//
// Implement, Review and Verify run together, up to 3 times, before this pass
// ever calls Wrap. A round fails when Review returns a `blocking` or `major`
// finding, or Verify returns `FAIL` — and a failed round below the cap reruns
// Implement with the failures added to its prompt, then reruns Review (unless
// this is a round-2+ launch, which never reviews at all — see above) and
// Verify on the fixed tree. Nothing commits until Wrap runs, once, after the
// loop ends — so every retry edits the same uncommitted tree rather than
// making a new one.
//
// `BLOCKED` never loops — it means the pass could not tell PASS from FAIL, not
// that it saw a fixable defect, and a closed surface (`surface_down`) is the
// caller's problem to bring up, not this pass's to retry into. `SKIP` also
// never loops: it means the behaviour could not be observed at all, and
// running Implement again against nothing to observe would not change that.
// Both still reach the return statement — `SKIP` as a blocker on landing,
// `BLOCKED` and `surface_down` as an immediate halt, exactly as a hard failure
// from Implement or Review does.
//
// Only `minor` findings never gate a round; they accumulate across rounds,
// deduplicated, and ship as `followups` on whatever round the loop actually
// ends on.

const MAX_ROUNDS = 3

const findingRow = (f) => `${f.file}${f.line ? `:${f.line}` : ''} — ${f.summary}${f.fix ? ` — ${f.fix}` : ''}`

const failuresBlock = (n, blocking, major, verdict) => {
  const rows = [
    ...blocking.map(findingRow),
    ...major.map(findingRow),
    ...(verdict && verdict.verdict === 'FAIL'
      ? (verdict.failures || []).map((x) => `${x}${verdict.evidence ? ` — evidence: ${verdict.evidence}` : ''}`)
      : []),
  ]
  return `\nFailures from round ${n}\n${rows.map((r) => `- ${r}`).join('\n')}\n`
}

// Used by both Review's diff and Verify's mutation check.
const G = dir ? `git -C ${dir}` : 'git'

let impl, review, verdict
let blockingFindings = [], majorFindings = []
const minorFollowups = []
let touchedFiles = [], touchedTests = []
let fixRound = 1

while (true) {
  const priorFailures = fixRound > 1 ? failuresBlock(fixRound - 1, blockingFindings, majorFindings, verdict) : ''

  // --- Implement -------------------------------------------------------
  // The one stage that genuinely needs continuity across attempts, so it
  // stays a single agent that writes the code and then builds it itself. Its
  // growth was never the code — it was raw build output accumulating,
  // thousands of lines per attempt, none of it ever leaving. A stage cannot
  // spawn a subagent, so it runs the build itself, with the output always
  // truncated before it lands in context.

  phase('Implement')

  impl = await agent(
    `${COMMON}

Write the code for this item, then get it compiling and its tests passing yourself — this stage owns both. The research is done; do not redo it.

Item:
${JSON.stringify(item, null, 2)}

Approach settled by the previous stage:
${plan.approach}

Files to change:
${plan.files.map((f) => `- \`${f.path}\` — ${f.why}${f.anchors && f.anchors.length ? ` (anchors: ${f.anchors.join(', ')})` : ''}`).join('\n')}

${plan.risks && plan.risks.length ? `Known risks:\n${plan.risks.map((r) => `- ${r}`).join('\n')}\n` : ''}${priorFailures}
Open ONLY those files. If the change genuinely requires a file that is not listed, make it and record it in \`notes\` — but treat that as a signal the plan was wrong, not as licence to explore freely.

${plan.build_command ? `Build command: \`${plan.build_command}\`` : 'Work out the build command from the repo.'}
${plan.test_command ? `Test command: \`${plan.test_command}\`` : ''}

⛔ **Once the code is written, run the build and test suite yourself, in the foreground, and always bound the output.** Raw build output is the single largest source of context growth in this stage, so pipe every run — \`<cmd> 2>&1 | tail -40\` (add \`| grep -E 'error|FAIL' | head -40\` first when the runner is chatty) — never let the full log land here. Pass \`timeout\` explicitly (up to 600000) and never background the run. You have no way to hand this off to another agent — run it yourself.

Loop: run the command → read the tail → fix what it names → run it again. Stop when it passes clean, or after 6 attempts with no reduction in the error count — in that case set \`green: false\` and list what is still failing in \`remaining\` rather than continuing to churn.

Record any file you had to touch beyond the list above in \`extra_files_touched\`.

**You edit the tree and return. You stage nothing and commit nothing — no \`git add\`, no \`git commit\`, no \`git merge\`, and do not advance the branch yourself.** Wrap is the only stage that commits; a commit made here reaches Verify already on HEAD, and the \`verified_parent\` field Verify writes is false the moment that happens. If you commit anyway despite this instruction, report it truthfully as \`committed: true\` — the pass halts on that report rather than continuing with a lie.

**If you cannot produce a diff after one or two attempts** — a false start, a blocker, something that needs a design call — return \`touched: []\` and say plainly in \`unresolved\` what stopped you. That ends the pass cleanly. Do not commit to a guess to have written something, and do not commit anything at all.`,
    { phase: 'Implement', model, schema: IMPLEMENT },
  )

  // "No diff after 1–2 attempts is a halt" used to be prose nothing enforced:
  // the prompt asks for the empty result, so the script reads it. An empty
  // `touched` reaching Verify means Verify inspects an unchanged tree and the
  // pass ships a commit of nothing.
  if (!impl) return halt('implement', 'implementation stage returned nothing')
  // Wrap is the only stage that commits. If Implement committed anyway,
  // everything downstream — Review's diff base, Verify's `verified_parent` —
  // is built on a tree that is no longer what the contract expects, so this
  // halts before Review or Verify ever runs rather than let a false
  // `verified_parent` through.
  if (impl.committed) {
    await salvage('Implement', 'a commit made outside of Wrap')
    return halt('implement', 'implementation stage committed — Wrap is the only stage that commits, so downstream verification would be built on a tree it did not expect')
  }
  if (!impl.touched || !impl.touched.length) {
    return halt('implement', `implementation produced no diff${(impl.unresolved || []).length ? `: ${impl.unresolved.join('; ')}` : ''}`)
  }
  if (!impl.green) {
    await salvage('Implement', `still failing after ${impl.attempts} attempts`)
    return halt('implement', `still failing after ${impl.attempts} attempts: ${(impl.remaining || []).join('; ')}`)
  }

  touchedFiles = [...impl.touched, ...(impl.extra_files_touched || [])]
  touchedTests = touchedFiles.filter((f) => TEST_PATH.test(f))

  // --- Review ------------------------------------------------------------
  // A stage, not a `/code-review` invocation inside wrap-up.
  //
  // `/code-review` resolves its own working directory. Nested two agent levels
  // deep inside a swarm worker it resolved to the session's PRIMARY checkout
  // instead of the worker's worktree, and reviewed a clean `main`. Observed
  // verbatim across three round-1/round-2 workers on 2026-08-16: "There are no
  // changes to review. The working tree is clean"; "I don't see any uncommitted
  // changes or commits ahead on the current branch"; "Standing by for direction."
  // The worker read "no findings" as a clean diff, so the quality gate passed
  // vacuously — and one of them asked a human a question mid-swarm, where no
  // channel back to a person exists.
  //
  // So this stage is never asked WHERE the change is: every command it is given
  // is pinned with `-C`. There is no repository for it to discover.
  //
  // It is not asked WHEN the change is either. The diff is `git diff <base>`, a
  // two-argument diff against a commit rather than a bare one — that spans
  // committed and uncommitted work in one command, so no stage's commit can
  // blind it, and it survives a halted pass's tree having already been
  // committed by `salvage`.
  //
  // Which commit is `<base>` matters too: it is not `base_sha`, read at Plan,
  // several stages earlier, because on a `land: 'self'` pass on the default
  // branch this repo's own PreToolUse hook runs `git pull --rebase` before
  // every Bash call, so commits that arrived from origin mid-pass would sit
  // between `base_sha` and HEAD and `git diff base_sha` would report them as
  // work this pass introduced. Three-dot does not help — after a rebase
  // `base_sha` is still an ancestor of HEAD, so `merge-base(base_sha, HEAD)` is
  // `base_sha` itself. The commits that arrived from origin are exactly the
  // ones reachable from the upstream ref; this pass's own commits are not
  // pushed yet. So the base is `merge-base HEAD @{upstream}`, read now rather
  // than at Plan, with two fallbacks to `base_sha`: a swarm worker's branch has
  // no upstream at Review time, and an upstream behind a *previous* session's
  // unpushed commits would drag the base back before this pass started.
  //
  // The script, not the agent, decides what a finding costs: a `blocking`
  // finding halts the pass immediately; a `major` finding fails the round and
  // reruns Implement with it named. A review that read no diff at all is not a
  // skip — it halts the pass, because in the run's output a skip is
  // indistinguishable from a clean review, which is why three of them shipped
  // unnoticed before this check existed.

  // Where the verdict goes. `~/.claude/tools/repo-slug --path <worktree>` is the one
  // definition of the per-repo disposable directory, and it creates it — so the agent
  // runs the tool rather than assembling a path from prose. This script cannot run it
  // (a Workflow script has no filesystem and no shell), so it checks the SHAPE of what
  // comes back instead: under the disposable root, and keyed by this item's id.
  //
  // Built once, ahead of the round branch below, because round === 1 may run this
  // prompt inside a `parallel()` alongside Review — `parallel()`'s own contract says
  // each thunk gets its own agent() call with `phase` set explicitly, so the prompt
  // itself has to exist before that decision is made, not be assembled inline inside
  // a single sequential `await agent(...)` the way it used to be.
  const VERDICT_DIR_CMD = `~/.claude/tools/repo-slug --path ${a.worktree || dir || '.'}`
  const verdictLeaf = `/verify/${item.id}.json`
  const verdictShapeOk = (p) => p.startsWith('/private/tmp/claude/') && p.endsWith(verdictLeaf)

  const verdictPrompt = `${COMMON}

Prove this item's behaviour works at the surface a person would actually use, and report a verdict. Passing tests are not that proof — they prove CI runs, and the previous stage already established the code compiles.

**Before any of that, check that every surface this item names is actually up.** Collect every \`host:port\` (e.g. \`127.0.0.1:2024\`) and every \`http(s)://\` URL mentioned in the item body below, in its acceptance criteria, and in \`${REPO_ROOT}/.claude/skills/verify-project/SKILL.md\` (read it now if you have not yet, just to scan for these — you read it properly in the next step regardless). For each one, run \`nc -z -G 3 <host> <port>\` (or, for a URL, \`curl -s -o /dev/null -m 3 -w '%{http_code}' <url>\` — any response code at all, even an error page, counts as reachable; a curl exit failure does not). **If any of them is closed, stop here and return immediately**: \`verdict: "BLOCKED"\`, \`surface_down: true\`, and \`failures\` containing one entry per closed surface reading \`surface unreachable: <host:port or url> (from <item body|acceptance criteria|verify-project/SKILL.md>)\`. Do nothing else in that case — no further verification, no mutation-testing step, no \`recheck\` beyond the reachability commands themselves. Only once every named surface answers do you go on to read and follow \`verify-project/SKILL.md\` in full.

**Verification runs through this project's own \`verify-project\` skill, read as a file.** Read \`${REPO_ROOT}/.claude/skills/verify-project/SKILL.md\` and follow it. It owns what verification means for this repo and how to get a handle on its surface; do not re-derive its method, do not hand-roll the check, and do not substitute a test run.

**Do not invoke \`Skill(verify)\`, and do not conclude anything is broken when you notice you cannot.** The bundled \`verify\` skill is model-invocation-disabled: from inside this stage the Skill tool returns \`Skill verify cannot be used with Skill tool ... Ask the user to run /verify themselves\` and nothing loads. That is the tool working as designed, not a missing skill and not a papercut. Reading the project skill as a file above is this stage's method, not a fallback from it.

**That path is in the primary checkout, not the worktree you are editing.** \`verify-project\` is git-excluded, so a fresh worktree carries it only if a link hook put it there — its absence from the worktree is no evidence about the repo. Read it at the absolute path above and nowhere else.

**If that file does not exist, write it first, then follow it.** Do not fall back to a generic recipe, and do not fail this stage for its absence — a repo without one is a repo that has not been bootstrapped yet, which is a thing you can fix in place. Work out how this repo's surface is actually driven: read its \`README.md\`, its \`CLAUDE.md\`, its \`admin.toml\` if it has one, and how its own entry points are invoked. Then write \`${REPO_ROOT}/.claude/skills/verify-project/SKILL.md\` naming *this* repo's real surface and real commands — what to launch, how to reach the behaviour, what a pass looks like in the output. A recipe that would read the same in any repo is not one, and it is exactly the weak verdict this step exists to prevent. Keep it out of git: append \`.claude/skills/verify-project\` to \`${REPO_ROOT}/.git/info/exclude\`, never \`.gitignore\`, which is committed. **Never name it \`verify\`** — that collides with the bundled skill and the collision is why the project skill has its own name. Say in \`evidence\` that you wrote it and what surface it names.

**Treat doubt as \`FAIL\`.** There is no partial pass, and a \`FAIL\` is a real answer this stage exists to produce — not something to soften into a note so the pass can continue.

**A surface this item names that is not listening is \`BLOCKED\` with \`surface_down: true\` (handled above, before you get here) — never \`SKIP\`.** \`SKIP\` remains only for behaviour that cannot be observed for a reason other than a closed port: no fixture data, no device, no way to drive the behaviour from this environment even though every named surface answered. \`FAIL\` is for behaviour you observed to be wrong; \`SKIP\` is for behaviour you could not observe for some other reason. The caller treats \`SKIP\` as a blocker on closing the item, so the work is not lost and the gap is not hidden.

Item: ${item.id} — ${item.title}
${item.acceptance && item.acceptance.length ? `Acceptance criteria:\n${item.acceptance.map((x) => `- ${x}`).join('\n')}` : 'No acceptance criteria were written down; verify the behaviour the item describes.'}
Files changed: ${touchedFiles.join(', ')}

**Do not read a screenshot into this context — a stage cannot delegate that to another agent.** Prove the result from text the surface already produces: logs, exit codes, a DOM or text dump. If an image genuinely must be captured, save it to a path and assert on it via text or exit code, naming the path in \`evidence\` rather than reading the image here.${
    a.constraints
      ? `

**The caller has constrained how you may verify. These override the paragraph above wherever they conflict, and they are not negotiable — a surface you are told not to touch is shared with sibling workers, and driving it corrupts their runs as well as yours.**

${a.constraints}

If these constraints make the item's behaviour genuinely unverifiable from here, return \`SKIP\` with \`evidence\` naming what you could not reach and why. Do not route around them.`
      : ''
  }

${
    touchedTests.length
      ? `
**This pass touched test files: ${touchedTests.join(', ')}. Prove they discriminate before you return a verdict.** A test that passes whether or not the change is present is not evidence of anything, and adding one is the most common way a pass looks green while fixing nothing.

**Classify the production half of the diff before picking a method.** Read it. If every hunk outside the test files only deletes production code, or only touches comments or documentation, there is no behaviour left to reverse — reversing a pure deletion restores exactly the deleted code, and the retained tests pass exactly as they did before, by construction. Running the patch/reverse/re-run procedure below on a diff like that produces \`discriminates: false\` every time, on every legitimate removal, whether or not anything is actually wrong — which is worse than useless: it teaches whoever reads this report to expect \`false\` and discount it, which is exactly the moment a real gap hides best. New behaviour with nothing to revert is NOT removal-only — that stays \`false\` per the paragraph below, not \`null\`.

**If the diff is removal-only:** skip the patch/reverse/re-run procedure entirely. Instead run these two checks, both real commands with real output, not an inference:

  (a) Does anything still reference what was removed? Grep the repo for the removed name(s) — symbol, constant, config key, whatever the diff deleted. Paste the command and its output (empty is a fine, real answer).
  (b) Does anything the change now describes as load-bearing — a mechanism promoted in a comment or in \`method\` to "the enforcement", "the check", "what actually stops it" — have a test exercising it? Grep the test files for that mechanism's name. Paste the command and its output.

  Return \`mutation\` with \`method: "n/a — removal only"\`, \`command\`/\`output\` carrying the check (a) command and its real output (both fields are required — put real text in them, not a placeholder), \`discriminates: null\`, and \`tests\` naming whichever tests you narrowed the check (b) grep to. **If check (b) comes back empty — something is now claimed load-bearing with no test exercising it — name that mechanism and the empty grep in \`failures\`.** That is the shape that hid a real defect once (run wf_1c7f6439-4e8, cc-fyt round 1): do not let a clean \`null\` swallow it.

**Otherwise (the diff adds or changes behaviour), do this, literally:**

1. Capture the production half of the change as a patch, then reverse it out of the tree. \`PATCH\` puts it in this checkout's disposable directory, **outside the repo** — a patch written to \`<checkout>/tmp/\` is inside the working tree, so \`git status\` sees it, \`git add\` can catch it, and it rides the branch:
   \`\`\`
   PATCH="$(${VERDICT_DIR_CMD})/mutation.patch"
   ${G} diff -- ${touchedFiles.filter((f) => !TEST_PATH.test(f)).map((f) => `'${f}'`).join(' ') || '<the non-test paths>'} > "$PATCH"
   ${G} apply -R "$PATCH"
   \`\`\`
   **Never \`git stash\`.** \`refs/stash\` lives in the shared git directory, not the worktree, so a sibling worker stashing at the same moment can pop yours — the patch file is keyed to this checkout and cannot collide. If the change added an untracked production file, \`mv\` it aside instead and \`mv\` it back in step 4.
2. Run ONLY the new or changed tests, narrowed by name — the whole suite is noise here.
3. Read what it printed. Copy the actual failure text.
4. Put the change back — \`${G} apply "$PATCH"\` — and confirm \`${G} status --short\` matches what it showed before step 1. **Do not leave this step undone**; the next stage commits this tree.
5. Re-run the same tests and confirm they pass again.

Return that as \`mutation\`: \`method\` (what you removed and how), \`command\` (the exact test invocation), \`output\` (the real failure string from step 3, or the real pass output if they did not fail), \`discriminates\` (true only if they actually failed without the change), \`tests\` (the test names you ran).

**If they pass without the change, say so — \`discriminates: false\` with the real output.** That is a true report and it is what this check is for; a report that they failed when they did not is the one unrecoverable answer. If the behaviour is new and there is nothing to remove, set \`discriminates: false\` and put \`"no prior implementation to revert"\` in \`method\`.
`
      : ''
  }
\`evidence\` must cite what you actually observed: real values, real output. A verdict with no evidence is not a verdict.

**Return \`recheck\`: the commands the caller runs to confirm this work itself.** Your verdict is a first-pass filter, not the last word — the session that launched this pass re-runs these in the worktree and its result is what decides whether the branch lands. Give the narrowest commands that would actually catch this change breaking, each with what a pass looks like in \`expect\`. Real invocations you ran in this stage, not \`npm test\` / \`passes\` written from memory. If nothing here is machine-checkable, return an empty array and say why in \`evidence\` rather than inventing a command.${
    a.worktree
      ? `

**Write the verdict to \`<dir>/verify/${item.id}.json\` before you finish — for every verdict, \`SKIP\` and \`FAIL\` included** — where \`<dir>\` is what \`${VERDICT_DIR_CMD}\` prints. Run that command; do not assemble the path from this sentence. It is the single definition of this worktree's disposable directory and it creates the directory, so \`mkdir -p <dir>/verify\` is the only other thing you need. **The verdict does not go inside the worktree** — \`tmp/\` there is the repo, the file would ride the branch or die with the worktree at teardown, and nothing that reads verdicts looks in it. This pass runs staged and its transcript is not recoverable; that file is the only evidence a later reader gets, and a verdict returned without one is treated as no verdict at all. Include at least \`{"item", "verdict", "evidence", "verified_parent", "branch"${touchedTests.length ? ', "mutation"' : ''}}\` — \`verified_parent\` from \`git -C ${a.worktree} rev-parse HEAD\` and \`branch\` from \`git -C ${a.worktree} branch --show-current\`. Fill \`branch\` in; leaving it null strands the verdict with no way back to the work.

**Run that \`rev-parse\` at the moment you write the file, alongside \`git -C ${a.worktree} status --short\`.** Never recalled from earlier in this stage, never reconstructed from a log line, never typed. A reader resolves the sha with \`git -C ${a.worktree} cat-file -e <verified_parent>^{commit}\` before comparing anything, so a sha that names no object does not read as a stale verdict — it reads as no verdict at all, and voids the whole file. Observed: a verdict carrying \`bb85bca17fe86dfa3c7a26b8c4c6a5b7d9e2f3a4\`, 40 valid hex characters naming no object, on a branch whose real fork point was \`25bee4a\`.

**Assert this instead of assuming it: if \`status --short\` comes back empty, the work is already committed, and the sha you just read is HEAD-of-the-work — not its parent.** That means an earlier stage committed despite being told not to, and \`verified_parent\` would be false the instant you write it under that name. Do not write the file in that case. Set \`tree_clean: true\` and return \`verdict: "BLOCKED"\` naming which stage's report you have no way to trust, and let the caller sort out what actually happened. If \`status --short\` shows changes (the normal case — this is what "verify BEFORE anything commits" means), set \`tree_clean: false\` and proceed as below.

**Then \`cat\` the file back and return the absolute path you actually wrote in \`verdict_path\`.** Read it back before you answer — the point of the field is that it is false unless the file is on disk, so a \`verdict_path\` you filled in from the instruction above rather than from a file you just read is a lie the pass cannot detect. If it is not there, write it, then read it again. A verdict returned without \`verdict_path\`, or with one that is not under \`/private/tmp/claude/\` and named \`${item.id}.json\`, halts this pass regardless of what it says.

**\`item\` is the tracker id — write \`"item": "${item.id}"\` exactly, never the title.** The id is what a reader matches on: the filename is keyed by it and the title is already on the issue. A verdict whose \`item\` holds the title has no id in either place, so nothing can match the file back to the work it describes.

**The field is \`verified_parent\`, not \`commit\`, and the name is the point.** Nothing has been committed yet at this stage, so the sha you just read is the PARENT of the commit this work becomes. Recording it under \`commit\` would claim you verified a commit that does not exist, and something downstream would then have to rewrite the file to make the claim true — which is a stage editing an evidence record to say what it did not say. Name it truthfully once and nothing has to correct it. A reader checks this verdict by confirming \`verified_parent\` is the parent of the branch head; if the branch moved after you finished, it will not be, and that is exactly the staleness the check exists to catch.`
      : ''
  }`

  if (round === 1) {
    phase('Review')

    const BASE = `BASE=$(${G} merge-base HEAD '@{upstream}' 2>/dev/null || echo ${plan.base_sha}); ${G} merge-base --is-ancestor "$BASE" ${plan.base_sha} && BASE=${plan.base_sha}`
    const DIFF = `${G} diff "$BASE"`

    const reviewPrompt = `${WHERE}

Review the change this pass just made. **You are not looking for something to review — the change is everything in \`${dir || 'this repository'}\` that this pass added on top of what everyone else already has.** Read it with exactly these two commands, the first one exactly as written including the \`BASE=\` part:

\`\`\`
${BASE}; ${DIFF}
${G} status --short
\`\`\`

That first line computes \`$BASE\` — the commit where this pass's work diverges from the upstream branch — and diffs it against the tree as it stands. Run it as one line; \`$BASE\` does not survive into a second command.

\`${DIFF}\` is the whole change. It covers work that an earlier stage may already have committed as well as work still sitting in the working tree, so do not care which it is. Do not substitute a bare \`${G} diff\` — that one sees uncommitted work only and is empty on a pass whose work is already committed. Do not substitute \`${G} diff ${plan.base_sha}\` either — that is where this pass started, and commits pulled from origin since then would show up as work this pass did.

For any path \`status --short\` marks \`??\`, the file is new and untracked and the diff will not show it: read it with the Read tool at its ABSOLUTE path under \`${dir || 'the repository'}\`. Never open a bare relative path — you did not start in that directory, and a relative path here resolves against a different checkout of the same repo.

Item: ${item.id} — ${item.title}
What the implementation stage says it did: ${impl.summary}
Files it names: ${touchedFiles.join(', ')}

Judge only the diff. Correctness first — a bug the change introduces or fails to fix; then reuse and simplification against what the repo already has; then efficiency. Skip style the repo's own formatter owns.

Severity means: \`blocking\` — the change is wrong, incomplete against the item, or breaks something that worked. \`major\` — a real defect in this diff that must be fixed before the branch lands. Both re-run Implement inside this pass if a round is left, and both halt the pass if three rounds still report one. \`minor\` — a note, worth a follow-up, never a reason to re-run Implement or to halt.

**Do not edit anything, and do not stage or commit anything — no \`git add\`, no \`git commit\`, no \`git merge\`.** Wrap is the only stage that commits. An edit you make here ships unverified, and a commit you make here reaches Verify already on HEAD, making its \`verified_parent\` field false the moment it is written.

**Nobody can answer you.** If \`${DIFF}\` and \`status --short\` both come back empty, that is a fact to report, not a question to ask: return \`reviewed: false\` with \`findings: []\` and say in \`note\` exactly what the two commands printed. It halts the pass — it is not a way to pass the stage, so do not reach for it to get unstuck. Never ask what to review, and never return \`reviewed: true\` for a diff you did not actually read — an empty \`findings\` is a claim that you read the change and it was clean.`

    // Review and Verify see the identical post-Implement tree and neither
    // consumes the other's output, so ordinarily they run at once. The one
    // exception: Verify's mutation-testing step (only reached when this round
    // touched test files) runs `git apply -R` to reverse the production diff,
    // runs the narrowed tests, then `git apply`s it back — a real mutation of
    // the same files Review is concurrently reading via `git diff $BASE`. Run
    // Review first and let it finish before Verify starts mutating anything,
    // so it can never observe a partially-reverted diff; when no tests were
    // touched Verify never reaches that step, and the two are safe to run in
    // one `parallel()`.
    if (touchedTests.length) {
      review = await agent(reviewPrompt, { phase: 'Review', model, schema: REVIEW })
      phase('Verify')
      verdict = await agent(verdictPrompt, { phase: 'Verify', model, schema: VERDICT })
    } else {
      const pair = await parallel([
        () => agent(reviewPrompt, { phase: 'Review', model, schema: REVIEW }),
        () => agent(verdictPrompt, { phase: 'Verify', model, schema: VERDICT }),
      ])
      // `parallel()` runs both thunks and hands back their two results in
      // order — a thunk that throws resolves to `null` there, which the halt
      // checks right below already treat the same as "the stage returned
      // nothing". What is NOT a legitimate result is an array shorter than
      // the two thunks passed in — a host whose `parallel()` does not invoke
      // its thunks. Fall back to running the same two calls directly rather
      // than destructuring `undefined` out of a mis-shapen array.
      if (Array.isArray(pair) && pair.length >= 2) {
        ;[review, verdict] = pair
      } else {
        review = await agent(reviewPrompt, { phase: 'Review', model, schema: REVIEW })
        verdict = await agent(verdictPrompt, { phase: 'Verify', model, schema: VERDICT })
      }
    }

    // A review that read no diff is a halt, not a skip. It used to log a line
    // and carry on, blocking only the tracker close — and in the run's output
    // "no findings" and "no review" then looked the same, so three unreviewed
    // passes reached a human's hands before anyone noticed. There is no diff
    // this stage can legitimately fail to find: the base is never later than
    // this pass's start, and Implement halts when it returns nothing or is
    // not green.
    if (!review || !review.reviewed) {
      await salvage('Review', 'a diff it could not read')
      return halt('review', review ? review.note || 'review read no diff and gave no note' : 'review stage returned nothing')
    }

    blockingFindings = (review.findings || []).filter((f) => f.severity === 'blocking')
    majorFindings = (review.findings || []).filter((f) => f.severity === 'major')
    for (const f of review.findings || []) {
      if (f.severity !== 'minor') continue
      const row = `minor — ${findingRow(f)}`
      if (!minorFollowups.includes(row)) minorFollowups.push(row)
    }
    log(`round ${fixRound} review: ${review.findings.length} findings (${blockingFindings.length} blocking, ${majorFindings.length} major) over ${(review.files_reviewed || []).length} files`)
  } else {
    review = { reviewed: true, findings: [] }
    blockingFindings = []
    majorFindings = []
    log(`round ${round}: skipping Review — the diff is now the whole branch, not just this round's fix`)

    phase('Verify')
    verdict = await agent(verdictPrompt, { phase: 'Verify', model, schema: VERDICT })
  }

  // A clean tree at this point means the work was already committed before
  // Verify ran, so the sha it read is HEAD-of-the-work rather than the parent
  // `verified_parent` claims to be — the exact inversion this pass exists to
  // stop, so it halts here rather than trust the prose above to have caught it.
  if (verdict && verdict.tree_clean === true) {
    await salvage('Verify', 'a tree that was already committed when Verify ran')
    return halt('verify', 'the worktree was already clean when Verify checked — an earlier stage committed despite being told not to, so verified_parent would name HEAD-of-the-work rather than its parent')
  }

  if (!verdict || verdict.verdict === 'BLOCKED') {
    await salvage('Verify', verdict ? verdict.verdict : 'nothing')
    if (verdict && verdict.surface_down === true) {
      return halt('surface', `surface unreachable: ${(verdict.failures || []).join('; ')}`)
    }
    return halt('verify', verdict ? `${verdict.verdict}: ${(verdict.failures || []).join('; ')}` : 'verify stage returned nothing')
  }

  // A PASS (or FAIL, or SKIP) whose verdict file was never written is not a
  // verdict at all — the evidence is inline and reads as complete either way,
  // so this is the only place the difference exists. It halts rather than
  // setting a flag for a caller to notice.
  if (a.worktree) {
    const reported = typeof verdict.verdict_path === 'string' ? verdict.verdict_path.trim() : ''
    if (!verdictShapeOk(reported)) {
      await salvage('Verify', `${verdict.verdict} with no verdict file`)
      return halt(
        'verify',
        reported
          ? `${verdict.verdict} but the verdict was written to ${reported}, which is not \`${VERDICT_DIR_CMD}\`${verdictLeaf} — nothing downstream reads that path`
          : `${verdict.verdict} with no verdict_path — nothing was reported written, so there is no evidence this pass verified anything`,
      )
    }
    log(`verdict written to ${reported}`)
  }

  // A round fails when Review found a `blocking` or `major` finding, or
  // Verify came back `FAIL`. `SKIP` does not fail the round — there is
  // nothing more Implement could do to make an unobservable behaviour
  // observable — it proceeds to Wrap and stays a blocker on landing, exactly
  // like a weak-test PASS does.
  const findingCount = blockingFindings.length + majorFindings.length
  const roundFailed = verdict.verdict === 'FAIL' || findingCount > 0

  if (!roundFailed) break

  if (fixRound >= MAX_ROUNDS) {
    await salvage(verdict.verdict === 'FAIL' ? 'Verify' : 'Review', `round ${fixRound} still failing after ${MAX_ROUNDS} rounds`)
    const stage = verdict.verdict === 'FAIL' ? 'verify' : 'review'
    const reason =
      verdict.verdict === 'FAIL'
        ? `FAIL: ${(verdict.failures || []).join('; ')}`
        : `${findingCount} blocking/major finding(s): ${[...blockingFindings, ...majorFindings].map((f) => `${f.file} — ${f.summary}`).join('; ')}`
    return halt(stage, `round ${fixRound} of ${MAX_ROUNDS}: ${reason}`)
  }

  log(`round ${fixRound} failed — ${verdict.verdict === 'FAIL' ? 'verify FAIL' : `${findingCount} blocking/major finding(s)`}; retrying`)
  fixRound++
}

const rounds = fixRound

// --- Wrap ------------------------------------------------------------------
// Not `workflow('wrap-up')`, and not because of nesting: this stage is an agent,
// and `Workflow` is unavailable inside any subagent. It would not be wrap-up
// anyway — wrap-up closes the item and lands the branch, and this pass does
// neither. What is left is a commit, which is short enough to state outright.

phase('Wrap')

const WORK = `Item: ${item.id} — ${item.title}
What changed: ${impl.summary}
Files: ${touchedFiles.join(', ')}
Verification: ${verdict.verdict}${verdict.evidence ? ` — ${verdict.evidence}` : ''}
${impl.notes && impl.notes.length ? `Notes from implementation:\n${impl.notes.map((n) => `- ${n}`).join('\n')}` : ''}
${
  minorFollowups.length
    ? `Code review of this diff (already done — do NOT run another review, and do not fix these here) found ${minorFollowups.length} minor finding(s):\n${minorFollowups.map((f) => `- [${f}]`).join('\n')}\nThe orchestrator files these itself; \`followups\` in your response is for your own observations only, so there is no reason to copy these rows into it. Every blocking and major finding from that review was already resolved in this pass's fix loop before this stage ran, so none remain to report — do NOT file anything under those labels as followups.`
    : 'Code review of this diff: already done. Do NOT run another review.'
}`

// This stage is written as its own text, NOT as wrap-up's SKILL.md with clauses
// subtracted from it. Handing an agent a skill whose default is to close the
// item and land the branch, and then listing the steps to skip, is a guard on a
// document that does the opposite of what the stage is for — and it failed the
// way guards fail: agents merged into `main` and closed their own issues
// against an explicit clause forbidding it, repeated up to four times.
//
// The text below never mentions landing, so there is no landing step to
// disobey, and it never pushes: a linked worktree shares the primary checkout's
// object store and refs, so the caller already has every commit this pass
// makes. "Never push to the default branch" is unstateable for an agent that
// runs no `git push` at all.
const homeClaudeException = REPO_ROOT === '/Users/pierce/.claude'
  ? ' This repo is `~/.claude`, whose own `CLAUDE.md` documents the exception: write a plain one-sentence commit message with no `type(scope):` prefix, not Conventional Commits.'
  : ''
const wrapPrompt = `${WHERE}

You are the last stage of one implement pass, in a git worktree at \`${a.worktree || dir}\` on branch \`${a.branch || item.branch || 'the checked-out branch'}\`. **Your whole job is to turn the finished edits into one commit on that branch.** Do not read any other skill for this stage; the steps below are the entire stage.

${WORK}

1. \`~/.claude/tools/repo-snapshot ${dir || '.'}\` once — not several separate git calls.
2. Run the project's formatter **on the files listed above and no others**. Never a repo-wide format or \`lint --fix\`: it rewrites files no sibling worker touched, so every other branch in the round conflicts on whitespace alone, and the conflict surfaces at landing long after you are gone. If the only formatter available is repo-wide, skip formatting and say so in \`summary\`.
3. \`git -C ${a.worktree || dir} add\` **the listed paths, explicitly**. Never \`git add -A\` and never \`git add .\`. \`admin.toml\`, \`.env*\`, \`CLAUDE.local.md\`, \`.mcp.json\` and everything under \`.claude/skills/\` are gitignored local files linked into this worktree so the pass could build at all — they are not yours to track, and the bulk adds are how they reach a diff.
4. Commit. Conventional Commits subject unless this repo's own \`CLAUDE.md\` says otherwise, referencing \`${item.id}\`.${homeClaudeException} No mention of Claude, an AI, or an assistant anywhere in the message. **You are the one stage that commits: \`git -C ${a.worktree || dir} commit -m "..."\`.**
5. Read back what you actually produced: \`git -C ${a.worktree || dir} rev-parse HEAD\` and \`git -C ${a.worktree || dir} status --short\`. Return the sha in \`commit\`, the branch in \`branch\`, \`committed: true\`, and a clean \`status\` is what \`committed\` asserts — if the tree is still dirty, say which paths in \`summary\`.
6. Stop. Return \`pushed: false\` and \`landed: false\`; both are correct and neither is a failure.

**There is nothing after step 6.** You do not push, merge, open a PR, rebase, or check out any other branch — not with \`git\` here, and not with \`git -C\` somewhere else. A linked worktree shares the primary checkout's object store, so the orchestrator can already read every commit you just made without a network round trip. It lands them itself, from the primary checkout, after re-verifying your branch against a base that may have moved while you worked.

**Read the tracker; never write to it.** No \`gh issue close\`, no \`gh issue comment\`, no \`bd close\`, no \`bd update\`. A separate stage owns that call so there is exactly one writer.

**Do not edit files every change appends a row to** — a changelog, a file map, a component registry. Every sibling branch collides on them by construction. Return the exact lines you would have written in \`index_entries\`, as \`{"file", "entry"}\` objects, and the orchestrator writes them after landing.

**\`index_entries\` is a field in the object you return, not a file to write.** Do not touch \`$(~/.claude/tools/repo-slug --path ${a.worktree || dir})/verify/${item.id}.json\` — that file is the Verify stage's verdict, it already exists, and it is the only surviving evidence this pass ran. Writing your index rows into it replaces the verdict with a file holding nothing but the rows.

Anything you noticed and did not fix goes in \`followups\` as text. Do not file it anywhere.`

const landed = await agent(wrapPrompt, { phase: 'Wrap', model: 'haiku', effort: 'low', schema: LANDED })

if (!landed) return halt('wrap', 'wrap-up stage returned nothing')

// --- Handoff -----------------------------------------------------------
// The pass does not close the item and does not land the branch. It reports
// what it did and what still stands in the way, and the caller decides.

const blockers = []
if (verdict.verdict !== 'PASS') blockers.push(`verification returned ${verdict.verdict}, not PASS`)
if (!landed.committed) blockers.push('nothing was committed')

// A tautological test is not a reason to throw away a correct implementation,
// so this blocks the CLOSE rather than halting the pass.
const mutationBlockers = []
if (touchedTests.length) {
  const m = verdict.mutation
  if (!m) mutationBlockers.push(`tests were added or changed (${touchedTests.join(', ')}) and no mutation check was reported — nothing shows they fail without the change`)
  else if (m.discriminates === null) {
    // Removal-only: there was no behaviour to reverse, so `false` was never
    // going to be evidence of anything — this is not a blocker on its own.
    // But `null` is the shape that concealed a real gap once (cc-fyt round
    // 1), so a `null` paired with a named, unexercised "load-bearing"
    // mechanism still blocks landing — just on the actual gap, not on the
    // absence of a mutation to run.
    log(`mutation check: removal only, nothing to discriminate — ${m.method}`)
    if ((verdict.failures || []).length) {
      mutationBlockers.push(`the removal-only change reported an unexercised mechanism it now relies on: ${verdict.failures.join('; ')}`)
    }
  } else if (m.discriminates !== true) mutationBlockers.push(`the added tests do not discriminate: with the change removed, \`${m.command}\` still reported ${JSON.stringify((m.output || '').slice(0, 200))}`)
  else log(`mutation check: tests fail without the change — ${(m.output || '').slice(0, 120)}`)
}
blockers.push(...mutationBlockers)

if (blockers.length) log(`not ready to land: ${blockers.join('; ')}`)

// followups for review findings are built here, not by Wrap: every
// blocking/major finding was already resolved by the fix loop before Wrap
// ran (see the WORK template above), but Wrap might still invent or echo one
// under those labels, so a stray row bearing that label is stripped rather
// than trusted. Minor findings are filed by the orchestrator itself, so a row
// that just echoes one of those is stripped too.
const wrapFollowups = (landed.followups || []).filter((row) => {
  if (/^\s*[-[]*\s*(blocking|major)\b/i.test(row)) return false
  if (minorFollowups.includes(row)) return false
  return true
})

return {
  ok: true,
  item: item.id,
  title: item.title,
  round,
  rounds,
  verdict: verdict.verdict,
  tests_touched: touchedTests,
  mutation: touchedTests.length ? verdict.mutation || null : undefined,
  review: round >= 2
    ? { findings: 0, blocking: 0, major: 0, skipped: 'fix round' }
    : { findings: review.findings.length, blocking: blockingFindings.length, major: majorFindings.length },
  files: touchedFiles,
  attempts: impl.attempts,
  commit: landed.commit,
  branch: landed.branch || item.branch,
  worktree: a.worktree || null,
  // The commands the caller re-runs to confirm this work before landing it.
  // Empty means the Verify stage found nothing machine-checkable and said why
  // in `evidence` — it does not mean "no check needed".
  recheck: verdict.recheck || [],
  verdict_path: verdict.verdict_path || null,
  // Empty means nothing this pass can see stands in the way of landing. It is
  // never absent: a caller must be able to tell "clear" from "nobody looked".
  blockers,
  followups: [...minorFollowups, ...wrapFollowups],
  summary: landed.summary || impl.summary,
  // Relay is a recommendation, not something this script can act on: `relay`
  // (`~/.claude/skills/relay/SKILL.md`) only clears the SAME, calling
  // session, and a Workflow stage agent has no way to reach into its parent
  // and run a skill on its behalf — it cannot even observe the orchestrator's
  // context, since it runs in its own fresh one. So the orchestrator is the
  // only party that knows how full its own window is, and it is taken as
  // input: `args.contextPercent`, a plain number the caller supplies. Above
  // 50, the pass names it as a recommendation; the caller decides whether and
  // when to relay.
  ...(typeof a.contextPercent === 'number' && a.contextPercent > 50
    ? {
        relay_recommended: true,
        relay_reason: `context at ${a.contextPercent}% of the window — relay before the next item, in the calling session`,
      }
    : {}),
}
