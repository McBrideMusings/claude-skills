# The project skill's `perf.md`

`<repo>/.claude/skills/project/perf.md` says what the project may cost while it runs, as
scenarios a program drives and limits a pass fails on. `implement` runs the scenarios a diff
needs after `verify.md`; `swarm`'s lead runs them again for each landing. A project with nothing
that runs (a library, a docs site) has a one-line `perf.md` saying so.

## Create

1. **Find the costs a person would feel.** For each runtime: CPU and memory at rest after
   launch, the time to settle after launch, the cost of the interactions people repeat (typing,
   scrolling, resizing, dragging, a request per page), and the traffic one part sends another
   (requests per minute, per event, per reply). Pick the ones that can grow with what a person
   accumulates — rows, files, sessions, accounts, windows.
2. **Write one script per scenario** under `tools/`, reusing `verify.md`'s launch and fixture
   helpers. Its fixture is the accumulated case, not one item. It drives the interaction on the
   app's own loop where the app has a debug surface for it (a request per step measures the
   request), reads numbers from the app and its counterpart (a frame-gap recorder, a request
   counter in the server's status, `ps`), prints one table, and ends with one `check` per limit.
   Build the counter or driver the script needs in the same change.
3. **Set each limit between today and broken.** Run the scenario on the current code and on a
   version with the regression the measure exists to catch (an earlier commit, or the change
   reverted locally); the limit sits between the two readings. A limit the broken version also
   passes measures nothing — change the fixture until it fails.
4. **Write `perf.md`**: a table of scenario, command and which diffs need it; per scenario what
   the fixture holds, a table of measure, limit, today's value and any target with the bead that
   reaches it; and the rule that a loaded machine (load average over the core count) reruns once
   before a failure counts.

## Audit

Run every scenario. A reading over its limit is a regression: file it, with the table, through
`issues file`. A reading far under its limit tightens the limit toward today's value plus room
for noise. A feature that landed since the last audit and runs per redraw, keystroke, frame or
request with no measure gets one. Update the "today" column from the run.
