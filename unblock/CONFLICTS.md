# Unblock — conflicts

Loaded by [SKILL.md](SKILL.md) Phase U2 when `pr.mergeable == 'CONFLICTING'`, and only then.
Bring the branch up to date with its base and resolve every conflict.

**A project-local `<repo>/.claude/skills/resolve-conflicts/SKILL.md` wins over this file
entirely** — Phase U2 loads that instead when it exists. This is the generic path.

[RULES.md](../review/RULES.md) binds this file. **RULE 2 especially: the gate already decided
that conflicts get resolved. Do not re-ask.** Present the plan, then execute it. The only halt
is a hunk whose two sides genuinely mean different things.

**Never ask which branch.** `Target.branch` and `Target.base` were resolved in Phase U0.

## Phase C1 — Setup

**Check for a merge or rebase already in progress FIRST**, before touching anything. A second
`git merge` on top of an unfinished one compounds the mess:

```
git rev-parse --git-dir            # then read <git-dir>/MERGE_HEAD, <git-dir>/rebase-merge, <git-dir>/rebase-apply
```

Any of those exists → stop and report which. The user finishes or aborts it, not you.

The clean-tree and `fetch` checks already ran in Phase U1 and the tree was clean or the pass
stopped there. Do not re-run them.

## Phase C2 — Analyze divergence

```
git log --oneline <base>..HEAD              # branch_commits
git log --oneline HEAD..<base>              # main_commits
git log --merges --oneline <base>..HEAD     # merge_commits
```

**Sanity-check `branch_commits` before trusting it — the branch may not be based on the default
branch.** Stacked branches are common: cut `08` off `05` and `git log <base>..HEAD` counts 05's
commits as yours, inflating the number that decides the strategy in Phase C3.

```
git log --oneline --first-parent <base>..HEAD          # whose commits are these?
git branch --contains $(git rev-list --max-parents=0 <base>..HEAD | tail -1)
```

Commits belonging to another feature branch → say so and count only the ones authored for *this*
branch. A wrong base silently corrupts every downstream decision.

`main_commits == 0` → the branch is already current. Report it and hand back to Phase U2; that
means `mergeable` was stale, so re-read it.

## Phase C3 — Choose strategy

**Rebase** when ALL of these hold:

- `branch_commits <= 10`
- `merge_commits == 0` — rebase would flatten them
- **the commits are not already published where others build on them.** Check, don't guess — this
  is the condition that costs a force-push and someone else's afternoon:
  ```
  git ls-remote --heads origin <branch>                    # pushed at all?
  git rev-list --count origin/<branch>..HEAD               # unpushed commits only?
  gh pr list --head <branch> --json number,reviews         # open PR? reviewed?
  git branch -r --contains origin/<branch>                 # other branches built on it?
  ```
  Never pushed, or pushed with nothing depending on it → rebase is fine. Pushed **and** carrying
  an open PR with submitted reviews, or another branch contains it → **merge**, because rebasing
  rewrites what a reviewer already read.

**Merge** otherwise. Merge is the safe default.

Say which you chose and why, in one line, then proceed. This is a statement, not a question.

## Phase C4 — Attempt it

```
git rebase <base>              # rebase path
git merge <base> --no-edit     # merge path
```

Conflicts → Phase C5. Clean → the section below, which is not optional.

### A clean merge is NOT a correct merge — verify before believing it

git reports success when neither side touched the same *lines*. It knows nothing about whether
the two changes make sense together. Two branches that fix the same problem in different places,
or in the same file at a distance, merge clean and produce broken code.

Observed: `main` and a feature branch each fixed the same flaky test — different mechanism,
non-overlapping lines. git merged both happily and left duplicate declarations of three symbols.
Zero conflicts reported; the file did not compile.

So on a clean merge, **do not skip to Phase C6 on the strength of the exit code**:

1. **Run the project's build/typecheck** — look for a single `check` entry point; most repos have
   one. This is the cheapest detector of a semantic conflict and it is not optional.
2. **Read the diff of what came in** against what your branch already did — `git diff HEAD@{1}
   --stat` for the shape, then the full diff of any file BOTH sides touched. Ask specifically:
   did the other side solve a problem my branch also solved?
3. Anything broken → fix it now, as part of the merge, and say so.

## Phase C5 — Resolve

```
git diff --name-only --diff-filter=U
```

Read each conflicted file in full. Per conflict, work out both intents:

- What does the **branch** side intend? (between `<<<<<<<` and `=======`)
- What does the **base** side intend? (between `=======` and `>>>>>>>`)
- Does one side's change depend on the other?
- **Research intent, not just the diff.** Read the commit messages that introduced each side
  (`git log -p <commit>`, `git blame`) and, where relevant, the originating PR or issue.
  Understanding *why* a change was made resolves more conflicts correctly than comparing hunks.

**Print the plan, then execute it.** One block, in chat, before editing:

```
## Conflict resolution — <N> in <M> files

### <path> (N conflicts)

**1** (lines X–Y) — `high`
- Branch: <what it changed and why>
- Base:   <what it changed and why>
- Taking: <keep both / prefer one side / combine, and why>
```

**High- and medium-confidence resolutions execute immediately after printing.** The plan is the
record of what you did, not a request to do it (RULE 2).

**Low-confidence resolutions halt, and only those.** A hunk is low-confidence when the two sides
encode genuinely different intents and picking one silently discards the other's meaning. Print
those separately, at the end, with the question stated:

```
2 conflicts need you:

1. packages/leagues/src/cohort.ts:88 — main caps a cohort at 40, this branch caps at 32.
   Both are deliberate. Which cap survives?
2. ...

Everything else is resolved. Answer per item; the merge stays open until you do.
```

Then execute:

```
git add <resolved-files>
git rebase --continue          # rebase — repeat C5 for each subsequent commit's conflicts
git diff --check               # merge — verify no markers remain, then commit
```

Merge commit message: `Merge <base> into <branch>`.

## Phase C6 — Verify

- `git diff --check` — no conflict markers remain.
- `git log --oneline -5` — show the result.
- **Run the project's checks, and on the conflicted-merge path run them BEFORE committing.** Look
  for a single entry point first (`check` in package.json, a Makefile target, `just`/`task`);
  most repos have one that chains typecheck → lint → tests. Falling back to "typecheck, then
  tests, then lint" separately is the exception, not the plan.

  Ordering matters: a conflicted merge is not committed until Phase C5's last step, so failures
  found now are fixed *in* the merge commit rather than trailing it. A clean merge is already
  committed by git, so its failures become a follow-up commit — still fix them here.

- **A failing check is a stop.** Do not describe the merge as done. Fix it, or hand it to Phase
  U3's test gate, which is the thing that knows how.

## Hand back — this file never pushes

Return to [SKILL.md](SKILL.md) Phase U2 with what was done. The push is Phase U5's single
confirm, batched with everything else the pass did.

**One thing does travel with the hand-back: the rebase path needs `--force-with-lease`.** History
rewriting is its own decision under `CLAUDE.md`, so tell Phase U5 the push is a force, and its
confirm line must say so and say how many commits: *"push to `<branch>`? (force-with-lease,
rewrites 3 commits)"*.

## Principles

- **Resolve rather than abort — but abort when the merge's premise is wrong.** Default hard to
  seeing it through: don't `--abort` because the conflicts look tedious, span many files, or need
  a judgement call.

  The exception is narrow and real: **abort when continuing would encode a mistake, not resolve
  one.** Concretely — the two sides built the same thing independently and one should be dropped
  rather than merged; you are merging the wrong base (Phase C2); or resolving demands a decision
  only the user can make on *every* hunk, so there is nothing left to land. Then `--abort`,
  restore the branch, and surface what you found with a recommendation. Discovering the merge
  shouldn't happen is a legitimate outcome; grinding through it to avoid the word "abort" is not.
- **Additive on both sides** — keep both. If the base added lines and the branch added different
  lines nearby, include all of them in logical order.
- **Same code modified differently** — prefer the base's structural changes and re-apply the
  branch's behavioral intent on top.
- **Deleted on one side, modified on the other** — the branch's intent probably still matters.
  Low-confidence; it goes in the halt list.
- **Generated files: never hand-merge — take one side, then regenerate.** Lockfiles are the
  obvious case, but the class is wider and the others conflict just as often: checked-in
  baselines and snapshots (`*-baseline.json`, `__snapshots__/`), generated schemas (`schema.sql`),
  API/type codegen, bundled or minified output. A hand-resolved generated file is wrong even when
  it looks right, because it no longer matches what its generator produces. Take the base's copy,
  re-run the generator, commit the result. **This is the most common thing a repo documents in
  its `CLAUDE.local.md`** — read what is there before guessing at the generator.
- **Repeated merges: mention `git rerere`.** A long-lived branch merged against a moving base
  re-presents the same conflicts every time. If the branch has merged the base more than once,
  mention `git config rerere.enabled true` — git then replays your previous resolution. Suggest
  it; don't set a user's git config unasked.
