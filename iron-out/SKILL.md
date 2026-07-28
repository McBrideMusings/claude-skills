---
name: iron-out
description: "Drive a backlog's ambiguity to zero: scan in-scope open issues with implement's AFK gate, then resolve each failing one with the user, editing issue bodies until every issue states a plan and a checkable definition of done. Use whenever issues are vague, half-specified, or 'TBD' — whether or not anything is about to work them. Selectors: issue numbers, #range, label:X, milestone:X, followups, papercuts; bare iron-out takes the whole open backlog."
---

# Iron Out

The goal state is **AFK**: every issue in scope passes `implement`'s Phase 0.5 gate — a concrete plan is statable and "done" is verifiable without a judgment call the user owns. This skill finds the issues that fail and drives them to zero with the user.

**This is worth doing on its own.** An issue that cannot state its own plan or its own definition of done is a bad issue whether or not an agent ever touches it — you will re-derive the missing decision every time you read it. Run `iron-out` because the backlog is vague, not because something is about to consume it.

It happens to also be what the autonomous harnesses require, and they say so themselves — `/orchestrate` stops its whole run on a gate failure and hands the scope here. That dependency points one way: they know about this skill; this skill does not need to know about them.

It writes issue bodies, never code. The body is the single durable artifact — `implement`'s gate reads the body, so the resolution must live there. No comments, no side files.

## Scope

Selector forms are shared with `iterate` — one table, in [../iterate/SELECTORS.md](../iterate/SELECTORS.md) (`#133-140`, `label:X`, `milestone:X`, `followups`, `papercuts`; union multiple selectors). Shared because a selector means the same thing everywhere, not because this skill runs after that one. Bare `iron-out` = every open issue in the current repo. Exclude `wayfinder:*`-labeled issues, same as triage. Local items (followups / papercuts) are judged like issues; their "body" is the entry line, and resolving one rewrites that line in its source file.

## Phase 1 — Scan

Fetch every in-scope issue (`gh issue list … --json number,title,labels,body`) plus dependencies per issue (`gh issue view <n> --json blockedBy`; `Blocked by:` prose fallback). Hand the bodies to a Haiku sub-agent so they stay out of parent context.

Sub-agent brief:

> For each issue, run implement's Phase 0.5 AFK gate:
>
> 1. **Plan test** — could an agent state a concrete plan right now: the files to touch, the changes to make, an objective acceptance check?
> 2. **Objectivity test** — is "done" verifiable without a qualitative, product, or design call the user owns? Does the body hide an unmade decision, missing information, or an ambiguity an agent would have to invent an answer to?
>
> Textual markers are fast-path flags feeding the same judgment, not a separate rule: `Type: HITL`, "TBD", "decide whether", "either … or", a `needs human input:` followup naming the issue. A marked issue still gets judged; an unmarked one can still fail.
>
> Return JSON only: per issue `{"number": N, "verdict": "afk"|"needs-human", "failed_test": "plan"|"objectivity"|"both", "question": "<the specific unresolved thing, one line>", "blocked_by": [numbers]}`.

**Completion criterion:** every scoped issue has a verdict, and every `needs-human` verdict names its specific unresolved question — "vague" is not a finding.

If nothing fails, report that the scope is already AFK-workable and stop.

## Phase 2 — Order by leverage

Order the failing issues by **unblock leverage**: how many in-scope issues each one transitively blocks (from the dependency edges). Highest first — a decision gating three issues outranks a leaf. Tiebreak: `priority:*` label, then ascending number. Print the queue with each issue's one-line question so the user sees the whole shape before the first interview.

## Phase 3 — The loop

One issue at a time, top of the queue. The user can stop at any point — progress is already durable (state lives in the edited bodies; a rerun rescans and resumes; there is no state file).

1. **Interview.** Present the issue — its number, title, full URL, and unresolved question — then route by failed test, exactly as implement's gate does:
   - Plan test failed (missing facts, unknown files or scope) → invoke `ask-questions-if-underspecified` via the Skill tool.
   - Objectivity test failed, or both (a design or product call the user owns) → invoke `grill-me` via the Skill tool. If a decision crystallises into an ADR, grill-me's existing offer covers it — take it.
2. **Edit the body.** Rewrite the issue body so the gate passes on its face: decisions baked in as statements (not options), acceptance check present, `Type: HITL` flipped to `Type: AFK` if present. Show the new body, then `gh issue edit <n> --body`. GitHub keeps edit history; nothing is lost.
3. **Verify.** Re-run the two tests on the edited body. Fail → the interview missed something; surface the residual and resolve it before moving on. Never leave an issue half-ironed.
4. **Cascade.** Re-judge the remaining flagged issues with the decisions made so far in hand — one answer often settles siblings. Any now passing get their body edits too, drafted from the recorded decisions, shown to the user, applied. Re-order what remains by leverage and continue at 1.

**Completion criterion:** the flagged queue is empty — every scoped issue passes the gate.

## Phase 4 — Report and hand off

Report: issues ironed out (with what was decided), issues auto-settled by cascade, ADRs written. Then offer next steps in plain chat — never via the `AskUserQuestion` tool:

```
Scope is AFK-workable. Reply with a number, or tell me something else.

1. Fan it out — invoke orchestrate on this scope.
2. March it sequentially — invoke iterate on this scope.
3. Stop here.
```

## Rules

- Never invent an answer. Every resolution comes from the interview; if the user declines to decide, the issue stays flagged and is reported as such.
- Don't implement, don't commit code, don't close issues. Body edits (and grill-me's ADRs) are the only writes.
- Interview one issue at a time — never batch questions across issues into one message.
- Every time an issue is named to the user — the Phase 2 queue, an interview, a cascade edit, the Phase 4 report — emit its full clickable URL alongside the number, so the user can open and read it. `#121` on its own is not enough. Get the URLs from the same `gh` call that fetched the bodies (`--json number,title,url`); for a local followup or papercut, give the absolute file path and line instead.
