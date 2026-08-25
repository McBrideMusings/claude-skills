# Review — test-health branch

Loaded by [SKILL.md](SKILL.md) Phase 00.1 when the test gate fires. Find out which tests are
failing, diagnose why each one fails, propose fixes, and hand back to the gate ladder.

Every confirmation here is a plain-chat line answered with a word — `go`, `1 3`, `hold`.
**Never use the `AskUserQuestion` tool.** RULE 0 in SKILL.md applies for the whole lifetime of
the review, and this file is inside it.

**Never ask what "the PR" or "the tests" means.** The gate already resolved both into
`BranchState` before loading this file. Read them from the record; do not re-shell.

## Where the repo-specific knowledge comes from

Nothing in this file names a CI job, a test runner, or a package script — those differ per
repo and a hard-coded name is wrong everywhere else. The project's own `CLAUDE.md` /
`CLAUDE.local.md` carries them, and both are already in context before this file loads.

What a project is expected to document there, when it has anything non-obvious:

- **Aggregator checks** — a required check that fails only because another check failed. It is
  never its own problem.
- **Sharded jobs** — how the shards are named, and that only the failing shard matters.
- **Rows that are not tests** — external autofix services, coverage bots, deploy previews.
- **The narrow run command** — how to run one project's suite without running the whole repo.
- **Known false-red conditions** — a suite that loses races under load, a port that must be
  free, a fixture that needs seeding.

If the project documents none of it, fall back to what the CI output itself shows (Phase 02)
and say in one clause that you inferred the job semantics rather than reading them.

## Phase T1 — Read the failures

**PR path** (`state.checks` has failing contexts):

```
gh pr checks <number>
gh run view --job <jobId> --log-failed
```

Separate real failures from noise before reporting anything. An aggregator row fails with no
failing test in its own log — mention it as "fails because X failed," never as a second
failure. `skipping` rows are path-filtered jobs with no relevant changes; they are not
failures.

Read the tail of the log. What you want is the failure summary block: the file path, the
suite/test name, the assertion message, and the `file.ext:LINE:COL` frame. CI logs are
ANSI-coded and long — the summary sits at the very end, after all the passing lines.

**Local path** (no PR, or the repo has no CI): run the suite for whatever the branch touched,
**narrowest first**. Never open with a whole-repo check.

```
git diff --name-only <base>...HEAD      # which app/package changed
```

Then the matching project run. Check any known false-red condition the project documents
before believing a whole-repo red.

## Phase T2 — Diagnose each failure

Per failing test, answer three questions in this order. Do not skip to a fix.

**1. Did this branch cause it?**

```
git log --oneline <base>..HEAD -- <test file> <impl files it exercises>
```

Then reproduce the same test at the base — a scratch worktree, never by switching this one:

```
git worktree add /private/tmp/claude/<repo-slug>/test-health-base <base>
```

Fails at the base too → **pre-existing**. Say so plainly and do not silently absorb it into
this branch's work.

**2. Is it flaky?** Re-run the single test file 3× locally. Passes sometimes → flaky. A flaky
test is a real bug in the test or the code under it; do not label it flaky and move on. Name
the race.

**3. What does it actually assert?** Read the test file around the failing line and the code
path it drives. State the failure the way a non-programmer can check it: what the test set up,
what it expected, what happened instead — in the domain's own words, not the language of the
assertion.

**Read the implementation file's top-of-file comment before proposing any structural change.**
If a header explains the design you are about to criticize, that header answers you first —
quote it or drop the finding.

## Phase T3 — Propose, then wait

One block per failing test, in chat. Never a file, never a page.

```
## N failing

### 1. <test name>
`<path/to/file.test.ts:LINE>` — <suite > test>

**What it expected:** <plain words>
**What it got:** <plain words, real values from the run>
**Why:** <the actual cause, one or two sentences>
**Cause:** this branch (<commit>) | pre-existing at <base> | flaky (<the race>)
**Fix:** <one sentence — which file, what changes>
**Confidence:** high | medium | low
```

Then one line: ``Reply `go` for all, or the numbers you want.``

**Whether the fix belongs in the test or in the code is the central call — say which and why,
every time.** Changing an assertion to match current behavior is only correct when the test
encoded the wrong expectation. If the code is wrong, fix the code. Never loosen an assertion,
add a retry, increase a timeout, or `skip` a test to get to green — if that is genuinely the
only path, stop and say so rather than doing it.

Flag low-confidence items explicitly; do not bury them among confident ones.

## Phase T4 — Fix

On approval, per approved item:

- Edit the file the diagnosis named. Nothing else.
- Re-run **that test file alone** and show the result.
- If the fix does not take, go back to Phase T2 for that item — do not stack a second guess on
  top of the first.

Once all approved items pass individually, run the affected project's full suite (not the whole
repo) to confirm nothing next door broke.

## Phase T5 — Report and hand back

- Files changed — one line each.
- Anything left red, and why.
- Pre-existing failures found, if any — offer to file them, don't file unasked.

**Commit and push are a separate yes**, and they are this file's own confirm — the gate does
not suppress it. One plain line: *"Fixed 2, both green. Commit and push to `<branch>`?"* —
`go` / `hold`. Never push while anything is still failing, and never describe the PR as fixed
before the push lands.

Then return to SKILL.md Phase 00.1, which **re-probes `BranchState` from scratch** and
restarts the gate ladder. Fixing tests moves `lastCommit`, which is an input to the novelty
gate; carrying the old record forward would skip a gate that should fire.

## Not-mine PRs — report only

When `state.mine` is false the gate loads this file for Phases T1–T2 only. Produce the
diagnosis, carry it into the review report as evidence, and **make no fix offer** — you do not
edit or push a teammate's branch to get their CI green. Findings that came from a failing test
are the strongest kind to post back, because the log is the reproduction.
