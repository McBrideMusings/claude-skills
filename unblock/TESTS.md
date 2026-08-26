# Unblock — failing tests

Loaded by [SKILL.md](SKILL.md) Phase U3 when checks are red, and only then. Find out which tests
are failing, diagnose why each one fails, fix them, and hand back.

**A project-local `<repo>/.claude/skills/resolve-failing-tests/SKILL.md` wins over this file
entirely** — Phase U3 loads that instead when it exists, and should. This file carries the
method and deliberately names no CI job, test runner, or package script, because a hard-coded
name is wrong in every other repo.

[RULES.md](../review/RULES.md) binds this file. **RULE 2: the gate already decided that red
tests get fixed.** Diagnose, propose, fix. The halt is a test whose *correct expectation*
depends on the user's intent — not the fixing itself.

**Never ask what "the PR" or "the tests" means.** Phase U0 resolved both into `Target`. Read
them from the record; do not re-shell.

## What a project is expected to document, and where

When a repo has anything non-obvious here, it lives in that repo's `CLAUDE.md` /
`CLAUDE.local.md` — already in context before this file loads — or in its own
`resolve-failing-tests` skill:

- **Aggregator checks** — a required check that fails only because another check failed. It is
  never its own problem.
- **Sharded jobs** — how the shards are named, and that only the failing shard matters.
- **Rows that are not tests** — external autofix services, coverage bots, deploy previews.
- **The narrow run command** — how to run one project's suite without running the whole repo.
- **Known false-red conditions** — a suite that loses races under load, a port that must be free,
  a fixture that needs seeding, a dev server that must be killed first.

If the project documents none of it, fall back to what the CI output itself shows (Phase T1) and
say in one clause that you inferred the job semantics rather than reading them. **Then say, in
one line at the end of the pass, that this repo should have a `resolve-failing-tests` skill** —
you just paid the cost of not having one.

## Phase T1 — Read the failures

**PR path** (`Target.checks` has failing contexts):

```
gh pr checks <number>
gh run view --job <jobId> --log-failed
```

Separate real failures from noise before reporting anything. An aggregator row fails with no
failing test in its own log — mention it as "fails because X failed," never as a second failure.
`skipping` rows are path-filtered jobs with no relevant changes; they are not failures.

Read the tail of the log. What you want is the failure summary block: the file path, the
suite/test name, the assertion message, and the `file.ext:LINE:COL` frame. CI logs are ANSI-coded
and long — the summary sits at the very end, after all the passing lines.

**Local path** (no PR, or the repo has no CI): run the suite for whatever the branch touched,
**narrowest first**. Never open with a whole-repo check.

```
git diff --name-only <base>...HEAD      # which app/package changed
```

Then the matching project run. Check any known false-red condition the project documents before
believing a whole-repo red.

## Phase T2 — Diagnose each failure

Per failing test, answer three questions in this order. Do not skip to a fix.

**1. Did this branch cause it?**

```
git log --oneline <base>..HEAD -- <test file> <impl files it exercises>
```

Then reproduce the same test at the base — a scratch worktree, never by switching this one:

```
git worktree add /private/tmp/claude/<repo-slug>/unblock-base <base>
```

Fails at the base too → **pre-existing**. Say so plainly and do not silently absorb it into this
branch's work.

**2. Is it flaky?** Re-run the single test file 3× locally. Passes sometimes → flaky. A flaky
test is a real bug in the test or the code under it; do not label it flaky and move on. Name the
race.

**3. What does it actually assert?** Read the test file around the failing line and the code path
it drives. State the failure the way a non-programmer can check it: what the test set up, what it
expected, what happened instead — in the domain's own words, not the language of the assertion.

**Read the implementation file's top-of-file comment before proposing any structural change.** If
a header explains the design you are about to change, that header answers you first — quote it or
drop the change.

## Phase T3 — Print the diagnosis, then fix

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

**High- and medium-confidence items are fixed immediately after printing.** The block is the
record of what you are doing, not a request for permission (RULE 2).

**Whether the fix belongs in the test or in the code is the central call — say which and why,
every time.** Changing an assertion to match current behavior is only correct when the test
encoded the wrong expectation. If the code is wrong, fix the code. Never loosen an assertion, add
a retry, increase a timeout, or `skip` a test to get to green — if that is genuinely the only
path, stop and say so rather than doing it.

**Low-confidence items halt, and only those.** A test halts when its *correct expectation* is the
user's call — the code and the test disagree and both are defensible. Print those separately,
with the question stated, and fix everything else first:

```
1 test needs you:

3. cohort.test.ts:112 — the test expects a straggler to join the smallest cohort; the code now
   joins the newest. Which is right?

The other 2 are fixed and green. Answer when you can.
```

## Phase T4 — Fix

Per item:

- Edit the file the diagnosis named. Nothing else.
- Re-run **that test file alone** and show the result.
- If the fix does not take, go back to Phase T2 for that item — do not stack a second guess on
  top of the first.

Once every item passes individually, run the affected project's full suite (not the whole repo)
to confirm nothing next door broke.

## Phase T5 — Hand back

Report to [SKILL.md](SKILL.md) Phase U3:

- Files changed — one line each.
- Anything left red, and why.
- Pre-existing failures found, if any — offer to file them, don't file unasked.

**This file never pushes.** The push is Phase U5's single confirm, batched with everything else
the pass did. Never let a still-red test reach that confirm without being named in it.

## Not-mine PRs — report only

When `Target.mine` is false, Phase U3 loads this file for T1–T2 only. Produce the diagnosis, carry
it out as evidence, and **make no fix** — you do not edit or push a teammate's branch to get their
CI green. Findings that came from a failing test are the strongest kind to hand back, because the
log is the reproduction.
