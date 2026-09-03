---
name: handoff
description: "Write a handoff document for the current session. Two audiences, two shapes: bare `/handoff` writes a terse doc for a fresh agent to resume from; `handoff write` generates the pasteable summary of what was built and why, for a person — a PR description, a report to the user. Write-only — never reads one back."
---

# Handoff

Two audiences, two output shapes. Pick by the token, never by guessing from repo state. No token means the fresh-agent doc.

**Write-only for both shapes.** This skill produces a document; it does not read one back, resume from one, or manage a single canonical slot. Nothing auto-fires it, and no other skill depends on it.

## Fresh-agent handoff (bare `/handoff`)

Captures the invisible context of the current session so a fresh agent — or you, later — can continue the work without re-reading the whole conversation.

If the user passed arguments (e.g. `/handoff working on the auth refactor next`), treat them as a description of what the next session will focus on — tailor the fields (especially **Immediate next step** and **Suggested next skills**) accordingly, and use them for the filename slug.

### What to capture

**Don't duplicate content already in other artifacts** — plans, ADRs, issues, commits, diffs. Reference them by path or URL. Capture only the **invisible context** that isn't in the code or those artifacts (e.g. "we ruled out approach A because the JWT lib doesn't expose a refresh hook").

Redact anything sensitive — API keys, passwords, hostnames, personally identifying info. Never write those into the file.

Capture four required fields and one optional fifth:

1. **What we were working on** — 1–2 sentences. The specific task or problem, not just the feature name.
2. **Key decisions** — what choices were made and *why*. Especially alternatives ruled out.
3. **Discoveries** — constraints, gotchas, or facts learned mid-session that aren't obvious from reading the code.
4. **Immediate next step** — the exact thing to do first when resuming. Specific enough to act on without re-reading the conversation. Include open blockers/questions here if they shape the next step.
5. **Suggested next skills** *(optional)* — 0–2 skills the next session is likely to invoke, inferred from the Immediate next step. e.g. *"/tdd, /diagnose"*. Omit the field entirely when no clear match.

### File format

```markdown
---
created: YYYY-MM-DD HH:MM
project: <basename of repo root>
---

**What we were working on:** <1–2 sentences>

**Key decisions:** <bullet or prose — include the why>

**Discoveries:** <anything non-obvious that isn't in the code>

**Immediate next step:** <specific enough to act on immediately>

**Suggested next skills:** </tdd, /diagnose>   ← omit this line entirely if no clear match
```

### Write procedure

1. Run `git rev-parse --show-toplevel` in its own Bash call to get the ABSOLUTE `<repo-root>`. If not in a git repo, use the absolute output of `pwd`. **`<repo-root>` MUST be absolute — never write to a cwd-relative `tmp/…`.** The Bash working directory is NOT guaranteed to be the repo root (an earlier `cd` may have left it in a subdirectory); a bare `/private/tmp/claude/<repo-slug>/handoffs/…` would land the file under whatever subdir the shell is in. Every `mkdir`/`Write`/path below MUST be the absolute `/private/tmp/claude/<repo-slug>/…`; if it doesn't start with `/`, it's the bug.
2. Run `mkdir -p /private/tmp/claude/<repo-slug>/handoffs` as a separate Bash call.
3. Build the filename: `/private/tmp/claude/<repo-slug>/handoffs/YYYY-MM-DD-HHMM.md`. If the user passed arguments, append a short kebab slug derived from them: `YYYY-MM-DD-HHMM-<slug>.md` (e.g. `2026-07-17-1432-auth-refactor.md`). Never overwrite an existing file — every handoff is a new file. In the unlikely case the exact minute-stamped name already exists, append `-2`, `-3`, … until unused.
4. Synthesize the four (or five) fields from the current conversation.
5. Write the file.
6. Confirm with one line ending at the path — **no trailing period or other punctuation** after the path, so Ghostty ⌘-click stays clean: `Handoff written to /private/tmp/claude/<repo-slug>/handoffs/2026-07-17-1432.md`

Do not print the full handoff content to chat — just confirm the path.

### Pruning

`/private/tmp/claude/<repo-slug>/handoffs/` accumulates one file per invocation. Prune nothing yourself: macOS deletes anything under `/private/tmp` untouched for three days. A handoff worth keeping longer than that is one the user should be told to move out.

## Pasteable summary (`handoff write`)

Generate a concise, pasteable summary of what was built and decided this session, and write the file. This is the mode `wrap-up` invokes at its Phase 6, and the mode `review` invokes to explain a PR before reviewing it.

Combines two sources:

- **Branch diff** — git commits and file changes since the branch diverged from the base branch (if in a git repo with changes)
- **Session context** — what was discussed, decided, or resolved in this conversation

Either source alone is valid. When both exist, synthesize them into one unified summary rather than two separate sections.

On non-base branches the summary file is **branch-scoped and persistent across sessions** — re-running on the same branch reads the prior file and folds forward any rationale or rejected-approaches notes that still apply to the current diff. On the base branch, detached HEAD, or non-git directories, the file is **timestamped** (each invocation writes a fresh file).

### Output format

#### Header

One or two sentences. Plain English, user-visible outcome, no labels or bullets. If the branch resolves a GitHub issue, open with `Resolves #N` on its own line — GitHub reads that line and closes the issue when the PR merges. On a beads repo, write `Resolves <bead-id>` instead; nothing parses it, so `/wrap-up` still has to run `bd close`, and the line is there for the human reading the summary. Skip if no issue — don't invent one.

```
Resolves #42

Added a promo code CRUD page to the admin tool.
```

```
Refactored the settlement ledger to use D1 batch writes, eliminating the race condition that could leave balances inconsistent under concurrent rebuys.
```

#### Problem

One short paragraph, between the header and the change list. What was broken, missing, or wrong — and the **root cause**, not the symptom. This is the part a reviewer needs to judge whether the approach is right, and it's the part the diff cannot show.

Write it so someone who has never opened the repo can say which behavior was wrong and why. Name the real values — the actual input, the actual output, what it should have been.

```
### Problem

Two players rebuying in the same tick each read the balance before either wrote it back, so the
second write clobbered the first. A player who rebought for 500 alongside another 500 rebuy ended
up with one 500 credited instead of two — the ledger showed 500 where it should have shown 1000.
The writes were separate `put` calls with no transaction around them.
```

**Skip it** when there is genuinely no problem behind the change — a new feature with no prior broken behavior, a dependency bump, a docs pass. Don't manufacture one. Never write a Problem section that restates the header in different words.

#### Change list

Bulleted list following the header. **Every top-level bullet must follow this exact format:**

```
- **Label** — one sentence.
```

- `**Label**` — short category name (feature, file cluster, concern). Bold. Always present.
- The sentence after `—` is exactly one sentence. Name file paths when relevant. No run-ons, no colons launching a paragraph.
- One bullet per logical area of work — not per file, not per commit.
- Aim for 3–7 bullets.

**Sub-bullets** — two uses only. Both use `  - text` (two-space indent + dash). Never indented prose without a dash — that's not a list item.

1. Distinct named child components of a feature: `  - **SubLabel** — one sentence.`
2. A decision or rejected approach a reviewer needs to know: `  - plain text, no bold.`

Two or fewer sub-items → inline them in the top-level sentence instead of nesting.

**Bad (what to avoid):**
```
Staging workflow — .github/workflows/deploy-cf-staging.yml: appended two steps after the poker Worker deploy: bunx vite build and bunx wrangler deploy --env staging, both scoped to apps/mainframe via working-directory overrides. The mainframe has no D1 migrations so no migration step is needed.
Deploy ordering — mainframe deploys after the poker Worker intentionally; the mainframe's Service Binding points at cloudflare-poker-staging, so the poker Worker should be current first.
```

**Good:**
```
- **Staging workflow** — added mainframe build + deploy steps to `.github/workflows/deploy-cf-staging.yml` after the poker Worker deploy.
  - Mainframe deploys second so its Service Binding points at an already-current poker Worker.
```

Full example:
```
Resolves #42

Added a CRUD page for promo codes to the admin tool.

### Problem

Promo codes could only be created by hand-editing rows in the D1 console, so every code shipped
without an audit trail and a typo in `reward_id` produced a code that silently granted nothing. Three
of the eleven live codes pointed at guard ids that no longer existed.

- **AdminRPC** — four new methods plus a `withAudit` helper in `adminRpc.ts`.
- **Promo Codes screen** — `PromoCodes.tsx`: table with Code, Type, Reward, Uses, Expires columns.
  - **GuardPicker** — fuzzy combobox over the card-guards catalog; shows `id` not display label.
  - **SkinPicker** — click-to-open dropdown with thumbnails per skin.
- **Error handling** — PATCH/DELETE return structured JSON; missing-ID updates 404 instead of silently no-oping.
  - Server-side validation layer ruled out: schema is type-checked at the RPC boundary, so it would add complexity without catching real bugs.
```

### Phases

### Phase 01 — Resolve Scope and Path

Determine the output path and whether this invocation is branch-scoped or timestamped.

Run these via Bash tool, each as its own call, using absolute paths. If you're not already in the project directory, use `git -C /absolute/path <subcommand>` instead:

1. `git rev-parse --show-toplevel 2>/dev/null` → the ABSOLUTE `<repo-root>`. If empty, not in a git repo → **timestamped mode**, and use the absolute output of `pwd` as `<repo-root>`. **`<repo-root>` MUST be absolute — every summary path is `/private/tmp/claude/<repo-slug>/…`, NEVER a cwd-relative `tmp/…`.** The Bash working directory is NOT guaranteed to be the repo root (an earlier `cd` may have left it in a subdirectory); a bare `/private/tmp/claude/<repo-slug>/summaries/…` would land the file under whatever subdir the shell is in, not the repo root. If a path you pass to Bash doesn't start with `/`, it's the bug.
2. `git branch --show-current` → current branch name. If empty (detached HEAD), **timestamped mode**.
3. `git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null` → e.g. `origin/main`. Strip the `origin/` prefix to get the base branch name. If empty, fall back to `main`.

**Mode selection:**

- **Timestamped mode** (not in a git repo, detached HEAD, or current branch == base): path is `/private/tmp/claude/<repo-slug>/summaries/claude-summary-<timestamp>.md`, where timestamp comes from `date '+%Y-%m-%d-%H%M%S'` run as its **own separate Bash tool call** — never chain it with mkdir or any other command. No prior file to read. Skip Phase 02.
- **Branch-scoped mode** (any other branch): path is `/private/tmp/claude/<repo-slug>/summaries/<repo-basename>/<branch-sanitized>.md`, where:
  - `<repo-basename>` is the basename of the repo root path
  - `<branch-sanitized>` is the current branch with `/` replaced by `-`
  - If a file already exists at this path, treat it as the **prior summary** for this branch and read it in Phase 05.

### Phase 02 — Prune Stale Summary Files

Branch-scoped mode only.

For `/private/tmp/claude/<repo-slug>/summaries/<repo-basename>/`:

1. If the directory doesn't exist yet, skip.
2. List the live local branches: `git for-each-ref refs/heads/ --format='%(refname:short)'`.
3. For each live branch, compute its expected sanitized filename using the same `/` → `-` mapping.
4. Delete any `*.md` in the directory whose basename doesn't match an expected filename.

This prunes files for branches that no longer exist locally (merged-and-deleted, manually deleted, worktree torn down). Don't try to detect "merged but not deleted" — branch deletion is the canonical signal and squash-merges make merge-detection unreliable.

(Note: cross-skill age-based pruning across all `/private/tmp/claude/<repo-slug>/...` writers is a separate, future policy — out of scope for this skill.)

### Phase 03 — Detect Git Component

Resolve a **diff base** — the ref the change list is computed against — then run `git log --oneline <diff-base>..HEAD`.

1. Start with `<diff-base>` = `origin/<base>` (the base branch name resolved in Phase 01). Run `git log --oneline origin/<base>..HEAD`.
2. **If that is empty and the current branch *is* the base branch** — the session's commits were pushed straight to `<base>`, so `origin/<base>..HEAD` shows nothing — fall back to the session-start marker:
   - Read `/private/tmp/claude/<repo-slug>/session-start-sha` (written by the git-sync SessionStart hook; holds HEAD as it stood when the session began).
   - If the file exists and its sha is an ancestor of HEAD (`git merge-base --is-ancestor <sha> HEAD`), set `<diff-base>` = that sha. The range `<sha>..HEAD` is exactly the commits made during this session.
   - If the marker is missing or its sha is not an ancestor of HEAD (stale marker, history rewritten), keep the empty result.

- If not in a git repo, or the diff range is still empty after the fallback: skip Phase 04 and go directly to Phase 05 (synthesize from session context + optional prior file only).
- Otherwise: proceed to Phase 04, passing the resolved `<diff-base>`.

### Phase 04 — Off-load Git Digest to a Haiku Sub-Agent

When there's a git component, spawn a Haiku sub-agent via the Agent tool with the brief below — **unless the session forbids subagents**, in which case gather the same digest yourself with truncated Bash (`git ... | head -N`) and carry on; a harness-injected "do not call the Agent tool" instruction cannot be edited from this repo and wins over this step. The git outputs and file samples can be large — keeping them in the sub-agent's context instead of the parent's is the point.

Brief (substitute the `<diff-base>` resolved in Phase 03 — usually `origin/<base>`, or the session-start sha when commits went straight to the base branch — everywhere the brief says `<diff-base>`):

> "Build a structured digest of the changes on this branch vs `<diff-base>`. Run: `git log --oneline <diff-base>..HEAD`, `git diff <diff-base> --stat`, `git diff <diff-base> -- '*.md' '*.json' | head -200`. Read a representative sample of changed files — focus on entry points, new modules, key types. Don't read every file; use the stat output to identify clusters. Return a structured list grouped by logical area of work (not by file or commit), naming real file paths. Aim for the level of detail a PR description needs. Under 600 words."

### Phase 05 — Write the Summary

Use your own session context + the sub-agent's digest + (in branch-scoped mode, if it exists) the prior summary file resolved in Phase 01.

**If a prior summary file exists** (branch-scoped mode, file present at the resolved path):

- Read it via the Read tool.
- **Regenerate the change list from scratch.** The diff layer is always the source of truth. Never preserve diff-derived bullets from the prior file just because they were there.
- **Carry forward rationale and rejected-approaches notes** from the prior file that still apply to the current diff. Verify each one against the sub-agent's digest before keeping it.
- **Drop anything** that describes work no longer reflected in the current branch state — reverts, renames, undone approaches all go.

Other rules:

- **Net diff only, not intermediate steps.** If something was added and then removed within this branch, and the net result is that it never reached the base, omit it entirely. The audience is co-workers reviewing a PR — they don't care about reversals that never shipped. Only the final state relative to the base matters.
- Start with the header: 1–2 sentence outcome description, preceded by `Resolves #N` if a linked issue exists.
- Then the Problem section, if the change had a problem behind it — what was broken and the root cause, with real values. Pull this from your session context and the prior summary file; the sub-agent's digest describes the diff, not the reason for it. Skip it for new features, bumps, and docs passes rather than inventing one.
- Then the change list — group by logical area of work, not by file or commit.
- Use sub-bullets for features with multiple distinct child components; inline small sub-items instead of nesting them.
- For ruled-out approaches: only include if a reviewer would genuinely benefit from knowing why the alternative was rejected. If so, add it as a sub-bullet under the change it belongs to — never as a top-level bullet. Pull these from your own conversation context + the prior summary file's preserved notes; the sub-agent didn't see them. Skip entirely if the decision reflects incomplete knowledge rather than a real tradeoff.
- If there are no git changes at all, write the header from session context only and skip the change list.
- Make it useful to someone who wasn't in the session — assume they'll paste it into a PR description.

### Phase 06 — Write the Summary File

Use the path resolved in Phase 01.

- Run `mkdir -p <parent-dir>` as its own separate Bash tool call — never chain it with `date` or any other command. Each command gets its own Bash call.
- In branch-scoped mode: write to the resolved path, overwriting any prior file. (The prior file's still-relevant content has already been folded into the new summary by Phase 05.)
- In timestamped mode: write to the timestamped path.

### Phase 07 — Print to Chat

Print the full summary to chat so the user can copy-paste it.

### Phase 08 — Report the File Path

Report a one-line link to the file. **The path must be the last token on its line with no trailing punctuation** (so Ghostty ⌘-click stays clean) — e.g. `Written to /private/tmp/claude/<repo-slug>/summaries/<repo>/<branch>.md`
