---
name: iterate
description: "Continuous walk-away harness: repeatedly cut a fresh feature branch off the default line, run one /implement continuous pass, and land it (merge on a repo you own, PR on a collaborative one) — up to 20 iterations or until the run ends. Two modes: SCOPED — give it a work group (issue numbers, a #range, label:X, milestone:X, followups, or papercuts) and it freezes that exact queue and marches it in order, skipping any item it can't work and continuing; BACKLOG-WIDE — bare `iterate` picks the next item from the whole backlog via triage each pass. Use for unattended end-to-end work across many tracked items in one sitting. Triggers: \"iterate\", \"/iterate\", \"iterate #133-140\", \"iterate label:react-native\", \"keep iterating\", \"walk away and keep working\", \"auto-pilot the backlog\". For a single item, use /implement."
---

# /iterate — Continuous autonomous iteration harness

The outer harness around `/implement`. You start it once and walk away; it works item after item, each on its own branch, landing each before starting the next — until the work group empties, the run hits a stopping condition, or the iteration cap is hit.

**What loops is this harness, not `implement`.** Two nested loops: the *inner* loop is a single `/implement` pass working one item end-to-end; the *outer* loop is the branch choreography below — cut a branch, run a pass, land it, repeat. `/iterate` drives the **outer** loop. It never tells `implement` to loop; `implement` stays a strict single pass. This separation is the whole reason the two skills are distinct.

---

## Two modes — scoped vs backlog-wide

Resolve the mode from the arguments **once, before anything else**:

- **SCOPED** — the arguments carry a work-group selector (any of the forms in "Resolving the work group" below). iterate resolves that selector to an **ordered, frozen queue of concrete items** up front, then marches the queue in order. This is the mode for "work exactly these": `iterate #133-140`, `iterate label:react-native`, `iterate followups`.
- **BACKLOG-WIDE** — a bare `iterate` with no selector. There is no frozen queue; each iteration runs `/implement continuous` and lets **triage** pick the next item from the whole backlog. This is the original behavior.

The two modes differ only in **how each iteration's item is chosen** and **what ends the run** (a scoped run ends when its queue empties; a backlog-wide run ends on the first halt). Everything else — ownership, pre-flight, branch choreography, landing, the cap — is shared.

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

If a selector is present, resolve it to an **ordered list of concrete items** *before* the loop, then freeze it. Print the resolved queue for the user so they see exactly what will be worked and in what order. Each item is one of two kinds:

- **Issue item** — carries a GitHub issue number. Fed to a pass as `/implement <n> continuous`.
- **Local item** — a followup or papercut with no issue number. Fed to a pass as `/implement continuous item:"<one-line description>" source:"<where it came from>"` (see implement Phase 0).

Selector forms (all match against **open** work only; dedupe by issue number / by text):

| Selector | Resolution |
|---|---|
| `133 134 135` (bare numbers) | Exactly those issues, in the order given. |
| `#133-140` or `133-140` (range) | Every integer in the inclusive range that is an **open** issue; skip numbers that are closed/missing and note them. |
| `label:<name>` (quote if it has spaces) | `gh issue list --label "<name>" --state open --json number,title` → ordered ascending by number. |
| `milestone:<name>` | `gh issue list --milestone "<name>" --state open --json number,title` → ordered ascending by number. |
| `followups` | Read `<repo-root>/tmp/claude/followups.md`; each unresolved entry is one **local item**. `<repo-root>` = absolute `git rev-parse --show-toplevel`. |
| `papercuts` | Read `<repo-root>/tmp/claude/papercuts.md`; each entry is one **local item**. |

Multiple selectors may be combined (e.g. `iterate 133 label:RN`); union them, dedupe, preserve first-seen order.

**Freeze the queue.** The list is fixed at resolution time. Newly-added matching issues that appear mid-run are **not** picked up — a scoped run is deterministic and finite by design. If the user wants a moving target, that's a second `iterate` run.

**Verify before freezing.** For issue items, confirm each is open (`gh issue view <n> --json number,state`); drop and note any that are closed/missing. If the resolved queue is empty, halt: *"No open items matched <selector> — nothing to iterate."*

---

## The loop

Drive the **whole per-iteration block below** via the `loop` skill as the unit to repeat — it handles cadence and re-invocation, keeping the run going across iterations instead of halting after the first. The **maximum is 20 iterations** regardless of mode; even if a queue is longer or a backlog keeps refilling, 20 is the safety valve that forces a human review point.

Each iteration:

1. **Refresh.** Ensure you're on the default branch with a clean tree, and fast-forward it: `git -C <repo> checkout <default>`, `git -C <repo> pull --ff-only origin <default>` (skip the pull if no remote). Every iteration branches from the *current* head of the default line, so a branch landed last iteration is already included. **If the tree is not clean here or the pull no longer fast-forwards, that is an environment stop (see Stopping conditions) — do not proceed.**
2. **Pick this iteration's item.**
   - **SCOPED:** pop the next item off the frozen queue. If the queue is empty, the run is **done** (not a halt) — go to "When the run ends".
   - **BACKLOG-WIDE:** no item to pick here; triage inside the pass chooses it.
3. **Cut a fresh feature branch** off the default head, e.g. `git -C <repo> checkout -b auto-iterate/<UTC-timestamp>`. The name is generic; the human-readable identity comes from the commit/PR summary.
4. **Run one pass.** Invoke `/implement continuous`, appending the item token for scoped mode and `delegate` if the run is delegated:
   - Issue item → `/implement <n> continuous [delegate]`
   - Local item → `/implement continuous item:"<text>" source:"<loc>" [delegate]`
   - Backlog-wide → `/implement continuous [delegate]` (triage resolves the item)

   Exactly one item, worked end-to-end. `implement` implements, then invokes `wrap-up`.
5. **Land it — handled inside the pass.** `wrap-up` lands the branch per the ownership verdict: **merge** into the default branch and delete the feature branch on a repo you own; **open a PR** on a collaborative repo. After a merge the pass leaves you back on a clean default branch — exactly what step 1 of the next iteration expects. Confirm the branch actually landed before continuing.
6. **Record the outcome and decide whether to continue** — see below.
7. **Repeat.**

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

The run ends and hands back to the user when any of these fire:

- **SCOPED:** the frozen queue is empty (normal completion), OR an environment stop fires.
- **BACKLOG-WIDE:** any pass halts (first halt wins), OR an environment stop fires.
- **Either:** 20 iterations reached — stop and force a human review even if items remain.

---

## When the run ends

Print a compact report:

- **Landed** — each item that merged / opened a PR, with its issue number or one-line description.
- **Skipped** (scoped) — each item skipped, with the reason (gate fail / no diff / unfixable tests / …). These are the items still needing attention.
- **Remaining** (scoped) — any queue items never reached because the cap or an environment stop ended the run early.
- **Why it stopped** — queue empty / cap hit / environment stop (+ what to reconcile).

For merges, the user can review with `git log --oneline origin/<default>..<default>`; for PRs, the list of opened PRs. They decide whether to start another loop (e.g. re-run over just the skipped items).

---

## Notes

- This skill never invokes itself and never invokes `implement` in a loop directly — it hands the **harness** to `loop`.
- The merge/PR mechanics are `wrap-up`'s single source of truth; this skill only supplies the ownership verdict and confirms each landing.
- Each iteration is fully independent: one branch, one item, one landing. Nothing accumulates on a single branch.
- The frozen queue is resolved once, up front. A scoped run is deterministic — the same selector against the same backlog produces the same march.
