---
name: iterate-loop
description: "Continuous walk-away harness: from a clean, up-to-date default branch, repeatedly cut a fresh feature branch, run one /iterate continuous pass on it, and land it (merge on a repo you own, PR on a collaborative one) — up to 20 iterations or until a pass halts. Use for unattended end-to-end work across many tracked items in one sitting. Triggers: \"iterate loop\", \"/iterate-loop\", \"keep iterating\", \"walk away and keep working\", \"auto-pilot the backlog\". For a single item, use /iterate."
---

# /iterate-loop — Continuous autonomous iteration harness

The outer harness around `/iterate`. You start it once on the default branch and walk away; it works item after item, each on its own branch, landing each before starting the next — until the backlog empties, a pass halts, or the iteration cap is hit.

**What loops is this harness, not `iterate`.** There are two nested loops in play: the *inner* loop is a single `/iterate` pass working one item end-to-end; the *outer* loop is the branch choreography below — cut a branch, run a pass, land it, repeat. `/iterate-loop` drives the **outer** loop. It never tells `iterate` to loop; `iterate` stays a strict single pass. This separation is the whole reason the two skills are distinct.

---

## When to Use

- Walk-away continuous work across **many** items: "iterate loop", "keep iterating", "auto-pilot the backlog"
- Multiple tracked items are ready and the user wants them worked back-to-back, each landed independently
- The user is fine with the run stopping on the first halt (no second-guessing)

## When NOT to Use

- One specific item — use `/iterate`
- Exploratory work with no tracked items — file follow-ups first
- The user wants to confirm each item before the next — use `/iterate` repeatedly instead

---

## Ownership — decided once, drives how each branch lands

Determine repository ownership up front; it decides whether each iteration ends in a **merge** or a **PR**.

- **No remote (local-only repo)** → **mine**.
- **Remote is a GitHub URL containing my username** (`git remote get-url origin`, parse the `owner` segment, compare to my GitHub login) → **mine**.
- **Otherwise** (GitHub remote whose owner isn't me) → **collaborative**.

Mine → each finished branch is **merged** into the default branch. Collaborative → each finished branch becomes a **PR**. The actual git choreography for both lives in `wrap-up` (invoked inside each `/iterate` pass) — this skill does not reimplement it; it only needs the ownership verdict so the run's intent is clear and so it can confirm each branch landed before cutting the next.

> ⚠️ Collaborative runs open PRs unattended. Invoking `/iterate-loop` is the authorization for that, the same way invoking `/wrap-up` authorizes commit/push/merge. If you don't want PRs opened without a per-PR yes, don't start a loop on a collaborative repo — run standalone `/iterate` instead.

---

## ⛔ BASH COMMAND RULES

Same hard bans as `iterate` — this harness runs unattended and a single permission prompt kills the run. In particular: never use `@{u}`/`@{upstream}`/`{…}` refspecs (use `origin/main` or `origin/$(git branch --show-current)`), never chain non-allowlisted sub-commands with `&&`/`;`, never `cd … && git` (use `git -C <abs-path> …`). See `iterate`'s BASH COMMAND RULES for the full list — they apply here verbatim.

---

## Pre-flight guards (run once, before the loop)

All must pass or the harness refuses to start. Print the reason and stop.

1. **On the default branch.** Resolve the default branch (`git symbolic-ref refs/remotes/origin/HEAD` → strip to the short name; fall back to `main`, then `master`, then `develop`). If the current branch is not it, halt: *"iterate-loop must start from the default branch (<name>); you're on <current>. Check it out, or run /iterate on this branch instead."* A continuous run must always branch from the head of the canonical line — never from a half-finished feature branch. This guard is the fix for the "kept looping on whatever branch it was on" failure.
2. **Clean working tree.** `git status --short` must be empty. If not, halt: *"Uncommitted changes present — commit, stash, or /wrap-up first."*
3. **Up to date with the remote.** If a remote exists, fast-forward the default branch before starting: `git pull --ff-only origin <default>`. If the fast-forward fails (local has diverged), halt and tell the user to reconcile — never force. No remote → skip this guard.

---

## The loop — drive this harness via `loop`, capped at 20

Hand the **whole per-iteration block below** to the `loop` skill as the unit to repeat. Loop the harness, not `/iterate`. The `loop` skill's job here is cadence and re-invocation — keeping the run going across iterations instead of halting after the first (a bare sequential invocation is far more likely to stop early). The **maximum is 20 iterations**; the run is meant to be almost entirely autonomous, and 20 is the safety valve that forces a human review point even if the backlog keeps refilling.

Each iteration:

1. **Refresh.** Ensure you're on the default branch with a clean tree, and fast-forward it: `git -C <repo> checkout <default>`, `git -C <repo> pull --ff-only origin <default>` (skip the pull if no remote). Every iteration branches from the *current* head of the default line, so a branch landed last iteration is already included.
2. **Cut a fresh feature branch.** Create and check out a new branch off the default head, e.g. `git -C <repo> checkout -b auto-iterate/<UTC-timestamp>`. The name is generic because the work item isn't chosen until the pass runs its triage; the human-readable identity comes from the commit/PR summary, not the branch name.
3. **Run one pass.** Invoke `/iterate continuous` (append `delegate` too if this run is delegated — the token flows straight through). Exactly one item, worked end-to-end. `iterate` resolves the item via triage (non-interactive, because `continuous`), implements, and invokes `wrap-up`.
4. **Land it — handled inside the pass.** `wrap-up` (called by `iterate`) lands the branch per the ownership verdict: **merge** into the default branch and delete the feature branch on a repo you own; **open a PR** on a collaborative repo. After a merge the pass leaves you back on a clean default branch — which is exactly the state step 1 of the next iteration expects. Confirm the branch actually landed (merged-and-deleted, or PR-opened) before continuing; if it didn't, that's a halt.
5. **Repeat** until a halt condition fires.

---

## Halt conditions

The run ends — and hands back to the user for review — as soon as any of these fire:

- **A pass halts.** Any `iterate` halt (empty queue / "nothing to iterate on", implementation produced no diff, tests unfixable in 1–2 attempts, unresolved 75+ review issue, delegate failed after 3 rounds, dirty tree) ends the whole run. First halt wins; no second-guessing.
- **A branch failed to land** (merge conflict surfaced by wrap-up, or PR creation failed).
- **20 iterations reached.** Stop and force a human review even if items remain.
- A pre-flight guard would fail on the next refresh (e.g. the pull no longer fast-forwards).

When the run ends, the user reviews what landed — `git log --oneline origin/<default>..<default>` for merges, or the list of opened PRs — and decides whether to start another loop.

---

## Notes

- This skill never invokes itself and never invokes `iterate` in a loop directly — it hands the **harness** to `loop`.
- The merge/PR mechanics are `wrap-up`'s single source of truth; this skill only supplies the ownership verdict and confirms each landing.
- Each iteration is fully independent: one branch, one item, one landing. Nothing accumulates on a single branch.
