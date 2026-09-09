# Verification and verdicts

## What a pass returns, in detail

`verdict_path` is the absolute path of the verdict JSON the pass wrote. `recheck` is how the orchestrator re-checks the work — empty means nothing machine-checkable. `blockers` empty means nothing the pass can see stops it landing. `review` is `{findings, blocking, major}`, or `null` when this launch spawned no code-reviewer over the current diff — a resumed pass that made further edits without re-reviewing them reports `null`, never a previous launch's numbers.

**A non-null `review` is a claim, not a fact — check it before landing on it.** `bash ~/.claude/tools/validate-review-claim <the pass's agent id>` looks for a `code-reviewer` meta record whose `parentAgentId` is that agent — exit 0 means the claim is backed, exit 1 means it isn't (treat as if `review` had come back `null`), exit 2 means the id itself doesn't resolve (can't validate). This is read-only and runs before merging, alongside the recheck commands.

## The verify loop's round mechanics

There is one loop and the orchestrating session owns it. A pass does not retry itself — it works the item once, verifies, and returns. This section is the loop the session runs after a pass returns, against what its own recheck found.

**On `r.halted_on == 'surface'`, start the surface named in `r.detail` and dispatch again — on the SAME worktree, not a fresh checkout.** This does not count against the two-launch limit; it is the environment catching up, not the work failing. If starting the surface does not succeed — the command errors, or the reachability check still fails after trying — fall through to the normal halt: leave the worktree standing and report `r.detail`, rather than retrying indefinitely.

**A second launch reuses the same worktree and carries the failures as the brief.** The brief names the worktree round 1 already committed into, the failing recheck commands with their real output, and `r.files` — round 1's touched files — so the agent fixes what failed rather than re-deriving the approach. The commit round 1 made is already in place.

**Two launches, then stop.** A second launch that still fails means the brief was wrong, and that is a judgment the user holds. In sequential arity, exhaustion stalls the rest of the queue, deliberately.

**Halt on oscillation before dispatching again.** If the failures you are about to hand back would undo a hunk the previous launch wrote, the item's criteria contradict each other. Stop, name both criteria and the file caught between them, and put it to the user.

**A verdict describes one tree.** If anything is touched after a clean recheck — a review nit, a last tidy-up — the verdict no longer describes what you are about to land. Re-run the recheck, and append the result to the verdict as a `rechecks` entry in the same breath — the re-verification and its record never separate. The file to append to is `$(~/.claude/tools/repo-slug --path <worktree>)/verify/<item>.json`.

## Verification itself

**The project's own `verify-project` skill owns what verification means; do not re-derive its method.** Driving a surface is never generic — a TUI needs a headless frame dump, an iOS app a simulator, a Worker a request against a dev server — so the recipe lives per repo, in `<repo>/.claude/skills/verify-project/SKILL.md`, and both halves of this skill read it: this session for the Verify bead, and the pass itself for its own verification.

**Where the recipe comes from, and why the pass reads a file rather than calling a skill.** The bundled `verify` skill is `disable-model-invocation`, so no agent can load it: `Skill(verify)` returns `Skill verify cannot be used with Skill tool ... Ask the user to run /verify themselves`, and only a person typing `/verify` gets it. A pass told to invoke it has no legal method at all. So the pass reads `verify-project/SKILL.md` as a file and follows it, and writes one when the repo has none. Do not hand-roll the check, do not substitute a test run, and do not log a papercut about the bundled skill being unreachable — that is the tool working as designed.

- **Resolve the path in the primary checkout, never the worktree.** `verify-project` is git-excluded, so a fresh worktree carries it only if the link hook ran (see below). Its absence from a worktree says nothing about the repo.
- If `<repo>/.claude/skills/verify-project/SKILL.md` exists, that is the recipe running. Trust it over anything generic.
- If not, the pass writes it — from this repo's `README.md`, `CLAUDE.md` and `admin.toml`, naming *this* repo's real surface and commands. Check what it wrote: a recipe that would read the same in any repo is the weak-verdict failure mode, not a bootstrap. A repo with no `verify-project` is never a gate failure; it is a repo that has not been bootstrapped yet.
- **Never name it `verify`.** That collides with the bundled skill, which is why the project skill has its own name.
- **Keep it out of git.** Add `.claude/skills/verify-project` to `<repo>/.git/info/exclude` — never `.gitignore`, which is committed. If you find it tracked, untrack it.

**A surface the brief names and that is not listening is `BLOCKED` with `halted_on: 'surface'`, not `SKIP`.** Before reading `verify-project/SKILL.md`, the pass checks every `host:port` and `http(s)://` URL named in the item body, its acceptance criteria, and that file, and any closed one halts the pass immediately rather than being discovered partway through. `SKIP` reads like a soft pass and nothing forces the environment up before the next launch, so it is the wrong verdict here. `SKIP` remains only for behaviour that cannot be observed for some other reason — no fixture data, no device — with every named surface already reachable. `FAIL` is still behaviour observed to be wrong.

**Data that contradicts the item's own model is `BLOCKED` with `halted_on: 'fixture'`, never `FAIL`.** A `FAIL` says the code is wrong and sends the next launch to change it; when the fixture is what is wrong, that launch edits working code to satisfy a row that should not exist. Ask once, before returning `FAIL` on a criterion you could not satisfy, whether the *data* is what is out of line — a seed row outside the numbering the item defines, a fixture predating the schema, a database filled from the constant this item is changing. If it is, name the row and the rule it violates and stop.

**A pass that touched tests must prove the tests discriminate.** A test is evidence only if it fails without the change. The pass captures the production half as a patch, reverses it, runs only the new tests, restores, and records `mutation.discriminates`, which has three states. `true` is evidence — the retained tests failed without the change. `false` is a blocker — a test was added and does not discriminate. `null` means the change was removal-only (deleted production code, or comment/documentation-only edits): there was no behaviour to reverse, so reversing it just restores the deleted code and the retained tests pass exactly as before — that is not a weak test, it is nothing to discriminate, and it is not a blocker. A `PASS` on a test-touching diff with no `mutation` block, or with `discriminates: false`, arrives in `blockers` — the work still commits, because a weak test is no reason to strand a correct implementation, but the item does not close on it.

A `null` still blocks when the change now claims another mechanism is load-bearing and nothing exercises that mechanism — on the named gap, via `verdict.failures`, not on the absence of a mutation to run. A self-consistent explanation of why reverting a deletion changes nothing is not evidence that the gap is closed.

A test that rebuilds the production logic inside its own body and asserts against that copy passes with the fix reverted. It is not evidence of anything.

A `blocking` or `major` review finding is fixed by the pass itself, in the same context, before it commits — it takes one review cycle, not two. A finding that survives that cycle goes in `followups` and the pass says so, rather than looping until the reviewer runs out of objections. Resolve what is left with a second launch of the verify loop, or a follow-up pass targeted at the finding — never by editing the worktree by hand.

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

**The field is `verified_parent`, not `commit`, and the name carries the contract.** Verification runs before anything commits, so the sha it can read is the *parent* of the commit the work becomes. Writing it under `commit` would claim a commit was verified before it existed, and something downstream would then have to rewrite the file to make the claim true. Name it truthfully once and nothing has to correct it. There is no re-stamping step, and adding one back is a mistake: rewriting `commit` after the fact claims a commit was verified that nothing verified.

**`rechecks` — the orchestrator's own rounds.** Only the orchestrator appends to this array, never the pass: a pass that wrote one would be making a claim about work it does not own. Each entry is `{by: "orchestrator", head: <sha the recheck commands ran against>, commands: [{cmd, expect, result}], at: <ISO timestamp>, override?}`, appended *beside* `verified_parent`, which is still never rewritten or re-stamped — the refusal above stands unchanged; this only adds somewhere for the orchestrator's own verification to live. `head` is resolved by `git -C <worktree> rev-parse HEAD` at the moment the commands run — never recalled, never reconstructed, the same rule as `verified_parent` above. The pass verifies before anything commits, so a parent is the only sha it can name; the orchestrator verifies a tree that already exists as a commit, so it names that commit directly.

`override` is optional and absent from an ordinary re-verification entry — most `rechecks` entries confirm a `PASS` still holds and have nothing to override. Its presence is the only thing that makes landing a branch over a recorded `FAIL` (or `BLOCKED`) legible rather than invisible. When present it carries `{verdict, claim, why}`: `verdict` is what the pass's verdict said (`"FAIL"`, `"BLOCKED"`); `claim` is the exact failure string being rejected, quoted from the verdict's `failures`; `why` is why the *verdict* is wrong, not why the work is fine — a justification that the named failure does not describe a defect in the diff. Only the orchestrator may write it, same as the rest of the entry. It does not change `verdict`, which stays `FAIL` on disk forever, for the same reason nothing re-stamps `verified_parent`: the override sits beside the failure it rejects rather than erasing it, so a later reader sees both the original claim and the argument against it.

Shape: a pass commits `C`, whose verdict carries `verified_parent` = `C`'s parent. The orchestrator makes a tidy-up commit `D` on top, re-runs every recheck command, and appends `{by: "orchestrator", head: "D", commands: [...], at: <ISO timestamp>}`. Reading it later, `branch^` is `C`, which is not `verified_parent` — but a `rechecks` entry names the branch head in `head`, so the branch was re-verified at the tree that ships.

An override entry adds `override: {verdict, claim, why}` beside that, where `why` argues the named failure does not describe a defect in the diff. The verdict on disk still reads `FAIL`.

**The second row above depends on "the pass commits once, after it verifies" actually holding.** The pass writes the verdict before it commits and reports `committed_early: true` if it broke that order, and `tree_clean` — read at the same moment as HEAD — is `false` on an honest run, so a `verified_parent` that is not the branch head's parent really does mean something committed after verification, not before. The orchestrator re-runs every `recheck` command itself rather than reading the verdict and believing it. If you find a pre-existing verdict where `verified_parent` equals the branch head rather than its parent, treat it as stale exactly as the general mismatch row above says: read the recheck commands and confirm them against the shipping tree yourself rather than trusting the verdict as written.

---

