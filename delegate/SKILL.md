---
name: delegate
description: "`delegate <target>` — hand work to a child worker this session keeps managing: it starts the worker through the shared launcher with `--report-back`, watches it, reports to the person at every check (what it is doing, which stage, how long it has run, how long is left and why, and proof it is alive from its process CPU and output file), then reads the result, verifies it and lands or folds it in. Use when this session cannot or should not do the work in place but still owns the outcome: the session on `main` delegating a build to a worker in a worktree, a cross-vendor review, a swarm's lanes, a sweep. When the worker is the person's and this session steps away, that is `dispatch`, not this. Never an in-session subagent (the Agent tool)."
---

# Delegate

Control words (`go`, `park`, `dispatch`, `delegate`, `implement`, `verify` …) are defined in
[`../CONTEXT.md`](../CONTEXT.md).

`delegate` hands work to a worker and keeps the result. The person and this session manage the
worker together: this session watches it, tells the person how it is going, and when it ends
reads its report, checks it against the request and lands or uses it. When the worker is the
person's from the moment it starts, use [`../dispatch/SKILL.md`](../dispatch/SKILL.md) instead.

Where the worker goes, which checkout it works in and how the brief ends are shared with
`dispatch`: [`../dispatch/TARGETS.md`](../dispatch/TARGETS.md). The launcher, its verbs and the
transports are [`../dispatch/LAUNCH.md`](../dispatch/LAUNCH.md).

## 1. Plan before launch

- **Place and checkout** from TARGETS.md: the place the person named, asked when none; a worktree
  when the worker writes code.
- **Stages.** Name the worker's planned stages before it starts, in the order it will run them
  (`plan, edit, build, verify, review, gate` for an `implement` pass; `read diff, review, write
  findings` for a review). Every report places the worker on this list.
- **Expected duration**, with its basis: the last run of the same build or test (from a log or a
  CI timing), the size of the diff against a similar past pass, or "no basis yet" when none
  exists. A guess with no basis is said to be one.
- **Watch or wait** (§ 3), decided now and named in the launch line.

## 2. Launch

Write the brief as `dispatch` does (TARGETS.md § Where the work happens), with the
`Mode: delegated` line and the outfile it names. Then run, with the Bash tool's
`run_in_background` and a timeout above the expected duration:

```bash
"$HOME/.claude/skills/dispatch/dispatch" exec --job <job> --report-back --name "<what the work is>" <brief> <outfile>
```

Its first lines name the agent, the transport and the pane or space, and for a claude worker
`dispatch alive <outfile>`. Put the agent, place, outfile, stages, expected duration and watch
or wait in the first status line to the person. The background call's completion notification
is the signal that the worker finished.

## 3. Watch or wait

Not every worker needs live reports. Decide from the context:

| Watch: report at every check | Wait: report at the end |
| --- | --- |
| The person is waiting on the result and this session has nothing else to do meanwhile. | This session has its own work meanwhile and joins the result afterwards (a cross-vendor review beside this session's own review). |
| Expected to run longer than 5 minutes. | Expected to finish within 5 minutes. |
| It writes code, builds or runs tests. | It only reads and reports. |
| It went wrong before: a failed or stalled earlier run of the same work. | — |

Any one reason in the left column means watch. A waited-on worker that passes its expected
duration becomes watched from then on, with that said in the report.

## 4. Each check

A check runs at every turn this session gets while the worker runs — a notification, a message
from the person, a timer — and at least every 5 minutes. For the timer, arm the harness's
`Monitor` tool with a loop that prints one line per check and re-arm it when it expires:

```bash
while :; do "$HOME/.claude/skills/dispatch/dispatch" alive <outfile>; sleep 300; done
```

Each check reads the facts, then reports every one of them to the person, in chat (and on the
status page, § 5). A check that only writes a log or a page has not reported.

| Report | From |
| --- | --- |
| **Doing now** — the command or step it runs | `alive`'s last call, the worker's work-board declaration (`wheel status --json`, its pane's `work`), or the last lines of its pane (`wheel term read <pane>`, `herdr pane read <pane>`) |
| **Stage** — which of the planned stages | the same, placed on § 1's list |
| **Running for** | `alive`'s running time |
| **Left, and why** | § 1's expected duration minus the time so far, revised by what the stages show; say the basis |
| **Alive?** | `alive`'s process tree CPU and the last write time of the worker's transcript or output file — never the pane's screen text alone |

**A step with no new output for 5 minutes gets an explicit verdict**, copied from `alive`:
`alive and using CPU`, `alive and idle`, or `dead`. `alive and idle` and `dead` are said first in
the report with what to do next: a worker blocked on something this session cannot resolve (a
permission prompt, a question only the person can answer) is brought in front of the person — in
Wheel, `wheel pane pop <pane>` floats it over the grid, and once it moves again
`wheel pane pop <pane>` puts it back in its grid; elsewhere, the report names its pane. A dead one is
relaunched or reported as failed, never waited on.

A worker that `alive` has no process for (codex or reasonix in a herdr space) is judged by its
pane and its outfile; say that the CPU fact is missing and why.

Times pair UTC with the person's local time. The report is a table with one row per worker when
there are several.

## 5. Where the report lives

- **Wheel** (`WHEEL_ENV=1`): also a status page kept current —
  [`dashboard delegate`](../dashboard/kinds/delegate.md), posted with `--every 30` right after
  launch and pushed at every check. One page per worker; `end` it when the result is reported.
  A `swarm` run uses the Wheelhouse swarm pane instead (swarm § 4).
- **herdr or a plain terminal**: the same `dashboard delegate` slot, which posts to Canvas outside
  Wheel; when `dashboard post` fails there, chat only, said in one line.

## 6. When it ends

The background `exec` returns. Then:

1. Run `dispatch alive <outfile>` once more and read `<outfile>`. A missing or empty outfile, or a
   pane dump (exit 3), is a failed worker: say so with the exit code and last line.
2. Verify the result against the request's quoted words, case by case (TARGETS.md: a worker's
   "passed" closes nothing until the caller reads what its check drove).
3. Land or fold it in: a code worker's branch lands through `wrap-up <worktree>`; findings join
   this session's own work. This session removes the worker's worktree and closes its pane or
   space after landing (TARGETS.md § Where the work happens).
4. Report the outcome, and `end` the status page.
