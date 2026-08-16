---
name: implement
description: "Autonomous single-pass work on one tracked item: resolve the item (argument → branch name → triage), implement, verify at the surface, wrap up. `implement <issue>` works that issue; bare `implement` discovers one; `implement delegate` hands implementation to a cheaper model with Claude validating. One pass, one item — continuous mode across many items is /iterate."
---

# /implement — Single-pass autonomous iteration

One pass on one tracked item: resolve what to work on → implement → wrap-up. Then **stop**. The user is walking away, not watching — minimize prompts, halt cleanly when something needs human judgment.

**One pass = one item = at most one commit, then done.** implement carries no looping logic of its own: it does not pull the next backlog item, it does not re-invoke itself, it does not manage cadence across passes. Continuous walk-away work across many items is `/iterate`'s job — a separate harness that drives implement. If you find yourself starting a second item in one invocation, that is the bug this skill exists to prevent.

## ⛔ Run the pass as a workflow — `~/.claude/workflows/implement.js`

**A pass runs staged, not as one long context.** The phases below are the source of truth for *what* each stage does; `~/.claude/workflows/implement.js` is the harness that runs them, one `agent()` per phase, each starting fresh and handing the next a small validated object.

Invoke it with `Workflow({ name: 'implement', args: { … } })`. Arguments: `issue` or `item` (or `resolved` when the caller already fetched and gated the item), `worktree`/`repo`, `branch`, `mode` (`standalone` | `continuous`), `model`, `land`.

**`land` says who owns the outcome, and it is the argument that decides whether the pass closes its item.** `'self'` — this pass lands its own branch and closes its own item in the Track stage. `'caller'` — a swarm worker: commit and push, then stop, and leave the tracker alone for `/orchestrate` to record after it re-verifies and lands. Unset defaults to `'caller'` when a `worktree` was given, `'self'` otherwise.

Pass it explicitly on a standalone pass that runs in a worktree. That case is the reason the argument exists: the role used to be inferred from `worktree` being set, so a normal `/implement` in an isolated checkout — which is most of them — silently adopted the worker rules and neither landed nor closed anything. Work shipped and the tracker still read open. `mode` cannot carry this, because `/orchestrate` and `/iterate` both pass `continuous` and only one of them may land.

**Why this is not optional.** Measured across 24h of session logs: 40 implement passes that ran as a single agent averaged ~300 turns, peaked between 243k and 406k context, and were **37% of all token spend**. The cost was never the code — it was one context that grew all pass and was re-read on every turn. Staging removes the growth curve; running the phases inline puts it back.

**Two rules the harness depends on, which apply to every stage:**

- **Never run a build, test, lint or typecheck directly.** Dispatch the `build-runner` subagent, which returns only the failures. Raw build output was the largest single source of growth inside a pass.
- **Never read a screenshot to check something.** Dispatch `screenshot-checker`. Images were 84% of all tool-result bytes in the measured day, and an image stays in context for every turn after it lands.

**Nesting is one level deep.** When `/orchestrate` or `/iterate` calls `workflow('implement')`, this script is already a child — its stages are plain agents and cannot open a further workflow. That is why the Wrap phase inlines wrap-up's phases rather than calling `workflow('wrap-up')`.

**Running the phases inline is still correct in one case:** a pass already executing inside a subagent that has no `Workflow` tool. Follow the phases in order, in context, and keep the two rules above.

---

## Flavors — solo vs delegate

- **`implement`** (default) — Claude does everything itself: resolve → implement → wrap-up.
- **`implement delegate`** — Claude stays the **orchestrator and validator**; the **implementation** (where most of the token cost lives) is handed to a cheaper model. The token `delegate` anywhere in the arguments turns it on; it flows through `/iterate … delegate` the same way `continuous` does, and is independent of the standalone/continuous mode. Everything outside the implement step — pre-flight, item resolution, wrap-up, halt conditions, output — is identical to solo. The delegate flavor **replaces Phase 1** (see below); the delegate is the *implementer*, never a reviewer.

---

## When to Use

- The user says "implement", "/implement", "implement 1118", "do a pass", or otherwise signals walk-away work on **one** item
- One specific tracked item needs to be moved end-to-end (issue or filed follow-up)
- The user wants commit / push / land / follow-up-filing handled without confirmation prompts

## When NOT to Use

- Continuous work across many items in one sitting — use `/iterate`
- Exploratory work with no concrete tracked item — file a follow-up first, or run `triage` interactively
- Bundling multiple unrelated issues into one pass — one item per pass
- The user is actively pairing and wants step-by-step confirmation
- A bug fix that needs design discussion before code

---

## ⛔ BASH COMMAND RULES — READ THIS BEFORE WRITING ANY SHELL COMMAND

These rules exist because implement is a walk-away tool. A single permission prompt kills the entire unattended run. There are no exceptions.

**HARD BANS — these will ALWAYS trigger a permission prompt and MUST NEVER appear:**

1. **`@{u}`, `@{upstream}`, `@{push}`, or ANY `{...}` git refspec.** These trigger brace-expansion prompts unconditionally. Use `origin/$(git branch --show-current)` or `origin/main` instead. Never type a `{` in a git argument outside a quoted string.

2. **Compound commands where ANY sub-command is not allowlisted.** `&&`, `||`, `;` chaining is only safe when EVERY piece would individually pass the allowlist. If uncertain, run commands separately. A compound with one unlisted binary prompts the whole thing.

3. **`$(...)` or backtick subshell expansion inside a command argument** where the inner command is not already allowlisted. Run the inner command first, capture the result, use it in a second call.

4. **`#` comments inside Bash tool calls.** They trigger approval prompts.

5. **Newlines inside a single Bash tool call** to separate commands.

6. **`cd /path && git <cmd>` to run git in a different directory.** This triggers an "untrusted hooks" prompt. Use `git -C /absolute/path <cmd>` instead — same effect, no compound, no prompt.

7. **`cat <file> || echo "not found"` existence-check compounds.** Use the Read tool to check/read files.

If you find yourself contorting a command to avoid a prompt, STOP. The right fix is adding the pattern to the allowlist, not clever reformatting. Halt and surface the issue instead.

---

## Pre-flight guard

Run before invoking any other skill. If it fails, print the reason and stop.

implement runs on whichever branch is currently checked out — including `main`/`master`. The user opted into auto-commits on the current branch by invoking the skill; do not refuse based on branch name. (When invoked by `/iterate`, the harness has already created and checked out a fresh feature branch — implement still just runs on the current branch.)

**Refuse to start with a dirty working tree.** Run `git status --short`. If non-empty, halt: *"Uncommitted changes present — commit, stash, or run /wrap-up before iterating."* (Untracked files in `.claude/` like `scheduled_tasks.lock` are harness artifacts — ignore them.)

There is deliberately **no commit-count guard here.** A single pass produces at most one commit, so a branch can never accumulate its way to a threshold within implement. Counting commits across passes and pausing for review is `/iterate`'s concern (its iteration cap), not implement's. If a single pass ever produces more than one commit, that is a wrap-up bug to fix, not a threshold to enforce.

---

## Pass mode — standalone vs continuous

One pass behaves slightly differently depending on whether it runs alone or inside `/iterate`. The difference is confined to two places: **whether item-resolution may prompt**, and **the end-of-pass follow-ups step**. Everything else (implement, commit, push, land, tracking) is autonomous either way.

- **Continuous** — this pass is one iteration of `/iterate`. The signal: your invocation ARGUMENTS contain the token `continuous` (injected by `/iterate`). A continuous pass must never stop for a prompt, so item-resolution falls straight through to **non-interactive triage** and the Phase 6 follow-ups step files **autonomously**.
- **Standalone** — a bare `/implement` with no `continuous` token. Still autonomous through commit + push + land, but two points are allowed to involve the user: if item-resolution finds no context it runs **interactive triage** (recommend + ask which one), and the Phase 6 follow-ups step **halts** so the user reviews what the work uncovered and chooses fix-now / file / skip. These are the only sanctioned pauses in a standalone pass.

Resolve the mode once, here, and carry it into item-resolution (Phase 0) and the Phase 2 wrap-up override below.

---

## Phase 0 — Resolve the work item (context first, triage last)

implement discovers **one** item to work, in this order. Stop at the first that resolves:

1. **Explicit item text (passed by `/iterate`).** If the arguments contain an `item:"…"` token, that text **is** the work item — a local followup or papercut that has no issue number. An optional `source:"…"` token records where it came from (e.g. `followups.md`, `papercuts.md`, a `file:line`). Skip triage entirely; the caller already chose the item. This branch exists so `/iterate` can freeze a scoped queue of local items and feed them one at a time. **Still run the Phase 0.5 AFK-ability gate on the text** — a vague local item must fail the gate and be handled per pass mode, exactly like a triage pick, never guessed.
2. **Explicit argument.** If the arguments contain a bare issue number (e.g. `/implement 1118`) or an issue reference (a beads ID like `myproj-zb8`), that issue **is** the work item. Resolve the backend via [`../_tracker/_detect.md`](../_tracker/_detect.md) and confirm it exists — `bd show <id> --json` on beads, `gh issue view <n> --json number,title,state` on GitHub; if it's closed or missing, halt and say so. Skip triage entirely — the user named the target.
3. **Branch-name context.** Otherwise, inspect the current branch name for an embedded issue ID (e.g. `fix/1118-login`, `1118-foo`, `issue-1118`, `myproj-zb8-login`). If one is present and matches an open issue on the resolved backend, that issue is the work item. Skip triage.
4. **Triage.** Only if none of the above resolve, invoke the `triage` skill via the Skill tool to discover the item — with these overrides:
   - **Standalone pass:** run triage **interactively** — let it recommend and ask the user which one item to work. Work exactly the one they pick, then this pass is done.
   - **Continuous pass:** run triage **non-interactively** — skip the "wait for user confirmation" step at triage Step 7 and proceed with the top recommendation. (`/iterate` supplies the fresh backlog each iteration; a single continuous pass still works exactly one item.)
   - **Skip triage's Step 9 (offer wrap-up).** implement runs wrap-up itself in Phase 2; don't let triage invoke it or it will double-commit.
   - **Refuse untracked items.** The item must be an existing issue on the resolved backend or an entry in `<repo-root>/tmp/claude/followups.md`. If triage's top pick is a fresh idea, a "while we're here" cleanup, or an invented refactor, halt and surface it for the user to file or reject. Never invent feature work autonomously.
   - **Empty queue:** if triage finds nothing actionable, print *"Nothing to iterate on."* and stop.

Whichever branch resolved it, implement now has exactly **one** item. Proceed to Phase 0.5.

---

## Phase 0.5 — AFK-ability self-assessment (the gate)

Before writing any code, judge whether the resolved item is actually walk-away work. implement is built to run unwatched with minimal prompts, and it assumes the item is objective enough to finish without a human judgment call. That assumption is untested until this gate tests it. Run this on **every** resolved item — a named issue (`implement 1118`), an `item:"…"` local item from `/iterate`, a branch-context match, or a triage pick — because any of them can be underspecified.

Judge the item on two tests:

1. **Plan test.** Can I state a concrete plan *right now* — the files to touch, the changes to make, and an objective acceptance check (which tests/commands prove it done)? If I can't name the files or can't name a check that would prove completion, I don't understand the problem well enough to work it unwatched.
2. **Objectivity test.** Is "done" verifiable without a qualitative, taste, product, or design call that is the user's to make? Does the item hide an unresolved decision, missing information, or an ambiguity I would have to *invent* an answer to in order to proceed? If yes, it fails — inventing that answer autonomously is exactly the mistake this gate exists to stop.

**Pass both → proceed to Phase 1.** (In the delegate flavor, the plan test *is* Phase 1-delegate step 1 — Claude writing the plan. The gate sits before the delegate branch: if Claude cannot write the plan, do not hand anything off.)

**Fail either test → act by pass mode:**

- **Standalone pass — resolve with the user, routed by which test failed:**
  - **Plan test failed** (missing facts, unclear scope, don't-know-the-files): ask the user targeted clarifying questions — one at a time, in plain chat, never the `AskUserQuestion` tool. Read the codebase for anything the repo can answer; only ask for what it can't. This is a factual gap-fill, not a design interview — don't reach for `grill-me` here.
  - **Objectivity test failed** (a qualitative / product / design call the user owns): invoke `grill-me` via the Skill tool — the design interview that surfaces and records the decision.
  - After the interview resolves, **re-run this gate once.** If it now passes, proceed to Phase 1. If it still fails, **halt** and surface the specific residual uncertainty — do not loop the interview a second time, and do not proceed anyway.

- **Continuous pass — cannot prompt.** Do **not** attempt the item. File a follow-up (via the `followups` skill) titled `needs human input: <item> — <what's ambiguous>`, with a one-line note on which test failed and why, then **halt the iteration** and hand control back to `/iterate`. Never guess-and-commit an item that failed the gate.

Only an item that passes both tests reaches Phase 1.

---

## Phase 1 — Implement

Work the resolved item on the current branch (following triage's Step 8 for the mechanics of a code change).

- If implementation produces no diff after 1–2 attempts (false start, blocked, needs design), halt with a one-line blocker explanation. Do not commit empty changes.
- If tests fail and the cause isn't trivially fixable in 1–2 attempts, halt with the failure surfaced.

**⛔ MANDATORY TRANSITION — there is NO stopping point between Phase 1, Phase 1.5, and Phase 2.**

The single most common implement failure is stopping here: code written, tests green, and the run ends on a "here's what I did / next: commit and push" recap **without ever invoking wrap-up**. That is a bug, not a completion — green tests are not the finish line; a *verified*, wrapped-up pass is. The moment implementation lands green with no halt fired, invoke the `verify` skill (Phase 1.5), then `wrap-up`. Specifically:

- **Do NOT emit a summary, recap, or "next steps" message and end your turn.** Catching yourself about to write "Next: commit and push" IS the signal to invoke `wrap-up` instead — the recap is the work wrap-up does.
- **Do NOT do any wrap-up work by hand** — no ad-hoc `git commit`, no manually-run `code-review`/`code-simplifier`, no manual followups filing. Those run *inside* the wrap-up invocation.
- **The pass is complete ONLY after** the `wrap-up` skill has returned. Until then, you are mid-pass — keep going.

The only legal exits from Phase 1 are: a halt condition fired (surface it and stop), or implementation succeeded (invoke `verify` and continue). There is no third option.

---

## Phase 1 (delegate flavor) — orchestrate, delegate the implementation, validate

When the `delegate` token is present, Phase 1 is **not** Claude writing the code. Claude plans, hands the implementation to a cheaper model, and validates the result. Claude never hands off the plan-making or the validation — only the typing. Everything else (the ⛔ mandatory transition into Phase 2, halt conditions) is unchanged.

1. **Plan (Claude).** From the resolved item, write a concrete implementation plan: the files to touch, the changes, and the acceptance check (which tests/commands must pass). This is the expensive thinking — it stays with Claude.
2. **Pick the implementer (ask in-flow).** Ask in **plain chat text** — name the two options and the keyword for each (`subagent` / `delegate`), and let the user type one. **Never use the `AskUserQuestion` tool** — the selector is banned in this workflow, same as in [review](../review/SKILL.md) RULE 0, and an `implement` pass routes into review at validate. Two options, chosen per run, and the order below is the recommendation order from [../delegate/TARGETS.md](../delegate/TARGETS.md):
   - **`subagent` — a cheaper Claude sub-agent (the default).** A Haiku/Sonnet implementer via the **Agent tool** with a model override and the plan as a tight brief. Cheapest, best plan-follower, no window, no second auth. Take this unless the user wants to watch or take over the implementer, needs it to outlive this session, or specifically wants a non-Claude model on the work.
   - **`delegate` — a separate agent process.** Via the `delegate` router. **Always go through `delegate exec` — never call a vendor binary directly.** Read [../delegate/SKILL.md](../delegate/SKILL.md). The surface is resolved, not chosen: inside herdr it is a **live agent in its own tab that you can switch to and type at**, otherwise a Terminal.app window; run `delegate transport` and say which, so the user knows whether there is a tab to open. Gate with `delegate check` first; if it fails, surface it and offer to fall back to the sub-agent or to solo `implement`. (In a **continuous** pass, don't prompt for the implementer — default to the last choice, or to the sub-agent; never stall the loop on a menu.)
3. **Implement.** Hand the plan to the chosen implementer; it writes the code against the plan. Brief either implementer the same way: *implement this plan exactly, do not exceed its scope, run the project's checks when done.*
4. **Validate (Claude).** Run the `review` skill's core ([../review/REVIEW-CORE.md](../review/REVIEW-CORE.md)) over the implementer's diff in **plain mode** — review this diff, no routing, no offers, no posting — plus the project's test/check suite. This judgment is Claude's, never delegated.
5. **Loop.** Feed concrete fixes back to the implementer (or fix trivial things itself) and re-validate, until the diff passes review + checks or a stop condition fires: max 3 implement→validate rounds, or two consecutive check failures → **halt and surface**. A diff that won't pass after 3 rounds is a halt, not a "commit anyway".
6. On a clean validate, take the ⛔ mandatory transition into Phase 1.5, exactly as solo.

---

## Phase 1.5 — Verify

Passing tests are not evidence the item works — they prove CI runs. Before wrap-up, prove it at its **surface**: invoke the `verify` skill via the Skill tool, scoped to this pass's diff.

`verify` owns what verification means and how to get a handle on the app; do not restate or re-derive its method here. This phase adds exactly two things on top of it.

**Where `verify` lives, so you don't conclude it is missing.** It is bundled into the Claude Code binary — there is no file for it under `~/.claude/skills/`, and it does not appear in the skill listing. `find` will come up empty and the listing will look like it was never built; neither is evidence. `Skill(verify)` loads it anyway (confirmed on 2.1.224–2.1.226). Do not hand-roll the verification, do not substitute a test run, and do not log a papercut about a missing skill.

**The project's own `verify` is the real one — the bundled skill is only its bootstrap.** How you drive a surface is never generic: a TUI needs a headless frame dump, an iOS app needs a simulator, a Worker needs a request against a dev server. The bundled skill exists to figure that out once per repo and write it down as `.claude/skills/verify-project/`, which then shadows it for every later pass. So:

- If `<repo>/.claude/skills/verify-project/` exists, that is the skill you are running. Trust it over anything the bundled version would have done.
- If it does not exist, let the bundled skill write one, and make sure what it writes names *this* repo's actual surface and commands — not a generic recipe that would read the same in any project.
- **Keep it out of git.** A `verify` skill is per-checkout tooling, not shipped code: add `.claude/skills/verify-project` to `<repo>/.git/info/exclude` (never `.gitignore`, which is committed) the moment you create one. If you find it already tracked in a repo, untrack it — `git rm --cached -r .claude/skills/verify-project` plus the exclude line — on a branch if the repo is not the user's own.

**1. Persist the verdict.** `verify` reports inline in chat, which nothing outside this session can read — and when the pass runs in a pane, that transcript is often unrecoverable. Write the verdict to `<repo-root>/tmp/claude/verify/<item>.json`, taking `<repo-root>` from `git rev-parse --show-toplevel` in its own call:

```json
{"item": "<issue number or followup text>", "verdict": "PASS|FAIL|BLOCKED|SKIP",
 "surface": "<what you drove>", "findings": ["…"],
 "branch": "<current branch>", "commit": "<HEAD sha>"}
```

Write it on **every** verdict, `SKIP` included. A missing file is not a pass — it is indistinguishable from a pass that never ran, which is exactly what a reader must never have to guess.

**A verdict describes one tree, and touching the code voids it.** If you change anything after `verify` returns — fixing a finding, a last tidy-up, a review nit — the verdict no longer describes what you are about to land: **re-run `verify` and rewrite the file.** Observed: a worker verified `PASS`, committed one more change, and shipped it unverified under the earlier verdict.

**What `commit` means here, because the obvious reading is wrong.** `verify` runs before wrap-up commits, so at verify time the branch head is still the *parent* of the commit this work becomes. `commit` therefore records that parent, and a verdict whose `commit` sits one behind the branch head is the normal, correct state — not staleness. Measured across three worktrees in one swarm, two verdict files recorded `c05e355` against branch heads `a85f9dc` and `8cd7231`; both were valid. The Track stage re-stamps the file with the real commit once it exists, preserving the original as `verified_parent`. So: never gate landing on `commit == branch head` before Track has run — that test fails on every honest verdict. Fill in `branch` too; two of those three files had it null, which strands the verdict with no route back to the work.

**1b. If the pass added or changed a test, prove the test discriminates — and put the proof in the verdict file.**

A test is evidence only if it fails without the change. Adding one is not evidence that anything was fixed, and "I added tests" is the most common way a pass looks green while the bug is still there.

Take the production change out of the tree without touching the tests (`git stash push -- <the non-test paths>`), run **only** the new or changed tests narrowed by name, read what it printed, restore the tree (`git stash pop`), and confirm `git status --short` matches what it showed before. Then add to the verdict file:

```json
"mutation": {"method": "<what you removed and how>", "command": "<the exact test invocation>",
             "output": "<the real failure text>", "discriminates": true,
             "tests": ["<test names>"]}
```

**Report `discriminates: false` honestly when they pass anyway** — that is the answer this check exists to surface, and a false `true` is the one unrecoverable one. For genuinely new behaviour with nothing to revert, `discriminates: false` with `"no prior implementation to revert"` as the `method`.

Observed 2026-08-16: a swarm worker landed three tests that each rebuilt the production logic inside the test body and asserted on their own copy — one carried the comment `// Replicate the padding logic from the fix`. Reverting the fix commit and re-running them printed `ok  powerhour/internal/tui/dashboard  0.283s`. They passed against the exact bug they were written to catch, and nothing in the pass had asked otherwise.

**2. Gate on it.**

- `PASS` or `SKIP` → continue into Phase 2.
- A `PASS` on a diff that touched tests, with no `mutation` block or with `discriminates: false`, **does not close the item.** The work still commits — a weak test is no reason to strand a correct implementation in an uncommitted worktree — and the pass reports the missing proof in `item_open_because`. `~/.claude/workflows/implement.js` makes that call from the file list; it is not the verifying agent's to soften.
- `FAIL` or `BLOCKED` → **halt before wrap-up.** Nothing commits, pushes, or lands. Surface the verdict with the evidence `verify` captured; in a **continuous** pass, file a follow-up and hand control back to `/iterate`.

`verify` admits no partial pass and resolves doubt as `FAIL`. Do not soften a `FAIL` into a follow-up and proceed — a failed verification is a halt, not a note.

---

## Phase 2 — Wrap-up (non-interactive overrides)

**This phase is reached by actually calling the `wrap-up` skill via the Skill tool — not by performing wrap-up's steps inline.** Invoke it now. The overrides below are instructions you carry *into* that invocation; they do not replace it. If you find yourself running `git commit`, `code-review`, or `followups` without having invoked `wrap-up`, stop and invoke `wrap-up` first.

Invoke the `wrap-up` skill via the Skill tool with these overrides:

- **Pass mode — pass it explicitly.** Tell wrap-up whether this is a **standalone** or **continuous** pass, using the mode resolved above. wrap-up defaults to the interactive/standalone posture and will halt for human disposition unless it is *told* `continuous` — so a continuous pass MUST pass the `continuous` token through. Never leave the mode implicit.
- **Tracking:** wrap-up does NOT write to the tracker. The Track stage after it does, so there is exactly one writer and a skipped close is visible instead of silent. Closing is automatic and unprompted when all three hold: `land` resolves to `'self'`, verification returned `PASS`, and something was committed. Otherwise the item stays open and the pass reports `item_open_because`. `SKIP` is not `PASS` — an item nobody managed to verify is not one to close on a machine's say-so. Moving resolved followup items to the Resolved section and closing emptied milestones stay with wrap-up.
- **Docs:** apply mechanical doc updates automatically (file-map.md, CLAUDE.md doc-table additions). For substantive doc updates that would normally prompt, do NOT prompt — append them as follow-up items with titles like *"Update PRD section X to reflect Y"*.
- **Quality:** run code-simplifier and code-review. Auto-apply simplifications. Auto-fix any 75+ issues. If a 75+ issue can't be auto-fixed in 1–2 attempts, halt before committing.
- **Commit + push + land:** commit with project conventions, push, and land per wrap-up's own ownership rules (merge on an owned repo; PR on a collaborative one). wrap-up owns the merge/PR choreography — implement does not duplicate it.
- **Follow-ups:** in a **standalone** pass the follow-up step is **interactive** (surface findings, user chooses fix-now / file / skip). In a **continuous** pass it files **autonomously** with no prompt. This is driven entirely by the mode token you passed above.

---

## Output

End the pass with a status line followed by a backlog snapshot:

```
Iteration complete: <one-sentence summary>. Halt: <reason | none>.

Backlog: X open issues (closed Y this pass). Roadmap: Z of W items complete (P%).
```

**Computing the snapshot:**

1. **Open issues** — on beads, `bd count --status open` (add `bd ready --json | jq length` for the unblocked figure, which is the more useful number when the backlog has real dependency edges); on GitHub, `gh issue list --state open --json number --limit 1000` and count. "Closed this pass" is the number wrap-up's tracking step closed (usually 1, occasionally 0).
2. **Roadmap** — check `ROADMAP.md`, `docs/ROADMAP.md`, `docs/roadmap.md` in order. If found, count checkbox lines: `[x]`/`[X]` complete, `[ ]` remaining. Report "Z of W items complete (P%)". If no roadmap file, omit the roadmap part.
3. If the backend's CLI is unavailable or errors, omit the issues line rather than halting.

---

## Halt conditions

The pass stops and surfaces to the user when any of these fire:

- Pre-flight failed (dirty tree)
- An explicit-argument issue is closed or missing
- Triage found nothing actionable (empty queue)
- Triage's top pick is not an already-tracked item
- Phase 0.5 gate failed and the interview couldn't resolve it (standalone), or the gate failed at all (continuous → filed follow-up + halt)
- Implementation produced no diff
- Tests fail and the cause isn't trivially fixable in 1–2 attempts
- Phase 1.5 verification returned `FAIL` or `BLOCKED`
- code-review surfaced a 75+ issue that auto-fix didn't resolve
- (delegate flavor) the delegate's diff won't pass review + checks after 3 implement→validate rounds

When implement is running inside `/iterate`, any halt ends that iteration and hands control back to the loop, which decides whether the whole run stops.

---

## Notes

- One pass works **one** item. Never bundle multiple issues, never pull the next item — that is `/iterate`'s job.
- A pass produces at most one commit (wrap-up's).
- This skill never invokes itself. Continuous mode lives entirely in `/iterate`.
