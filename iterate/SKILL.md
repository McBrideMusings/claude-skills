---
name: iterate
description: "Continuous walk-away harness: repeatedly cut a fresh branch, run one /implement pass, and land it — up to 20 iterations, chunked to keep context flat. SCOPED mode freezes a given work group (issue numbers, #range, label:X, milestone:X, followups, papercuts) and marches it in order; bare `iterate` picks each next item from the whole backlog via triage. Every pass runs as a staged `/implement` workflow. Use for unattended work across many tracked items; a single item is /implement, many items in parallel is /orchestrate."
---

# /iterate — Continuous autonomous iteration harness

The outer harness around `/implement`. You start it once and walk away; it works item after item, each on its own branch, landing each before starting the next — until the work group empties, the run hits a stopping condition, or the iteration cap is hit.

It works in **chunks of 5 items**, relaying into a fresh context between them, so a long run does not accumulate context in one window. You start it once; the relay chain is what keeps it going without you.

**What loops is this harness, not `implement`.** Two nested loops: the *inner* loop is a single `/implement` pass working one item end-to-end; the *outer* loop is the branch choreography below — cut a branch, run a pass, land it, repeat. `/iterate` drives the **outer** loop. It never tells `implement` to loop; `implement` stays a strict single pass. This separation is the whole reason the two skills are distinct.

---

## Two modes — scoped vs backlog-wide

Resolve the mode from the arguments **once, before anything else**:

- **SCOPED** — the arguments carry a work-group selector (any of the forms in "Resolving the work group" below). iterate resolves that selector to an **ordered, frozen queue of concrete items** up front, then marches the queue in order. This is the mode for "work exactly these": `iterate #133-140`, `iterate label:react-native`, `iterate followups`.
- **BACKLOG-WIDE** — a bare `iterate` with no selector. There is no frozen queue; each iteration runs `/implement continuous` and lets **triage** pick the next item from the whole backlog. This is the original behavior.

The two modes differ only in **how each iteration's item is chosen** and **what ends the run** (a scoped run ends when its queue empties; a backlog-wide run ends on the first halt). Everything else — ownership, pre-flight, branch choreography, landing, the cap — is shared.

---

## Where each pass runs — always a workflow

**There is one transport.** Every pass is `workflow('implement', { … })`, driven by the script's own `for … of` loop. There is no session transport and no `workflow` token to type; invoking `/iterate` is the request that authorizes the `Workflow` tool.

→ [TRANSPORT-WORKFLOW.md](TRANSPORT-WORKFLOW.md)

**Why the session transport is gone.** Running pass after pass in one session context is exactly the shape that made this expensive: implement passes running as a single growing context dominate token spend, and under the session transport every pass in a run piled into the *same* window, on top of each other. The workflow transport gives each pass its own context and each phase within it a fresh one. Keeping both meant keeping the expensive one as the default.

What you lose: watching a pass execute live in this pane. `/workflows` shows per-agent progress, tokens, and a stop control instead, and a run is stoppable and resumable by its `runId`.

**A pass is `/implement continuous`** — same gate, same phases, same verify, same wrap-up. `iterate` decides *which* item and *when to stop*; it never changes what a pass does.
---

## When to Use

- Walk-away continuous work across **many** items: "iterate", "keep iterating", "auto-pilot the backlog"
- A specific enumerated group of work you want marched in order and each landed independently: "iterate these RN issues", "iterate #133-140", "iterate label:X"
- The user is fine leaving the run unattended and reviewing what landed at the end

## When NOT to Use

- One specific item — use `/implement`
- Exploratory work with no tracked items — file follow-ups first
- The user wants to confirm each item before the next — use `/implement` repeatedly instead

---

## Ownership — decided once, drives how each branch lands

Determine repository ownership up front; it decides whether each iteration ends in a **merge** or a **PR**.

- **No remote (local-only repo)** → **mine**.
- **Remote is a GitHub URL containing my username** (`git remote get-url origin`, parse the `owner` segment, compare to my GitHub login) → **mine**.
- **Otherwise** (GitHub remote whose owner isn't me) → **collaborative**.

Mine → each finished branch is **merged** into the default branch. Collaborative → each finished branch becomes a **PR**. The actual git choreography for both lives in `wrap-up` (invoked inside each `/implement` pass) — this skill does not reimplement it; it only needs the ownership verdict so the run's intent is clear and so it can confirm each branch landed before cutting the next.

> ⚠️ Collaborative runs open PRs unattended. Invoking `/iterate` is the authorization for that, the same way invoking `/wrap-up` authorizes commit/push/merge. If you don't want PRs opened without a per-PR yes, don't start a loop on a collaborative repo — run standalone `/implement` instead.

---

## ⛔ BASH COMMAND RULES

Same hard bans as `implement` — this harness runs unattended and a single permission prompt kills the run. In particular: never use `@{u}`/`@{upstream}`/`{…}` refspecs (use `origin/main` or `origin/$(git branch --show-current)`), never chain non-allowlisted sub-commands with `&&`/`;`, never `cd … && git` (use `git -C <abs-path> …`). See `implement`'s BASH COMMAND RULES for the full list — they apply here verbatim.

---

## Pre-flight guards (run once, before the loop)

All must pass or the harness refuses to start. Print the reason and stop.

1. **On the default branch.** Resolve the default branch (`git symbolic-ref refs/remotes/origin/HEAD` → strip to the short name; fall back to `main`, then `master`, then `develop`). If the current branch is not it, halt: *"iterate must start from the default branch (<name>); you're on <current>. Check it out, or run /implement on this branch instead."* A continuous run must always branch from the head of the canonical line — never from a half-finished feature branch.
2. **Clean working tree.** `git status --short` must be empty. If not, halt: *"Uncommitted changes present — commit, stash, or /wrap-up first."*
3. **Up to date with the remote.** If a remote exists, fast-forward the default branch before starting: `git pull --ff-only origin <default>`. If the fast-forward fails (local has diverged), halt and tell the user to reconcile — never force. No remote → skip this guard.

---

## Resolving the work group (SCOPED mode only)

If a selector is present, resolve it to an **ordered, frozen list of concrete items** *before* the loop and print the resolved queue. The selector forms, freeze/verify rules, and issue-vs-local item kinds live in [SELECTORS.md](SELECTORS.md) — load it only when the run is SCOPED.

---

## The loop

**The workflow script drives the repetition** — its own `for … of` over the queue. See [TRANSPORT-WORKFLOW.md](TRANSPORT-WORKFLOW.md) for that mechanism; the steps below are what each turn of it does.

### Two caps, and they do different jobs

- **A run is at most 20 iterations.** The safety valve that forces a human review point, regardless of mode or how long the queue is.
- **A chunk is at most 5 iterations.** One workflow call works 5 items, then this session **relays** and a fresh context works the next 5. A 20-item queue is 4 chunks, not one 20-agent workflow.

The chunk cap is what keeps context flat. Nothing enters this window *between* iterations — the loop runs inside the workflow — but a run's own scaffolding does accumulate: pre-flight git reads, the resolved queue, the triage read, the outcomes array, the report. Chunking bounds that at 5 items' worth however long the queue is, and relaying discards it before the next chunk starts.

It also resolves the workflow size guideline honestly. A cap of 20 exceeds this session's `medium` guideline of 15 agents; a chunk of 5 does not, so there is nothing to quietly ship over budget.

**Do not relay between individual passes.** Resume (`resumeFromRunId`) only works within the session that launched the run, so the relay boundary and the workflow boundary have to be the same boundary. Per-pass relaying would trade all resumability for context that is already flat.

**Iterations are strictly sequential.** Step 1 branches from the *current* head of the default line, which only exists once the previous iteration has landed. Two passes running at once would branch from the same head and race each other into the default branch. There is no version of this harness that fans out — that is `/orchestrate`, which pays for concurrency with a worktree per worker.

Each iteration:

1. **Refresh.** Ensure you're on the default branch with a clean tree, and fast-forward it: `git -C <repo> checkout <default>`, `git -C <repo> pull --ff-only origin <default>` (skip the pull if no remote). Every iteration branches from the *current* head of the default line, so a branch landed last iteration is already included. **If the tree is not clean here or the pull no longer fast-forwards, that is an environment stop (see Stopping conditions) — do not proceed.**
2. **Pick this iteration's item.**
   - **SCOPED:** pop the next item off the frozen queue. If the queue is empty, the run is **done** (not a halt) — go to "When the run ends".
   - **BACKLOG-WIDE:** no item to pick here; triage inside the pass chooses it.
3. **Cut a fresh feature branch** off the default head, e.g. `git -C <repo> checkout -b auto-iterate/<UTC-timestamp>`. The name is generic; the human-readable identity comes from the commit/PR summary.
4. **Run one pass** — `workflow('implement', { … })` with `mode: 'continuous'`, the resolved item, the branch, and the model. The equivalent `/implement continuous` invocation, with the item token for scoped mode and `delegate` when the run is delegated:
   - Issue item → `/implement <n> continuous [delegate]`
   - Local item → `/implement continuous item:"<text>" source:"<loc>" [delegate]`
   - Backlog-wide → `/implement continuous [delegate]` (triage resolves the item)

   Exactly one item, worked end-to-end. `implement` implements, then invokes `wrap-up`.
5. **Land it — handled inside the pass.** `wrap-up` lands the branch per the ownership verdict: **merge** into the default branch and delete the feature branch on a repo you own; **open a PR** on a collaborative repo. After a merge the pass leaves you back on a clean default branch — exactly what step 1 of the next iteration expects. Confirm the branch actually landed before continuing.
6. **Record the outcome and decide whether to continue** — see below.
7. **Repeat**, until the chunk's 5 items are done or a stopping condition fires. Then the workflow returns and this session takes over again — see "When a chunk ends".

---

## Per-item outcome — skip vs stop

After each pass, classify the outcome. The governing rule for a **scoped** run: *you enumerated this group and want the rest worked*, so a failure on one item does not end the run — it skips that item and moves on. But a failure that leaves the **repository unable to return to a clean default head** is unsafe to continue past and stops the whole run.

**LANDED** — the branch merged (or a PR opened). Record it and go to the next iteration.

**ITEM-LEVEL FAILURE — skip this item, keep going** (scoped mode). These are failures *of the item*, not of the environment:
- The item failed implement's AFK-ability gate (too vague / hides a human decision) — implement files a `needs human input:` followup and halts the pass.
- The pass produced no diff ("nothing to implement").
- Tests were unfixable in implement's 1–2 attempts.
- An unresolved 75+ review issue blocked wrap-up.
- The delegate failed after its retry rounds.

On an item-level failure, **clean up the abandoned branch before the next item**: the feature branch never landed, so drop it — `git -C <repo> reset --hard HEAD` (discards any uncommitted work on the *auto-iterate* branch only), `git -C <repo> checkout <default>`, `git -C <repo> branch -D <feature>`. Record the item as **skipped** with the reason, then continue.

**ENVIRONMENT STOP — end the whole run** (both modes). These leave the repo in a state where cutting the next branch would be unsafe or wrong:
- A landing left a **merge conflict** or half-merged state that isn't cleanly reset.
- The refresh in step 1 finds the tree dirty in a way the skip-cleanup above didn't produce, or the pull no longer fast-forwards (the default line diverged).
- Any state where you cannot get back to a clean default head.

Stop, leave the repo as-is, and surface exactly what's wrong for the user to reconcile. Never force-resolve a conflict or force-push to continue a run.

**Backlog-wide mode has no queue to skip within** — an item-level failure there ends the run (first halt wins), same as before. Skip-and-continue is a scoped-mode behavior; it needs the frozen queue to have a "next" to move to.

---

## Stopping conditions (summary)

A **chunk** ends after 5 iterations, or on any run-ending condition below. Five items done with the queue still full is not the end of the run — relay and keep going.

The **run** ends and hands back to the user when any of these fire:

- **SCOPED:** the frozen queue is empty (normal completion), OR an environment stop fires.
- **BACKLOG-WIDE:** any pass halts (first halt wins), OR an environment stop fires.
- **Either:** 20 iterations reached **across all chunks** — stop and force a human review even if items remain. Carry the running total across relays; a chunk that starts fresh must not reset the count to zero.

---

## When a chunk ends

The workflow returns its `outcomes` array. Fold it into the running totals, then take
exactly one of three branches.

**1. Queue still has items, no run-ending condition, under 20 total — relay to the next chunk.**

Print a one-line chunk line (`chunk 2/4: #31 landed, #33 skipped (no diff)`) — not the
full report; that is for the end of the run. Then invoke **`relay auto`** with a brief
carrying everything the next context cannot rediscover:

- The repo path, and that this is `/iterate` resuming a run already in progress.
- **The remaining queue, verbatim and in order.** A fresh context must not re-resolve
  the selector — the backlog moved while this run was landing branches, so re-resolving
  would silently produce a different queue than the one the user approved.
- **Running totals: iterations used so far, and the 20 cap.** Without this the next
  chunk restarts at zero and the safety valve never fires.
- Landed and skipped so far, one line each, so the final report is complete.
- Ownership verdict, model, and mode, so the next chunk does not re-derive them.

Then end the turn. `relay` writes the marker; the `Stop` hook clears the pane and
delivers the brief.

**2. An environment stop fired — do not relay.** Print the full report and stop. A
dirty tree or a diverged default line needs the user to reconcile; a fresh context
would hit the same wall with less information about how it got there.

**3. Queue empty, or 20 iterations used — the run is over.** Print the full report
below, then hand forward per "When the run ends".

## When the run ends

Print a compact report covering **every chunk**, not just the last one — this is why
each relay brief carries the landed/skipped lines forward:

- **Landed** — each item that merged / opened a PR, with its issue number or one-line description.
- **Skipped** (scoped) — each item skipped, with the reason (gate fail / no diff / unfixable tests / …). These are the items still needing attention.
- **Remaining** (scoped) — any queue items never reached because the cap or an environment stop ended the run early.
- **Why it stopped** — queue empty / cap hit / environment stop (+ what to reconcile).

For merges, the user can review with `git log --oneline origin/<default>..<default>`; for PRs, the list of opened PRs.

### Then relay into the next run

Rather than asking "want me to do another round?" and doing it in this window, hand the
next run forward: invoke `relay auto` after printing the report.

Relay's own stop conditions are what end the chain, and they are usually the same ones
that ended this run: an empty tracker or an all-HITL remainder means there is no next
run, so `relay` declines and the pane stays. As at a chunk boundary, an **environment
stop** skips the relay entirely.

---

## Notes

- This skill never invokes itself and never invokes `implement` in a loop directly — the workflow script drives the repetition.
- The merge/PR mechanics are `wrap-up`'s single source of truth; this skill only supplies the ownership verdict and confirms each landing.
- Each iteration is fully independent: one branch, one item, one landing. Nothing accumulates on a single branch.
- The frozen queue is resolved once, up front. A scoped run is deterministic — the same selector against the same backlog produces the same march.
