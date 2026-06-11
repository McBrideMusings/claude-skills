---
name: delegated-iterate
description: "Autonomous single-pass iteration like /iterate, but with an independent Codex review of the actual implemented diff inserted as a gate before wrap-up commits. Claude implements; Codex (in a Terminal.app pane) reviews the real diff; Claude fixes blocks; loop until mergeable; then wrap-up. Use when you want walk-away iteration with an adversarial second reviewer on the result. Triggers: \"delegated iterate\", \"delegated-iterate\", \"iterate with codex review\", \"dual iterate\", \"iterate and have codex check the diff\"."
---

# /delegated-iterate — Single-pass iteration with an independent review gate

This is `/iterate` plus one insertion: after implementation lands and tests pass, but **before** wrap-up commits, an independent Codex review inspects the *actual diff*. Claude fixes any blocking findings, re-confirms with Codex, and only then proceeds to wrap-up.

**Core principle — a passing test suite and a self-review will lie to you.** Route-scoped tests only cover the paths the implementation named, so "green + Claude reviewed it" is exactly the combination that hides bypasses and regressions. The high-value catch is an *independent* reviewer enumerating the real diff. That gate is the only thing this skill adds over `/iterate`; everything else — triage rules, the mandatory implement→wrap-up transition, halt conditions, the output snapshot — is `/iterate`'s, unchanged.

Claude stays the implementer (this is an overlay, not the five-role build pipeline). The delegation is the *reviewer*, not the coder.

## When to Use / NOT to Use

Same as `/iterate` (one tracked item, walk-away, minimize prompts). Use *this* variant when the extra confidence of an independent diff review is worth the added Codex round — risky changes, security-sensitive paths, refactors that touch many call sites. For a quick low-risk pass, plain `/iterate` is enough. For continuous mode, `/loop /delegated-iterate`.

## Prerequisites

- Everything `/iterate` needs, plus the delegation backend: **Terminal.app only** — read [../delegation-backend/terminal-app.md](../delegation-backend/terminal-app.md) for spawn / read / done-signal mechanics. Do not use MacTerm, Ghostty, or Poker Native.
- `codex` on `PATH` and Automation (TCC) permission to control Terminal. **If Codex or Terminal driving is unavailable, halt and tell the user** — do not silently degrade to a plain `/iterate`, because the gate is the reason they chose this skill.

## The pass

### Phases 1–2 — Triage and Implement
Run exactly as `/iterate` Phases 1–2: the same pre-flight guards (clean tree, ≤5 commits ahead), the same triage non-interactive overrides (act only on already-tracked items, skip triage's wrap-up), and the same implement step. Resolve standalone-vs-continuous mode the same way (`continuous` token in the arguments).

**The one change to iterate's Phase 2→3 transition:** iterate says "the moment tests are green, immediately invoke wrap-up." Here, the moment tests are green you immediately go to the **review gate below** instead. The gate sits *between* implementation and wrap-up. Wrap-up still runs — just after the gate clears. All of iterate's "do not stop, do not emit a recap" force still applies: green tests are not the finish line, and neither is a clean review — wrap-up is.

If a halt condition fires during implement (no diff, unfixable test failure), halt as iterate does — never start the gate on a non-existent diff.

### Phase 2.5 — Independent Codex review gate (the insertion)

1. **Scope.** Compute the diff range for the work this pass produced: `git diff <merge-base>..HEAD` for committed work, or `git diff HEAD` plus untracked files if implementation hasn't committed yet. Tell Codex the exact command to run.
2. **Kick off Codex.** Derive the slug (backend doc) and spawn Codex non-interactively in a Terminal.app window, output to `/tmp/<slug>-codex.md` with a trailing sentinel. Use `codex exec "<prompt>"` with:
   - The exact diff command and base.
   - "The check/test suite is already green — focus on **correctness, security holes, regressions**, not re-running tests."
   - A push to **enumerate every call site of any dangerous capability the diff touches** (every parse of client input, every privileged call), rather than trusting that the changed routes are the only ones — that is where false confidence lives.
   - Project conventions (`CLAUDE.md` / `AGENTS.md`).
   - A verdict line: `MERGEABLE / MERGEABLE-WITH-FIXES / BLOCK`, plus prioritized findings written to the `/tmp/<slug>-codex.md` file.
3. **Wait** on the sentinel (primary) + `busy` (secondary) per the backend doc.
4. **Triage + fix.** Read the findings. Classify with the dual-review buckets:
   - **Mechanical** (compile/type error, missing guard, off-by-one, obvious race) → **Claude applies the fix** (faster and more reliable than re-delegating), adds a regression test where it makes sense, re-runs the full check.
   - **Design call** (new abstraction, behavioral semantics, API surface) → in a **standalone** pass, `AskUserQuestion` with Codex's wording + a recommendation; in a **continuous** pass, do not prompt — file it as a follow-up and proceed (don't silently pick an architecture).
   - **Architecture** → never auto-fix. Surface; in continuous mode file as a follow-up titled `Architecture: <finding>`.
   - **Out-of-scope** → dismiss with a one-line reason.
5. **Re-confirm.** After fixes, send a follow-up `codex exec` (same `/tmp/<slug>-codex.md`) summarizing what was applied / dismissed / deferred and asking Codex to re-inspect the current diff and re-issue its verdict. Loop fix↔review until **MERGEABLE** or a stop condition.
6. **Gate stop conditions:** Codex says mergeable; or max 3 review rounds reached; or two consecutive check failures from Claude's own fixes (halt and surface); or the user intervenes. Close the Terminal window when the gate clears (leave it open on a halt for inspection).

A `BLOCK` Codex won't release after 3 rounds is a **halt**, not a "commit anyway" — surface it and stop. The whole point is that the gate is load-bearing.

### Phase 3 — Wrap-up
Once the gate clears, invoke `wrap-up` exactly as `/iterate` Phase 3 does (same non-interactive overrides). Wrap-up's own Phase 4 quality check still runs — it's cheap and catches anything the gate's fixes introduced. Then the post-wrap-up conditional-handoff step, same as iterate.

## Halt conditions

All of `/iterate`'s, plus:
- Codex / Terminal driving unavailable at the start (don't degrade silently).
- Codex holds a `BLOCK` after 3 review rounds.
- Two consecutive check failures while fixing the gate's findings.

## Output

Same status line + backlog snapshot as `/iterate`, with the gate result appended:

```
Iteration N complete: <summary>. Branch ahead by M commits. Codex gate: MERGEABLE in R round(s). Halt: <reason | none>.
```

## Notes

- The delegate is the **reviewer**, not the implementer — Claude owns every code change, including the fixes for Codex's findings. Don't re-task Codex to write code.
- One tracked item per pass, at most one commit (wrap-up's), exactly like `/iterate`.
- Continuous mode is `/loop /delegated-iterate continuous`; this skill never invokes itself.
