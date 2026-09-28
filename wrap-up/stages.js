export const meta = {
  name: 'wrap-up',
  description: 'Close out a session: assess, track, document, quality-check, commit, land',
  whenToUse: 'Called by /wrap-up. /implement inlines these same stages rather than calling this script, because workflow nesting is one level deep.',
  phases: [
    { title: 'Assess', detail: 'what actually changed' },
    { title: 'Fan-out', detail: 'tracking, docs and quality in parallel' },
    { title: 'Land', detail: 'commit, push, follow-ups, land' },
  ],
}

// ---------------------------------------------------------------------------
// wrap-up fires at the most expensive moment there is: the end of a session,
// when context is at its peak. 34 runs in one measured day, each of them
// re-reading a context that had been growing all session.
//
// Phases 1–4 are near-pure fan-out with compact returns, so they run as
// separate agents. Phase 5–6 (commit, push, land) stay wherever this script was
// called from, because landing is the step the human may need to see.
//
// The `review` skill is NOT modified or reimplemented here — the quality agent
// invokes it exactly as wrap-up's Phase 4 already does.
// ---------------------------------------------------------------------------

const WRAP = '~/.claude/skills/wrap-up/SKILL.md'

const a = args || {}
const dir = a.worktree || a.repo || a.cwd
const mode = a.mode === 'continuous' ? 'continuous' : 'interactive'
const model = a.model || 'sonnet'

const WHERE = dir
  ? `Work exclusively inside \`${dir}\` — every command either runs with \`git -C ${dir}\` or inside a \`( cd ${dir} && … )\` subshell. You did not start there.`
  : ''

const BASE = `${WHERE}

Read \`${WRAP}\`. Execute ONLY the phase named below.

Open the repo with \`~/.claude/tools/repo-snapshot ${dir || '.'}\` — one call, not several separate git calls. Route every build, test, lint or typecheck run through the \`build-runner\` subagent so raw output never lands in your context.`

// minLength/minItems are load-bearing, not decoration. A bare `type: 'string'`
// accepted `summary: "test"`, `files: ["a"]` — placeholder output that validated
// cleanly, flowed into every downstream agent's context as the description of
// the session, and only surfaced because the tracking agent said the metadata
// looked wrong. Phases 2-4 still ran fine, so nothing failed loudly.
const ASSESSMENT = {
  type: 'object',
  required: ['summary', 'files', 'branch'],
  properties: {
    summary: { type: 'string', minLength: 120 },
    files: { type: 'array', minItems: 1, items: { type: 'string', minLength: 3 } },
    branch: { type: 'string', minLength: 1 },
    items: { type: 'array', items: { type: 'string' } },
    scope_creep: { type: 'array', items: { type: 'string' } },
  },
}

const EDITS = {
  type: 'object',
  required: ['done'],
  properties: {
    done: { type: 'array', items: { type: 'string' } },
    skipped: { type: 'array', items: { type: 'string' } },
    followups: { type: 'array', items: { type: 'string' } },
  },
}

const QUALITY = {
  type: 'object',
  required: ['clean'],
  properties: {
    clean: { type: 'boolean' },
    findings: { type: 'array', items: { type: 'string' } },
    fixed: { type: 'array', items: { type: 'string' } },
    followups: { type: 'array', items: { type: 'string' } },
  },
}

phase('Assess')

const ASSESS_PROMPT = `${BASE}

Execute **Phase 1 — Assess what was done**.

${a.item ? `The work item was: ${JSON.stringify(a.item)}` : 'Work out what this session changed from the diff and the commits.'}

\`summary\` is written for someone who did not watch the session: what behaviour is different now, in concrete terms. Not a list of file names — that is what \`files\` is for.

\`branch\` is the actual current branch name and \`files\` are real repo-relative paths, both read from the repo — never invented, never a placeholder.`

/**
 * The summary carries the check. File paths cannot: a submodule pointer (`skills`),
 * a `Makefile` or a `Dockerfile` is a real path with no separator and no extension.
 */
const looksReal = (r) => r && r.summary.trim().length >= 120

// Everything downstream describes the session using this object, so a placeholder
// here silently mislabels the whole run. One retry that names the rejection, then
// halt rather than fan out over junk.
let assessment = await agent(ASSESS_PROMPT, { phase: 'Assess', model, schema: ASSESSMENT })

if (assessment && !looksReal(assessment)) {
  log('Assess returned placeholder-looking output — retrying once.')
  assessment = await agent(
    `${ASSESS_PROMPT}

Your previous answer was REJECTED as placeholder output: summary ${JSON.stringify(
      assessment.summary.slice(0, 40),
    )}, files ${JSON.stringify(assessment.files.slice(0, 3))}. Read the actual diff and commits and answer from them.`,
    { phase: 'Assess', label: 'assess:retry', model, schema: ASSESSMENT },
  )
}

if (!assessment) return { ok: false, halted_on: 'assess' }
if (!looksReal(assessment))
  return { ok: false, halted_on: 'assess', reason: 'placeholder assessment', assessment }

phase('Fan-out')

const ctx = `Branch: ${assessment.branch || 'unknown'}
What changed: ${assessment.summary}
Files: ${assessment.files.join(', ')}`

const [tracking, docs, quality] = await parallel([
  () =>
    agent(
      `${BASE}

Execute **Phase 2 — Update tracking** (issues, milestones, followups file, roadmap, in-repo tracking).

${ctx}

Pass mode: ${mode}. Never close an issue on a repo the authenticated \`gh\` user does not own.`,
      { label: 'tracking', phase: 'Fan-out', model, schema: EDITS },
    ),
  () =>
    agent(
      `${BASE}

Execute **Phase 3 — Update docs**.

${ctx}

Only docs this change actually made stale. A doc you did not need to touch is not a finding.`,
      { label: 'docs', phase: 'Fan-out', model, schema: EDITS },
    ),
  () =>
    agent(
      `${BASE}

Execute **Phase 4 — Quality checks**, exactly as wrap-up defines them — including invoking the \`review\` skill as that phase already specifies. Do not reimplement or substitute for \`review\`; call it.

${ctx}

Report findings that survived; list what you fixed in place and what should become a follow-up.`,
      { label: 'quality', phase: 'Fan-out', model, schema: QUALITY },
    ),
])

phase('Land')

return {
  ok: true,
  assessment,
  tracking,
  docs,
  quality,
  followups: [
    ...((tracking && tracking.followups) || []),
    ...((docs && docs.followups) || []),
    ...((quality && quality.followups) || []),
  ],
  // Phases 5 and 6 (commit, push, follow-up dispositions, summarize, land) are
  // deliberately NOT run here. They return to the caller, which owns the
  // human-facing steps: on a standalone wrap-up the follow-up dispositions are
  // a single batched question to the user, and landing a branch is a step the
  // user may want to watch.
  next: 'Run wrap-up Phase 5 (commit and push) and Phase 6 (follow-ups, summary, land) in the calling context.',
}
