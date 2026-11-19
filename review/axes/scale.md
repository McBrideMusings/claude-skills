---
run: gated
when:
  - jev:
      noul: "The diff touches code whose cost grows with load: a loop over records, rows, files or requests; a database or network call; a cache, queue, pool or in-memory collection that persists across calls; a background job, worker or scheduled task; a lock, transaction or check-then-write sequence; or state held in one process that other processes or instances also need."
      min_p: 0.3
      min_confidence: 0.5
      state: diff
---

# Scale lens

Find code that is correct for one user and wrong for many. First find the expected load in the repo — the README, deploy config, a worker count, a cron schedule — one person running a script, or many users and processes at once. Judge every finding against that load, and open your report with one line naming the load you assumed and where you read it.

Look for:

- **Check-then-write races** — read a value, decide, then write, with no lock, transaction or conditional write between, so two concurrent callers both pass the check.
- **The same work done by every process** — a job, migration, warm-up or scheduled task that each instance runs when one should.
- **Memory or lists that only grow** — a cache, map, queue or log buffer with no bound, eviction or cleanup.
- **A query or network call per item** — a call inside a loop that one batched call could replace.
- **Quadratic work on big input** — a nested scan, a list `in` check inside a loop, repeated sorting, where the input can be large at the expected load.
- **Per-process state that must be shared** — a counter, rate limit, session or lock kept in one process's memory while several processes serve the same users.

A finding's **Bites** input names the load that triggers it: `two concurrent calls with the same orderId`, `10,000 rows in one import`, `4 workers started by the deploy`. A pattern that would only matter far above the expected load is not a finding.

Axis tag: `scale`.
