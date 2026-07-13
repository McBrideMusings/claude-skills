---
name: repo-analysis
description: Compare a subsystem in the user's repo against one or more reference repos (open source projects, similar tools, alternative implementations) to find smarter approaches, likely bugs revealed by the diff, and features worth porting. Use whenever the user points at another project as a reference and asks what they do differently, says "their X is better than ours", asks if a feature is worth porting, troubleshoots a flaky feature and references another project that implements it cleanly, asks "what do they do that we don't", or wants to mine techniques from prior art. Also harvests a capability the user's repo doesn't have at all — "harvest their X", "bring feature A in from this repo", "figure out how they do X and plan how we'd build it", "turn this reference into docs and issues" — producing a committed analysis doc plus a dependency-ordered issue slate instead of a comparison. Also harvests whole skills when the reference is a skills repo (a repo of SKILL.md files, following Anthropic's skill structure, little or no code) — "mine their skills", "harvest skills from X", "what skills should I take from this repo", "compare their skills to mine" — cataloguing their skills against yours and deciding what to copy, merge, or fold in as an axis. Filters differences of UX, interface, and project scope so suggestions stay portable. Also use when the user pastes a github url alongside a question about their own code's behavior.
---

# Repo Analysis

Compare a focused subsystem in the user's repo against one or more reference repos. Surface implementation differences that are worth acting on. Filter out differences that are about scope, UX, or project intent.

**Three modes, one spine.** The default is **code mode** — the workflow below, comparing a code subsystem to a reference and porting implementation techniques. When the reference is a **skills repo** (a repo of `SKILL.md` files following Anthropic's skill structure, little or no code) the unit of harvest is a whole skill, not a technique — run **skills mode** (see "Skills mode" below). When the capability doesn't exist in the user's repo at all — nothing on our side to compare — run **harvest mode** (see "Harvest mode" below): understand the reference, translate it onto the user's architecture, leave a committed analysis doc + issue slate.

**Mode detection is contextual, never verb-based** — "harvest" legitimately triggers two different modes, so dispatch on the payload and the analog, not the word: reference payload is SKILL.md-structured skills → skills mode; payload is code and the user's repo HAS an implementation of the thing → code mode; payload is code and the user's repo has NO implementation of it → harvest mode. If you can't tell whether an ours-side analog exists, check the user's repo before asking. Everything after scope — acquire, sub-agent-per-reference, report, terminal action — is shared; the non-default modes only swap the scope rule, the mapping, the buckets, and the terminal action.

## The core principle: implementation, not intent

The job is to find PORTABLE differences — changes that would improve the user's code regardless of what their project is trying to be.

**Filezilla rule:** if a Docker container that performs FileZilla-like operations has a smarter SFTP retry implementation than FileZilla itself, that's portable — copy the retry logic. Suggesting "make FileZilla a Docker container" is not portable — that's a scope difference, not an implementation insight.

When deciding whether a finding is portable, ask: "if I made this change to my repo, would it conflict with what my repo is trying to be?" If yes, drop it. If no, surface it.

This applies symmetrically. A reference repo with a desktop GUI doesn't mean the user's web app should grow a GUI. A reference library doesn't mean the user's app should be reshaped into a library. The transferable layer is usually deeper than the surface — error handling, retry logic, concurrency model, edge case handling, data structure choices, sequencing.

## Workflow

### Phase 01 — Lock down scope (do not skip)

Cross-repo analysis is useless without a focused subsystem. Before fetching or reading anything:

1. **Identify the subsystem in the user's repo** by file path, module, or feature. If the user says "compare our auth flow", find the actual files first. Don't proceed until you can name them. If the search turns up nothing — the user's repo has no implementation of the thing — comparison is impossible; switch to harvest mode.
2. **Identify the reference repo(s)** by url or local path. Multiple references are fine.
3. **Identify the intent**: feature mining, bug hunting, or "find what's smarter generally". Mixed is fine — note it.

If any of these is fuzzy, ask the user — as a plain-chat question, never the `AskUserQuestion` tool / structured-question schema. Do not do whole-repo comparisons — they produce noise.

Restate the locked scope back in one sentence before continuing. Example:

> Comparing our `src/streaming/hls/` against video-dev/hls.js's `src/loader/` to find why our HLS handling drops segments. Feature mining secondary.

### Phase 02 — Acquire reference repos

For each reference:

- If it's a URL, shallow clone to a scratch directory:

  ```bash
  mkdir -p <repo-root>/tmp/claude/repo-analysis
  git clone --depth 1 <url> <repo-root>/tmp/claude/repo-analysis/<name>
  ```
- If it's a local path, use it directly. Don't copy.
- For repos larger than ~500MB where only one subsystem matters, sparse-checkout:

  ```bash
  git clone --depth 1 --filter=blob:none --sparse <url> <repo-root>/tmp/claude/repo-analysis/<name>
  git -C <repo-root>/tmp/claude/repo-analysis/<name> sparse-checkout set <subdir>
  ```

### Phase 03 — Map subsystems

Reference repo directory structure won't match the user's. Find the analog by:

- Reading their README and any `ARCHITECTURE.md` to learn terminology
- Looking for files with similar names, similar imports, similar entry points
- Grepping keywords specific to the subsystem (`hls`, `sftp`, `transcode`, etc.)
- If the user told you where to look, start there and verify

Write the mapping explicitly:

> ours: `src/streaming/hls.ts` ↔ ref `libavformat/hlsenc.c`

If a reference repo has no analog, say so. "They don't implement this at all" is itself a finding worth noting — it might mean the user's design is unusual, or it might mean the reference solves the problem at a different layer.

**Cross-language comparisons are fine.** Implementation patterns transfer across languages. A retry strategy in Go can be ported to Python; a state machine in Rust can be ported to TypeScript. Don't dismiss a reference because the language differs.

### Phase 04 — Read user's implementation, then spawn parallel sub-agents per reference

**04a — Parent reads the user's implementation.** This stays in parent context because it's load-bearing for the final report and you'll be answering follow-up questions about it. Take notes with file:line citations.

**04b — Spawn one Sonnet sub-agent per reference repo, in parallel** (single message, multiple `Agent` tool calls). Each sub-agent:

- Receives: a digest of the user's implementation (paths, key behaviour observations, edge cases handled), the path to its one reference repo, and the locked scope from Phase 01.
- Reads only its assigned reference (not the others, not the user's repo — parent already has that).
- Returns the findings buckets from Phase 05 below, structured per-reference, with file:line citations on both sides.

Reference repos can be huge — keeping their reads inside isolated sub-agents avoids dragging entire codebases into parent context. The parent gets back compact bucketed findings.

If there's only one reference repo, a sub-agent is still worth it: it isolates the reference-side reads from your parent context.

**04c — For each implementation (parent's read AND the sub-agent reads), observe:**

- Inputs accepted and assumptions made about them
- Invariants the code tries to maintain
- Edge cases handled explicitly (`if` / `catch` / `switch` clusters are signals)
- Error path: retry? abort? log? recover? with what backoff?
- Allocation and cleanup (resources, file handles, locks, goroutines, etc.)
- Concurrency model
- External resources touched and the sequencing
- Hot paths and what's been optimized in them

### Phase 05 — Merge sub-agent findings, apply the Filezilla rule, bucket

Parent collects the bucketed findings from each Sonnet sub-agent and merges them. The Filezilla rule applies at merge time — drop anything across the merged set where "if I made this change, would it conflict with what my repo is trying to be?" answers *yes*.

Each finding goes into exactly one bucket:

- **Likely bug or weakness in user's code** — their edge case handling, error path, or invariant looks more correct, and the user's approach has plausible failure modes that theirs avoids.
- **Smarter implementation worth considering** — same outcome, better path. More efficient, simpler, more idiomatic.
- **Feature they have, user doesn't, fits scope** — a capability that's compatible with what the user's repo is trying to be.
- **Feature they have, user doesn't, does NOT fit** — list briefly so the user knows you considered and rejected them. One line each.
- **Scope/UX/intent difference (rejected)** — list briefly. Shows you noticed but explains why it's not actionable.

If a finding doesn't clearly fit one bucket, say so. Let the user decide.

### Phase 06 — Produce the report

Write to `<root>/tmp/claude/repo-analysis-<ref-name>.md`, where `<ref-name>` is a short slug naming the reference repo(s) — e.g. `repo-analysis-cmux.md`, or `repo-analysis-hlsjs-shaka.md` for multiple references. Never write to a bare `repo-analysis.md`: each analysis gets its own file, so a later run against a different reference (or subsystem) never overwrites an earlier report. If the exact target filename already exists (a re-run against the same reference), overwrite it — same analysis, refreshed. **Resolve `<root>` to an ABSOLUTE path — never write to a cwd-relative `tmp/…`.** The Bash working directory is NOT guaranteed to be the repo root (an earlier `cd` may have left it in a subdirectory), so a bare `tmp/claude/…` would land the report under whatever subdir the shell is in, not the repo root. Run `git rev-parse --show-toplevel` in its own Bash call and capture the absolute result as `<root>`; if it errors/empty (not a git repo), use the absolute output of `pwd`. Every `mkdir`/`Write`/path below MUST be the absolute `<root>/tmp/claude/…` — if it doesn't start with `/`, it's the bug. Ensure `tmp/` is in `<root>/.gitignore` (Read it; Edit to add `tmp/` if absent). Run `mkdir -p <root>/tmp/claude` before writing. ALWAYS use this exact structure:

```markdown
# Cross-Repo Analysis: [user's subsystem] vs [reference(s)]

**Scope**: [restate scope in one sentence]
**Ours**: [path]
**References**: [name + path/url for each]
**Intent**: [feature mining / bug hunting / both]

## Subsystem mapping
- ours `path/to/ours.ext` ↔ ref-name `path/to/theirs.ext`
- ...

## Findings

### Likely bugs or weaknesses
- **[short title]**
  - Ours: `path:line` — [what it does]
  - Theirs: `ref-name path:line` — [what they do]
  - Why theirs looks better: [1-2 sentences]
  - Suggested fix: [1-2 sentences, or "needs investigation"]

### Smarter implementations worth considering
[same structure]

### Features worth porting
[same structure, plus "fits our scope because…" line]

### Considered and rejected
- **[feature/difference]** — [one-line reason; usually scope/UX/intent]

## Summary
Top 3 things to act on, in priority order. Brief.
```

Findings must be concrete. Bad: "Their error handling is better." Good: "On `loader.ts:142` they retry with exponential backoff capped at 30s; we retry once then abort at `streaming.ts:88`."

### Phase 07 — Present to the user

Tell the user the report path — put it on its own line with **no trailing punctuation** (so Ghostty ⌘-click opens it cleanly). Then print the full contents of the report into chat, verbatim, immediately after. Do not summarize, truncate, or hold anything back for the user to go read separately — the file is a saved copy, not a substitute for showing the work.

### Phase 08 — Break the findings into actionable items (grill-me session)

Always follow the report with a grill-me-style interview (the `grill-me` skill's mechanic: one question per message, in plain chat, recommending an answer each time — never the `AskUserQuestion` tool). A cross-repo report is dense; stepping through it piece by piece is what turns it into discrete, actionable work items instead of a document that gets read once and shelved.

1. **Map findings against existing tracking first — codebase over questions.** Before asking anything, check the repo's existing plans: open GitHub issues (`gh issue list`), plan files, roadmap docs. Bucket every actionable finding as either **already planned** (an existing issue/plan covers it — candidate for an augmentation comment citing the reference's pattern) or **unplanned** (candidate for a new issue). Show the user this mapping as context before the first question.
2. **Grill only the contested routings, one per message.** Skip findings whose disposition is obvious (a clear bug with no existing issue → new issue; an existing issue that already anticipates the fix → small augment). For each genuinely contested item — where does it live, augment vs new, which mechanism, what scope — offer 2-3 lettered options with a recommendation and wait for the user's answer. Never answer your own question or roll forward on an assumed answer.
3. **End with a confirmed slate.** Summarize the final list — new issues with one-line scopes, augmentation comments per existing issue — and get an explicit yes before creating anything. Issue bodies match the repo's existing issue conventions and cite the reference's file:line pattern sources; augmentation comments name the concrete code both sides.

If the user declines the session ("just the report"), stop after Phase 07 — the interview is the default, not a gate.

## Skills mode

When the reference is a skills repo, the harvest unit is a whole **skill**, not a technique. Same spine — acquire, sub-agent-per-reference, report, grill-me — with four phase overrides.

**Detect it:** the reference's payload is `SKILL.md`-structured skills (Anthropic's skill layout — a `skills/` tree of folders each holding a `SKILL.md` with `name`/`description` frontmatter), little or no application code. Auto-switch to skills mode, or take the user's explicit "harvest their skills".

**Phase 01 scope — whole-catalog is fine here.** Code mode refuses whole-repo comparisons because diffing two codebases file-by-file is noise. Skills are the opposite: each is a coarse, self-describing unit with a `name` and `description`, so cataloguing all of theirs is cheap and high-signal. Scan the whole skills catalog. Narrow to a domain only when the repo is large (dozens of skills) and the user named an area. Still restate the locked scope in one sentence.

**Phase 03 mapping — their skill → mine-or-gap.** For each of their skills, find your analog by capability, not name (their `to-prd` ↔ your `to-spec`). Each lands as **overlap** (you have one doing the same job — a comparison target) or **gap** (you have nothing — a copy/fold candidate). Read their `SKILL.md` descriptions first; open bodies only for skills that overlap or look worth taking.

**Phase 05 buckets — incorporation decisions, not bug/feature.** Each of their skills goes in exactly one:

- **Copy whole** — a gap, self-contained, fits your workflow. Take the skill as-is, adapting frontmatter and paths to your conventions.
- **Merge into mine** — overlaps one of yours and does part of it better. Port the better part into your existing skill; do not add a second skill (that would be an alias by another name).
- **Fold as axis** — their skill is one context of a process an engine of yours already runs (a platform, a domain, an asset type). Drop it into the matching `_axis/` directory as a new file, not a new skill. This is the **axis split**; mechanics live in `writing-skills`. (`_generate/` was folded in from `majidmanzarpour/threejs-game-skills` this way.)
- **I have better** — you already do it as well or better. Note it, take nothing.
- **Reject** — doesn't fit your workflow, or is scope/tooling-specific to their setup. One line each.

Apply the portability filter as in code mode: "if I took this, would it fight what my skills are trying to be?" If yes, reject.

**Phase 08 terminal — incorporate, don't file issues.** The grill-me session walks the report skill by skill; on a yes it writes into the skills repo — copy-whole creates the new skill folder, merge edits the existing skill, fold-as-axis adds the `_axis/` file and updates that engine's `README.md`. Confirm the full slate before writing anything, then make the edits. (Where code mode ends by filing GitHub issues, skills mode ends by changing the skills repo.)

**Report** — same file target and structure as Phase 06, with the buckets above swapped in for the code-mode buckets.

## Harvest mode

When the capability is absent from the user's repo, the job flips from comparison to acquisition: understand how the reference implements it, translate it onto the user's architecture, and leave behind planning artifacts a future implementation session can execute from. Same spine — scope, acquire, sub-agent-per-reference, portability filter — with five phase overrides.

**Phase 01 scope — lock the capability and its landing zone, not an ours-side subsystem.** There is no user subsystem to name. Instead lock: (1) the capability being brought in, (2) the reference(s), (3) where it would land in the user's architecture — which existing system stays authoritative and which invariants constrain the new piece. Read the user's repo for (3) before reading the reference; the landing zone shapes what's worth extracting. Restate in one sentence: "Harvesting <ref>'s surface-crawling vine generation into our voxel game as a rendering layer; the voxel sim stays authoritative."

**Phase 04 depth — read to reimplementation level.** Comparison can skim for differences; harvest can't. Sub-agents read the reference until each technique is explainable well enough to rebuild from the writeup alone: the algorithm, key constants, data shapes, and — highest value of all — recorded why-decisions and abandoned approaches (a README or comment saying "we tried X, it failed because Y" saves the user from re-walking that dead end).

**Phase 05 — translation map instead of diff buckets.** Build a technique-by-technique map: their mechanism → our equivalent. The load-bearing rows are the **divergences** — places where the reference's assumptions don't hold in the user's architecture (e.g. reference generates once up front; user's system mutates continuously, so generation must be incremental). Divergences dictate the design; straight ports are just labor. Each technique lands in one bucket:

- **Adopt** — ports near-verbatim; name the target module.
- **Adapt** — a divergence forces a redesign; name the divergence and the reshaped approach.
- **Reject** — fails the Filezilla rule or doesn't serve what the user's repo is trying to be. One line each.

**Phase 06 — committed analysis doc, not a tmp report.** The deliverable is a permanent reference-analysis doc in the user's docs tree (e.g. `docs/research/<ref-slug>-analysis.md`), following the repo's docs conventions: what the reference is (with source links), how it works technique by technique, then the translation map. Keep implementation sequencing OUT of the doc — that's the issues' job — so the doc stays true even as the plan shifts. Wire the doc into the repo's docs surface per its conventions (sidebar/nav, file map, a roadmap pointer once issues exist).

**Phase 08 terminal — dependency-ordered issue slate.** Draft one issue per subsystem of the incoming capability, ordered by dependency (`Depends on #N`), each with context citing the doc's sections, concrete scope, and acceptance criteria; plus one backlog-capture issue for techniques noticed but deliberately unscheduled, so they aren't lost. Show the user the drafted slate and get an explicit yes before filing — grill-me only for genuinely contested routing, as in code mode.

## Things to avoid

- **Whole-repo comparisons.** Always scope to a subsystem first. If the user resists scoping, push back once and explain why.
- **Style/formatting nits.** Linters handle those. Focus on logic, behavior, architecture.
- **"They use library X, we should too"** — only if X addresses a concrete problem the user has, not as a general suggestion.
- **Architectural rewrite recommendations** unless the user explicitly asked for that level.
- **Confident claims without evidence.** If unsure why theirs is better, say "this looks more robust because…" rather than asserting it. Let the user verify.
- **Citing without file:line.** Every finding traces to specific code in both repos.
- **Inferring intent from incomplete reading.** If you only skimmed, say so. The whole point is to be accurate enough to act on.

## Examples

See [EXAMPLES.md](EXAMPLES.md) for grounded examples of useful vs rejected findings across bug-hunt, feature-mining, and cross-language cases. Read when you need to calibrate what counts as a portable finding.
