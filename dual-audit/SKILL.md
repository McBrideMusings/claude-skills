---
name: dual-audit
description: "Run the audit review, then add an independent second-opinion review of the same diff by the configured cross-vendor delegate (Codex or Reasonix/DeepSeek) running non-interactively in a Terminal.app window, reconcile the two, and report the union — read-only, never fixes. The delegate catches what Claude's own review misses (concurrency, lifecycle, edge cases) and adds a second architecture opinion. Triggers: \"dual audit\", \"dual-audit\", \"audit with codex\", \"codex audit\", \"deepseek audit\", \"independent review of my changes\", \"have the delegate double-check the audit\", \"second-opinion review\"."
---

# Dual Audit

`audit` plus an **independent second reviewer**. Claude runs the normal `audit` (its six review axes); a non-Claude delegate independently reviews the *same diff*; the two finding sets are reconciled into one source-tagged report. The point is the second pair of eyes from a *different model* — a self-review and the test suite both miss bypasses and regressions that an independent reviewer on the actual diff catches, especially concurrency, lifecycle, and edge-case bugs. The delegate also gives a second, independent read on architecture fit. (A Claude subagent reviewer wouldn't help here — same model family, correlated blind spots. The cross-vendor delegate is the whole point.)

**Read-only, like `audit`.** This skill *reviews* — it never edits, commits, or fixes. To act on findings afterward, the user drives the next step (`/iterate`, `/delegated-iterate`, or a manual fix).

## Prerequisites

- The delegate runs through the cross-vendor backend — read [../delegation-backend/SKILL.md](../delegation-backend/SKILL.md) for the `delegate` resolver and the Terminal.app transport. The skill never names a vendor; `delegate` resolves it from `CLAUDE_DELEGATE_AGENT`.
- **Gate first:** run `delegate check`. If it fails (no delegate configured, not authenticated, Terminal automation not permitted), say so and **fall back to a plain `audit`** — a single-model review is still useful; just tell the user the second opinion was skipped and why.

```bash
D="$HOME/.claude/skills/delegation-backend/delegate"
"$D" check || { echo "Delegate unavailable — running plain audit only"; }
```

## Workflow

### 1. Run audit
Invoke the `audit` skill via the Skill tool. Let it determine the review scope (uncommitted / branch-vs-base / fixed-point), locate CLAUDE.md and the spec, and produce its axis-tagged findings. Capture **the exact diff command audit used** — the delegate must review the identical scope.

### 2. Kick off the independent delegate review
Derive the slug (see the backend doc). Write the review prompt to a temp file, then run `delegate exec` in the **background** (the Bash tool's background mode), output to `/tmp/<slug>-delegate.md`:

```bash
prompt="$(mktemp -t dual-audit.XXXXXX)"
cat > "$prompt" <<'PROMPT'
Review the changes produced by this exact diff command: <diff-cmd>
Enforce the project conventions in CLAUDE.md / AGENTS.md / .claude/rules/*.
Report two dimensions separately:
  CODE: correctness, types, nil-safety, concurrency, lifecycle, edge cases, error handling, dead code.
  ARCHITECTURE: fit, abstraction level, pattern consistency, structural scalability, ownership clarity —
    always design calls, never style nits.
Output prioritized findings (Critical / Important / Minor), terse, no praise.
PROMPT
"$D" exec "$prompt" "/tmp/<slug>-delegate.md"      # run this call in the background
```

Substitute the **literal** diff command audit used (`gh pr diff`, the merge-safe diff, or `git diff HEAD`) into the prompt. Let the delegate read the repo and run that command itself — don't paste a huge diff into the prompt.

### 3. Wait for the delegate
Because `delegate exec` runs in the background, the harness notifies you when it finishes; then read `/tmp/<slug>-delegate.md`. The delegate's output includes its own chrome (a progress line, a token/cost footer) around the findings — extract the substance, ignore the chrome.

### 4. Reconcile
Merge the delegate's findings with audit's into one set, deduped by file+line+claim. Tag each finding's **source**: `audit`, `delegate`, or `both`. "Both flagged it" is a strong signal; "only the delegate flagged it" is exactly the catch this skill exists for — weight it accordingly, don't discount it for being single-source.

### 5. Triage (read-only)
Classify each finding, but **surface — never fix**:

| Bucket | What it is | Action |
|---|---|---|
| **Mechanical** | Compile/type error, missing nil check, off-by-one, dead code, obvious race | Report with a concrete fix; do not apply it |
| **Design call** | New abstractions, API-surface or behavioral-semantics changes | Report with the delegate's wording + a recommendation |
| **Architecture** | Layer/boundary violation, wrong abstraction level, pattern inconsistency, ownership ambiguity | Always surface (never out-of-scope, even if the file wasn't in the diff). Present the finding + your own severity read + the tradeoff |
| **Out-of-scope** | Adjacent refactor the delegate wants, pre-existing debt, dismissed nits | Note and drop; mention you dismissed it and why |

### 6. (Optional) second delegate round
If the user wants a finding dug into deeper, write a follow-up prompt referencing the prior round and that finding, and run `delegate exec` again to the same `/tmp/<slug>-delegate.md`. Stop after at most a couple of rounds or when the delegate returns nothing new.

### 7. Report
Produce a single consolidated report in `audit`'s file format and location, with two additions: a **Source** tag (`audit` / `delegate` / `both`) on each finding, and the delegate's findings folded into the matching axis sections (its architecture findings into `### Architecture`, its bug findings into `### Bugs`, etc.). Print the body, then the file path as the last token on its line with no trailing punctuation.

Do **not** commit, fix, or open a PR — this is a review.

## Anti-patterns

- **Fixing anything.** Dual-audit is read-only. If the user wants fixes applied with a delegate gate, that's `delegated-iterate`.
- **Discounting delegate-only findings.** The single-source cross-vendor catch is the whole reason to run this — don't bury it because Claude's own agents didn't independently surface it.
- **Dismissing architecture findings as out-of-scope.** A layer violation from one new import is in scope regardless of diff size.
- **Expanding scope.** If the delegate wants to refactor adjacent code that wasn't in the diff, dismiss it as out-of-scope unless the user authorizes a wider review.
- **Naming a vendor in the skill.** Always go through `delegate`; the resolver picks codex vs reasonix from the environment.
- **Substituting a Claude subagent for the delegate.** Same-family review gives correlated blind spots — defeats the purpose. If the delegate is unavailable, fall back to plain `audit` and say so, don't fake the second opinion with another Claude.
