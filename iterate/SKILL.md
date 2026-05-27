---
name: iterate
description: "Autonomous single-pass work on one tracked item: triage → implement → wrap-up (commits, pushes, files follow-ups). Use when the user wants to walk away while one item gets worked end-to-end without supervision. Triggers: \"iterate\", \"/iterate\", \"do a pass\", \"walk away and work an item\", \"auto-commit the next followup\". For continuous walk-away mode, use /loop /iterate."
---

# /iterate — Single-pass autonomous iteration

Compose `triage` → work → `wrap-up` into one autonomous pass. The user is walking away, not watching — minimize prompts, halt cleanly when something needs human judgment.

For continuous walk-away mode, use `/iterate-loop` (sibling skill) — equivalent to `/loop /iterate`.

---

## When to Use

- The user says "iterate", "/iterate", "do a pass", or otherwise signals walk-away autonomous work
- One specific tracked item needs to be moved end-to-end (issue or filed follow-up)
- The user wants commits/pushes/follow-up-filing handled without confirmation prompts
- Composing into `/loop /iterate` for continuous unattended progress

## When NOT to Use

- Exploratory work with no concrete tracked item — file a follow-up first, or run `triage` interactively
- Bundling multiple unrelated issues into one pass — one item per pass
- The user is actively pairing and wants step-by-step confirmation
- A bug fix that needs design discussion before code

---

## ⛔ BASH COMMAND RULES — READ THIS BEFORE WRITING ANY SHELL COMMAND

These rules exist because iterate is a walk-away tool. A single permission prompt kills the entire unattended run. There are no exceptions.

**HARD BANS — these will ALWAYS trigger a permission prompt and MUST NEVER appear:**

1. **`@{u}`, `@{upstream}`, `@{push}`, or ANY `{...}` git refspec.** These trigger brace-expansion prompts unconditionally. Use `origin/$(git branch --show-current)` or `origin/main` instead. Never type a `{` in a git argument outside a quoted string.

2. **Compound commands where ANY sub-command is not allowlisted.** `&&`, `||`, `;` chaining is only safe when EVERY piece would individually pass the allowlist. If uncertain, run commands separately. A compound with one unlisted binary prompts the whole thing.

3. **`$(...)` or backtick subshell expansion inside a command argument** where the inner command is not already allowlisted. Run the inner command first, capture the result, use it in a second call.

4. **`#` comments inside Bash tool calls.** They trigger approval prompts.

5. **Newlines inside a single Bash tool call** to separate commands.

6. **`cd /path && git <cmd>` to run git in a different directory.** This triggers an "untrusted hooks" prompt. Use `git -C /absolute/path <cmd>` instead — same effect, no compound, no prompt.

**When checking commits ahead of upstream**, use:
```
git rev-list --count origin/$(git branch --show-current)..HEAD
```
If that fails (no remote tracking branch), fall back to `git rev-list --count origin/main..HEAD`. NEVER use `@{u}`.

If you find yourself contorting a command to avoid a prompt, STOP. The right fix is adding the pattern to the allowlist, not clever reformatting. Halt and surface the issue instead.

---

## Pre-flight guards

Run both before invoking any other skill. If any fails, print the reason and stop.

Iterate runs on whichever branch is currently checked out — including `main`/`master`. The user opted into auto-commits on the current branch by invoking the skill; do not refuse based on branch name.

1. **Refuse to start with a dirty working tree.** Run `git status --short`. If non-empty, halt: *"Uncommitted changes present — commit, stash, or run /wrap-up before iterating."* (Untracked files in `.claude/` like `scheduled_tasks.lock` are harness artifacts — ignore them.)
2. **Refuse if commits ahead-of-upstream > 5.** Run `git rev-list --count origin/$(git branch --show-current)..HEAD` (falls back to `origin/main` if no remote tracking branch). If > 5, halt: *"Branch has accumulated N auto-iterations — review and merge before continuing."*

---

## Phase 1 — Triage (non-interactive overrides)

Invoke the `triage` skill via the Skill tool with these overrides:

- **Skip the "wait for user confirmation" step at triage Step 7.** After computing the recommendation, do NOT print *"Start on the recommendation?"* and do NOT wait. Proceed directly to triage Step 8 (Implement) with the top recommendation.
- **Skip triage's Step 9 (offer wrap-up).** Iterate runs wrap-up itself in Phase 3 with non-interactive overrides — don't let triage invoke wrap-up or it will double-commit.
- **Refuse to act on items not already tracked.** The recommendation must be an existing GitHub issue, an item already present in `<repo-root>/tmp/claude/followups.md`, or an outstanding handoff at `<repo-root>/tmp/claude/handoffs.md`. If triage's top pick is anything else (a fresh idea, a "while we're here" cleanup, an invented refactor), halt and surface it for the user to file or reject. Never invent feature work autonomously inside the loop.
- **If the top pick is the handoff:** invoke `handoff` Resume mode to extract the "Immediate next step" field and any session context, then proceed to Phase 2 with that as the work item. After successful implementation, delete the handoff file as part of Phase 3 wrap-up (do not prompt — the handoff has been fulfilled).
- **Halt cleanly on empty queue.** If triage finds nothing actionable, print *"Nothing to iterate on."* and stop. Do not loop on an empty queue.

---

## Phase 2 — Implement

Work the chosen item on the current branch following triage's Step 8.

- If implementation produces no diff after a reasonable attempt (false start, blocked, needs design), halt with a one-line blocker explanation. Do not commit empty changes.
- If tests fail and the cause isn't trivially fixable in 1–2 attempts, halt with the failure surfaced.

---

## Phase 3 — Wrap-up (non-interactive overrides)

Invoke the `wrap-up` skill via the Skill tool with these overrides:

- **Phase 2 (tracking):** apply automatically — close fulfilled GitHub issues with summary comments, move resolved followup items to the Resolved section, close milestones that hit zero open issues. No confirmation prompts.
- **Phase 3 (docs):** apply mechanical doc updates automatically (file-map.md, CLAUDE.md doc-table additions). For substantive doc updates that would normally prompt for diff confirmation, do NOT prompt — instead append them as follow-up items in Phase 6 with titles like *"Update PRD section X to reflect Y from iter-N"*.
- **Phase 4 (quality):** run code-simplifier and code-review in parallel. Auto-apply simplifications. Auto-fix any 75+ issues. If a 75+ issue can't be auto-fixed in 1–2 attempts, halt before committing.
- **Phase 5 (commit + push):** commit with project conventions, push to current branch. Confirm `git status` is clean afterward.
- **Phase 6 (followups):** run `summarize`, then invoke `followups` in **Generate mode, autonomous** (per the autonomous branch in followups' Step 5). It files every suggestion that clears the bar with no ask. **Never run followups' interactive Step 5 ask inside iterate** — a single "which to file?" prompt halts the whole unattended run. Items that don't clearly clear the bar are skipped silently; they'll resurface next session if still relevant.

---

## Post-wrap-up — Conditional handoff write

After `wrap-up` returns, decide whether this pass uncovered something hot enough that the *next* pass benefits from this session's context as scaffolding for its first action.

**Default: write no handoff.** A handoff is reserved for cases where context is load-bearing — not "here's the next backlog item." Routine polish, clean passes, and items already captured as followups do not justify one; normal triage will pick them up next pass.

Write a handoff only when at least one of the following clearly applies:

- **Regression introduced** — this pass broke something and the fix didn't fully land.
- **Partial fix** — implementation started but couldn't complete (budget exhausted, halt condition hit, sub-step deferred). The next pass needs to know where to resume, not start over.
- **Adjacent bug discovered** — a bug was found next to the worked item, and the territory this session already loaded makes the next fix materially cheaper than rediscovering it cold.
- **New high-priority issue surfaced mid-work** that wasn't visible before this pass and shouldn't wait behind the normal backlog.

If none clearly apply, write nothing and end the pass.

**When a handoff IS warranted:** invoke the `handoff` skill in Write mode. No prompt — this is autonomous mode. The "Immediate next step" must name the hot item concretely (the specific regression, the resume point, the adjacent bug), not a generic backlog entry. The handoff skill owns the format, path, and field definitions.

This step runs only inside `iterate`. Manual `/wrap-up` and direct `/followups` never write a handoff; the user invokes `/handoff` directly if they want one in a non-autonomous session.

**Interaction with Phase 1 handoff-resume:** if this pass began by resuming a prior handoff (Phase 1, line: "If the top pick is the handoff"), the resumed handoff file was already deleted as part of fulfillment. Writing a new handoff here is independent — gated solely on whether *this* pass's outcome meets the criteria above.

---

## Output

End each pass with a status line followed by a backlog snapshot:

```
Iteration N complete: <one-sentence summary>. Branch ahead by M commits. Halt: <reason | none>.

Backlog: X open issues (closed Y this pass). Roadmap: Z of W items complete (P%).
```

**Computing the snapshot:**

1. **GitHub issues** — run `gh issue list --state open --json number --limit 1000` and count the results. The "closed this pass" count is the number of issues wrap-up's Phase 2 tracking step closed (usually 1, occasionally 0).

2. **Roadmap** — check for a roadmap file in order: `ROADMAP.md`, `docs/ROADMAP.md`, `docs/roadmap.md`. If found, count checkbox lines: `[x]`/`[X]` = complete, `[ ]` = remaining. Report as "Z of W items complete (P%)". If no roadmap file exists, omit the roadmap part entirely.

3. If `gh` is unavailable or returns an error, omit the issues line rather than halting.

---

## Halt conditions

The pass stops and surfaces to the user when any of these fire:

- Pre-flight failed (dirty tree, too many commits ahead)
- Triage found nothing actionable
- Triage's top pick is not an already-tracked item
- Implementation produced no diff
- Tests fail and the cause isn't trivially fixable in 1–2 attempts
- code-review surfaced a 75+ issue that auto-fix didn't resolve
- After this pass, branch reaches the 5-commit threshold (next pre-flight will block)

When `/loop /iterate` hits a halt, the loop ends — the user reviews and decides whether to resume.

---

## Notes

- Each pass works one tracked item. Don't bundle multiple unrelated issues into one pass.
- Each pass produces at most one commit (wrap-up's). The branch accumulates commits, not the pass.
- The 5-commit threshold is the natural pause for human review. When it fires, review with `git log --oneline origin/$(git branch --show-current)..HEAD` (or `origin/main`), merge or reset, then resume.
- This skill never invokes itself recursively. Continuous mode is `/loop /iterate`, where the `loop` skill drives cadence.
