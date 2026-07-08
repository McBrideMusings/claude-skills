---
name: cross-repo-analysis
description: Compare a specific subsystem in the user's repo against one or more reference repos (open source projects, similar tools, alternative implementations) to find smarter approaches, likely bugs revealed by the diff, and features worth porting. Use whenever the user points at another project as a reference and asks what they do differently, says "their X is better than ours", asks if a feature is worth porting, troubleshoots a flaky feature and references another project that implements it cleanly, asks "what do they do that we don't", or wants to mine techniques from prior art. Filters differences of UX, interface, and project scope so suggestions stay portable. Also use when the user pastes a github url alongside a question about their own code's behavior.
---

# Cross-Repo Analysis

Compare a focused subsystem in the user's repo against one or more reference repos. Surface implementation differences that are worth acting on. Filter out differences that are about scope, UX, or project intent.

## The core principle: implementation, not intent

The job is to find PORTABLE differences — changes that would improve the user's code regardless of what their project is trying to be.

**Filezilla rule:** if a Docker container that performs FileZilla-like operations has a smarter SFTP retry implementation than FileZilla itself, that's portable — copy the retry logic. Suggesting "make FileZilla a Docker container" is not portable — that's a scope difference, not an implementation insight.

When deciding whether a finding is portable, ask: "if I made this change to my repo, would it conflict with what my repo is trying to be?" If yes, drop it. If no, surface it.

This applies symmetrically. A reference repo with a desktop GUI doesn't mean the user's web app should grow a GUI. A reference library doesn't mean the user's app should be reshaped into a library. The transferable layer is usually deeper than the surface — error handling, retry logic, concurrency model, edge case handling, data structure choices, sequencing.

## Workflow

### Phase 01 — Lock down scope (do not skip)

Cross-repo analysis is useless without a focused subsystem. Before fetching or reading anything:

1. **Identify the subsystem in the user's repo** by file path, module, or feature. If the user says "compare our auth flow", find the actual files first. Don't proceed until you can name them.
2. **Identify the reference repo(s)** by url or local path. Multiple references are fine.
3. **Identify the intent**: feature mining, bug hunting, or "find what's smarter generally". Mixed is fine — note it.

If any of these is fuzzy, ask the user — as a plain-chat question, never the `AskUserQuestion` tool / structured-question schema. Do not do whole-repo comparisons — they produce noise.

Restate the locked scope back in one sentence before continuing. Example:

> Comparing our `src/streaming/hls/` against video-dev/hls.js's `src/loader/` to find why our HLS handling drops segments. Feature mining secondary.

### Phase 02 — Acquire reference repos

For each reference:

- If it's a URL, shallow clone to a scratch directory:

  ```bash
  mkdir -p <repo-root>/tmp/claude/cross-repo-analysis
  git clone --depth 1 <url> <repo-root>/tmp/claude/cross-repo-analysis/<name>
  ```
- If it's a local path, use it directly. Don't copy.
- For repos larger than ~500MB where only one subsystem matters, sparse-checkout:

  ```bash
  git clone --depth 1 --filter=blob:none --sparse <url> <repo-root>/tmp/claude/cross-repo-analysis/<name>
  git -C <repo-root>/tmp/claude/cross-repo-analysis/<name> sparse-checkout set <subdir>
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

Write to `<root>/tmp/claude/cross-repo-analysis.md`. **Resolve `<root>` to an ABSOLUTE path — never write to a cwd-relative `tmp/…`.** The Bash working directory is NOT guaranteed to be the repo root (an earlier `cd` may have left it in a subdirectory), so a bare `tmp/claude/…` would land the report under whatever subdir the shell is in, not the repo root. Run `git rev-parse --show-toplevel` in its own Bash call and capture the absolute result as `<root>`; if it errors/empty (not a git repo), use the absolute output of `pwd`. Every `mkdir`/`Write`/path below MUST be the absolute `<root>/tmp/claude/…` — if it doesn't start with `/`, it's the bug. Ensure `tmp/` is in `<root>/.gitignore` (Read it; Edit to add `tmp/` if absent). Run `mkdir -p <root>/tmp/claude` before writing. ALWAYS use this exact structure:

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
