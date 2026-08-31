---
name: project-status
description: "Reality check: measure a project's code against its declared vision (README, AGENTS.md, PRD, plan docs) and report where it actually stands, with evidence. Triggers: 'project status', 'reality check', 'does the code match the README/vision/plan', 'how far along is this actually', 'what actually works', 'is the backlog enough to deliver the vision'."
---

# Project Status

A **reality check**: docs are the measuring stick, code is the ground truth, and the gap between them is the product. Extract the declared vision, rate each goal against the actual code, categorize the gaps, check whether the open backlog would close them, and end on a steering recommendation.

Read-only. This skill writes no code, files no tickets, and edits no docs — bridging a gap is a handoff offered in the closing slate.

`project-status push` runs the same assessment, then escalates the steering recommendation through ambition rounds before presenting (Phase 06).

## Phases

### Phase 01 — Extract Vision

Read every doc that describes what the project SHOULD be: `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/PRD.md`, `docs/roadmap.md`, `docs/CONTEXT.md`, plan/spec files (glob `**/PLAN*.md`, `**/*spec*.md`, `docs/adr/` once if defaults miss). Distill them into a numbered **Vision Checklist**: concrete, testable goals, each with its source (file + section). "Fast" is not a goal; "p95 wrapper latency <10ms" is. Merge restatements — one goal per promise, however many docs repeat it.

Without explicit goals you assess code against vibes instead of promises — if no vision doc exists at all, stop and say so; there is nothing to measure against.

Completion: every vision-bearing doc read, every extracted goal traceable to a quoted source.

### Phase 02 — Assess Code

Rate each goal from code inspection, never from self-reported progress — a README status line, a tracker comment, or a plan checkbox is a claim to verify, not evidence. For each goal find: real implementation vs. stubs, tests that exist and pass, and whether it works end-to-end. Where the project ships a runnable artifact, run it (route via the `run` skill or `admin` tasks) and rate the shipped behavior, not the repo's.

Statuses: **WORKING** / **PARTIAL** / **STUB** / **MISSING** / **EXCEEDED** (shipped beyond the promise). Qualify where honesty needs it ("WORKING (component level)", "PARTIAL — hard-gated on X"). Every status carries one line of evidence: the test suite, the LOC/reality of the module, the live probe result, the absent file.

For a large checklist, fan the inspection out to parallel read-only `Explore` subagents (Sonnet), one per goal cluster; the parent keeps only their per-goal verdicts and evidence.

Completion: every checklist row has a status AND a code-derived evidence line.

### Phase 03 — Gap Analysis

Categorize every non-WORKING row:

- **Vision gap** — zero coverage; nothing in the codebase even attempts it.
- **Implementation gap** — code exists but is stub or incomplete.
- **Proof gap** — code exists, no tests or measurements back it.
- **Integration gap** — parts work alone, not composed end-to-end.

Integration gaps are the ones progress metrics hide: 72% of tasks done can coexist with 0% of the core value proposition working end-to-end. Name the single gating gap if one exists — the item that unblocks the most downstream work.

### Phase 04 — Coverage Check

Resolve the tracker by invoking `ref-tracker`, then answer: **if every open and in-progress item were completed, would the vision be fully delivered?** Map each gap to the open items that would close it (`bd list --status open --json` on beads; `gh issue list --state open` on GitHub). Hunt specifically for goals with zero tracked coverage — those are invisible to any burndown. Also flag the inverse: a plan doc or checklist that contradicts the tracker (stale measuring stick).

A repo with no tracker gets the answer "no tracker — coverage unmeasurable" and the slate offers `bd init` via `to-tickets`, not a halt.

### Phase 05 — Report

Present in chat, in this order:

1. **Headline** — one paragraph answering "where is this project really", leading with what is true today.
2. **Vision Checklist** — table: `# | Goal | Source | Status | Evidence`.
3. **The four honest answers** — What IS working right now? What is NOT working or not implemented? What's blocking? If all open items were completed, would the gap close?
4. **Gaps** — each named gap with its category and who/what it hurts.
5. **Steering recommendation** — the numbered slate (Phase 07).

### Phase 06 — Ambition Push (`push` mode only)

Skip entirely unless invoked as `project-status push`.

Before presenting, run 2–3 escalation rounds over the draft steering recommendation. Each round: acknowledge what the current draft achieves, then demand dramatically more ambition, depth, and sophistication — models default to safe, obvious next steps unless pushed. Inject domain knowledge (resolve via `_domains/_detect.md`) where it sharpens a recommendation. Revise the recommendation **in place** each round — one recommendation list exists at the end, never a stack of drafts. The Vision Checklist and statuses are facts and are exempt: escalation rewrites where to steer, never what was measured.

### Phase 07 — Steering Slate

Close with one numbered slate of recommended moves, highest-leverage first, each carrying its disposition pick (`tickets` — hand to `to-tickets` to spec and file; `note` — record in the report only; `skip`). Anything requiring only the user (hardware, ears, consent, credentials) is labeled as such, never assigned a disposition.

End with the standard escape hatch: *"Type `go` to apply my picks as described, or answer per item (`1 tickets, 3 skip`)."* On `go`, invoke `to-tickets` for the `tickets` items and stop there — implementation is a separate invocation.

## Rules

- Status ratings come from code inspection and live probes; docs and trackers are claims to verify.
- Every claim in the report carries evidence — a path, a number, a probe result. "Largely working" with nothing after it is a finding you haven't made yet.
- Honest absence beats optimistic presence: NOT_STARTED with a reason ("correctly gated on X") is a valid, reportable state.
- No new process or ceremony in the recommendations — steer toward the work, not toward more tracking.
- Big-report escape: a checklist past ~25 goals still gets every row rated; compress evidence, never drop rows.
