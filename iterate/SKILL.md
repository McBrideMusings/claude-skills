---
name: iterate
description: "Autonomous single-pass work on one tracked item: resolve the item (argument → branch name → triage) → implement → wrap-up (commit, push, land, file follow-ups). One pass, one item, then stop. `iterate <issue>` works that issue directly; bare `iterate` discovers one. `iterate delegate` keeps Claude as orchestrator + validator and hands the implementation to a cheaper model. Triggers: \"iterate\", \"/iterate\", \"iterate 1118\", \"do a pass\", \"walk away and work an item\", \"delegated iterate\". For continuous walk-away mode across many items, use /iterate-loop."
---

# /iterate — Single-pass autonomous iteration

One pass on one tracked item: resolve what to work on → implement → wrap-up. Then **stop**. The user is walking away, not watching — minimize prompts, halt cleanly when something needs human judgment.

**One pass = one item = at most one commit, then done.** iterate carries no looping logic of its own: it does not pull the next backlog item, it does not re-invoke itself, it does not manage cadence across passes. Continuous walk-away work across many items is `/iterate-loop`'s job — a separate harness that drives iterate. If you find yourself starting a second item in one invocation, that is the bug this skill exists to prevent.

## Flavors — solo vs delegate

- **`iterate`** (default) — Claude does everything itself: resolve → implement → wrap-up.
- **`iterate delegate`** — Claude stays the **orchestrator and validator**; the **implementation** (where most of the token cost lives) is handed to a cheaper model. The token `delegate` anywhere in the arguments turns it on; it flows through `/iterate-loop … delegate` the same way `continuous` does, and is independent of the standalone/continuous mode. Everything outside the implement step — pre-flight, item resolution, wrap-up, halt conditions, output — is identical to solo. The delegate flavor **replaces Phase 2** (see below); the delegate is the *implementer*, never a reviewer.

---

## When to Use

- The user says "iterate", "/iterate", "iterate 1118", "do a pass", or otherwise signals walk-away work on **one** item
- One specific tracked item needs to be moved end-to-end (issue or filed follow-up)
- The user wants commit / push / land / follow-up-filing handled without confirmation prompts

## When NOT to Use

- Continuous work across many items in one sitting — use `/iterate-loop`
- Exploratory work with no concrete tracked item — file a follow-up first, or run `triage` interactively
- Bundling multiple unrelated issues into one pass — one item per pass
- The user is actively pairing and wants step-by-step confirmation
- A bug fix that needs design discussion before code

---

## ⛔ BASH COMMAND RULES — READ THIS BEFORE WRITING ANY SHELL COMMAND

These rules exist because iterate is a walk-away tool. A single permission prompt kills the entire unattended run. There are no exceptions.

**HARD BANS — these will ALWAYS trigger a permission prompt and MUST NEVER appear:**

1. **`@{u}`, `@{upstream}`, `@{push}`, or ANY `{...}` git refspec.** These trigger brace-expansion prompts unconditionally. Use `origin/$(git branch --show-current)` or `origin/main` instead. Never type a `{` in a git argument outside a quoted string.

2. **Compound commands where ANY sub-command is not allowlisted.** `&&`, `||`, `;` chaining is only safe when EVERY piece would individually pass the allowlist. If uncertain, run commands separately. A compound with one unlisted binary prompts the whole thing.

3. **`$(...)` or backtick subshell expansion inside a command argument** where the inner command is not already allowlisted. Run the inner command first, capture the result, use it in a second call.

4. **`#` comments inside Bash tool calls.** They trigger approval prompts.

5. **Newlines inside a single Bash tool call** to separate commands.

6. **`cd /path && git <cmd>` to run git in a different directory.** This triggers an "untrusted hooks" prompt. Use `git -C /absolute/path <cmd>` instead — same effect, no compound, no prompt.

If you find yourself contorting a command to avoid a prompt, STOP. The right fix is adding the pattern to the allowlist, not clever reformatting. Halt and surface the issue instead.

---

## Pre-flight guard

Run before invoking any other skill. If it fails, print the reason and stop.

iterate runs on whichever branch is currently checked out — including `main`/`master`. The user opted into auto-commits on the current branch by invoking the skill; do not refuse based on branch name. (When invoked by `/iterate-loop`, the harness has already created and checked out a fresh feature branch — iterate still just runs on the current branch.)

**Refuse to start with a dirty working tree.** Run `git status --short`. If non-empty, halt: *"Uncommitted changes present — commit, stash, or run /wrap-up before iterating."* (Untracked files in `.claude/` like `scheduled_tasks.lock` are harness artifacts — ignore them.)

There is deliberately **no commit-count guard here.** A single pass produces at most one commit, so a branch can never accumulate its way to a threshold within iterate. Counting commits across passes and pausing for review is `/iterate-loop`'s concern (its iteration cap), not iterate's. If a single pass ever produces more than one commit, that is a wrap-up bug to fix, not a threshold to enforce.

---

## Pass mode — standalone vs continuous

One pass behaves slightly differently depending on whether it runs alone or inside `/iterate-loop`. The difference is confined to two places: **whether item-resolution may prompt**, and **the end-of-pass follow-ups step**. Everything else (implement, commit, push, land, tracking) is autonomous either way.

- **Continuous** — this pass is one iteration of `/iterate-loop`. The signal: your invocation ARGUMENTS contain the token `continuous` (injected by `/iterate-loop`). A continuous pass must never stop for a prompt, so item-resolution falls straight through to **non-interactive triage** and the Phase 6 follow-ups step files **autonomously**.
- **Standalone** — a bare `/iterate` with no `continuous` token. Still autonomous through commit + push + land, but two points are allowed to involve the user: if item-resolution finds no context it runs **interactive triage** (recommend + ask which one), and the Phase 6 follow-ups step **halts** so the user reviews what the work uncovered and chooses fix-now / file / skip. These are the only sanctioned pauses in a standalone pass.

Resolve the mode once, here, and carry it into item-resolution (Phase 0) and the Phase 3 wrap-up override below.

---

## Phase 0 — Resolve the work item (context first, triage last)

iterate discovers **one** item to work, in this order. Stop at the first that resolves:

1. **Explicit argument.** If the arguments contain a bare issue number (e.g. `/iterate 1118`) or an issue reference, that issue **is** the work item. Confirm it exists (`gh issue view <n> --json number,title,state`); if it's closed or missing, halt and say so. Skip triage entirely — the user named the target.
2. **Branch-name context.** Otherwise, inspect the current branch name for an embedded issue number (e.g. `fix/1118-login`, `1118-foo`, `issue-1118`). If one is present and matches an open GitHub issue, that issue is the work item. Skip triage.
3. **Triage.** Only if neither above resolves, invoke the `triage` skill via the Skill tool to discover the item — with these overrides:
   - **Standalone pass:** run triage **interactively** — let it recommend and ask the user which one item to work. Work exactly the one they pick, then this pass is done.
   - **Continuous pass:** run triage **non-interactively** — skip the "wait for user confirmation" step at triage Step 7 and proceed with the top recommendation. (`/iterate-loop` supplies the fresh backlog each iteration; a single continuous pass still works exactly one item.)
   - **Skip triage's Step 9 (offer wrap-up).** iterate runs wrap-up itself in Phase 3; don't let triage invoke it or it will double-commit.
   - **Refuse untracked items.** The item must be an existing GitHub issue, an entry in `<repo-root>/tmp/claude/followups.md`, or an outstanding handoff at `<repo-root>/tmp/claude/handoffs.md`. If triage's top pick is a fresh idea, a "while we're here" cleanup, or an invented refactor, halt and surface it for the user to file or reject. Never invent feature work autonomously.
   - **Handoff as top pick:** invoke `handoff` Resume mode to extract the "Immediate next step" and session context, then proceed with that as the work item. Delete the handoff file as part of Phase 3 wrap-up once fulfilled (no prompt).
   - **Empty queue:** if triage finds nothing actionable, print *"Nothing to iterate on."* and stop.

Whichever branch resolved it, iterate now has exactly **one** item. Proceed to Phase 2.

---

## Phase 2 — Implement

Work the resolved item on the current branch (following triage's Step 8 for the mechanics of a code change).

- If implementation produces no diff after a reasonable attempt (false start, blocked, needs design), halt with a one-line blocker explanation. Do not commit empty changes.
- If tests fail and the cause isn't trivially fixable in 1–2 attempts, halt with the failure surfaced.

**⛔ MANDATORY TRANSITION — there is NO stopping point between Phase 2 and Phase 3.**

The single most common iterate failure is stopping here: code is written, tests pass, and the run ends with a "here's what I did / next: commit and push" recap **without ever invoking wrap-up**. That is a bug, not a completion. Green tests are NOT the finish line — wrap-up is.

The moment implementation lands and tests are green (and no halt condition fired), you MUST immediately proceed into Phase 3 by invoking the `wrap-up` skill via the Skill tool. Specifically:

- **Do NOT emit a summary, recap, or "next steps" message and end your turn.** If you catch yourself about to write "Next: commit and push" or any equivalent, that is the signal to invoke `wrap-up` instead — the recap IS the work wrap-up does.
- **Do NOT do any wrap-up work by hand** — no ad-hoc `git commit`, no manually-run `code-review`/`code-simplifier`, no manual followups filing. Those are wrap-up's phases and must run *inside* the wrap-up skill invocation.
- **The pass is complete ONLY after** the `wrap-up` skill has returned **and** the Post-wrap-up conditional-handoff step below has been evaluated. Until then, you are mid-pass — keep going.

The only legal exits from Phase 2 are: a halt condition fired (surface it and stop), or implementation succeeded (invoke `wrap-up` and continue). There is no third option.

---

## Phase 2 (delegate flavor) — orchestrate, delegate the implementation, validate

When the `delegate` token is present, Phase 2 is **not** Claude writing the code. Claude plans, hands the implementation to a cheaper model, and validates the result. Claude never hands off the plan-making or the validation — only the typing. Everything else (the ⛔ mandatory transition into Phase 3, halt conditions) is unchanged.

1. **Plan (Claude).** From the resolved item, write a concrete implementation plan: the files to touch, the changes, and the acceptance check (which tests/commands must pass). This is the expensive thinking — it stays with Claude.
2. **Pick the implementer (ask in-flow).** `AskUserQuestion` — two options, chosen per run:
   - **Cross-vendor delegate** — Codex/Reasonix via the `delegate` router, implementing in a watchable Terminal.app window. **Always go through `delegate exec` — never call a vendor binary directly.** Read [../delegate/SKILL.md](../delegate/SKILL.md). Gate with `delegate check` first; if it fails, surface it and offer to fall back to the Claude sub-agent or to solo `iterate`. (In a **continuous** pass, don't prompt for the implementer — default to the last choice, or to the cross-vendor delegate; never stall the loop on a menu.)
   - **Cheaper Claude sub-agent** — a Haiku/Sonnet implementer via the **Agent tool** with a model override and the plan as a tight brief. Cheapest and the best plan-follower; no Terminal.
3. **Implement.** Hand the plan to the chosen implementer; it writes the code against the plan. Brief either implementer the same way: *implement this plan exactly, do not exceed its scope, run the project's checks when done.*
4. **Validate (Claude).** Run audit's review core over the implementer's diff in **plain mode** — review this diff, no routing, no offers, no posting — plus the project's test/check suite. This judgment is Claude's, never delegated.
5. **Loop.** Feed concrete fixes back to the implementer (or fix trivial things itself) and re-validate, until the diff passes review + checks or a stop condition fires: max 3 implement→validate rounds, or two consecutive check failures → **halt and surface**. A diff that won't pass after 3 rounds is a halt, not a "commit anyway".
6. On a clean validate, take the ⛔ mandatory transition into Phase 3 wrap-up, exactly as solo.

---

## Phase 3 — Wrap-up (non-interactive overrides)

**This phase is reached by actually calling the `wrap-up` skill via the Skill tool — not by performing wrap-up's steps inline.** Invoke it now. The overrides below are instructions you carry *into* that invocation; they do not replace it. If you find yourself running `git commit`, `code-review`, or `followups` without having invoked `wrap-up`, stop and invoke `wrap-up` first.

Invoke the `wrap-up` skill via the Skill tool with these overrides:

- **Pass mode — pass it explicitly.** Tell wrap-up whether this is a **standalone** or **continuous** pass, using the mode resolved above. wrap-up defaults to the interactive/standalone posture and will halt for human disposition unless it is *told* `continuous` — so a continuous pass MUST pass the `continuous` token through. Never leave the mode implicit.
- **Tracking:** apply automatically — close fulfilled GitHub issues with summary comments, move resolved followup items to the Resolved section, close milestones that hit zero open issues. No confirmation prompts.
- **Docs:** apply mechanical doc updates automatically (file-map.md, CLAUDE.md doc-table additions). For substantive doc updates that would normally prompt, do NOT prompt — append them as follow-up items with titles like *"Update PRD section X to reflect Y"*.
- **Quality:** run code-simplifier and code-review. Auto-apply simplifications. Auto-fix any 75+ issues. If a 75+ issue can't be auto-fixed in 1–2 attempts, halt before committing.
- **Commit + push + land:** commit with project conventions, push, and land per wrap-up's own ownership rules (merge on an owned repo; PR on a collaborative one). wrap-up owns the merge/PR choreography — iterate does not duplicate it.
- **Follow-ups:** in a **standalone** pass the follow-up step is **interactive** (surface findings, user chooses fix-now / file / skip). In a **continuous** pass it files **autonomously** with no prompt. This is driven entirely by the mode token you passed above.

---

## Post-wrap-up — Conditional handoff write

After `wrap-up` returns, decide whether this pass uncovered something hot enough that the *next* pass benefits from this session's context as scaffolding for its first action.

**Default: write no handoff.** A handoff is reserved for cases where context is load-bearing — not "here's the next backlog item." Routine polish, clean passes, and items already captured as followups do not justify one.

Write a handoff only when at least one clearly applies:

- **Regression introduced** — this pass broke something and the fix didn't fully land.
- **Partial fix** — implementation started but couldn't complete. The next pass needs the resume point.
- **Adjacent bug discovered** — a bug found next to the worked item, where the territory this session loaded makes the next fix materially cheaper than rediscovering it cold.
- **New high-priority issue surfaced mid-work** that wasn't visible before and shouldn't wait behind the normal backlog.

If none clearly apply, write nothing and end the pass.

**When a handoff IS warranted:** invoke the `handoff` skill in Write mode (no prompt — autonomous). The "Immediate next step" must name the hot item concretely. The handoff skill owns the format, path, and field definitions.

This step runs only inside `iterate`. Manual `/wrap-up` and direct `/followups` never write a handoff.

---

## Output

End the pass with a status line followed by a backlog snapshot:

```
Iteration complete: <one-sentence summary>. Halt: <reason | none>.

Backlog: X open issues (closed Y this pass). Roadmap: Z of W items complete (P%).
```

**Computing the snapshot:**

1. **GitHub issues** — run `gh issue list --state open --json number --limit 1000` and count. "Closed this pass" is the number wrap-up's tracking step closed (usually 1, occasionally 0).
2. **Roadmap** — check `ROADMAP.md`, `docs/ROADMAP.md`, `docs/roadmap.md` in order. If found, count checkbox lines: `[x]`/`[X]` complete, `[ ]` remaining. Report "Z of W items complete (P%)". If no roadmap file, omit the roadmap part.
3. If `gh` is unavailable or errors, omit the issues line rather than halting.

---

## Halt conditions

The pass stops and surfaces to the user when any of these fire:

- Pre-flight failed (dirty tree)
- An explicit-argument issue is closed or missing
- Triage found nothing actionable (empty queue)
- Triage's top pick is not an already-tracked item
- Implementation produced no diff
- Tests fail and the cause isn't trivially fixable in 1–2 attempts
- code-review surfaced a 75+ issue that auto-fix didn't resolve
- (delegate flavor) the delegate's diff won't pass review + checks after 3 implement→validate rounds

When iterate is running inside `/iterate-loop`, any halt ends that iteration and hands control back to the loop, which decides whether the whole run stops.

---

## Notes

- One pass works **one** item. Never bundle multiple issues, never pull the next item — that is `/iterate-loop`'s job.
- A pass produces at most one commit (wrap-up's).
- This skill never invokes itself. Continuous mode lives entirely in `/iterate-loop`.
