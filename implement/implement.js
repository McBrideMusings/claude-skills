export const meta = {
  name: 'implement',
  description: 'One tracked item, worked end to end to a commit',
  whenToUse: 'Called by /implement for every pass it runs — once, N times in series, or N at once. Not invoked directly by a human, and never by name: the caller runs name-pass.sh to generate a per-pass copy of this file and passes that copy\'s absolute path as scriptPath.',
  phases: [
    { title: 'Resolve', detail: 'fetch the tracked item' },
    { title: 'Gate', detail: 'AFK-ability self-assessment' },
    { title: 'Locate', detail: 'find the files and settle the approach' },
    { title: 'Edit', detail: 'make the change' },
    { title: 'Green', detail: 'build and fix until it compiles and tests pass' },
    { title: 'Review', detail: "read this pass's whole diff for defects" },
    { title: 'Verify', detail: 'check the behaviour at the surface' },
    { title: 'Wrap', detail: 'format the touched files and commit' },
  ],
}

// ---------------------------------------------------------------------------
// Why this is a workflow and not one long agent.
//
// Measured over 24h of session logs: 40 implement passes ran as a single
// `general-purpose` agent each. They averaged ~300 turns and peaked between
// 243k and 406k context, and together they were 37% of all token spend. The
// cost is not the code — it is one monotonically growing context re-read on
// every turn.
//
// Each stage below starts fresh and hands the next one a small validated
// object. Exploration output dies at the end of Locate; build logs never
// enter any context at all (see the Green stage).
//
// Each stage prompt below is the whole of that stage's brief.
//
// Stages used to be handed `skills/implement/SKILL.md` and told which phase of
// it to execute. That document is written for a reader who owns the whole pass:
// of its sixteen sections, twelve address a whole-pass reader and four address
// one stage. So every agent read at least twelve sections of instructions for
// work that was not its own — and one of them, the transition inside Phase 1,
// says "the moment implementation lands green with no halt fired, invoke verify
// then wrap-up". The Green stage stands at exactly that moment holding exactly
// that sentence, and a Green stage that reached wrap-up would push, land and
// close the item halfway through the pass. The script guarded it with "execute
// ONLY the phase named below — do not run ahead", which is a guard against a
// document the script itself supplied.
//
// So the per-stage rules live here, in the prompt of the stage they govern, and
// `STAGE-RULES.md` carries only what is true for every stage. No stage prompt
// mentions a later stage, so there is no running ahead to forbid. SKILL.md is
// now the document a human reads, and the router that decides to run this.
// ---------------------------------------------------------------------------

const SKILLS = '/Users/pierce/.claude/skills'
const RULES = `${SKILLS}/implement/STAGE-RULES.md`
const DETECT = `${SKILLS}/_tracker/_detect.md`

const a = args || {}
const dir = a.worktree || a.repo || a.cwd
const model = a.model || 'sonnet'

// This pass NEVER lands and NEVER writes the tracker. It ends at a commit on
// its own branch, and the caller — the chat session that launched it — reviews
// the result, verifies it, lands it, and closes the item.
//
// There used to be a `land: 'self' | 'caller'` argument and a `mode:
// 'standalone' | 'continuous'` argument, because three skills called this
// script with three different ideas of who owned the outcome. Both are gone.
// One pass does one thing, and the only caller is a chat session that is
// already awake and already holds the judgment the tracker write depends on.
//
// A linked worktree shares the primary checkout's object store, so the caller
// already has every commit this pass makes. There is nothing to push.

// Every agent starts outside the working directory, so say so once, here.
const WHERE = dir
  ? `Work exclusively inside \`${dir}\` — every command either runs with \`git -C ${dir}\` or inside a \`( cd ${dir} && … )\` subshell. You did not start there. Never leave the Bash working directory somewhere it did not start.`
  : ''

const COMMON = `${WHERE}

Read \`${RULES}\` — the rules every stage of this pass obeys, including its Bash command rules. What follows is the whole of your job; finish it, and do not read another implement document to find more of it.

**Nobody is watching this run. Never call \`AskUserQuestion\` and never end your stage on a question** — the session that started this pass is blocked on it. A decision your prompt does not settle goes into the object you return, as a halt or an unresolved note, and the script decides.`

// --- schemas ---------------------------------------------------------------

const ITEM = {
  type: 'object',
  required: ['id', 'title', 'body'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    body: { type: 'string' },
    acceptance: { type: 'array', items: { type: 'string' } },
    unresolved: { type: 'array', items: { type: 'string' } },
    branch: { type: 'string' },
  },
}

const GATE = {
  type: 'object',
  required: ['pass', 'reason'],
  properties: {
    pass: { type: 'boolean' },
    reason: { type: 'string' },
    missing: { type: 'array', items: { type: 'string' } },
  },
}

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
  },
}

const EDIT = {
  type: 'object',
  required: ['touched', 'summary'],
  properties: {
    touched: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    diffstat: { type: 'string' },
    notes: { type: 'array', items: { type: 'string' } },
    unresolved: { type: 'array', items: { type: 'string' } },
  },
}

const GREEN = {
  type: 'object',
  required: ['green', 'attempts'],
  properties: {
    green: { type: 'boolean' },
    attempts: { type: 'number' },
    remaining: { type: 'array', items: { type: 'string' } },
    extra_files_touched: { type: 'array', items: { type: 'string' } },
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
const MUTATION = {
  type: 'object',
  required: ['method', 'command', 'output'],
  properties: {
    method: { type: 'string' },
    command: { type: 'string' },
    output: { type: 'string' },
    discriminates: { type: 'boolean' },
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

// The tracker database this pass's Resolve stage must read from, resolved
// against the ORCHESTRATOR's checkout — never the worktree `bd` would
// auto-discover from by walking up from its own cwd.
//
// A submodule's tracker is not on any ancestor path of its worktree: the code
// repo is nested inside the tracker repo, so a worktree at
// `~/.worktrees/claude-skills/<id>` has no `.beads` above it at all, and `bd`
// silently falls back to whatever *is* above the worktree — an empty or
// unrelated database — and answers "not found" with exit 0. A pass launched
// on the `skills` submodule halted at the Gate reading exactly that: "issue
// cc-xne does not exist in this tracker", against an issue that was open.
//
// The walk has to be an agent, not inline JS: a Workflow script has no
// filesystem or Node API access, so `implement.js` itself cannot stat a
// directory. And it has to target the nearest `.beads` DIRECTORY, not a
// `.beads/*.db` file — this install's tracker is `~/.claude/.beads/`, which
// holds `embeddeddolt` and `issues.jsonl`, no `.db` file at all. A literal
// `*.db` glob would find nothing and halt every pass on this machine.
const TRACKER = {
  type: 'object',
  required: ['backend'],
  properties: {
    backend: { type: 'string' },
    // Absolute path to the tracker's `.beads` directory. beads only.
    db: { type: 'string' },
    searched: { type: 'string' },
  },
}

const halt =(stage, detail) => ({ ok: false, halted_on: stage, detail, item: a.item || a.issue })

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
    `You are salvaging work in the git worktree at \`${a.worktree}\` on branch \`${a.branch || item.branch || 'the checked-out branch'}\`.

The ${stage} stage just returned ${outcome} for this item and the pass is halting. The implementation is still there and it is NOT yours to fix, judge, or improve — your only job is to make sure it survives, because this worktree is deleted after the round and an uncommitted change dies with it.

Commit every source change in the tree. Then stop.

- Stage the files the pass actually changed. Never \`git add -A\`.
- Do not commit gitignored local files linked into the worktree — \`admin.toml\`, \`.env*\`, \`CLAUDE.local.md\`, \`.mcp.json\`, anything under \`.claude/skills/\`.
- Write a commit message that says plainly this work halted at ${stage} and names the outcome above, so nobody reading the log mistakes it for finished work. Conventional Commits, and no mention of Claude, AI, or any assistant.
- If the tree is already clean and the work is committed, do nothing and say so.
- **You run no \`git push\` at all**, to any branch, and no \`gh pr create\`. The commit is already visible to the orchestrator — a linked worktree shares the primary checkout's object store — so there is nothing a push would accomplish. "Never push to the default branch" was the old wording here, and on 2026-08-16 workers pushed to \`origin/main\` anyway; a stage that runs no push has nothing to route around.

Return one sentence: the sha you committed, or that there was nothing to commit.`,
    { phase: stage, label: 'salvage', model, effort: 'low' },
  )
}

// --- Resolve ---------------------------------------------------------------

phase('Resolve')

let item
if (a.resolved) {
  // The caller (or iron-out) already resolved and gated this one; don't re-fetch.
  item = a.resolved
  log(`item pre-resolved by caller: ${item.id} ${item.title}`)
} else {
  // Resolve the tracker database BEFORE the Resolve agent runs, against the
  // ORCHESTRATOR's checkout (`args.repo`/`args.cwd`) — never `dir`, which
  // prefers the worktree and is exactly the path that produced the bug.
  //
  // Skipped entirely when neither is known: a caller that supplies only
  // `worktree` (or nothing at all) gives this walk no root to start from, and
  // there is nothing above the worktree itself to search from here — the
  // Resolve agent below falls back to whatever `bd` auto-discovers, same as
  // before this change.
  const TRACKER_ROOT = a.repo || a.cwd || null
  let db = null
  if (TRACKER_ROOT) {
    const tracker = await agent(
      `${COMMON}

Detect the tracker backend via \`${DETECT}\`. If it is beads, walk UP from \`${TRACKER_ROOT}\` for the nearest ancestor directory (including \`${TRACKER_ROOT}\` itself) that contains a \`.beads\` directory — the tracker commonly lives one repo up from a submodule checkout — and return that \`.beads\` directory's absolute path in \`db\`. If none is found, return \`backend: "beads"\` with no \`db\`. If the backend is GitHub, return \`backend: "github"\` and no \`db\` — \`gh\` resolves its own repo from the git remote and needs no path from you.

This is read-only. Run no \`bd\` write of any kind.`,
      { phase: 'Tracker', label: 'tracker-db', model, effort: 'low', schema: TRACKER },
    )
    if (!tracker) return halt('resolve', `could not determine the tracker database above ${TRACKER_ROOT}`)
    if (tracker.backend === 'beads' && !tracker.db) {
      return halt('resolve', `no beads database found above ${TRACKER_ROOT}`)
    }
    db = tracker.db || null
  }
  // Interpolated into every `bd` read in the Resolve prompt below. A bare `bd`
  // discovers its database by walking up from the CURRENT WORKING DIRECTORY,
  // which for this stage is the worktree — not the tracker's repo — so it
  // silently answers from a different, usually empty, database.
  const DB = db ? ` --db ${db}` : ''

  item = await agent(
    `${COMMON}

Resolve exactly **one** tracked work item and return it. Resolving it is the whole job — do not plan it, judge it, or touch a line of code.

Target: ${a.issue ? `issue ${a.issue}` : a.item ? `the local item ${JSON.stringify(a.item)}` : 'no explicit target — resolve it from the branch name, then from non-interactive triage'}.

Resolve the tracker backend via \`${DETECT}\`, then work down this ladder and stop at the first rung that answers.${DB ? ` Every \`bd\` read in this stage carries \`${DB}\`; a bare \`bd\` resolves from the worktree's own working directory and can answer from a different database than the one this item actually lives in.` : ''}

1. **An issue number or id in the target above** (\`1118\`, or a beads id like \`myproj-zb8\`) — that issue IS the item. Confirm it exists and is open: \`bd${DB} show <id> --json\` on beads, \`gh issue view <n> --json number,title,state\` on GitHub. **If it is closed or missing, return nothing** rather than substituting another item.
2. **Item text in the target above** — a papercut or local note with no issue number. That text IS the item; carry the id the caller gave it. Do not go looking for a matching issue.
3. **The current branch name**, for an embedded issue id — \`fix/1118-login\`, \`1118-foo\`, \`issue-1118\`, \`myproj-zb8-login\`. It counts only if it matches an item that is open on the backend (\`bd${DB} show <id> --json\`).
4. **Triage.** Invoke the \`triage\` skill via the Skill tool **non-interactively** — skip its wait-for-confirmation step and take the top recommendation. Skip triage's offer-wrap-up step; this pass does not wrap up. **The pick must be an item that already exists on the tracker.** A fresh idea, a "while we're here" cleanup or an invented refactor is not one — return nothing instead. If triage finds nothing actionable, return nothing.

Return the item itself. Put every question the tracker thread left unanswered into \`unresolved\` — that field is what the next stage gates on, and an empty \`unresolved\` you did not actually check for is the failure mode here.`,
    { agentType: 'issue-reader', phase: 'Resolve', schema: ITEM },
  )
  if (!item) return halt('resolve', 'item resolution returned nothing')
}

// The id is the key for everything downstream, and one path can arrive without
// it: `a.resolved` comes from the caller and is never schema-checked, while the
// agent branch above is (ITEM requires `id`). A record whose id is spelled
// anything else renders `undefined` into the verdict's filename, so every pass
// in a batch writes to one colliding path and each overwrites the last. Halting
// here costs one stage; the alternative is a round of invisible verdicts.
//
// No default and no fallback name: a synthesised id would produce a verdict
// that files correctly and points at nothing. Fail here, before any work exists
// to lose.
if (item.id === undefined || item.id === null || `${item.id}`.trim() === '') {
  return halt('resolve', `resolved item has no id — ${JSON.stringify(item).slice(0, 200)}`)
}
item = { ...item, id: `${item.id}`.trim() }

// --- Gate ------------------------------------------------------------------

phase('Gate')

const gate = await agent(
  `${COMMON}

Judge whether this item is walk-away work — objective enough for an unwatched agent to finish it without a human judgment call. Judging is the whole job: do not fix anything, and do not start on it if it passes.

${JSON.stringify(item, null, 2)}

Read whatever the repo can tell you about it before answering. Then apply two tests, and **both** must pass:

1. **Plan test.** Can you state a concrete plan *right now* — the files to touch, the changes to make, and an objective acceptance check that would prove it done? If you cannot name the files, or cannot name a check whose result would settle whether it is finished, the item is not understood well enough to work unwatched.
2. **Objectivity test.** Is "done" verifiable without a qualitative, taste, product or design call that is the user's to make? Does the item hide an unresolved decision, missing information, or an ambiguity you would have to *invent* an answer to in order to proceed? If so it fails — inventing that answer autonomously is exactly the mistake this gate exists to stop.

Be strict: this gate exists to stop a pass that would otherwise guess at intent and produce confidently wrong work. \`pass: false\` with a precise \`reason\` — naming which test failed and why — is a good outcome, not a failure. Put each specific thing you would have had to invent or ask about in \`missing\`.`,
  { phase: 'Gate', model, schema: GATE },
)

if (!gate || !gate.pass) {
  log(`gate failed: ${gate ? gate.reason : 'gate agent returned nothing'}`)
  return halt('gate', gate ? gate.reason : 'gate agent returned nothing')
}

// --- Locate ----------------------------------------------------------------
// Read-only, and deliberately a separate context: the search history — every
// grep miss, every file opened and discarded — dies here instead of riding
// along for the next 300 turns.

phase('Locate')

const plan = await agent(
  `${COMMON}

Work out **where** this change goes and **what** it should be. Stop before writing any of it — you have no edit tools; do not attempt one.

Item:
${JSON.stringify(item, null, 2)}

Find every file that must change and settle the approach. For each file give an \`anchors\` list — the function, type or symbol names the edit will target — so the next stage can open the file and go straight to the right place instead of re-reading it whole.

Also report the project's real build and test commands. Prefer an \`admin\` task when the repo has an \`admin.toml\`; otherwise the raw command.

**Report \`base_sha\`: the output of \`git -C ${dir || '.'} rev-parse HEAD\`, run now, before anything has been edited.** A later stage uses it as the earliest point the review's diff may start from, and it is only truthful if you read it before the first edit. Return the full 40-character sha and nothing else in that field.

\`files\` must be complete and it must be minimal. If it is wrong the next stage re-explores and this stage's whole purpose is lost.`,
  { agentType: 'Explore', phase: 'Locate', schema: PLAN },
)

if (!plan || !plan.files || !plan.files.length) {
  return halt('locate', 'no files identified for the change')
}
if (!/^[0-9a-f]{7,40}$/.test(plan.base_sha || '')) {
  return halt('locate', `no usable base_sha — got ${JSON.stringify(plan.base_sha)}; the Review stage has nothing to diff against`)
}
log(`plan: ${plan.files.length} files — ${plan.files.map((f) => f.path).join(', ')}`)

// --- Edit ------------------------------------------------------------------

phase('Edit')

const edit = await agent(
  `${COMMON}

Write the code for this item. The research is done; do not redo it.

Item:
${JSON.stringify(item, null, 2)}

Approach settled by the previous stage:
${plan.approach}

Files to change:
${plan.files.map((f) => `- \`${f.path}\` — ${f.why}${f.anchors && f.anchors.length ? ` (anchors: ${f.anchors.join(', ')})` : ''}`).join('\n')}

${plan.risks && plan.risks.length ? `Known risks:\n${plan.risks.map((r) => `- ${r}`).join('\n')}\n` : ''}
Open ONLY those files. If the change genuinely requires a file that is not listed, make it and record it in \`notes\` — but treat that as a signal the plan was wrong, not as licence to explore freely.

Write the code. Do not run the build; another stage owns that.

**If you cannot produce a diff after one or two attempts** — a false start, a blocker, something that needs a design call — return \`touched: []\` and say plainly in \`unresolved\` what stopped you. That ends the pass cleanly. Do not commit to a guess to have written something, and do not commit anything at all.`,
  { phase: 'Edit', model, schema: EDIT },
)

// "No diff after 1–2 attempts is a halt" used to be prose in SKILL.md that
// nothing enforced: the Edit prompt asks for the empty result, so the script
// reads it. An empty `touched` reaching Green means Green builds an unchanged
// tree, goes green, and the pass ships a commit of nothing.
if (!edit) return halt('edit', 'implementation stage returned nothing')
if (!edit.touched || !edit.touched.length) {
  return halt('edit', `implementation produced no diff${(edit.unresolved || []).length ? `: ${edit.unresolved.join('; ')}` : ''}`)
}

// --- Green -----------------------------------------------------------------
// The one stage that genuinely needs continuity across attempts, so it stays a
// single agent. Its growth was never the code — it was raw build output
// accumulating, thousands of lines per attempt, none of it ever leaving. It is
// forbidden from running the build itself; `build-runner` absorbs the log and
// hands back only failures.

phase('Green')

const green = await agent(
  `${COMMON}

Get the change compiling and its tests passing.

Files changed by the previous stage: ${edit.touched.join(', ')}
${plan.build_command ? `Build command: \`${plan.build_command}\`` : 'Work out the build command from the repo.'}
${plan.test_command ? `Test command: \`${plan.test_command}\`` : ''}

⛔ **You must not run the build or the test suite yourself.** Every build, test, lint and typecheck run goes through the \`build-runner\` subagent, which returns only the failures. Raw build output is the single largest source of context growth in this stage and it must never land here.

**Spawn it with the Agent tool** — \`Agent({ subagent_type: "build-runner", description: "...", prompt: "..." })\` — a fresh one each attempt. It is a subagent type you CREATE, not a running agent you address: it will never appear in \`ListAgents\`, and \`SendMessage\` to it always fails. Hunting for it there and halting when it is absent is the observed failure this sentence exists to prevent.

**If the Agent tool is genuinely unavailable to you, run the commands yourself in the foreground and carry on.** Pass \`timeout\` explicitly (up to 600000) and never background them. Letting raw output into your own context is a cost; halting the whole pass over an instruction you cannot follow is a total loss. Note in \`remaining\` that you ran them directly.

Loop: spawn build-runner → read the failures → fix them → spawn again. Stop when it reports \`ok: true\`, or after 6 attempts with no reduction in the error count — in that case set \`green: false\` and list what is still failing rather than continuing to churn.

Record any file you had to touch beyond the previous stage's list in \`extra_files_touched\`.`,
  { phase: 'Green', model, schema: GREEN },
)

if (!green || !green.green) {
  return halt('green', green ? `still failing after ${green.attempts} attempts: ${(green.remaining || []).join('; ')}` : 'build stage returned nothing')
}

// --- Review ----------------------------------------------------------------
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
// It is not asked WHEN the change is either, and that is the second fix. It
// used to read `status --short` + `git diff`, which see uncommitted work only,
// on the premise that nothing commits before Wrap. That premise does not hold:
// a hook or a sibling process can commit, and a halted pass's tree is committed
// by `salvage` before anything reads it. When the tree was already committed
// both commands came back genuinely empty and the stage skipped — three times in
// one run, each against a worktree holding a committed diff, and every one had
// to be reviewed by hand before it could land.
//
// So the diff is `git diff <base>`, a two-argument diff against a commit rather
// than a bare one. That spans committed and uncommitted work in one command, and
// no stage's commit can blind it.
//
// Which commit is `<base>` is the third fix. It used to be `base_sha` — HEAD as
// the Locate stage read it, several stages earlier. The commit does not move,
// but the tip does: on a `land: 'self'` pass on the default branch, this repo's
// own PreToolUse hook runs `git pull --rebase` before every Bash call, so
// commits that arrived from origin mid-pass sit between `base_sha` and HEAD and
// `git diff base_sha` reports them as work this pass introduced. Three-dot does
// not help — after a rebase `base_sha` is still an ancestor of HEAD, so
// `merge-base(base_sha, HEAD)` is `base_sha` itself, and three-dot drops the
// uncommitted work that cc-797 exists to keep.
//
// The commits that arrived from origin are exactly the ones reachable from the
// upstream ref; this pass's own commits are not pushed yet. So the base is
// `merge-base HEAD @{upstream}`, read now rather than before the first edit, and
// re-read after however many pulls have landed. Two fallbacks, both to
// `base_sha`: a swarm worker's branch has no upstream at Review time, and an
// upstream that is behind a *previous* session's unpushed commits would drag the
// base back before this pass started.
//
// The script, not the agent, decides what a finding costs: a `blocking` finding
// blocks the close below. A review that read no diff at all is not a skip — it
// halts the pass, because in the run's output a skip is indistinguishable from
// a clean review, which is why three of them shipped unnoticed.

phase('Review')

const G = dir ? `git -C ${dir}` : 'git'
const BASE = `BASE=$(${G} merge-base HEAD '@{upstream}' 2>/dev/null || echo ${plan.base_sha}); ${G} merge-base --is-ancestor "$BASE" ${plan.base_sha} && BASE=${plan.base_sha}`
const DIFF = `${G} diff "$BASE"`

const review = await agent(
  `${WHERE}

Review the change this pass just made. **You are not looking for something to review — the change is everything in \`${dir || 'this repository'}\` that this pass added on top of what everyone else already has.** Read it with exactly these two commands, the first one exactly as written including the \`BASE=\` part:

\`\`\`
${BASE}; ${DIFF}
${G} status --short
\`\`\`

That first line computes \`$BASE\` — the commit where this pass's work diverges from the upstream branch — and diffs it against the tree as it stands. Run it as one line; \`$BASE\` does not survive into a second command.

\`${DIFF}\` is the whole change. It covers work that an earlier stage may already have committed as well as work still sitting in the working tree, so do not care which it is. Do not substitute a bare \`${G} diff\` — that one sees uncommitted work only and is empty on a pass whose work is already committed. Do not substitute \`${G} diff ${plan.base_sha}\` either — that is where this pass started, and commits pulled from origin since then would show up as work this pass did.

For any path \`status --short\` marks \`??\`, the file is new and untracked and the diff will not show it: read it with the Read tool at its ABSOLUTE path under \`${dir || 'the repository'}\`. Never open a bare relative path — you did not start in that directory, and a relative path here resolves against a different checkout of the same repo.

Item: ${item.id} — ${item.title}
What the implementation stage says it did: ${edit.summary}
Files it names: ${[...edit.touched, ...(green.extra_files_touched || [])].join(', ')}

Judge only the diff. Correctness first — a bug the change introduces or fails to fix; then reuse and simplification against what the repo already has; then efficiency. Skip style the repo's own formatter owns.

Severity means: \`blocking\` — the change is wrong, incomplete against the item, or breaks something that worked. \`major\` — real defect, does not invalidate the change. \`minor\` — worth a follow-up.

**Do not edit anything.** A later stage commits this tree, and an edit you make here ships unverified.

**Nobody can answer you.** If \`${DIFF}\` and \`status --short\` both come back empty, that is a fact to report, not a question to ask: return \`reviewed: false\` with \`findings: []\` and say in \`note\` exactly what the two commands printed. It halts the pass — it is not a way to pass the stage, so do not reach for it to get unstuck. Never ask what to review, and never return \`reviewed: true\` for a diff you did not actually read — an empty \`findings\` is a claim that you read the change and it was clean.`,
  { phase: 'Review', model, schema: REVIEW },
)

// A review that read no diff is a halt, not a skip. It used to log a line and
// carry on, blocking only the tracker close — and in the run's output "no
// findings" and "no review" then looked the same, so three unreviewed passes
// reached a human's hands before anyone noticed. There is no diff this stage
// can legitimately fail to find: the base is never later than this pass's start, Edit
// halts when it returns nothing, and Green halts when the build is not green.
if (!review || !review.reviewed) {
  await salvage('Review', 'a diff it could not read')
  return halt('review', review ? review.note || 'review read no diff and gave no note' : 'review stage returned nothing')
}

const blockingFindings = (review.findings || []).filter((f) => f.severity === 'blocking')
log(`review: ${review.findings.length} findings (${blockingFindings.length} blocking) over ${(review.files_reviewed || []).length} files`)

// --- Verify ----------------------------------------------------------------

const touchedFiles = [...edit.touched, ...(green.extra_files_touched || [])]
const touchedTests = touchedFiles.filter((f) => TEST_PATH.test(f))

phase('Verify')

// Where the verdict goes. `~/.claude/tools/repo-slug --path <worktree>` is the one
// definition of the per-repo disposable directory, and it creates it — so the agent
// runs the tool rather than assembling a path from prose. This script cannot run it
// (a Workflow script has no filesystem and no shell), so it checks the SHAPE of what
// comes back instead: under the disposable root, and keyed by this item's id.
//
// There is exactly one spelling of this path, and `repo-slug --path` is it. When
// the writer, the reader and the brief each named their own, a pass that obeyed
// any one of them was invisible to the other two — so the command is run, never
// assembled from a sentence.
// `--path <checkout>` because the slug is per-checkout: a worktree and its
// primary checkout get different directories, so two passes never collide.
// Falls back to the pass's working directory when no worktree was given —
// without it the command interpolates the string "undefined" and every write
// lands in one shared directory.
const VERDICT_DIR_CMD = `~/.claude/tools/repo-slug --path ${a.worktree || dir || '.'}`
const verdictLeaf = `/verify/${item.id}.json`
const verdictShapeOk = (p) => p.startsWith('/private/tmp/claude/') && p.endsWith(verdictLeaf)

const verdict = await agent(
  `${COMMON}

Prove this item's behaviour works at the surface a person would actually use, and report a verdict. Passing tests are not that proof — they prove CI runs, and the previous stage already established the code compiles.

Invoke the \`verify\` skill via the Skill tool. It owns what verification means and how to get a handle on the app; do not re-derive its method, do not hand-roll the check, and do not substitute a test run.

**Where \`verify\` lives, so you do not conclude it is missing.** It is bundled into the Claude Code binary — there is no file for it under \`~/.claude/skills/\` and it does not appear in the skill listing. \`find\` comes up empty and the listing looks like it was never built; neither is evidence. \`Skill(verify)\` loads it anyway. Do not log a papercut about a missing skill.

**The project's own \`verify\` is the real one; the bundled skill is its bootstrap.** If \`<repo>/.claude/skills/verify-project/\` exists, that is the skill you are running — trust it over anything the bundled one would have done. If it does not, let the bundled skill write one, and make sure what it writes names *this* repo's actual surface and commands rather than a generic recipe. Keep it out of git: add \`.claude/skills/verify-project\` to \`<repo>/.git/info/exclude\`, never \`.gitignore\`, which is committed.

**Resolve doubt as \`FAIL\`.** There is no partial pass, and a \`FAIL\` is a real answer this stage exists to produce — not something to soften into a note so the pass can continue.

Item: ${item.id} — ${item.title}
${item.acceptance && item.acceptance.length ? `Acceptance criteria:\n${item.acceptance.map((x) => `- ${x}`).join('\n')}` : 'No acceptance criteria were written down; verify the behaviour the item describes.'}
Files changed: ${[...edit.touched, ...(green.extra_files_touched || [])].join(', ')}

If verification needs a screenshot, dispatch the \`screenshot-checker\` subagent rather than reading the image here.${
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

Do this, literally:

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

**Run that \`rev-parse\` at the moment you write the file.** Never recalled from earlier in this stage, never reconstructed from a log line, never typed. A reader resolves the sha with \`git -C ${a.worktree} cat-file -e <verified_parent>^{commit}\` before comparing anything, so a sha that names no object does not read as a stale verdict — it reads as no verdict at all, and voids the whole file. Observed: a verdict carrying \`bb85bca17fe86dfa3c7a26b8c4c6a5b7d9e2f3a4\`, 40 valid hex characters naming no object, on a branch whose real fork point was \`25bee4a\`.

**Then \`cat\` the file back and return the absolute path you actually wrote in \`verdict_path\`.** Read it back before you answer — the point of the field is that it is false unless the file is on disk, so a \`verdict_path\` you filled in from the instruction above rather than from a file you just read is a lie the pass cannot detect. If it is not there, write it, then read it again. A verdict returned without \`verdict_path\`, or with one that is not under \`/private/tmp/claude/\` and named \`${item.id}.json\`, halts this pass regardless of what it says.

**\`item\` is the tracker id — write \`"item": "${item.id}"\` exactly, never the title.** The id is what a reader matches on: the filename is keyed by it and the title is already on the issue. A verdict whose \`item\` holds the title has no id in either place, so nothing can match the file back to the work it describes.

**The field is \`verified_parent\`, not \`commit\`, and the name is the point.** Nothing has been committed yet at this stage, so the sha you just read is the PARENT of the commit this work becomes. Recording it under \`commit\` would claim you verified a commit that does not exist, and something downstream would then have to rewrite the file to make the claim true — which is a stage editing an evidence record to say what it did not say. Name it truthfully once and nothing has to correct it. A reader checks this verdict by confirming \`verified_parent\` is the parent of the branch head; if the branch moved after you finished, it will not be, and that is exactly the staleness the check exists to catch.`
    : ''
}`,
  { phase: 'Verify', model, schema: VERDICT },
)

if (!verdict || verdict.verdict === 'FAIL' || verdict.verdict === 'BLOCKED') {
  await salvage('Verify', verdict ? verdict.verdict : 'nothing')
  return halt('verify', verdict ? `${verdict.verdict}: ${(verdict.failures || []).join('; ')}` : 'verify stage returned nothing')
}

// A PASS whose verdict file was never written is not a pass. The evidence is inline
// and reads as complete either way, so this is the only place the difference exists.
// It halts rather than setting a flag for a caller to notice: `unreviewed: true` was
// the flag shape at the Review stage and nobody read it.
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

// A tautological test is not a reason to throw away a correct implementation, so
// this blocks the CLOSE rather than halting the pass. Halting here would strand
// an uncommitted worktree — the one state a swarm cannot recover from — over a
// weak test rather than broken code.
const mutationBlockers = []
if (touchedTests.length) {
  const m = verdict.mutation
  if (!m) mutationBlockers.push(`tests were added or changed (${touchedTests.join(', ')}) and no mutation check was reported — nothing shows they fail without the change`)
  else if (m.discriminates !== true) mutationBlockers.push(`the added tests do not discriminate: with the change removed, \`${m.command}\` still reported ${JSON.stringify((m.output || '').slice(0, 200))}`)
  else log(`mutation check: tests fail without the change — ${(m.output || '').slice(0, 120)}`)
}

// --- Wrap ------------------------------------------------------------------
// Not `workflow('wrap-up')`, and not because of nesting: this stage is an agent,
// and `Workflow` is unavailable inside any subagent. It would not be wrap-up
// anyway — wrap-up closes the item and lands the branch, and this pass does
// neither. What is left is a commit, which is short enough to state outright.

phase('Wrap')

const WORK = `Item: ${item.id} — ${item.title}
What changed: ${edit.summary}
Files: ${[...edit.touched, ...(green.extra_files_touched || [])].join(', ')}
Verification: ${verdict.verdict}${verdict.evidence ? ` — ${verdict.evidence}` : ''}
${edit.notes && edit.notes.length ? `Notes from implementation:\n${edit.notes.map((n) => `- ${n}`).join('\n')}` : ''}
${
  review.findings.length
    ? `Code review of this diff (already done — do NOT run another review, and do not fix these here):\n${review.findings.map((f) => `- [${f.severity}] ${f.file}${f.line ? `:${f.line}` : ''} — ${f.summary}`).join('\n')}\nPut every one of them into \`followups\`, verbatim, severity included.`
    : 'Code review of this diff: already done, no findings. Do NOT run another review.'
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
const wrapPrompt = `${WHERE}

You are the last stage of one implement pass, in a git worktree at \`${a.worktree || dir}\` on branch \`${a.branch || item.branch || 'the checked-out branch'}\`. **Your whole job is to turn the finished edits into one commit on that branch.** Do not read any other skill for this stage; the steps below are the entire stage.

${WORK}

1. \`~/.claude/tools/repo-snapshot ${dir || '.'}\` once — not several separate git calls.
2. Run the project's formatter **on the files listed above and no others**. Never a repo-wide format or \`lint --fix\`: it rewrites files no sibling worker touched, so every other branch in the round conflicts on whitespace alone, and the conflict surfaces at landing long after you are gone. If the only formatter available is repo-wide, skip formatting and say so in \`summary\`.
3. \`git -C ${a.worktree || dir} add\` **the listed paths, explicitly**. Never \`git add -A\` and never \`git add .\`. \`admin.toml\`, \`.env*\`, \`CLAUDE.local.md\`, \`.mcp.json\` and everything under \`.claude/skills/\` are gitignored local files linked into this worktree so the pass could build at all — they are not yours to track, and the bulk adds are how they reach a diff.
4. Commit. Conventional Commits subject unless this repo's own \`CLAUDE.md\` says otherwise, referencing \`${item.id}\`. No mention of Claude, an AI, or an assistant anywhere in the message.
5. Read back what you actually produced: \`git -C ${a.worktree || dir} rev-parse HEAD\` and \`git -C ${a.worktree || dir} status --short\`. Return the sha in \`commit\`, the branch in \`branch\`, \`committed: true\`, and a clean \`status\` is what \`committed\` asserts — if the tree is still dirty, say which paths in \`summary\`.
6. Stop. Return \`pushed: false\` and \`landed: false\`; both are correct and neither is a failure.

**There is nothing after step 6.** You do not push, merge, open a PR, rebase, or check out any other branch — not with \`git\` here, and not with \`git -C\` somewhere else. A linked worktree shares the primary checkout's object store, so the orchestrator can already read every commit you just made without a network round trip. It lands them itself, from the primary checkout, after re-verifying your branch against a base that may have moved while you worked.

**Read the tracker; never write to it.** No \`gh issue close\`, no \`gh issue comment\`, no \`bd close\`, no \`bd update\`. A separate stage owns that call so there is exactly one writer.

**Do not edit files every change appends a row to** — a changelog, a file map, a component registry. Every sibling branch collides on them by construction. Return the exact lines you would have written in \`index_entries\`, as \`{"file", "entry"}\` objects, and the orchestrator writes them after landing.

**\`index_entries\` is a field in the object you return, not a file to write.** Do not touch \`$(~/.claude/tools/repo-slug --path ${a.worktree || dir})/verify/${item.id}.json\` — that file is the Verify stage's verdict, it already exists, and it is the only surviving evidence this pass ran. Writing your index rows into it replaces the verdict with a file holding nothing but the rows.

Anything you noticed and did not fix goes in \`followups\` as text. Do not file it anywhere.`

const landed = await agent(wrapPrompt, { phase: 'Wrap', model, schema: LANDED })

if (!landed) return halt('wrap', 'wrap-up stage returned nothing')

// --- Handoff ---------------------------------------------------------------
// The pass does not close the item and does not land the branch. It reports
// what it did and what still stands in the way, and the caller decides.
//
// There used to be a Track stage here that closed the item itself. It was the
// last thing in this script that wrote to something outside the worktree, and
// it forced every caller to declare in advance whether this pass owned the
// outcome — the `land: 'self' | 'caller'` argument, which was inferred wrong
// often enough to ship work against a tracker that still read open. A pass with
// no authority to close cannot close the wrong thing.

const blockers = []
if (verdict.verdict !== 'PASS') blockers.push(`verification returned ${verdict.verdict}, not PASS`)
if (!landed.committed) blockers.push('nothing was committed')
blockers.push(...mutationBlockers)
if (blockingFindings.length) blockers.push(`code review returned ${blockingFindings.length} blocking finding(s): ${blockingFindings.map((f) => `${f.file} — ${f.summary}`).join('; ')}`)

if (blockers.length) log(`not ready to land: ${blockers.join('; ')}`)

return {
  ok: true,
  item: item.id,
  title: item.title,
  verdict: verdict.verdict,
  tests_touched: touchedTests,
  mutation: touchedTests.length ? verdict.mutation || null : undefined,
  review: { findings: review.findings.length, blocking: blockingFindings.length },
  files: [...edit.touched, ...(green.extra_files_touched || [])],
  attempts: green.attempts,
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
  followups: landed.followups || [],
  summary: landed.summary || edit.summary,
}
