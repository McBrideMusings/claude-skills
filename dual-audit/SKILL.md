---
name: dual-audit
description: "Run the audit review, then add an independent Codex review of the same diff in a Terminal.app pane, reconcile the two, and report the union — read-only, never fixes. Codex catches what Claude's own review misses (concurrency, lifecycle, edge cases) and adds a second architecture opinion. Triggers: \"dual audit\", \"dual-audit\", \"audit with codex\", \"codex audit\", \"independent review of my changes\", \"have codex double-check the audit\", \"second-opinion review\"."
---

# Dual Audit

`audit` plus an **independent second reviewer**. Claude runs the normal `audit` (its six review axes), Codex independently reviews the *same diff* in a Terminal.app pane, and the two finding sets are reconciled into one source-tagged report. The point is the second pair of eyes: a self-review and the test suite will both miss bypasses and regressions that an independent reviewer on the actual diff catches — especially concurrency, lifecycle, and edge-case bugs. Codex also gives a second, independent read on architecture fit.

**Read-only, like `audit`.** This skill *reviews* — it never edits, commits, or fixes. To act on findings afterward, the user drives the next step (`/iterate`, `/delegated-iterate`, or a manual fix).

## Prerequisites

- The delegation backend is **Terminal.app only** — read [../delegation-backend/terminal-app.md](../delegation-backend/terminal-app.md) for the spawn / read / done-signal mechanics. Do not reach for MacTerm, Ghostty, or Poker Native.
- `codex` on `PATH`, and Automation (TCC) permission to control Terminal (the doc covers the one-time prompt). If Codex or Terminal driving is unavailable, say so and fall back to a plain `audit` — don't silently skip the second opinion.

## Workflow

### 1. Run audit
Invoke the `audit` skill via the Skill tool. Let it determine the review scope (uncommitted / branch-vs-base / fixed-point), locate CLAUDE.md and the spec, and produce its axis-tagged findings. Capture **the exact diff command audit used** — Codex must review the identical scope.

### 2. Kick off the independent Codex review
Derive the slug (see the backend doc) and spawn Codex non-interactively in a Terminal.app window, output redirected to `/tmp/<slug>-codex.md` with a trailing sentinel. Two options:

- **Repo-level review:** `codex exec review` (its built-in, read-only code review).
- **Scoped review:** `codex exec "<prompt>"` when you need to pin the exact diff range and conventions. The prompt must include:
  - The exact diff command (the one audit used — `gh pr diff`, the merge-safe diff, or `git diff HEAD`).
  - Project conventions to enforce (`CLAUDE.md` / `AGENTS.md` / `.claude/rules/*`).
  - **Two explicit dimensions:** *code* (correctness, types, nil-safety, concurrency, lifecycle, edge cases, error handling, dead code) and *architecture* (fit, abstraction level, pattern consistency, structural scalability, ownership clarity — surfaced separately, always design calls).
  - Output format: prioritized findings (Critical / Important / Minor), terse, no praise, written to the `/tmp/<slug>-codex.md` file.

Let Codex read the repo and run the diff command from its own pane — don't paste a huge diff into the prompt.

### 3. Wait for the delegate
Poll the sentinel (primary) and `busy` (secondary) per the backend doc. Reviews stream slowly — be patient before nudging. If the pane blocks on an unexpected prompt, read its `history` and surface it rather than blindly approving.

### 4. Reconcile
Read `/tmp/<slug>-codex.md`. Merge Codex's findings with audit's into one set, deduped by file+line+claim. Tag each finding's **source**: `audit`, `codex`, or `both`. "Both flagged it" is a strong signal; "only Codex flagged it" is exactly the catch this skill exists for — weight it accordingly, don't discount it for being single-source.

### 5. Triage (read-only)
Classify each finding with the dual-review buckets, but **surface — never fix**:

| Bucket | What it is | Action |
|---|---|---|
| **Mechanical** | Compile/type error, missing nil check, off-by-one, dead code, obvious race | Report with a concrete fix; do not apply it |
| **Design call** | New abstractions, API-surface or behavioral-semantics changes | Report with Codex's wording + a recommendation |
| **Architecture** | Layer/boundary violation, wrong abstraction level, pattern inconsistency, ownership ambiguity | Always surface (never out-of-scope, even if the file wasn't in the diff). Present the finding + your own severity read + the tradeoff |
| **Out-of-scope** | Adjacent refactor Codex wants, pre-existing debt, dismissed nits | Note and drop; mention you dismissed it and why |

### 6. (Optional) second Codex round
If the user wants a finding dug into deeper, send a follow-up `codex exec` referencing the prior round and the specific finding, writing to the same `/tmp/<slug>-codex.md`. Stop after at most a couple of rounds or when Codex returns nothing new.

### 7. Report
Produce a single consolidated report in `audit`'s file format and location, with two additions: a **Source** tag (`audit` / `codex` / `both`) on each finding, and Codex's findings folded into the matching axis sections (its architecture findings into `### Architecture`, its bug findings into `### Bugs`, etc.). Print the body, then the file path as the last token on its line with no trailing punctuation. Close the Terminal window when done (leave it open if Codex errored, so the user can inspect).

Do **not** commit, fix, or open a PR — this is a review.

## Anti-patterns

- **Fixing anything.** Dual-audit is read-only. If the user wants fixes applied with a Codex gate, that's `delegated-iterate`.
- **Discounting Codex-only findings.** The single-source Codex catch is the whole reason to run this — don't bury it because Claude's own agents didn't independently surface it.
- **Dismissing architecture findings as out-of-scope.** A layer violation from one new import is in scope regardless of diff size.
- **Expanding scope.** If Codex wants to refactor adjacent code that wasn't in the diff, dismiss it as out-of-scope unless the user authorizes a wider review.
- **Babysitting an interactive Codex.** Use `codex exec` (non-interactive). If you find yourself hand-approving prompts in the pane, you launched the wrong mode.
- **Reaching for another backend.** Terminal.app only — Ghostty can't return output and MacTerm isn't ready.
