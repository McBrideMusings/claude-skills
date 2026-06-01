---
name: wrap-up
description: "Close out the current session: assess changes, update tracking (GitHub issues, followups), update docs, run code quality checks (review + simplify), commit, push, then summarize and generate follow-ups. Triggers: user invokes '/wrap-up', 'wrap up', 'close out the session', 'end of session', 'finalize this work'. Also invoked by iterate as Phase 3."
---

Work through each phase below. Skip any phase that doesn't apply to this project — never create files, tracking systems, or documentation that doesn't already exist.

---

## ⛔ RUN TO COMPLETION — wrap-up is not done until the work is committed AND pushed

The entire reason wrap-up exists is **Phase 5: commit and push.** Phases 1–4 are preparation; Phase 6 is reporting. If you stop before Phase 5, you have left the user's work uncommitted in the working tree — the exact failure wrap-up is meant to prevent. This is the #1 way wrap-up fails, so treat it as non-negotiable:

- **A quality check that finds nothing is a GREEN LIGHT to commit, not a stopping point.** Phase 4 returning `(none)` / "no issues" means proceed *immediately* to Phase 5. It does NOT mean you are finished. A clean review is the single most common false finish line — do not fall for it.
- **Do NOT emit a recap, summary, or "here's what I did" message and end your turn before Phase 5 has committed and pushed.** A terminal-looking output from a sub-skill (a code review, a passing test run) is not the end of the pass.
- **Phases run in order to the end.** The only legal early exit is a genuine blocker that needs the user (e.g. a 75+ review issue you cannot auto-fix, a push that fails auth) — surface it explicitly and stop. "The review was clean" is the opposite of a blocker.
- **Done means:** `git status` is clean, the branch is pushed, and Phase 6 (summary + followups) has run. Until all three are true, you are mid-wrap-up — keep going.

When invoked by `iterate`, this is doubly true: stopping mid-wrap-up strands the whole autonomous pass with uncommitted work.

---

## When to Use

- The user invokes `/wrap-up` or asks to "wrap up", "close out the session", "end of session", "finalize this work"
- A coherent session of work is complete and ready to be committed, tracked, and summarized
- The working tree is in a state intended to be committed (not mid-debug, not exploratory scratch)
- Invoked by `iterate` as Phase 3 of an autonomous pass

## When NOT to Use

- Mid-feature with broken tests or known regressions — finish or revert first
- The user is mid-debug and the dirty tree is intentional scratch they want to keep
- The branch isn't ready and the user is just pausing — use `handoff` instead
- Work spans multiple unrelated topics that should commit separately — split first, then wrap up each

Invoking this skill grants explicit authority to auto-commit and auto-push. The global "never commit without asking" rule is satisfied by the act of invocation.

---

## ⛔ BASH COMMAND RULES — READ THIS BEFORE WRITING ANY SHELL COMMAND

When invoked by `iterate`, wrap-up runs unattended. A single permission prompt kills the autonomous run. These rules have no exceptions.

**HARD BANS — these will ALWAYS trigger a permission prompt and MUST NEVER appear:**

1. **`@{u}`, `@{upstream}`, `@{push}`, or ANY `{...}` git refspec.** Use `origin/$(git branch --show-current)` or `origin/main` instead.

2. **Compound commands where ANY sub-command is not allowlisted.** `&&`, `||`, `;` chaining is only safe when EVERY piece individually passes the allowlist. When in doubt, run commands separately.

3. **`$(...)` subshell expansion** where the inner command is not allowlisted. Run the inner command first, capture the result, use it in a second call.

4. **`#` comments inside Bash tool calls.** They trigger approval prompts.

5. **Newlines inside a single Bash tool call** to separate commands.

6. **`cd /path && git <cmd>`.** Triggers an "untrusted hooks" prompt. Use `git -C /absolute/path <cmd>` instead.

7. **`cat <file> || echo "not found"` or similar existence-check compounds.** Use the Read tool to check/read files — it won't prompt. Never use `cat` with a fallback `||`.

---

## Phase 1: Assess what was done

Summarize the work completed this session by reviewing:
- Recent conversation history
- `git diff` and `git status` for uncommitted changes
- Recent commits on the current branch (`git log --oneline -20`)

**Multiple repos:** If the session touched more than one repository, run a full wrap-up for each repo — separate commits, separate tracking updates, and separate follow-up lists per repo. Do not bundle cross-repo follow-ups together.

---

## Phase 2: Update project tracking

Check for and update ANY of these tracking mechanisms that exist. Do not create any that don't exist.

### GitHub Issues and Milestones

**Ownership check — do this first.** Determine whether the current repo is owned by the authenticated user:
- Get the repo's owner: `gh repo view --json owner --jq .owner.login`
- Get the authenticated user: `gh api user --jq .login`
- If the owner does NOT match (i.e., a repo owned by an org or another person, like a work repo where a product manager triages issues), the repo is **non-owned**. Issue lifecycle on those repos is managed by someone else — **never call `gh issue close` or close a milestone**. Discovery and reporting still happen; only the close action is suppressed.

**Always — owned and non-owned alike:**
- Run `gh issue list --state open` and review each open issue against the session's work. Look for **two** cases, not one:
  - **Completed** — session work fulfilled the issue's intent.
  - **Reversed or obsoleted** — session work went the opposite direction, abandoned the intent, or made the issue moot. Example: an issue "Rename remaining init-* commands to audit-*" is obsoleted when the session instead renames the audit-* commands away from that prefix — the issue is now backwards.
- Build a list of matches. Surface them in the Phase 6 session summary regardless of owned/non-owned — the user wants to see "this session resolved issues #12, #34" either way.
- **Milestones** — `gh` has no `milestone` subcommand. Use the API to list:
  - `gh api repos/{owner}/{repo}/milestones --jq '.[] | "\(.number) \(.title) \(.open_issues)/\(.open_issues + .closed_issues)"'`

**Owned repos only — actually close:**
- Close issues with `gh issue close NUMBER --comment "reason"` (use a summary of what shipped for completed; name the reversal for obsoleted).
- Close milestones (when 0 open issues remain): `gh api repos/{owner}/{repo}/milestones/NUMBER -X PATCH -f state=closed`
- **Always** check milestones after closing issues — if a milestone has 0 open issues, close it immediately.

**Non-owned repos — report only:**
- Do NOT call `gh issue close` or the milestone close API.
- Do NOT post a comment on issues unless the user explicitly asks ("comment on #123 that this is done").
- In the session summary, list matches as **"Issues resolved by this session (not closed — owned by `<owner>`): #12, #34"** so the user can hand them off to their PM.

### Followups file
- The followups file lives at `<repo-root>/tmp/claude/followups.md`. Get `<repo-root>` via `git rev-parse --show-toplevel` as a **separate Bash call** — never nest `$(...)` (triggers a permission prompt). Use the Read tool to check if the file exists; do NOT use `cat ... || echo ...` (compound triggers a permission prompt).
- If the file exists, scan items in prior dated sections for any that this session's work **completed, reversed, or obsoleted** (same two cases as GitHub issues above).
- For each match, propose moving the item to a `## Resolved` section at the bottom of the file (the followups file is append-only — items get sectioned, never deleted). Show the user the proposed moves and ask before applying.
- If the file doesn't exist, skip silently.

### Roadmap / TODO documents
- Check for roadmap or TODO files: `ROADMAP.md`, `TODO.md`, `docs/roadmap.md`, or similar
- If found: mark completed items, update status, add notes on what was accomplished

### CLAUDE.md task tracking
- If CLAUDE.md contains a roadmap, milestone list, or task tracking section: update it to reflect completed work

### In-repo issue tracking
- Check for `.github/`, `docs/issues/`, or any other in-repo tracking
- Update as appropriate

---

## Phase 3: Update documentation

Update documentation files ONLY if they already exist and the session's changes affect them.

### Standard docs site (PRD / roadmap / file-map)

If the project has the standard layout (`docs/PRD.md`, `docs/roadmap.md`, `docs/file-map.md` — set up by the `/docs` skill), check session work against the update-when table from the project's CLAUDE.md.

Split changes into **mechanical** (apply silently, report in summary) and **substantive** (show diff, ask before applying):

**Mechanical — auto-apply, then report:**
- `docs/file-map.md` — when top-level files/folders were added, removed, renamed, or moved. Detect via `git diff --name-status` for the session's commits or working-tree changes. Update entries inline; don't restructure the file.
- `CLAUDE.md` "Documentation" section — when a new standard doc was created (e.g., `docs/api.md` didn't exist before, now it does → add the row to the update-when table).

**Substantive — propose with diff, ask before applying:**
- `docs/PRD.md` — any product behavior, scope, or surface-area change
- `docs/roadmap.md` — direction shifts, completed initiatives (move from Now → previous milestone or just remove), newly deferred items
- `docs/api.md` (if exists) — external API surface change
- `docs/architecture/*` (if exists) — subsystem behavior change

Print a "**Mechanical doc updates applied:**" summary listing what was changed without prompt. Then list each substantive proposal with a diff and ask before applying.

If `docs/` doesn't exist or doesn't follow the standard layout, skip this section silently.

### Other documentation

- **CLAUDE.md** (top-level) — update to reflect new features, changed architecture, new keyboard shortcuts, new configuration. Stay under 40k chars (`wc -m CLAUDE.md`). Don't duplicate code.
- **README.md** — update if session changes affect user-facing setup or features.
- **CONTRIBUTING.md, etc.** — update if session changes affect them.

---

## Phase 4: Code quality check

Before committing, run two parallel quality checks on the session's changes:

1. **Launch both in parallel using the Agent tool** (two agents in a single message):
   - A **code-simplifier agent** (subagent_type: "code-simplifier") to simplify and refine changed code
   - A **code-review agent** (subagent_type: "general-purpose") — invoke the `code-review` skill using the Skill tool to review uncommitted changes for bugs and CLAUDE.md compliance

2. **Fallback if a subagent type isn't registered:** if the Agent tool reports the subagent type is unavailable, invoke the equivalent skill inline via the Skill tool instead (e.g., run the `code-review` skill directly in this context) and continue.
3. Wait for both agents to complete
4. Apply any simplifications from the code-simplifier agent
5. Address any issues scored 75+ from the code review — fix them before committing
6. If either agent found nothing actionable, proceed to Phase 5

**⛔ Do not stop here.** A clean review (no findings, `(none)`, nothing 75+) means the code is ready to commit — it is a green light to proceed to Phase 5, NOT a place to end your turn. The most common wrap-up failure is emitting a recap after a clean Phase 4 and stopping with the work still uncommitted. Both agents must have run (code-review AND code-simplifier — not just one); then move straight into Phase 5 and commit. The pass is not finished until Phase 5 has pushed and Phase 6 has reported.

---

## Phase 5: Commit and finalize

1. Stage and commit all remaining changes (documentation updates, tracking updates, quality fixes, any straggling code changes)
   - Use the project's commit message conventions (check CLAUDE.md for rules)
   - If no conventions exist: one short sentence describing what changed
   - Do NOT use conventional-commit prefixes (`feat:`, `fix:`, etc.) — global rule
2. Confirm the final state: `git status` should be clean
3. Push to origin if a remote exists: `git push origin $(git branch --show-current)`. For a first push on a new branch, use `git push -u origin $(git branch --show-current)` to set upstream (matching the branch's own name — never to `main`).
4. If working on a feature branch: mention whether it's ready to merge (but don't merge without being asked)

---

## Phase 6: Session summary and follow-ups

Give a brief summary of:
- What was accomplished this session
- What tracking/docs were updated

Then invoke the `summarize` skill using the Skill tool to generate a unified summary of branch changes and session work. After the summary is printed, invoke the `followups` skill using the Skill tool in Generate mode to surface new items from this session and file the selected ones.
