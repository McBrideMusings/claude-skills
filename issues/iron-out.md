# Iron out

Resolve the items waiting on a person that hold other work back, one at a time, so what they
block can be worked without one. A question gets its answer recorded and closes; a work item gets its body
rewritten until an agent can run it. The goal state is **AFK**: every queued item passes
`implement`'s readiness gate ([`../implement/HANDOFF.md`](../implement/HANDOFF.md) §1) — a
concrete plan is statable, and "done" is verifiable without a judgment call the user owns.

**Worth doing on its own.** An item that cannot state its own plan or its own definition of
done is a bad item whether or not an agent ever touches it — you re-derive the missing decision
every time you read it. These are the items `implement`'s readiness gate turns away; this verb does
not need `implement` to run. Its exit is [`../relay/SKILL.md`](../relay/SKILL.md) §Ending (Phase 4), which
runs `next-work` on the run's focus and prints the one `Next:` line; no phase before it offers
work to `implement`.

**Structure is [`shape.md`](shape.md)'s job.** This verb never builds epics, wires inferred
edges or relabels a backlog wholesale. It reads the graph as it stands. A backlog with no types
and no edges still irons out; the queue is just ordered by priority instead of leverage.

## Two kinds of item, one loop

Every item is an ordinary issue in the ordinary backlog. There is no parallel planning surface.

- **Work item** — describes something to build. Resolving it **rewrites its body** so the gate passes; the issue stays open and gets implemented later.
- **Question** — its whole content is a decision nobody has made. Resolving it **posts the answer and closes it**, and often files new issues. Carries beads' native `human` label (`bd human list` / `respond` / `dismiss` / `stats`) and `issue_type: decision`, so `issues next` and `implement` skip it — nothing is built *from* a question.

**A question is a roadmap node.** `bd types` ships `decision` as a first-class type, so a decision sits in the dependency graph next to the work it gates. On a fresh backlog the next three things are frequently calls the user owes, not code.

The loop is identical for both. Only the write step differs. An issue that fails the gate because it *hides* an unmade decision usually wants splitting: the decision becomes a question, the buildable remainder stays a work item blocked by it.

## Plan, don't do

**Load [`show-shape`](../show-shape/SKILL.md) via the Skill tool before writing the resolved plan
onto an issue.** An ironed-out issue states a concrete plan by definition — that is the gate it has
to pass — so every issue body this verb writes is a plan, and prose is not the format for one.

This verb writes issue bodies and answers. It never writes code. The pull to just go build the thing is the signal that the scope is already clear — that's the exit, not a step. Assets produced along the way (a research doc, a prototype) are **linked** from the issue, never pasted in.

## Scope

**Bare `issues iron-out`** scans every open item in the current repo and queues three kinds:

```bash
bd human list                                   # labelled human
bd list --status open,in_progress,blocked --type decision --limit 0 --json   # typed decision
bd list --status open,in_progress,blocked --limit 0 --json                   # everything else, judged by Phase 1's gate
```

A scope argument resolves through [`../implement/SELECTORS.md`](../implement/SELECTORS.md), the one table for `#133-140`, `label:X`, `milestone:X`, `epic:X`, free text, `followups` and `papercuts` (union multiple selectors); iron-out then keeps the human, decision and Phase 1-failing items of the resolved set, blocked ones included, so `issues iron-out label:client` scans only that label's. Papercuts are local items judged like issues; a papercut's "body" is the entry line, and resolving one rewrites that line in `.claude/papercuts.md`.

**The queue is the leverage calls, not every flagged item.** Phase 1 scans and flags the whole
scope, but Phase 2 queues only the failing items that block at least one other open item. A
failing leaf blocks nothing, so Phase 1's `human` flag already keeps it out of `issues next`, and
it waits for a later pass. Two arguments widen the queue:
- **`all`** (`issues iron-out all`, or `all` beside a selector) queues every failing item, leaves
  included.
- **An explicit id list** queues exactly those ids, whatever they block.

**Dependencies are real edges, never prose.** On beads: read with `bd dep tree`, `bd blocked` and `bd ready --limit 0`. On GitHub: the native `blockedBy` / `blocking` fields, reachable through GraphQL. A `Blocked by #<n>` line in a body is an edge nobody wired; report it and leave the wiring to `issues shape`.

**`bd ready` trusts a denormalized `is_blocked` flag that can go stale** after a pull whose scoped recompute was skipped, or a merge conflict resolved by hand. Run `bd recompute-blocked` before any read that orders work.

## Phase 1 — Scan

Resolve the issue backend through [`_detect.md`](./_detect.md), then fetch every in-scope issue plus its dependencies. Hand the bodies to a **Sonnet** sub-agent so they stay out of parent context.

**Sonnet, not Haiku — the isolation is the point, not the model.** A cheaper model can return template placeholder text in every `question` field while producing perfectly valid JSON: right array length, every field present, content empty. Nothing downstream catches that — Phase 2 prints those strings straight to the user as the queue, and the whole pass has to be redone.

**When the Agent tool is unavailable, degrade — do not skip the isolation.** A session carrying a harness-injected "do not call the Agent tool unless the user requested it" instruction cannot spawn the reader, and that instruction wins. Write a paging script under the scratchpad that prints one truncated line per issue (ID, title, labels, first ~700 characters), read it in chunks, and judge from that. Say in the report that the read ran inline. **Never page full bodies into the main context** — a 111-issue backlog read whole costs upward of 100k tokens per turn for the rest of the pass.

- **`beads`:** `bd list --status open,in_progress,blocked --limit 0 --json` (filtered per selector) and `bd dep tree <id>` for the edges.
- **`github`:** `gh issue list … --json number,title,url,labels,body` plus `gh issue view <n> --json blockedBy`.

Sub-agent brief:

> For each issue, run implement's AFK readiness gate:
>
> 1. **Plan test** — could an agent state a concrete plan right now: the files to touch, the changes to make, an objective acceptance check?
> 2. **Objectivity test** — is "done" verifiable without a qualitative, product, or design call the user owns? Does the body hide an unmade decision, missing information, or an ambiguity an agent would have to invent an answer to?
>
> Markers are fast-path flags feeding the same judgment, not a separate rule: the `human` label, a legacy `hitl` label or `Type: HITL` line, "TBD", "decide whether", "either … or", a `needs human input:` followup naming the issue. A marked issue still gets judged; an unmarked one can still fail.
>
> Then say what resolving it would take: `decision` (a call the user owns), `fact` (something knowable by reading docs, APIs, or code), `artifact` (needs something concrete to react to), `manual` (needs the user to go do a thing offline).
>
> 3. **Staleness check** — the two tests above ask whether an issue is *decidable*. They never ask whether what it says about the codebase is still *true*. So also resolve every concrete thing the body cites: file paths, symbols, and commit hashes. `grep` the symbol, stat the path, `git cat-file -e` the hash. Anything that no longer resolves goes in `stale_claims` — a finding, not a gate failure.
>
> Read the code before trusting an asserted limitation. "There is no way to X" in a body is a claim with an expiry date, not a fact.
>
> Return JSON only: per issue `{"number": N, "verdict": "afk"|"needs-human", "failed_test": "plan"|"objectivity"|"both", "needs": "decision"|"fact"|"artifact"|"manual", "question": "<the specific unresolved thing, one line>", "stale_claims": ["<citation that no longer resolves, and what is there now>"], "has_human_label": true|false}`.

**Completion criterion:** every scoped issue has a verdict, every `needs-human` verdict names its specific unresolved question — "vague" is not a finding — and every issue has a `stale_claims` array, empty only after actually checking.

**Reject a placeholder before you use it.** A `question` that echoes this brief's own wording, restates the test name, or is under about fifteen words is a non-answer that will read as a finished scan. Re-run rather than printing it.

**Flag what needs a person and carries no flag.** Every `needs-human` verdict with `has_human_label: false` gets `bd label add <id> human` before the queue prints; a `hitl` label on it is removed in the same write. Report the count in one line (`Flagged 7 unlabelled items human.`). An unflagged item is invisible to `bd human list`, to `issues next`'s exclusion and to every later iron-out — that is how it went unanswered.

**Stale claims are reported alongside the verdict, and they change what the pass does.** An issue can pass both gates cleanly and still be false — those are the expensive ones, because nothing downstream doubts them. Fix the body as part of the pass.

If nothing fails, report that the scope is already AFK-workable and go to Phase 4.

## Phase 2 — Order the queue

Order the **failing** issues by unblock leverage: how many open items each transitively blocks through `blocks` edges. Highest first — a decision gating three issues outranks a leaf. Children reached only through a `parent-child` edge do not count. An epic or umbrella task is not leverage just for having children. Drop every item whose leverage is zero unless the run is `all` or an id list ([Scope](#scope)), and print the count dropped: `61 leaves stay flagged human for a later pass.`

**Read the leverage off the graph; never recompute it.** `bd dep tree <id>` gives the transitive closure, `bd blocked` the blocked set, `bd ready --limit 0` the unblocked one. A second traversal written here would be free to disagree with the one beads runs. Run `bd recompute-blocked` first.

Tiebreak on the native `priority` field (`0-4`), then ascending ID. Print the queue with each issue's name, URL, one-line question, and what it needs, so the user sees the whole shape before the first interview. When many queued items wait on one root, print the root once with the count it gates, not every member.

## Phase 3 — The loop

One issue at a time, top of the queue. The user can stop at any point — progress is durable (state lives in the edited bodies and posted answers; a rerun rescans and resumes; there is no state file).

### 3a. Route by what it needs

**`decision` — resolve here, now.** Present the issue (name, URL, unresolved question), then interview:

- Plan test failed (missing facts, unknown files or scope) → ask targeted clarifying questions, one at a time in plain chat, never the `AskUserQuestion` tool. Read the codebase for anything the repo can answer; only ask for what it can't.
- Objectivity test failed, or both (a design or product call the user owns) → invoke `grill-me` via the Skill tool. If a decision crystallises into an ADR, grill-me's existing offer covers it — take it. In a domain with a design axis (`game` via [`../ref/game/design.md`](../ref/game/design.md), `gui` via [`../ref/gui/design.md`](../ref/gui/design.md)), the interview consults its lenses.

**Any question offering more than one path carries a recommendation and a stated reason, per CLAUDE.md's Deciding & designing rule** — a bare menu of options is a non-answer whether it's this interview or `grill-me`'s. A single-fact question ("which file holds X?") doesn't need one; a question with two or more live paths does.

Cheap and conversational, so **many per session**. No per-session cap.

**`fact` or `artifact` — dispatch a subagent.** These are session-sized and would eat the interview loop alive. Offer once, in plain chat:

```
<issue name> needs a prototype before you can react to it.
Say "go" and I'll write the brief, dispatch a subagent to build it, and
tell you when it's back. Or say "mine" and I'll give you the brief to run yourself.
```

On **go**, follow [Dispatching a subagent](#dispatching-a-subagent). On **mine**, write the brief and give the user its absolute path plus the exact invocation, then hold the issue. Either way **do not block** — hold it and continue the queue with the next `decision`.

**`manual` — hand over a checklist and hold.** Precise, ordered steps; what proves it worked; what not to do. The issue stays open and blocked until the user reports back. Only file this once the impossibility is demonstrated — quote the error or name the missing capability, never assume.

### 3b. Record the resolution

- **Work item** → rewrite the body so the gate passes on its face: decisions baked in as statements (not options), acceptance check present, any legacy `Type: HITL` marker deleted from the body. Show the new body, then write it: `bd update <id> --body-file <path> --acceptance "<check>"` plus `bd label remove <id> human` on beads, `gh issue edit <n> --body --remove-label human` on GitHub. Removing `human` is what makes it AFK — there is no positive AFK label to add. Both keep history — beads in Dolt, GitHub in its edit log; nothing is lost.

  Run `bd recompute-blocked` after the write; whether the item is the next pass is `next-work`'s verdict at Phase 4, never a row offered here.
- **Question** → `bd human respond <id> -r "<answer>"`, which posts the comment and closes in one call; `bd human dismiss <id>` when the answer is that the question no longer applies. On GitHub: `gh issue comment <n>` + `gh issue close <n>`. **Before any close call, verify the issue is typed `decision`.** If it is not, refuse the close with a one-line error — it is a work item, and work items never close here, whatever labels it carries (Phase 1 flags work items `human` too).
- **New work the resolution implies** → file it now, before Phase 3c. Several beads go through [`spec.md`](spec.md) (`issues spec`); one goes through [`file.md`](file.md) (`issues file`). Both take the destination from this run, so the filing procedure stays theirs and iron-out never runs `bd create` itself:
  - **Focus is an `epic:` selector** → pass the epic id. `issues spec` reuses it as the run epic ([`spec.md`](spec.md) § Caller-supplied destination) and parents every slice under it; `issues file` passes `--parent <epic-id>`.
  - **Focus is a `label:` selector** → pass the labels. Both create each bead with those labels, which must already be in `.beads/labels.toml`.
  - **No focus epic or label** (bare `issues iron-out`, an id list, free text) → pass the id of the item being resolved. Each new bead is created with `--deps discovered-from:<that-id>` and joins no focus: the next `next-work` hop does not count it, and Phase 4 names every such bead.
  - **Offers** → neither verb prints a next-work or implement offer when called from here. [`../relay/SKILL.md`](../relay/SKILL.md) §Ending is the only one.
  - **Bodies** → each filed body is a plan, so the `show-shape` load above covers it.

Assets are linked, never pasted.

### 3c. Verify

Re-run the two tests on the resolved item. Fail → the interview missed something; surface the residual and resolve it before moving on. Never leave an issue half-ironed.

### 3d. Cascade

- **Cascade** — re-judge the remaining flagged issues with the decisions made so far in hand; one answer often settles siblings. Any now passing get their body edits drafted from the recorded decisions, shown, applied.
- **Move the roadmap.** After each close, `bd recompute-blocked` then `bd ready --limit 0 --json` shows what it unblocked (`bd close --suggest-next` prints the same for a plain close). Emit **one line, only when a wave actually moved** — *"Closing `Which conflict policy for sync` unblocked 4 issues; wave 1 is now 7."* Silence otherwise.
- **Graduate** — if the epic carries a brief from [`shape.md`](shape.md)'s charting, file whatever fog the answer just made statable as fresh issues through [`file.md`](file.md) (create, then wire edges in a second pass), and clear those patches from **Not yet specified**. If the answer reveals an issue sits past the destination, rule it Out of scope rather than resolving it. If it invalidates other issues, update or close them as questions answered.

Re-order what remains by leverage and continue at 3a.

**Completion criterion:** the queue is empty, no held item is still outstanding, and **Not yet specified** is empty — every queued issue passes the gate. Leaves Phase 2 dropped stay flagged `human`.

## Dispatching a subagent

The pattern for `fact` and `artifact` items. The subagent does the expensive building; the user does the reacting, here, in this session. This is `dispatch agent` — the default target everywhere ([`../dispatch/TARGETS.md`](../dispatch/TARGETS.md) owns the ladder). Nothing here meets that ladder's bar for escalating to `workspace`, `window`, or a vendor: the work is Claude-shaped, the user is not meant to watch it, and it is expected to finish inside this session.

1. **Write the brief.** A short file under `/private/tmp/claude/<repo-slug>/` capturing what the subagent can't infer from the issue body alone — decisions already made this pass, alternatives ruled out and why, the destination from the epic brief. Note its absolute path.
2. **Dispatch it.** Use the **Agent tool**, `run_in_background: true`, `model: "sonnet"` unless the work is genuinely heavy. The prompt: read the brief at `<absolute-path>`, read issue `<url>`, run the `research` skill (for `fact`) or the `spike` skill (for `artifact`), write the output under `/private/tmp/claude/<repo-slug>/`, and return its absolute path plus what it found. Tell it to **stop and report rather than guess** if it hits a decision the user owns.
3. **Note the claim.** Comment on the issue that a subagent is working it, with the brief's path — so a concurrent session skips it.
4. **Keep going.** Continue the queue with the next `decision` item. Never idle waiting on a subagent.
5. **Report on return.** When the notification lands, read the result and surface it to the user classified as exactly one of:
   - **question** — it hit a call the user owns. Bring the question into the interview loop as a normal `decision`.
   - **ready to react** — the artifact exists. Give its absolute path (own line, no trailing punctuation), say what to look at, and interview the user's reaction.
   - **needs more info** — it lacked something the brief should have carried. Supply it via `SendMessage` to the same agent rather than respawning. **If the send fails with "No transcript found"** (completed background agents are often not resumable), append the new information to the brief file as a new round section and dispatch a fresh agent pointed at it — the brief file, not the agent's memory, is the source of truth.
   - **findings** — it answered the question. Post the answer, close the issue, cascade.

**Never stand in for the user's side of an `artifact` item.** A subagent that builds a prototype *and* decides whether it feels right has broken the whole point — the same guard `grill-me` carries.

## Phase 4 — Report and end

Report: issues ironed out (with what was decided), questions answered and closed, issues auto-settled by cascade, items flagged `human` by the scan, fog graduated, leaves left flagged for a later pass (the count), new beads filed by Phase 3b (name each one that joined no focus, with the item it was discovered from), items still held, ADRs written.

Then end through [`../relay/SKILL.md`](../relay/SKILL.md) §Ending, which runs `next-work` on the run's focus, prints its verdict and the `Next:` line, and closes with the hatch. Phase 3b has already filed the work a decision implies, so the verdict sees it.

## Rules

- **Never invent an answer.** Every resolution comes from the interview or a dispatched agent's cited findings. If the user declines to decide, the issue stays flagged and is reported as such.
- **Don't implement, don't commit code.** Body edits, posted answers, closing answered questions, the `human` flag on unlabelled items, beads filed by Phase 3b, and grill-me's ADRs are the only writes this verb makes. Ending through relay §Ending is this verb's exit, not implementing.
- **Never close a work item.** Only a question — an issue typed `decision` — closes here; the `human` label alone does not make an item a question.
- **Interview one issue at a time** — never batch questions across issues into one message.
- **Never re-implement what `bd` computes.** Ready fronts, transitive blocking, staleness — `bd ready --limit 0`, `bd blocked`, `bd dep tree`, `bd stale`.
