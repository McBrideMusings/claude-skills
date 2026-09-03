---
name: implement
description: "Autonomous work on tracked items, one workflow pass per item. `implement <issue>` works that issue; bare `implement` discovers one; `implement <selector>` walks a queue one at a time; `implement swarm <selector>` runs several at once. Each pass ends at a commit and this session lands it."
---

# /implement — run passes, verify them, land them

One **pass** is one tracked item, worked end to end by `implement.js` in its own worktree, ending at a commit. This session is the orchestrator: it decides what to run, re-checks what came back, lands it, and closes the item.

**Arity is the only difference between the three ways to use this.** A pass does not know or care which one is happening.

| | What this session does |
|---|---|
| `implement <issue>` | one pass, land it, stop |
| `implement <selector>` | a pass, land it, then the next — one at a time |
| `implement swarm <selector>` | N passes launched without waiting, each landed as it returns |

A pass takes no `mode` argument and has no idea how many siblings it has. Running two is this session calling the workflow twice.

## The unit is a slice, and the bookends are yours

A pass takes **one slice child** of a broken-down issue — `myproj-25.1`, never `myproj-25`. The breakdown in `issues/breakdown.md` puts slices, a Verify bead and a Land bead under every issue at the moment it is picked up, and a pass is the thing that works exactly one slice to a commit. So `implement <parent>` means: break it down now if `bd children <parent>` is empty (in chat, where the slices are visible), then walk the slice children in dependency order, one pass each, landing each before the next. A parent with no breakdown is never handed to `implement.js`; a Verify or Land child is never handed to it either.

**The Verify bead is this session's**, worked after the last slice lands, through the project's `verify-project` skill with the worktrees still standing to be looked at. A Verify bead carrying `human` stops here and says what a person has to look at; nothing below runs until they have.

**The Land bead is a slate row**, offered after Verify passes and taken with `go`: on an owned repo the merge, on a collaborative one the PR, with the bead's `--design` body as the draft. It is never inside a pass and never inside a brief. The one run that carried "push and open the PR" into the worker did exactly that, with four unanswered product questions pasted into the PR body, and the only reason the questions existed was that nobody had been asked. `implement.js` cannot open a PR because it runs no `git push`; this section is why the orchestrator does not either until the row is accepted.

**How a cleared tracked item becomes a launched pass lives in [`HANDOFF.md`](HANDOFF.md)** — the three cheap queries that make an item dispatchable, reading swarm-vs-sequential shape off the dependency graph instead of asking, and offering the result as one more slate row rather than a new accept word.

---

## ⛔ The pass is a workflow, and it is addressed by path

Every pass shares the same `scriptPath`, and `meta` must stay a pure literal
— no interpolation, no `args` — so every row in the workflow list would
otherwise render identically and two concurrent passes would be
indistinguishable. Before calling `Workflow`, generate a per-pass copy whose
`meta` literal already names the item, and pass *that* path:

```sh
generated=$(bash /Users/pierce/.claude/skills/implement/name-pass.sh "$issue" "$title")
```

```js
Workflow({
  scriptPath: generated,
  args: { issue, worktree, repo, branch, model },
})
```

The generated copy is disposable — it lands under
`$(~/.claude/tools/repo-slug --path <repo>)`, which macOS reaps after three
days idle. `implement.js` is the only file edited by hand; never edit a
generated `implement-<id>.js` directly, and never point `scriptPath` at
`implement.js` itself.

**Never `Workflow({name: 'implement'})` and never `workflow('implement', …)`.** Name resolution reads the *project's* `.claude/workflows/`, not `~/.claude/`, so it fails in exactly the place every pass runs — a worktree — with `Workflow "implement" not found. Available: deep-research, code-review`. The absolute path has no registry between it and the file.

**Only this session may call `Workflow` at all.** It is not available inside subagents: a subagent that tries gets `No such tool available`. So the orchestrator is always the chat session, never something it spawned.

**Why staged and not one long agent.** Passes that ran as a single agent averaged ~300 turns, peaked between 243k and 406k context, and were **37% of all token spend** in a measured day. The cost was never the code — it was one context that grew all pass and was re-read every turn. `implement.js` runs one `agent()` per stage, each starting fresh and handing the next a small validated object.

**Editing this file does not change what a pass does.** Stage prompts live in `implement.js`; rules binding every stage live in [`STAGE-RULES.md`](STAGE-RULES.md) — including the Bash command rules, and the two that protect the saving above: a stage runs its own build or test but must bound the output (`2>&1 | tail -40`), and no stage reads a screenshot. Raw build output was the largest single source of growth inside a pass; images were 84% of all tool-result bytes. Neither goes through a `build-runner` or `screenshot-checker` subagent — a stage cannot spawn one at all (tested 2026-09-01, see below).

`tools/tests/implement-workflow.test.sh` and `skills/implement/implement.test.mjs` are what hold the script to its contract. Run both after editing it.

---

## What a pass returns

```js
{ ok: true, item, title, verdict, verdict_path, commit, branch, worktree,
  // verdict_path: absolute path of the verdict JSON the pass wrote
  recheck: [{cmd, expect}],   // how YOU re-check it — empty means nothing machine-checkable
  blockers: [],               // empty means nothing the pass can see stops it landing
  review: {findings, blocking, major}, files, followups, summary }
```

A halt returns `{ok: false, halted_on, detail, worktree}` instead. **Branch on `ok` first** — a halt carries no `blockers` array, and reading one as "no blockers" is how broken work gets merged.

`blockers` empty is the pass's opinion, not a verdict. Yours comes next.

`followups` is for work outside this item's scope — something noticed and not fixed, an append-only index row. It is never a defect in the diff the pass just wrote. A defect in this pass's own diff comes back as a Review finding, and at `major` severity or above it also lands in `blockers` — see below.

---

## The verify loop — this session's job, not the pass's

The implementer does not get to certify its own work. `implement.js` has a Verify stage run by a different agent than the one that wrote the code, and that is a filter, not the authority. **You re-run `recheck` yourself, in the worktree, and your result is what decides whether the branch lands.**

```text
check every host:port / URL named in the item, its acceptance criteria, and verify-project/SKILL.md
  -> start whatever is down, before the first launch
r = Workflow(pass)
round = 1
loop
  if !r.ok && r.halted_on == 'surface'  -> start the named surface, then relaunch below on the SAME worktree (never a fresh checkout)
  if !r.ok                     -> halt: report r.halted_on and r.detail
  run every r.recheck[].cmd in r.worktree, compare against .expect
  append a rechecks entry to the verdict file at r.verdict_path, recording the head sha, the commands and their results
  review r's diff against the sha the pass started from
  if all clear and r.blockers is empty  -> land
  if round == 5                -> halt: leave the worktree standing, report the path
  r = Workflow(pass, args: {...args, worktree: r.worktree, round: round, resolved: {...item, body: failures, files: r.files}}); round++
```

**Run the same reachability check the Verify stage runs, yourself, before the first `Workflow(pass)` launch** — every `host:port` and `http(s)://` URL named in the item, its acceptance criteria, and `verify-project/SKILL.md`, checked with `nc -z -G 3 <host> <port>` or `curl`. Start whatever is down before launching; a pass that starts against a closed surface just re-derives the same halt the Verify stage would have caught anyway, one Workflow launch later.

**On `r.halted_on == 'surface'`, start the surface named in `r.detail` and relaunch — on the SAME `worktree`, passing `round: round` (not a fresh checkout), exactly as a normal round 2+ relaunch does.** This does not count against the five-round exhaustion limit above; it is the environment catching up, not the work failing. If starting the surface does not succeed — the command that should bring it up errors, or the reachability check still fails after trying — fall through to the normal halt: leave the worktree standing and report `r.detail`, rather than retrying indefinitely.

**Rounds 2..N relaunch `Workflow` on the SAME `worktree`, carrying the failures as the item body.** Pass `args.worktree` as the worktree round 1 already committed into, `args.round` as the loop's own counter, and `args.resolved` as the original item with `body` replaced by round 1's failure list — the recheck commands that failed and their real output — plus `files: r.files`, round 1's touched files. The pass re-enters the existing checkout with round 1's commit already in place; `name-pass.sh` still generates a fresh `scriptPath` per launch, so round 2 gets its own generated copy, and that is expected.

**A fix round (`round >= 2`) skips Gate, Locate and Review.** Round 1 already settled the approach and the files, so Gate and Locate would only re-derive what is already known; Review is skipped because by round 2 the diff is the whole branch, not just this round's fix, and re-reading it would re-flag round 1's already-accepted work. Edit receives round 1's files directly and fixes only the failures named in the item body — Green, Verify and Wrap still run in full.

**Only *omitting* `worktree` cuts a fresh checkout that has never seen round 1's code.** Passing the same `worktree` reuses it.

**Tested 2026-09-01: a `Workflow`'s stage agents are not addressable.** They do not appear in `ListAgents`, and `SendMessage` to a stage's `agentId` returns `No transcript found for agent ID: …`. `resumeFromRunId` does not help either — an unchanged `(prompt, opts)` replays from cache, and round 2's new information (the orchestrator's failures) is not in any stage's prompt, so nothing about resuming re-runs anything.

**On exhaustion, halt — in every arity, including sequential and swarm.** Leave the worktree standing, print its absolute path, the failing command and its real output. The work is in there and it is the only copy; a removed worktree holding an unlanded branch is the one state nothing recovers from. In sequential this stalls the rest of the queue, and that is deliberate: five rounds failing is evidence the brief was wrong, which is a judgment the user holds.

**A verdict describes one tree.** If anything is touched after a clean recheck — a review nit, a last tidy-up — the verdict no longer describes what you are about to land. Re-run the recheck, and append the result to the verdict as a `rechecks` entry in the same breath — the re-verification and its record never separate. The file to append to is `$(~/.claude/tools/repo-slug --path <worktree>)/verify/<item>.json`.

**When this session's own context fills mid-run, relay rather than pushing on** — the `relay` skill's in-flight manifest is what makes handing off passes still running or returned-but-unlanded safe.

---

## Verification itself

**The project's own `verify-project` skill owns what verification means; do not re-derive its method.** Driving a surface is never generic — a TUI needs a headless frame dump, an iOS app a simulator, a Worker a request against a dev server — so the recipe lives per repo, in `<repo>/.claude/skills/verify-project/SKILL.md`, and both halves of this skill read it: this session for the Verify bead, and `implement.js`'s Verify stage for each pass.

**Where the recipe comes from, and why the stage reads a file rather than calling a skill.** The bundled `verify` skill is `disable-model-invocation`, so no agent can load it: `Skill(verify)` returns `Skill verify cannot be used with Skill tool ... Ask the user to run /verify themselves`, and only a person typing `/verify` gets it. A Verify stage told to invoke it therefore had no legal method at all and returned `BLOCKED` on every pass — observed on run `wf_7109ee86-5bb`, item `cc-9qo.1`. So the stage reads `verify-project/SKILL.md` as a file and follows it, and writes one when the repo has none. Do not hand-roll the check, do not substitute a test run, and do not log a papercut about the bundled skill being unreachable — that is the tool working as designed.

- **Resolve the path in the primary checkout, never the worktree.** `verify-project` is git-excluded, so a fresh worktree carries it only if the link hook ran (see below). Its absence from a worktree says nothing about the repo.
- If `<repo>/.claude/skills/verify-project/SKILL.md` exists, that is the recipe running. Trust it over anything generic.
- If not, the stage writes it — from this repo's `README.md`, `CLAUDE.md` and `admin.toml`, naming *this* repo's real surface and commands. Check what it wrote: a recipe that would read the same in any repo is the weak-verdict failure mode, not a bootstrap. A repo with no `verify-project` is never a gate failure; it is a repo that has not been bootstrapped yet.
- **Never name it `verify`.** That collides with the bundled skill, which is why the project skill has its own name.
- **Keep it out of git.** Add `.claude/skills/verify-project` to `<repo>/.git/info/exclude` — never `.gitignore`, which is committed. If you find it tracked, untrack it.

**A surface the brief names and that is not listening is `BLOCKED` with `halted_on: 'surface'`, not `SKIP`.** Before reading `verify-project/SKILL.md`, the Verify stage checks every `host:port` and `http(s)://` URL named in the item body, its acceptance criteria, and that file, and any closed one halts the pass immediately rather than letting the stage discover it partway through — a closed port re-diagnosed as a code problem burned 29 minutes twice over on run `a9667f84` (`neutrino-2lc.12.6`), because `SKIP` reads like a soft pass and nothing forced the environment to come up before the next launch. `SKIP` remains only for behaviour that cannot be observed for some other reason — no fixture data, no device — with every named surface already reachable. `FAIL` is still behaviour observed to be wrong.

**A pass that touched tests must prove the tests discriminate.** A test is evidence only if it fails without the change. `implement.js`'s Verify stage captures the production half as a patch, reverses it, runs only the new tests, and records `mutation.discriminates`, which has three states. `true` is evidence — the retained tests failed without the change. `false` is a blocker — a test was added and does not discriminate. `null` means the change was removal-only (deleted production code, or comment/documentation-only edits): there was no behaviour to reverse, so reversing it just restores the deleted code and the retained tests pass exactly as before — that is not a weak test, it is nothing to discriminate, and it is not a blocker. A `PASS` on a test-touching diff with no `mutation` block, or with `discriminates: false`, arrives in `blockers` — the work still commits, because a weak test is no reason to strand a correct implementation, but the item does not close on it.

A `null` is not automatically clear, though. It is the shape that once concealed a real gap: run `wf_1c7f6439-4e8` (cc-fyt round 1) deleted the `COMMIT_OK` sentinel and its six tests, and in the same diff promoted `tree_clean` to "the enforcement" — with zero test coverage of `tree_clean` itself. The mutation report read `false`, with a correct, self-consistent explanation of why reverting a deletion changes nothing the retained tests check, and it nearly landed on the strength of that explanation. So a `null` whose change now claims another mechanism is load-bearing, with nothing exercising that mechanism, still blocks — on the named gap, via `verdict.failures`, not on the absence of a mutation to run.

Agents have landed tests that rebuilt the production logic inside the test body and asserted against their own copy — one carried the comment `// Replicate the padding logic from the fix`. Reverting the fix and re-running them printed `ok`. They passed against the exact bug they were written to catch.

A `major` Review finding gates landing the same way: the work still commits, but `blockers` is non-empty, so the item does not close on it. Resolve it with another round of the verify loop — re-running the pass, or a follow-up pass targeted at the finding — never by editing the worktree by hand.

---

## Where a pass runs

**Every pass runs in a worktree. No exceptions, however small the change.** The user is usually standing in the primary checkout, and an agent committing underneath them is a collision they did not agree to.

Which worktree depends on whether the repo is collaborative — check the `origin` owner, not the directory:

**Solo (remote owned by `mcbridemusings`, or no remote).** Cut a throwaway worktree per pass from the primary checkout:

```
git rev-parse --show-toplevel                       # → <repo>
git -C <repo> worktree add -b <branch> ~/.worktrees/<repo-name>/<slug> <default-branch>
CLAUDE_PROJECT_DIR=~/.worktrees/<repo-name>/<slug> bash ~/.claude/hooks/worktree-link-locals.sh
```

`<slug>` is the tracker id lowercased; `<branch>` is `<type>/<slug>-<short-title>`. Land by merging into the default branch, then remove the worktree — **from the primary checkout, after the workflow returns**, because a session cannot outlive its own working directory. Exception: for `~/.claude`, land with `~/.claude/tools/claude-land <worktree>` run from inside the worktree — never a merge in the primary — then remove the worktree from the primary as usual.

**Collaborative (remote owned by anyone else).** The long-lived thing is the feature, not the pass. Make one herdr worktree for the body of work and keep it:

```
herdr worktree create --workspace <repo-workspace-id> --branch <feature>
```

Targeting `--workspace` is what nests it under the repo in the sidebar instead of detaching it to top level; never `herdr workspace create --cwd`, and never a custom `--label`. Checkouts land under `~/.worktrees/<repo>/<branch>`. Passes cut their throwaway worktrees off *that* branch and merge back into it, and only the feature branch ever becomes a PR.

**The link hook is run by hand and skipping it fails quietly.** Its normal trigger is a Claude session entering the directory, and none ever does — the workflow's stage agents inherit *this* session's `CLAUDE_PROJECT_DIR`. Without it the worktree has no `admin.toml`, no `.env*`, no `CLAUDE.local.md` and no `.claude/skills/verify-project`. The first two fail loudly on the first build; the last one produces a weak Verify verdict that reads exactly like a real one.

**Never `git worktree remove` or `rm -rf` from inside the checkout being removed.** `hooks/no-self-delete-guard.py` blocks it, and the reason is real: delete the directory a session runs in and every later hook fails to spawn with `ENOENT` before reaching its first line, so every PreToolUse, PostToolUse and Stop guard is silently skipped for the rest of that session.

**The branch is not yours to delete on a collaborative repo.** Its PR has not merged when the worktree finishes. `tools/git-sweep.sh`, run daily from `hooks/daily-git-sweep.sh`, collects branches proven merged along with any worktree still holding them.

---

## Cross-repo items

**A pass works exactly one repo.** The worktree confinement above is load-bearing, and this section does not lift it — an item that needs two repos gets split, never worked in one pass.

`~/.claude` and `~/.claude/skills` (`claude-skills`) are **two separate repos**, not one. The second is a git submodule nested inside the first, and its files sit right there in the parent's directory tree — `hooks/`, `tools/`, `tools/tests/` and `CLAUDE.md` live in `~/.claude`, while every skill, including `implement` itself, lives in `claude-skills`. Reading the directory tree does not tell you which repo a path belongs to; check its repo root before assuming a pass confined to one can touch it. Any repo with a nested submodule, or any item whose test lives in a harness repo beside the code repo, has the same shape.

An item touching both is split into one item per repo, wired with a dependency edge, and each half's brief says which repo it owns and names the other half's item id.

The Gate stage's third test (reachability) catches this automatically: an item naming a file, or carrying an acceptance criterion, outside the repo the pass is confined to fails the gate with a `missing` entry naming the out-of-repo path. That costs one cheap stage instead of a whole pass discovering the same thing at Verify, its last stage.

## Pre-flight

Run before anything else. If it fails, print the reason and stop.

**Refuse to start with a dirty working tree.** `git status --short -- . ':(exclude).beads' ':(exclude).claude'` — the exclusions are part of the check, not something to apply by eye afterwards. Non-empty means halt: *"Uncommitted changes present — commit, stash, or run /wrap-up first."*

Two path families are exempt because both are the session's own bookkeeping, not work in progress:

- **`.claude/`** — `scheduled_tasks.lock`, `papercuts.md`, `review-rejected.md`.
- **`.beads/`** — the tracker's export churn. `issues.jsonl` and `interactions.jsonl` are a passive export of a local Dolt database, rewritten by `bd` commands including the `bd show` a pass runs to resolve its own item. Halting on them means no pass can start after any earlier `bd` command, which is nearly every pass. Do not stash them and do not commit them to clear the check.

Anything else dirty is a real halt, including a file the user left half-edited.

The dirty-tree halt is judged in the checkout the pass will branch from. When that checkout is the primary `~/.claude`, a dirty file there belongs to another concurrent session sharing that index, not to this pass — it is not a halt, and the pass cuts its worktree from `main` regardless.

**No commit-count guard.** The invariant is one commit per *pass*, not per branch — a branch that goes N verify-loop rounds carries one commit per round, and that is correct, not accumulation. If a single pass ever produces two commits, that is a bug in the Wrap stage.

---

## Picking the model

**Sonnet by default; Haiku for mechanical work** — a rename, a string, a bounds check. Pass `model` explicitly on every call: omitting it makes the pass inherit this session's model, which is frequently Opus, and that is exactly the path a wrong tier takes into a run.

**Never Opus for a pass, and never Fable at all.** A pass follows a brief that already survived the readiness gate, in an isolated worktree, with its result re-checked before it lands. That is Sonnet's job. Opus is for deciding what to execute — which is what this session is doing. Fable is only ever chosen by the user, explicitly.

**A swarm round drawn from a well-defined, low-risk selector defaults to Haiku for the whole round**, not just per-item mechanical edits — `label:papercut`, `label:mechanical`, or any selector whose items already passed the scope gate on uniformly small, low-risk changes. Reach for Sonnet per-item only where an individual item's brief is heavier than the selector implies.

In swarm arity, say the split in the report: `slug → sonnet|haiku`, or a count per tier when it is large.

---

## Sequential arity

Resolve the selector into a frozen queue first — issue numbers, `#range`, `label:X`, `milestone:X`, `epic:X`, `followups`, `papercuts`. Then work it one at a time: pass, verify loop, land, next. Re-resolving the selector between items gets a different queue, because the backlog moved while you were landing branches.

Before freezing the queue, apply HANDOFF § 2's mount-file test to any items that would otherwise be sequenced only because they share a file: when that shared file is a mount file, the items leave the sequential queue and go out as a swarm instead.

- **Start from the default branch.** A continuous run branches from the head of the canonical line, never from a half-finished feature branch.
- **Land each before starting the next.** Each pass branches from the *current* head, so two in flight would race into the default branch. This is why sequential is sequential and not a `pipeline()`.
- **Cap the run at 20 items.** The cap is a safety valve, not a target.
- **An item-level failure skips to the next; an environment failure ends the run.** A tree that will not come back clean, or a pull that no longer fast-forwards, is the second kind — do not attempt the next item.
- **A halted pass stops the queue** (see the verify loop). Report which items never ran.

---

## Swarm arity

Every pass gets its own worktree and they run at once. The human is involved at exactly two moments: the gate before anything is dispatched, and the report after. In between there is no channel from a pass back to a person, and no way for one to exist. An item that turns out to be ambiguous costs its whole dispatch and waits for an `iron-out` pass.

**The scope gate, before anything is dispatched.** Read every in-scope issue and confirm each one is actually ready — a concrete plan, named files, an objective acceptance check. Exclude automatically and without asking: anything unlabelled or untriaged, anything whose body is a question, anything touching migrations, auth, payments, or deletion paths, and anything naming paths in two repos (see Cross-repo items above) — split it into one item per repo before it is dispatched. State what you excluded and why.

**No pass ever lands its own work.** `implement.js` ends at a commit and has no push in it at all — a stage that runs no `git push` has nothing to route around. `hooks/landing-guard.sh` makes that structural rather than remembered: one of its two predicates is that the caller is a subagent (the other is a worktree marked SELF-LAND), and on that one it denies `git push`, `git merge` into the default branch, `gh pr`/`gh issue` writes and `bd` writes from any implementation subagent. Prose instructions not to push have not held on their own; agents merged into `main` and closed their own issues against explicit clauses repeated four times.

**You land each pass as it returns**, from the primary checkout, after re-verifying against a base that may have moved. A linked worktree shares the object store, so every commit is already visible there — no fetch needed.

**Copy each verdict into the repo's own directory before removing a worktree.** `$(~/.claude/tools/repo-slug --path <worktree>)/verify/<item>.json` is keyed to a directory that is about to stop existing. The repo's copy is the one a later reader can find; without it, the outside view is indistinguishable from a swarm that skipped verification. Take the copy *after* the last `rechecks` append — a copy taken before a later round leaves the repo's copy reading stale for a branch that was actually re-verified. If you append a `rechecks` entry after already copying, re-copy before `worktree remove --force`.

**Never edit files that every change appends a row to** — a changelog, a file map, a component registry. Every sibling branch collides on them by construction. Passes return the rows in `followups` instead and you write them after landing. A mount file is the same shape — a root component, router table, barrel `index.*`, or plugin list that briefs only ever append a reference line to — and HANDOFF § 2 says how the brief gets rewritten so the pass returns the mount lines in `followups` instead of editing the file directly.

**Keep rounds small enough that a bad brief does not burn the frontier.** A round of N items is N passes at once; watch the running total in `/workflows`.

**A selector matching more than 8 items pilots first.** Dispatch a batch of at most 5, land those, and check the cost and failure rate in `/workflows` before dispatching the rest. Sequential arity already caps a whole run at 20 items; swarm arity has no run-level cap, so an oversized selector dispatches its entire count at once unless this step catches it first.

---

## Retiring a worktree

Teardown is yours because it is **structurally impossible for the pass**: git refuses to delete a branch a worktree still has checked out, and the pass is standing in it. Whatever created a resource retires it.

```bash
ls $(~/.claude/tools/repo-slug --path <worktree>)/verify/*.json    # every verdict in there, by name
test -f $(~/.claude/tools/repo-slug --path <repo>)/verify/<item>.json   # the copy you made
git -C <worktree> status --short          # must be empty
git log <default>..<branch>               # must be empty — fully merged
pgrep -f "<worktree>" | xargs -r ps -o pid=,comm=   # must be empty — nothing is standing in it
```

```bash
git -C <repo> worktree remove --force <worktree> \
  && git -C <repo> branch -d <branch>
```

**The first two lines are not a formality.** `worktree remove --force` is the last moment the verdict exists. If the copy is missing, make it now rather than removing the worktree — this is the check that stops a run's evidence disappearing one worktree at a time, each teardown looking perfectly clean as it goes. If a `rechecks` entry was appended after the copy was made, the copy is stale in the same way a missing one is: re-copy before removing.

**List the directory; do not just `test -f` the path you expect.** A `test -f` against one exact name passes vacuously when the pass wrote a differently-named file, and `--force` then deletes the only copy — including a complete `FAIL` verdict naming the exact cause, found only by listing. **Any `.json` in there that is not `<item>.json` blocks teardown**: copy it out under a name that includes the item and branch, then decide. Two passes in one round can both write a same-named stray file, and once copied to the primary checkout they are indistinguishable — so never copy one out under the name it already has.

**A live process in the worktree forbids teardown exactly as uncommitted work does.** `worktree remove --force` deletes the directory out from under whatever is standing in it, and that process keeps running against a path that no longer exists — a bundler or dev server left running inside keeps serving from a path that is now gone, and the failure surfaces later, inside whatever was consuming it, reading as a broken build rather than as teardown. A clean, fully-merged tree passes every other check and gives no warning.

**Refuse, do not name-and-remove.** In a queued or swarmed run this happens unattended, so "removed, and this killed the process" is still an unattended removal — the sentence lands in a report nobody reads until the app is already broken. Deferring costs one worktree's disk; the branch is already merged. Say which condition fired and which process holds it — worktree, item, pid, command — so the next pass retires it rather than re-deriving why it was skipped.

`pgrep -f` matches the command line, not the working directory: it catches a bundler, dev server or watch process launched with the path in its argv, and misses a bare shell that `cd`'d in. When it is empty and you still suspect a hold, `lsof +D <worktree>` walks the tree and answers for certain — slower, and worth it only then. Quote the path (it contains no metacharacters today, but a branch slug can), and use `xargs -r`: without it, BSD xargs still runs `ps` once when pgrep found nothing, with no pids to select on, so what prints depends on the calling terminal rather than on the worktree. Never `pgrep -fl` — an npm-exec process carries its whole inherited environment in the command column, so one match can run tens of thousands of characters.

**A gitignored file the pass created is invisible to every check above, and `hooks/worktree-remove-locals-guard.sh` denies the removal when one exists.** `git status --short` reads git's view, so a file git is told to ignore leaves it empty — a pass-created `admin.toml`, gitignored globally and never committed, passes every teardown check and then `--force` takes the repo's only copy of its build, test and dev commands. The guard compares the worktree against the primary checkout on the `pattern` names in `~/.config/repo/config.toml`, the same list `repo populate` brings in, and names the file it found. Copy that file to the primary checkout, then re-run the removal.

**No `push origin --delete`.** A pass does not push, so its branch exists only locally and there is nothing on the remote to delete — the command fails with `remote ref does not exist` and, chained with `&&`, makes a clean teardown read as a failed one.

**Retire the pass's device too**, if you gave it one — the platform cell has the teardown commands. It survives its pass and holds resources; a long run that skips this ends with one per item still alive.

---

## Reading a verdict someone else wrote

A verdict file is evidence, and these are the ways it lies.

| Symptom | What it means |
|---|---|
| verdict `PASS`/`SKIP` but `verified_parent` **names no object** | there is no verdict at all — the file is void, so **never land** the branch on it |
| `verified_parent` resolves and is **not** the branch head's parent | stale: something was committed after verification and is shipping unverified |
| `verified_parent` resolves, is not `branch^`, **and** a `rechecks` entry's `head` is the branch head itself | re-verified by the orchestrator at the shipping tree — the verdict is current; land it |
| a `PASS` in a returned object with no file on disk | not a pass |
| verdict `FAIL`, no `rechecks` entry carrying an `override` | the pass failed and nothing on disk justifies landing it — do not land; if it is already landed, that is an incident, not a formality |
| verdict `FAIL`, plus a `rechecks` entry whose `override.claim` matches the recorded failure and whose `head` is the branch head | the orchestrator rejected a specific claim and re-verified at the shipping tree — read the `why` and judge it; this is legible, not automatically correct, and an override is a written argument a later reader may disagree with |

Absent a `rechecks` entry whose `head` is the branch head, the stale row above still applies — a mismatch with no matching entry means shipping unverified, not a benefit of the doubt.

Resolve the sha before comparing anything:

```bash
git -C <worktree> cat-file -e <verified_parent>^{commit}   # void if this fails
git -C <worktree> rev-parse <branch>^                      # must equal verified_parent
```

A pass makes exactly one commit, so on an honest run those match. `cat-file -e` is what separates the first row from the second: a fabricated 40-hex string is valid hex naming nothing, and without this check it reads as an ordinary mismatch rather than as a void file.

**The sha comes out of `git -C <checkout> rev-parse HEAD`, run at the moment you write the file.** Never recalled from earlier in the pass, never reconstructed from a log line, never typed.

**The field is `verified_parent`, not `commit`, and the name carries the contract.** Verification runs before anything commits, so the sha it can read is the *parent* of the commit the work becomes. Writing it under `commit` would claim a commit was verified before it existed, and something downstream would then have to rewrite the file to make the claim true. Name it truthfully once and nothing has to correct it. There is no re-stamping stage and adding one back is a mistake: an agent asked to rewrite `commit` after the fact is being asked to write "this commit was verified" about a commit no stage verified, and the safety classifier refuses it as audit tampering — correctly.

**`rechecks` — the orchestrator's own rounds.** Only the orchestrator appends to this array, never a stage: a stage that wrote one would be making a claim about work it does not own. Each entry is `{by: "orchestrator", head: <sha the recheck commands ran against>, commands: [{cmd, expect, result}], at: <ISO timestamp>, override?}`, appended *beside* `verified_parent`, which is still never rewritten or re-stamped — the refusal above stands unchanged; this only adds somewhere for the orchestrator's own verification to live. `head` is resolved by `git -C <worktree> rev-parse HEAD` at the moment the commands run — never recalled, never reconstructed, the same rule as `verified_parent` above. The two fields name different things for a real reason: the pass verifies *before* anything commits, so a parent is the only sha it can name; the orchestrator verifies a tree that already exists as a commit, so it names that commit directly.

`override` is optional and absent from an ordinary re-verification entry — most `rechecks` entries confirm a `PASS` still holds and have nothing to override. Its presence is the only thing that makes landing a branch over a recorded `FAIL` (or `BLOCKED`) legible rather than invisible. When present it carries `{verdict, claim, why}`: `verdict` is what the pass's verdict said (`"FAIL"`, `"BLOCKED"`); `claim` is the exact failure string being rejected, quoted from the verdict's `failures`; `why` is why the *verdict* is wrong, not why the work is fine — a justification that the named failure does not describe a defect in the diff. Only the orchestrator may write it, same as the rest of the entry. It does not change `verdict`, which stays `FAIL` on disk forever, for the same reason nothing re-stamps `verified_parent`: the override sits beside the failure it rejects rather than erasing it, so a later reader sees both the original claim and the argument against it.

Worked example. A pass commits `c1b5700`; the verdict it writes carries `verified_parent: 4f72046` (`c1b5700`'s parent). The orchestrator then makes a tidy-up commit `fa9eea6` on top, re-runs every recheck command against the new tree, and appends one `rechecks` entry: `{by: "orchestrator", head: "fa9eea6", commands: [...], at: "2026-09-01T19:18:00Z"}`. Reading it later: `branch^` is `c1b5700`, which is not `verified_parent` (`4f72046`) — but a `rechecks` entry names the branch head `fa9eea6` in `head`, so the branch was re-verified by the orchestrator at exactly the tree that ships.

Worked example, with an override. The verdict at `/private/tmp/claude/.claude-skills/verify/cc-fyt.json` reads `verdict: "FAIL"`. Its single recorded failure named `hooks/subagent-push-guard.sh`, a file in the `~/.claude` repo outside `args.repo` that the pass could not reach — the acceptance criterion was wrong, not the code. The `claude-skills` half was correct: 60 passing tests, both suites green, the diff read by hand. The orchestrator landed the branch anyway, as `dbc4d2f`, merged `9399361`, and appended a `rechecks` entry making that legible: `{by: "orchestrator", head: "dbc4d2f", commands: [...], at: <ISO timestamp>, override: {verdict: "FAIL", claim: "hooks/subagent-push-guard.sh …", why: "the acceptance criterion named a path outside args.repo, so the pass could not have satisfied it — the failure describes the brief, not the diff"}}`. `verdict` on the cc-fyt file itself still reads `FAIL`; the override sits beside it, not over it.

**The second row above depends on "Wrap is the only stage that commits" actually holding, and it now does.** Edit and Green both halt the pass the instant they report they committed anyway, and Verify's `tree_clean` check — reading `git status --short` at the same moment it reads HEAD, by a different agent than the one that would have committed — returns `BLOCKED` instead of writing `verified_parent` when the tree is already clean, so a `verified_parent` that is not the branch head's parent really does mean something committed after verification, not before this was enforced. A verdict written before this held can still show the strongest possible case misread as the weakest: **observed on cc-22k round 2**, the Edit stage committed, Verify then read `verified_parent` as the branch head itself (not its parent), and the second row's check flagged a branch that had in fact been verified against exactly the tree that shipped. If you find a pre-existing verdict where `verified_parent` equals the branch head rather than its parent, that shape — not the general mismatch row above — is what it means: read the recheck commands and confirm them against the shipping tree yourself rather than discarding the verdict as stale.

---

## Halt conditions

- Pre-flight failed (dirty tree)
- A named issue is closed or missing
- Triage found nothing actionable, or its top pick is not already tracked
- The pass's AFK-ability gate failed — the item hides a decision the user owns. File `needs human input: <item> — <what's ambiguous>` via `followups` and stop; never guess-and-commit
- The gate's reachability test failed — the item names a path, or an acceptance criterion, outside the repo the pass is confined to (see Cross-repo items above). Split it into one item per repo and wire a dependency edge; never lift the confinement to reach the other repo from this pass
- Implementation produced no diff
- The build will not go green
- Verification returned `FAIL` or `BLOCKED`
- The verify loop exhausted five rounds
- Review surfaced a blocking finding that was not resolved

The Verify stage admits no partial pass and resolves doubt as `FAIL`. Do not soften a `FAIL` into a follow-up and proceed.

A `major` Review finding is not on this list — it does not halt the pass, the work still commits — but it does gate landing: it lands in `blockers`, exactly like a weak-test verdict, and the item does not close on it.

---

## Output

**Additive to `CLAUDE.md` §Finishing work, not a replacement.** **Files changed / Unchanged / Follow-up needed** and the **Run:** / **Look for:** steps still close the work — once for the run as a whole, not once per item. Then:

```
Implement complete: <one-sentence summary>. Halt: <reason | none>.

Backlog: X open issues (closed Y), Z ready.
```

In sequential or swarm arity also name: every item and its outcome, the `slug → model` split, every worktree still standing and why, the verdict files now in the primary checkout, and the run's token total read from `/workflows`. A run that lands six items should leave six verdicts behind; anything less means evidence went out with a worktree.

Computing the snapshot: on beads, `bd count --status open` plus `bd ready --json | jq length` for the unblocked figure; on GitHub, `gh issue list --state open --json number --limit 1000` and count. If the backend errors, omit the line rather than halting.

**The tracker is the only source for this line.** There is no roadmap file to consult — the dependency graph is the roadmap, and `iron-out` is what reads it. Never probe for `ROADMAP.md` or report its absence; a repo that keeps everything in beads is the normal case, not a gap worth a line of output.

---

## Notes

- One pass works **one** item. Never bundle two.
- This skill never invokes itself, and a pass never invokes it.
- A pass never writes to the tracker. This session closes the item, after landing, and only when verification returned `PASS` and something was actually committed — a weaker verdict does not close it.
