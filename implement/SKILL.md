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

**Editing this file does not change what a pass does.** Stage prompts live in `implement.js`; rules binding every stage live in [`STAGE-RULES.md`](STAGE-RULES.md) — including the Bash command rules, and the two that protect the saving above: no stage runs a build or test itself (that goes through `build-runner`), and no stage reads a screenshot (that goes through `screenshot-checker`). Raw build output was the largest single source of growth inside a pass; images were 84% of all tool-result bytes.

`tools/tests/implement-workflow.test.sh` and `skills/implement/implement.test.mjs` are what hold the script to its contract. Run both after editing it.

---

## What a pass returns

```js
{ ok: true, item, title, verdict, commit, branch, worktree,
  recheck: [{cmd, expect}],   // how YOU re-check it — empty means nothing machine-checkable
  blockers: [],               // empty means nothing the pass can see stops it landing
  review: {findings, blocking}, files, followups, summary }
```

A halt returns `{ok: false, halted_on, detail}` instead. **Branch on `ok` first** — a halt carries no `blockers` array, and reading one as "no blockers" is how broken work gets merged.

`blockers` empty is the pass's opinion, not a verdict. Yours comes next.

---

## The verify loop — this session's job, not the pass's

The implementer does not get to certify its own work. `implement.js` has a Verify stage run by a different agent than the one that wrote the code, and that is a filter, not the authority. **You re-run `recheck` yourself, in the worktree, and your result is what decides whether the branch lands.**

```text
r = Workflow(pass)
round = 1
loop
  if !r.ok                     -> halt: report r.halted_on and r.detail
  run every r.recheck[].cmd in r.worktree, compare against .expect
  review r's diff against the sha the pass started from
  if all clear and r.blockers is empty  -> land
  if round == 5                -> halt: leave the worktree standing, report the path
  r = Workflow(pass, args: {...args, worktree: r.worktree, resolved: {...item, body: the failures}}); round++
```

**Rounds 2..N relaunch `Workflow` on the SAME `worktree`, carrying the failures as the item body.** Pass `args.worktree` as the worktree round 1 already committed into, and `args.resolved` as the original item with `body` replaced by round 1's failure list — the recheck commands that failed and their real output. The pass re-enters the existing checkout with round 1's commit already in place; `name-pass.sh` still generates a fresh `scriptPath` per launch, so round 2 gets its own generated copy, and that is expected.

**Only *omitting* `worktree` cuts a fresh checkout that has never seen round 1's code.** Passing the same `worktree` reuses it.

**Tested 2026-09-01: a `Workflow`'s stage agents are not addressable.** They do not appear in `ListAgents`, and `SendMessage` to a stage's `agentId` returns `No transcript found for agent ID: …`. `resumeFromRunId` does not help either — an unchanged `(prompt, opts)` replays from cache, and round 2's new information (the orchestrator's failures) is not in any stage's prompt, so nothing about resuming re-runs anything.

**On exhaustion, halt — in every arity, including sequential and swarm.** Leave the worktree standing, print its absolute path, the failing command and its real output. The work is in there and it is the only copy; a removed worktree holding an unlanded branch is the one state nothing recovers from. In sequential this stalls the rest of the queue, and that is deliberate: five rounds failing is evidence the brief was wrong, which is a judgment the user holds.

**A verdict describes one tree.** If anything is touched after a clean recheck — a review nit, a last tidy-up — the verdict no longer describes what you are about to land. Re-run the recheck.

---

## Verification itself

`verify` owns what verification means; do not re-derive its method. Two things sit on top of it.

**Where `verify` lives, so you don't conclude it is missing.** It is bundled into the Claude Code binary — no file under `~/.claude/skills/`, absent from the skill listing. `find` comes up empty and the listing looks like it was never built; neither is evidence. `Skill(verify)` loads it anyway. Do not hand-roll the check, do not substitute a test run, and do not log a papercut about a missing skill.

**The project's own `verify` is the real one; the bundled skill is its bootstrap.** Driving a surface is never generic — a TUI needs a headless frame dump, an iOS app a simulator, a Worker a request against a dev server. The bundled skill works that out once per repo and writes `.claude/skills/verify-project/`, which shadows it afterwards.

- If `<repo>/.claude/skills/verify-project/` exists, that is the skill running. Trust it.
- If not, let the bundled skill write one, and check that what it writes names *this* repo's real surface and commands rather than a recipe that would read the same anywhere.
- **Keep it out of git.** Add `.claude/skills/verify-project` to `<repo>/.git/info/exclude` — never `.gitignore`, which is committed. If you find it tracked, untrack it.

**A pass that touched tests must prove the tests discriminate.** A test is evidence only if it fails without the change. `implement.js`'s Verify stage captures the production half as a patch, reverses it, runs only the new tests, and records `mutation.discriminates`. A `PASS` on a test-touching diff with no `mutation` block, or with `discriminates: false`, arrives in `blockers` — the work still commits, because a weak test is no reason to strand a correct implementation, but the item does not close on it.

Agents have landed tests that rebuilt the production logic inside the test body and asserted against their own copy — one carried the comment `// Replicate the padding logic from the fix`. Reverting the fix and re-running them printed `ok`. They passed against the exact bug they were written to catch.

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

`<slug>` is the tracker id lowercased; `<branch>` is `<type>/<slug>-<short-title>`. Land by merging into the default branch, then remove the worktree — **from the primary checkout, after the workflow returns**, because a session cannot outlive its own working directory.

**Collaborative (remote owned by anyone else).** The long-lived thing is the feature, not the pass. Make one herdr worktree for the body of work and keep it:

```
herdr worktree create --workspace <repo-workspace-id> --branch <feature>
```

Targeting `--workspace` is what nests it under the repo in the sidebar instead of detaching it to top level; never `herdr workspace create --cwd`, and never a custom `--label`. Checkouts land under `~/.worktrees/<repo>/<branch>`. Passes cut their throwaway worktrees off *that* branch and merge back into it, and only the feature branch ever becomes a PR.

**The link hook is run by hand and skipping it fails quietly.** Its normal trigger is a Claude session entering the directory, and none ever does — the workflow's stage agents inherit *this* session's `CLAUDE_PROJECT_DIR`. Without it the worktree has no `admin.toml`, no `.env*`, no `CLAUDE.local.md` and no `.claude/skills/verify-project`. The first two fail loudly on the first build; the last one produces a weak Verify verdict that reads exactly like a real one.

**Never `git worktree remove` or `rm -rf` from inside the checkout being removed.** `hooks/no-self-delete-guard.py` blocks it, and the reason is real: delete the directory a session runs in and every later hook fails to spawn with `ENOENT` before reaching its first line, so every PreToolUse, PostToolUse and Stop guard is silently skipped for the rest of that session.

**The branch is not yours to delete on a collaborative repo.** Its PR has not merged when the worktree finishes. `tools/git-sweep.sh`, run daily from `hooks/daily-git-sweep.sh`, collects branches proven merged along with any worktree still holding them.

---

## Pre-flight

Run before anything else. If it fails, print the reason and stop.

**Refuse to start with a dirty working tree.** `git status --short -- . ':(exclude).beads' ':(exclude).claude'` — the exclusions are part of the check, not something to apply by eye afterwards. Non-empty means halt: *"Uncommitted changes present — commit, stash, or run /wrap-up first."*

Two path families are exempt because both are the session's own bookkeeping, not work in progress:

- **`.claude/`** — `scheduled_tasks.lock`, `papercuts.md`, `review-rejected.md`.
- **`.beads/`** — the tracker's export churn. `issues.jsonl` and `interactions.jsonl` are a passive export of a local Dolt database, rewritten by `bd` commands including the `bd show` a pass runs to resolve its own item. Halting on them means no pass can start after any earlier `bd` command, which is nearly every pass. Do not stash them and do not commit them to clear the check.

Anything else dirty is a real halt, including a file the user left half-edited.

**No commit-count guard.** The invariant is one commit per *pass*, not per branch — a branch that goes N verify-loop rounds carries one commit per round, and that is correct, not accumulation. If a single pass ever produces two commits, that is a bug in the Wrap stage.

---

## Picking the model

**Sonnet by default; Haiku for mechanical work** — a rename, a string, a bounds check. Pass `model` explicitly on every call: omitting it makes the pass inherit this session's model, which is frequently Opus, and that is exactly the path a wrong tier takes into a run.

**Never Opus for a pass, and never Fable at all.** A pass follows a brief that already survived the readiness gate, in an isolated worktree, with its result re-checked before it lands. That is Sonnet's job. Opus is for deciding what to execute — which is what this session is doing. Fable is only ever chosen by the user, explicitly.

In swarm arity, say the split in the report: `slug → sonnet|haiku`, or a count per tier when it is large.

---

## Sequential arity

Resolve the selector into a frozen queue first — issue numbers, `#range`, `label:X`, `milestone:X`, `epic:X`, `followups`, `papercuts`. Then work it one at a time: pass, verify loop, land, next. Re-resolving the selector between items gets a different queue, because the backlog moved while you were landing branches.

- **Start from the default branch.** A continuous run branches from the head of the canonical line, never from a half-finished feature branch.
- **Land each before starting the next.** Each pass branches from the *current* head, so two in flight would race into the default branch. This is why sequential is sequential and not a `pipeline()`.
- **Cap the run at 20 items.** The cap is a safety valve, not a target.
- **An item-level failure skips to the next; an environment failure ends the run.** A tree that will not come back clean, or a pull that no longer fast-forwards, is the second kind — do not attempt the next item.
- **A halted pass stops the queue** (see the verify loop). Report which items never ran.

---

## Swarm arity

Every pass gets its own worktree and they run at once. The human is involved at exactly two moments: the gate before anything is dispatched, and the report after. In between there is no channel from a pass back to a person, and no way for one to exist. An item that turns out to be ambiguous costs its whole dispatch and waits for an `iron-out` pass.

**The scope gate, before anything is dispatched.** Read every in-scope issue and confirm each one is actually ready — a concrete plan, named files, an objective acceptance check. Exclude automatically and without asking: anything unlabelled or untriaged, anything whose body is a question, and anything touching migrations, auth, payments, or deletion paths. State what you excluded and why.

**No pass ever lands its own work.** `implement.js` ends at a commit and has no push in it at all — a stage that runs no `git push` has nothing to route around. `hooks/subagent-push-guard.sh` makes that structural rather than remembered: it denies `git push`, `git merge` into the default branch, `gh pr`/`gh issue` writes and `bd` writes from any implementation subagent. Prose instructions not to push have not held on their own; agents merged into `main` and closed their own issues against explicit clauses repeated four times.

**You land each pass as it returns**, from the primary checkout, after re-verifying against a base that may have moved. A linked worktree shares the object store, so every commit is already visible there — no fetch needed.

**Copy each verdict into the repo's own directory before removing a worktree.** `$(~/.claude/tools/repo-slug --path <worktree>)/verify/<item>.json` is keyed to a directory that is about to stop existing. The repo's copy is the one a later reader can find; without it, the outside view is indistinguishable from a swarm that skipped verification.

**Never edit files that every change appends a row to** — a changelog, a file map, a component registry. Every sibling branch collides on them by construction. Passes return the rows in `followups` instead and you write them after landing.

**Keep rounds small enough that a bad brief does not burn the frontier.** A round of N items is N passes at once; watch the running total in `/workflows`.

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

**The first two lines are not a formality.** `worktree remove --force` is the last moment the verdict exists. If the copy is missing, make it now rather than removing the worktree — this is the check that stops a run's evidence disappearing one worktree at a time, each teardown looking perfectly clean as it goes.

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
| a `PASS` in a returned object with no file on disk | not a pass |

Resolve the sha before comparing anything:

```bash
git -C <worktree> cat-file -e <verified_parent>^{commit}   # void if this fails
git -C <worktree> rev-parse <branch>^                      # must equal verified_parent
```

A pass makes exactly one commit, so on an honest run those match. `cat-file -e` is what separates the first row from the second: a fabricated 40-hex string is valid hex naming nothing, and without this check it reads as an ordinary mismatch rather than as a void file.

**The sha comes out of `git -C <checkout> rev-parse HEAD`, run at the moment you write the file.** Never recalled from earlier in the pass, never reconstructed from a log line, never typed.

**The field is `verified_parent`, not `commit`, and the name carries the contract.** Verification runs before anything commits, so the sha it can read is the *parent* of the commit the work becomes. Writing it under `commit` would claim a commit was verified before it existed, and something downstream would then have to rewrite the file to make the claim true. Name it truthfully once and nothing has to correct it. There is no re-stamping stage and adding one back is a mistake: an agent asked to rewrite `commit` after the fact is being asked to write "this commit was verified" about a commit no stage verified, and the safety classifier refuses it as audit tampering — correctly.

---

## Halt conditions

- Pre-flight failed (dirty tree)
- A named issue is closed or missing
- Triage found nothing actionable, or its top pick is not already tracked
- The pass's AFK-ability gate failed — the item hides a decision the user owns. File `needs human input: <item> — <what's ambiguous>` via `followups` and stop; never guess-and-commit
- Implementation produced no diff
- The build will not go green
- Verification returned `FAIL` or `BLOCKED`
- The verify loop exhausted five rounds
- Review surfaced a blocking finding that was not resolved

`verify` admits no partial pass and resolves doubt as `FAIL`. Do not soften a `FAIL` into a follow-up and proceed.

---

## Output

**Additive to `CLAUDE.md` §Finishing work, not a replacement.** **Files changed / Unchanged / Follow-up needed** and the **Run:** / **Look for:** steps still close the work — once for the run as a whole, not once per item. Then:

```
Implement complete: <one-sentence summary>. Halt: <reason | none>.

Backlog: X open issues (closed Y), Z ready.
```

In sequential or swarm arity also name: every item and its outcome, the `slug → model` split, every worktree still standing and why, and the verdict files now in the primary checkout. A run that lands six items should leave six verdicts behind; anything less means evidence went out with a worktree.

Computing the snapshot: on beads, `bd count --status open` plus `bd ready --json | jq length` for the unblocked figure; on GitHub, `gh issue list --state open --json number --limit 1000` and count. If the backend errors, omit the line rather than halting.

**The tracker is the only source for this line.** There is no roadmap file to consult — the dependency graph is the roadmap, and `iron-out` is what reads it. Never probe for `ROADMAP.md` or report its absence; a repo that keeps everything in beads is the normal case, not a gap worth a line of output.

---

## Notes

- One pass works **one** item. Never bundle two.
- This skill never invokes itself, and a pass never invokes it.
- A pass never writes to the tracker. This session closes the item, after landing, and only when verification returned `PASS` and something was actually committed. `SKIP` is not `PASS`.
