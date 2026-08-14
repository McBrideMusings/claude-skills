---
name: iron-out
description: "Drive a scope's ambiguity to zero so the work can be handed off: scan every in-scope issue with implement's AFK gate, then resolve each failure — a decision by interviewing the user, a fact or a prototype by dispatching a subagent. Also charts a foggy effort from scratch, filing the open questions as issues under a milestone that names the destination. Selectors: issue numbers, #range, label:X, milestone:X, followups, papercuts; bare iron-out takes the whole open backlog."
---

# Iron Out

The goal state is **AFK**: every issue in scope passes `implement`'s Phase 0.5 gate — a concrete plan is statable, and "done" is verifiable without a judgment call the user owns. This skill finds the issues that fail and drives them to zero.

**Worth doing on its own.** An issue that cannot state its own plan or its own definition of done is a bad issue whether or not an agent ever touches it — you re-derive the missing decision every time you read it. Run `iron-out` because the backlog is vague, not because something is about to consume it.

It happens to also be what the autonomous harnesses require, and they say so themselves — `/orchestrate` stops its whole run on a gate failure and hands the scope here. That dependency points one way: they know about this skill; this skill does not need to know about them.

## Two kinds of item, one loop

Every item is an ordinary issue in the ordinary backlog. There is no parallel planning surface.

- **Work item** — describes something to build. Resolving it **rewrites its body** so the gate passes; the issue stays open and gets implemented later.
- **Question** — its whole content is a decision nobody has made. Resolving it **posts the answer and closes it**, and often files new issues. Carries the `question` label, so `triage` and `implement` skip it — nothing is built *from* a question.

The loop is identical for both. Only the write step differs. An issue that fails the gate because it *hides* an unmade decision usually wants splitting: the decision becomes a question, the buildable remainder stays a work item blocked by it.

## Plan, don't do

This skill writes issue bodies and answers. It never writes code. The pull to just go build the thing is the signal that the scope is already clear — that's the exit, not a step. Assets produced along the way (a research doc, a prototype) are **linked** from the issue, never pasted in.

## Refer by name

Every issue has a title. In everything the user reads — the queue, an interview, the report — refer to it by that name with its **full clickable URL**, never a bare `#42`. A wall of `#42, #43, #44` is illegible; names read at a glance. Get URLs from the same `gh` call that fetched the bodies (`--json number,title,url`). For a local followup or papercut, give the absolute file path and line instead.

## Scope

Selector forms are shared with `iterate` — one table, in [../iterate/SELECTORS.md](../iterate/SELECTORS.md) (`#133-140`, `label:X`, `milestone:X`, `followups`, `papercuts`; union multiple selectors). Shared because a selector means the same thing everywhere, not because this skill runs after that one. Bare `iron-out` = every open issue in the current repo. Local items (followups / papercuts) are judged like issues; their "body" is the entry line, and resolving one rewrites that line in its source file.

**Dependencies** are a `Blocked by #<n>` line in the body (one per blocker), plus GitHub's native `blockedBy`. An item is unblocked when every blocker is closed.

**Free text that isn't a selector is a loose idea, not a scope** — `iron-out a 3D storefront browser for my Plex library`. There is no backlog to scan yet, so go to [Charting a foggy effort](#charting-a-foggy-effort) first; the loop runs afterwards over the milestone it creates.

## Charting a foggy effort

When the user arrives with an idea rather than a backlog — a greenfield build, a huge feature, a migration — there is nothing to scan yet. Chart it first. Only reach for this when the effort is too big to hold in one session; a smaller idea goes straight to `/grill-me` → `/to-spec`.

1. **Name the destination.** Run `grill-me` to pin down what this effort finds its way to — a spec, a decision, a change made in place. The destination fixes the scope, so it is settled first.
2. **Map the frontier.** Grill again, **breadth-first** — fan out across the whole space rather than deep on one thread, surfacing the open decisions and the first steps takeable now. **If no fog surfaces**, the way is already clear: say so and send the user to `/to-spec`. No milestone needed.
3. **Create the milestone.** Its title is the effort; its description is the brief:

```markdown
## Destination
<what reaching the end looks like. One or two lines; every pass orients to it first.>

## Notes
<domain; skills every pass should consult; standing preferences for this effort>

## Not yet specified
<in-scope fog — the suspected question, the area to revisit. Graduates into issues as the frontier advances.>

## Out of scope
<work consciously ruled beyond the destination. Never graduates.>
```

<!-- If the effort is in a domain with a design axis (detect via ../_domains/_detect.md — today: `game`
     via ../_domains/game/design.md, `ui` via ../_domains/gui/design.md), point Notes at it so every
     pass's interviews consult the domain's design lenses. Structure + tradeoffs only, never a fun-verdict. -->

4. **File the questions you can state now** as issues on that milestone, labelled `question`. Then wire `Blocked by` edges in a **second pass** — issues need numbers before they can reference each other.
5. Run the loop below over `milestone:<name>`.

**Fog or issue?** The test is whether you can state the question precisely now — *not* whether you can answer it now. Sharp enough to phrase → file it, even if it's blocked. Not sharp enough → leave it in **Not yet specified**. Don't pre-slice fog into issue-sized pieces; one patch may graduate into several issues, or none.

Fog only ever gathers *toward* the destination. Work past it is **Out of scope**, not fog — and if an existing issue turns out to sit past the destination, close it and leave one line in Out of scope saying why.

## Phase 1 — Scan

Resolve the issue backend via [`../_tracker/_detect.md`](../_tracker/_detect.md), then fetch every in-scope issue plus its dependencies. Hand the bodies to a **Sonnet** sub-agent so they stay out of parent context.

**Sonnet, not Haiku — the isolation is the point, not the model.** A Haiku run returned template placeholder text in every `question` field (literally `"Decision or design choice not settled: Which"`) while producing perfectly valid JSON: right array length, every field present, content empty. Nothing downstream catches that — Phase 2 prints those strings straight to the user as the queue, and the whole pass has to be redone. Re-running on Sonnet produced real questions from the same bodies.

- **`beads`:** `bd list --status open --json` (filtered per selector) and `bd dep tree <id>` for the edges. The dependency graph is real here, so `Blocked by:` prose in a body is a *finding* — an edge someone never wired — not the source of truth. Note each one and offer to convert it: `bd dep add <id> <blocker-id> -t blocks`.
- **`github`:** `gh issue list … --json number,title,url,labels,body` plus `gh issue view <n> --json blockedBy`, with the `Blocked by:` prose fallback.

Sub-agent brief:

> For each issue, run implement's Phase 0.5 AFK gate:
>
> 1. **Plan test** — could an agent state a concrete plan right now: the files to touch, the changes to make, an objective acceptance check?
> 2. **Objectivity test** — is "done" verifiable without a qualitative, product, or design call the user owns? Does the body hide an unmade decision, missing information, or an ambiguity an agent would have to invent an answer to?
>
> Textual markers are fast-path flags feeding the same judgment, not a separate rule: `Type: HITL`, "TBD", "decide whether", "either … or", a `needs human input:` followup naming the issue. A marked issue still gets judged; an unmarked one can still fail.
>
> Then say what resolving it would take: `decision` (a call the user owns), `fact` (something knowable by reading docs, APIs, or code), `artifact` (needs something concrete to react to), `manual` (needs the user to go do a thing offline).
>
> 3. **Staleness check** — the two tests above ask whether an issue is *decidable*. They never ask whether what it says about the codebase is still *true*. So also resolve every concrete thing the body cites: file paths, symbols, and commit hashes. `grep` the symbol, stat the path, `git cat-file -e` the hash. Anything that no longer resolves goes in `stale_claims` — a finding, not a gate failure.
>
> Read the code before trusting an asserted limitation. "There is no way to X" in a body is a claim with an expiry date, not a fact.
>
> Return JSON only: per issue `{"number": N, "verdict": "afk"|"needs-human", "failed_test": "plan"|"objectivity"|"both", "needs": "decision"|"fact"|"artifact"|"manual", "question": "<the specific unresolved thing, one line>", "stale_claims": ["<citation that no longer resolves, and what is there now>"], "blocked_by": [numbers]}`.

**Completion criterion:** every scoped issue has a verdict, every `needs-human` verdict names its specific unresolved question — "vague" is not a finding — and every issue has a `stale_claims` array, empty only after actually checking.

**Reject a placeholder before you use it.** A `question` that echoes this brief's own wording, restates the test name, or is under about fifteen words is a non-answer that will read as a finished scan. Re-run rather than printing it.

**Stale claims are reported alongside the verdict, and they change what the pass does.** An issue can pass both gates cleanly and still be false — those are the expensive ones, because nothing downstream doubts them. Observed in a single pass: an issue describing a 659-line diff in a project file that had stopped being tracked the day after filing; a docs issue whose own instructions named two toolbar buttons that had been removed, which would have produced a confidently wrong spec; and two issues sitting labelled human-only for weeks on an asserted tooling limit that was not real. Fix the body as part of the pass — a stale issue is unworkable in exactly the way this skill exists to fix.

If nothing fails and there is no fog, report that the scope is already AFK-workable and go to Phase 4.

## Phase 2 — Order by leverage

Order the failing issues by **unblock leverage**: how many in-scope issues each transitively blocks. Highest first — a decision gating three issues outranks a leaf. Tiebreak: `priority:*` label, then ascending number. Print the queue with each issue's name, URL, one-line question, and what it needs, so the user sees the whole shape before the first interview.

## Phase 3 — The loop

One issue at a time, top of the queue. The user can stop at any point — progress is durable (state lives in the edited bodies and posted answers; a rerun rescans and resumes; there is no state file).

### 3a. Route by what it needs

**`decision` — resolve here, now.** Present the issue (name, URL, unresolved question), then interview:

- Plan test failed (missing facts, unknown files or scope) → ask targeted clarifying questions, one at a time in plain chat, never the `AskUserQuestion` tool. Read the codebase for anything the repo can answer; only ask for what it can't.
- Objectivity test failed, or both (a design or product call the user owns) → invoke `grill-me` via the Skill tool. If a decision crystallises into an ADR, grill-me's existing offer covers it — take it.

Cheap and conversational, so **many per session**. No per-session cap.

**`fact` or `artifact` — dispatch a subagent.** These are session-sized and would eat the interview loop alive. Offer once, in plain chat:

```
<issue name> needs a prototype before you can react to it.
Say "go" and I'll write the handoff, spawn a subagent to build it, and
tell you when it's back. Or say "mine" and I'll hand you the handoff to run yourself.
```

On **go**, follow [Dispatching a subagent](#dispatching-a-subagent). On **mine**, write the handoff and give the user its absolute path plus the exact invocation, then park the issue. Either way **do not block** — park it and continue the queue with the next `decision`.

**`manual` — hand over a checklist and park.** Precise, ordered steps; what proves it worked; what not to do. The issue stays open and blocked until the user reports back. Only file this once the impossibility is demonstrated — quote the error or name the missing capability, never assume.

### 3b. Record the resolution

- **Work item** → rewrite the body so the gate passes on its face: decisions baked in as statements (not options), acceptance check present, `Type: HITL` flipped to `Type: AFK` if present. Show the new body, then write it: `bd update <id> --body-file <path>` (plus `--acceptance` for the check, and `--remove-label hitl --add-label afk`) on beads, `gh issue edit <n> --body` on GitHub. Both keep history — beads in Dolt, GitHub in its edit log; nothing is lost.
- **Question** → post the answer as a comment, then close: `bd comment <id> "<answer>"` + `bd close <id> -r "answered"` on beads, `gh issue comment <n>` + `gh issue close <n>` on GitHub.

Assets are linked, never pasted.

### 3c. Verify

Re-run the two tests on the resolved item. Fail → the interview missed something; surface the residual and resolve it before moving on. Never leave an issue half-ironed.

### 3d. Cascade and graduate

- **Cascade** — re-judge the remaining flagged issues with the decisions made so far in hand; one answer often settles siblings. Any now passing get their body edits drafted from the recorded decisions, shown, applied.
- **Graduate** — if there is a milestone brief, file whatever fog the answer just made statable as fresh issues (create, then wire `Blocked by` in a second pass), and clear those patches from **Not yet specified**. If the answer reveals an issue sits past the destination, rule it Out of scope rather than resolving it. If it invalidates other issues, update or delete them.

Re-order what remains by leverage and continue at 3a.

**Completion criterion:** the flagged queue is empty, no parked item is still outstanding, and **Not yet specified** is empty — every scoped issue passes the gate.

## Dispatching a subagent

The pattern for `fact` and `artifact` items. The subagent does the expensive building; the user does the reacting, here, in this session.

The **Agent tool** is the target for this, and it is also the default everywhere ([../delegate/TARGETS.md](../delegate/TARGETS.md)). Nothing here meets that ladder's bar for escalating to a separate process: the work is Claude-shaped, the user is not meant to watch it, and it is expected to finish inside this session.

1. **Write the handoff.** Invoke the `handoff` skill with the issue as the argument. It captures what the subagent can't infer from the issue body alone — decisions already made this pass, alternatives ruled out and why, the destination from the milestone brief. Note its absolute path.
2. **Spawn it.** Use the **Agent tool**, `run_in_background: true`, `model: "sonnet"` unless the work is genuinely heavy. The prompt: read the handoff at `<absolute-path>`, read issue `<url>`, run the `research` skill (for `fact`) or the `prototype` skill (for `artifact`), write the output under `<repo-root>/tmp/claude/`, and return its absolute path plus what it found. Tell it to **stop and report rather than guess** if it hits a decision the user owns.
3. **Note the claim.** Comment on the issue that a subagent is working it, with the handoff path — so a concurrent session skips it.
4. **Keep going.** Continue the queue with the next `decision` item. Never idle waiting on a subagent.
5. **Report on return.** When the notification lands, read the result and surface it to the user classified as exactly one of:
   - **question** — it hit a call the user owns. Bring the question into the interview loop as a normal `decision`.
   - **ready to react** — the artifact exists. Give its absolute path (own line, no trailing punctuation), say what to look at, and interview the user's reaction.
   - **needs more info** — it lacked something the handoff should have carried. Supply it via `SendMessage` to the same agent rather than respawning. **If the send fails with "No transcript found"** (completed background agents are often not resumable), fall back to the durable path: append the new information to the handoff file as a new round section and spawn a fresh agent pointed at it — the handoff, not the agent's memory, is the source of truth.
   - **findings** — it answered the question. Post the answer, close the issue, cascade.

**Never stand in for the user's side of an `artifact` item.** A subagent that builds a prototype *and* decides whether it feels right has broken the whole point — the same guard `grill-me` carries.

## Phase 4 — Report and hand off

Report: issues ironed out (with what was decided), questions answered and closed, issues auto-settled by cascade, fog graduated, items still parked, ADRs written. Then offer next steps in plain chat — never via the `AskUserQuestion` tool. The exit is a **fork**, picked by what is actually in the pile:

```
Scope is clear. Reply with a number, or tell me something else.

1. Write the spec — invoke to-spec on the decisions made. (Answered questions, nothing implementable yet.)
2. Fan it out — invoke orchestrate on this scope. (Work items, all AFK-ready.)
3. March it sequentially — invoke iterate on this scope.
4. Stop here.
```

Option 1 loops back: `to-spec` → `to-tickets` files work issues onto the same milestone → `iron-out` again. Name the next step and stop — never auto-chain into it.

## Rules

- **Never invent an answer.** Every resolution comes from the interview or a dispatched agent's cited findings. If the user declines to decide, the issue stays flagged and is reported as such.
- **Don't implement, don't commit code.** Body edits, posted answers, closing answered questions, and grill-me's ADRs are the only writes. Never close a work item.
- **Interview one issue at a time** — never batch questions across issues into one message.
- **Every issue named to the user carries its full clickable URL.** `#121` on its own is not enough.
