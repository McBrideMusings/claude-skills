# Verification and verdicts

## What a pass returns, in detail

`verdict_path` is the absolute path of the verdict JSON the pass wrote. `recheck` is how the orchestrator re-checks the work — empty means nothing machine-checkable. `blockers` empty means nothing the pass can see stops it landing. `review` is `{findings, blocking, major}`.

## The verify loop's round mechanics

**On `r.halted_on == 'surface'`, start the surface named in `r.detail` and relaunch — on the SAME `worktree`, passing `round: round` (not a fresh checkout), exactly as a normal round 2+ relaunch does.** This does not count against the five-round exhaustion limit; it is the environment catching up, not the work failing. If starting the surface does not succeed — the command that should bring it up errors, or the reachability check still fails after trying — fall through to the normal halt: leave the worktree standing and report `r.detail`, rather than retrying indefinitely.

**Rounds 2..N relaunch `Workflow` on the SAME `worktree`, carrying the failures as the item body.** Pass `args.worktree` as the worktree round 1 already committed into, `args.round` as the loop's own counter, and `args.resolved` as the original item with `body` replaced by round 1's failure list — the recheck commands that failed and their real output — plus `files: r.files`, round 1's touched files. The pass re-enters the existing checkout with round 1's commit already in place; `name-pass.sh` still generates a fresh `scriptPath` per launch, so round 2 gets its own generated copy, and that is expected.

**A fix round (`round >= 2`) skips Gate, Locate and Review.** Round 1 already settled the approach and the files, so Gate and Locate would only re-derive what is already known; Review is skipped because by round 2 the diff is the whole branch, not just this round's fix, and re-reading it would re-flag round 1's already-accepted work. Edit receives round 1's files directly and fixes only the failures named in the item body — Green, Verify and Wrap still run in full.

**Only *omitting* `worktree` cuts a fresh checkout that has never seen round 1's code.** Passing the same `worktree` reuses it.

**Tested 2026-09-01: a `Workflow`'s stage agents are not addressable.** They do not appear in `ListAgents`, and `SendMessage` to a stage's `agentId` returns `No transcript found for agent ID: …`. `resumeFromRunId` does not help either — an unchanged `(prompt, opts)` replays from cache, and round 2's new information (the orchestrator's failures) is not in any stage's prompt, so nothing about resuming re-runs anything.

**In sequential arity, exhaustion stalls the rest of the queue, and that is deliberate:** five rounds failing is evidence the brief was wrong, which is a judgment the user holds.

**A verdict describes one tree.** If anything is touched after a clean recheck — a review nit, a last tidy-up — the verdict no longer describes what you are about to land. Re-run the recheck, and append the result to the verdict as a `rechecks` entry in the same breath — the re-verification and its record never separate. The file to append to is `$(~/.claude/tools/repo-slug --path <worktree>)/verify/<item>.json`.

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

