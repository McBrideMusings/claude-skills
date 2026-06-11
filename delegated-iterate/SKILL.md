---
name: delegated-iterate
description: "Autonomous single-pass iteration like /iterate, but with an independent review of the actual implemented diff by the configured cross-vendor delegate (Codex or Reasonix/DeepSeek), inserted as a gate before wrap-up commits. Claude implements; the delegate reviews the real diff non-interactively in a Terminal.app window; Claude fixes blocks; loop until mergeable; then wrap-up. Use when you want walk-away iteration with an adversarial second reviewer on the result. Triggers: \"delegated iterate\", \"delegated-iterate\", \"iterate with codex review\", \"iterate with deepseek review\", \"dual iterate\", \"iterate and have the delegate check the diff\"."
---

# /delegated-iterate — Single-pass iteration with an independent review gate

This is `/iterate` plus one insertion: after implementation lands and tests pass, but **before** wrap-up commits, an independent review by a non-Claude delegate inspects the *actual diff*. Claude fixes any blocking findings, re-confirms with the delegate, and only then proceeds to wrap-up.

**Core principle — a passing test suite and a self-review will lie to you.** Route-scoped tests only cover the paths the implementation named, so "green + Claude reviewed it" is exactly the combination that hides bypasses and regressions. The high-value catch is an *independent, different-model* reviewer enumerating the real diff. That gate is the only thing this skill adds over `/iterate`; everything else — triage rules, the mandatory implement→wrap-up transition, halt conditions, the output snapshot — is `/iterate`'s, unchanged.

Claude stays the implementer (this is an overlay, not the five-role build pipeline). The delegation is the *reviewer*, not the coder — and it's deliberately cross-vendor: a Claude subagent reviewer would share Claude's blind spots.

## When to Use / NOT to Use

Same as `/iterate` (one tracked item, walk-away, minimize prompts). Use *this* variant when the extra confidence of an independent diff review is worth the added round — risky changes, security-sensitive paths, refactors that touch many call sites. For a quick low-risk pass, plain `/iterate` is enough. For continuous mode, `/loop /delegated-iterate`.

## Prerequisites

- Everything `/iterate` needs, plus the cross-vendor backend — read [../delegation-backend/SKILL.md](../delegation-backend/SKILL.md) for the `delegate` resolver and Terminal.app transport. The skill never names a vendor; `delegate` resolves it from `CLAUDE_DELEGATE_AGENT`.
- **Gate the gate:** before the review step, run `delegate check`. If it fails (no delegate configured, not authenticated, Terminal automation not permitted), **halt and tell the user** — do not silently degrade to a plain `/iterate`, because the independent gate is the reason they chose this skill.

```bash
D="$HOME/.claude/skills/delegation-backend/delegate"
"$D" check || { echo "Delegate unavailable — halting (the review gate is the point of /delegated-iterate)"; halt; }
```

## The pass

### Phases 1–2 — Triage and Implement
Run exactly as `/iterate` Phases 1–2: the same pre-flight guards (clean tree, ≤5 commits ahead), the same triage non-interactive overrides (act only on already-tracked items, skip triage's wrap-up), and the same implement step. Resolve standalone-vs-continuous mode the same way (`continuous` token in the arguments).

**The one change to iterate's Phase 2→3 transition:** iterate says "the moment tests are green, immediately invoke wrap-up." Here, the moment tests are green you immediately go to the **review gate below** instead. The gate sits *between* implementation and wrap-up. Wrap-up still runs — just after the gate clears. All of iterate's "do not stop, do not emit a recap" force still applies: green tests are not the finish line, and neither is a clean review — wrap-up is.

If a halt condition fires during implement (no diff, unfixable test failure), halt as iterate does — never start the gate on a non-existent diff.

### Phase 2.5 — Independent review gate (the insertion)

1. **Scope.** Compute the diff range for the work this pass produced: `git diff <merge-base>..HEAD` for committed work, or `git diff HEAD` plus untracked files if implementation hasn't committed yet.
2. **Kick off the delegate.** Derive the slug (backend doc). Write the review prompt to a temp file and run `delegate exec` in the **background**, output to `/tmp/<slug>-delegate.md`. The prompt must include:
   - The exact diff command and base.
   - "The check/test suite is already green — focus on **correctness, security holes, regressions**, not re-running tests."
   - A push to **enumerate every call site of any dangerous capability the diff touches** (every parse of client input, every privileged call), rather than trusting that the changed routes are the only ones — that is where false confidence lives.
   - Project conventions (`CLAUDE.md` / `AGENTS.md`).
   - A verdict line: `MERGEABLE / MERGEABLE-WITH-FIXES / BLOCK`, plus prioritized findings.
   ```bash
   prompt="$(mktemp -t deleg-iter.XXXXXX)"; cat > "$prompt" <<'PROMPT'
   <the review instructions above, with <diff-cmd> substituted literally>
   PROMPT
   "$D" exec "$prompt" "/tmp/<slug>-delegate.md"    # background
   ```
3. **Wait.** `delegate exec` runs in the background; the harness notifies you when it finishes. Read `/tmp/<slug>-delegate.md` and extract the substance (ignore the vendor's chrome/cost footer).
4. **Triage + fix.** Classify with the dual-review buckets:
   - **Mechanical** (compile/type error, missing guard, off-by-one, obvious race) → **Claude applies the fix** (faster and more reliable than re-delegating), adds a regression test where it makes sense, re-runs the full check.
   - **Design call** (new abstraction, behavioral semantics, API surface) → in a **standalone** pass, `AskUserQuestion` with the delegate's wording + a recommendation; in a **continuous** pass, do not prompt — file it as a follow-up and proceed (don't silently pick an architecture).
   - **Architecture** → never auto-fix. Surface; in continuous mode file as a follow-up titled `Architecture: <finding>`.
   - **Out-of-scope** → dismiss with a one-line reason.
5. **Re-confirm.** After fixes, write a follow-up prompt summarizing what was applied / dismissed / deferred and asking the delegate to re-inspect the current diff and re-issue its verdict; run `delegate exec` again to the same `/tmp/<slug>-delegate.md`. Loop fix↔review until **MERGEABLE** or a stop condition.
6. **Gate stop conditions:** delegate says mergeable; or max 3 review rounds reached; or two consecutive check failures from Claude's own fixes (halt and surface); or the user intervenes.

A `BLOCK` the delegate won't release after 3 rounds is a **halt**, not a "commit anyway" — surface it and stop. The whole point is that the gate is load-bearing.

### Phase 3 — Wrap-up
Once the gate clears, invoke `wrap-up` exactly as `/iterate` Phase 3 does (same non-interactive overrides). Wrap-up's own Phase 4 quality check still runs — it's cheap and catches anything the gate's fixes introduced. Then the post-wrap-up conditional-handoff step, same as iterate.

## Halt conditions

All of `/iterate`'s, plus:
- `delegate check` fails at the start of the gate (don't degrade silently).
- The delegate holds a `BLOCK` after 3 review rounds.
- Two consecutive check failures while fixing the gate's findings.

## Output

Same status line + backlog snapshot as `/iterate`, with the gate result appended:

```
Iteration N complete: <summary>. Branch ahead by M commits. Delegate gate: MERGEABLE in R round(s). Halt: <reason | none>.
```

## Notes

- The delegate is the **reviewer**, not the implementer — Claude owns every code change, including the fixes for the delegate's findings. Don't re-task the delegate to write code.
- One tracked item per pass, at most one commit (wrap-up's), exactly like `/iterate`.
- Continuous mode is `/loop /delegated-iterate continuous`; this skill never invokes itself.
