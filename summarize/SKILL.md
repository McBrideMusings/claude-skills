---
name: summarize
description: "This skill should be used when the user asks to summarize the current session or branch, says 'summarize', 'summarize the branch', 'summarize the session', wants a summary of what was built, or needs a draft for a PR description."
---

# Summarize

Generate a concise, pasteable summary of what was built and decided this session. Combines two sources:

- **Branch diff** — git commits and file changes since the branch diverged from the base branch (if in a git repo with changes)
- **Session context** — what was discussed, decided, or resolved in this conversation

Either source alone is valid. When both exist, synthesize them into one unified summary rather than two separate sections.

On non-base branches the summary file is **branch-scoped and persistent across sessions** — re-running on the same branch reads the prior file and folds forward any rationale or rejected-approaches notes that still apply to the current diff. On the base branch, detached HEAD, or non-git directories, the file is **timestamped** (each invocation writes a fresh file).

## Output format

### Header

One or two sentences. Plain English, user-visible outcome, no labels or bullets. If the branch resolves a GitHub issue, open with `Resolves #N` on its own line. Skip if no issue — don't invent one.

```
Resolves #42

Added a promo code CRUD page to the admin tool.
```

```
Refactored the settlement ledger to use D1 batch writes, eliminating the race condition that could leave balances inconsistent under concurrent rebuys.
```

### Change list

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

- **AdminRPC** — four new methods plus a `withAudit` helper in `adminRpc.ts`.
- **Promo Codes screen** — `PromoCodes.tsx`: table with Code, Type, Reward, Uses, Expires columns.
  - **GuardPicker** — fuzzy combobox over the card-guards catalog; shows `id` not display label.
  - **SkinPicker** — click-to-open dropdown with thumbnails per skin.
- **Error handling** — PATCH/DELETE return structured JSON; missing-ID updates 404 instead of silently no-oping.
  - Server-side validation layer ruled out: schema is type-checked at the RPC boundary, so it would add complexity without catching real bugs.
```

## Phases

### Phase 01 — Resolve Scope and Path

Determine the output path and whether this invocation is branch-scoped or timestamped.

Run these via Bash tool (as separate calls — never nest `$(...)`). **NEVER prefix these with `cd /path &&`** — that triggers an "untrusted hooks" permission prompt. If you're not already in the project directory, use `git -C /absolute/path <subcommand>` instead:

1. `git rev-parse --show-toplevel 2>/dev/null` → `<repo-root>`. If empty, not in a git repo → **timestamped mode**, and use `pwd` as `<repo-root>` (summaries land at `./tmp/claude/summaries/` relative to CWD). All summary paths are relative to this.
2. `git branch --show-current` → current branch name. If empty (detached HEAD), **timestamped mode**.
3. `git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null` → e.g. `origin/main`. Strip the `origin/` prefix to get the base branch name. If empty, fall back to `main`.

**Mode selection:**

- **Timestamped mode** (not in a git repo, detached HEAD, or current branch == base): path is `<repo-root>/tmp/claude/summaries/claude-summary-<timestamp>.md`, where timestamp comes from `date '+%Y-%m-%d-%H%M%S'` run as its **own separate Bash tool call** — never chain it with mkdir or any other command. No prior file to read. Skip Phase 02.
- **Branch-scoped mode** (any other branch): path is `<repo-root>/tmp/claude/summaries/<repo-basename>/<branch-sanitized>.md`, where:
  - `<repo-basename>` is the basename of the repo root path
  - `<branch-sanitized>` is the current branch with `/` replaced by `-`
  - If a file already exists at this path, treat it as the **prior summary** for this branch and read it in Phase 05.

### Phase 02 — Prune Stale Summary Files

Branch-scoped mode only.

For `<repo-root>/tmp/claude/summaries/<repo-basename>/`:

1. If the directory doesn't exist yet, skip.
2. List the live local branches: `git for-each-ref refs/heads/ --format='%(refname:short)'`.
3. For each live branch, compute its expected sanitized filename using the same `/` → `-` mapping.
4. Delete any `*.md` in the directory whose basename doesn't match an expected filename.

This prunes files for branches that no longer exist locally (merged-and-deleted, manually deleted, worktree torn down). Don't try to detect "merged but not deleted" — branch deletion is the canonical signal and squash-merges make merge-detection unreliable.

(Note: cross-skill age-based pruning across all `<repo-root>/tmp/claude/...` writers is a separate, future policy — out of scope for this skill.)

### Phase 03 — Detect Git Component

Run `git log --oneline origin/<base>..HEAD` via Bash tool, substituting the base branch name resolved in Phase 01.

- If not in a git repo, or no commits beyond base: skip Phase 04 and go directly to Phase 05 (synthesize from session context + optional prior file only).
- Otherwise: proceed to Phase 04.

### Phase 04 — Off-load Git Digest to a Haiku Sub-Agent

When there's a git component, spawn a Haiku sub-agent via the Agent tool with the brief below. The git outputs and file samples can be large — keeping them in the sub-agent's context instead of the parent's is the point.

Brief (substitute the actual base branch name for `<base>` before invoking):

> "Build a structured digest of the changes on this branch vs `origin/<base>`. Run: `git log --oneline origin/<base>..HEAD`, `git diff origin/<base> --stat`, `git diff origin/<base> -- '*.md' '*.json' | head -200`. Read a representative sample of changed files — focus on entry points, new modules, key types. Don't read every file; use the stat output to identify clusters. Return a structured list grouped by logical area of work (not by file or commit), naming real file paths. Aim for the level of detail a PR description needs. Under 600 words."

Before spawning the sub-agent, resolve the followups path in **two separate Bash calls** — never nest `$(...)` (triggers a permission prompt):
1. `git rev-parse --show-toplevel` → get the repo root path
2. From that result, derive: `<repo-root>/tmp/claude/followups.md`

Inject the resolved absolute path into the brief and ask the sub-agent to skim it for the most recent session section if the file exists.

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

Report a one-line link to the file. **The path must be the last token on its line with no trailing punctuation** (so Ghostty ⌘-click stays clean) — e.g. `Written to <repo-root>/tmp/claude/summaries/<repo>/<branch>.md`
