# Approach Comparison

Two or three **real implementations** of the same interface, run against the same fixture, measured.
For questions of the form "which technical approach should we use" — SQLite or Postgres for the queue,
polling or a websocket, one table or two, this library or hand-rolled.

If it's "does this state model hold up" → [LOGIC.md](LOGIC.md).

**First, split the comparison on what the answer actually is.** The two halves use different
transports, and picking the wrong one produces a confident answer to the wrong question:

- **A number decides it** — latency, memory, rows/sec, lines of code, hard cases passed. That's this
  file. Run it through the `terminal` skill's one-shot mode (the transport `delegate exec` sits on) so
  the measurement happens in a visible window and the output comes back verbatim.
- **A look decides it** — two or three approaches whose difference the user has to *see*, not read off
  a table. That's [UI.md](UI.md) with one `<template data-variant>` per approach, named for the
  approach. Everything below about a shared fixture and a stated criterion still applies; the fixture
  is just the same content rendered by each.

A comparison can be both: measure the numbers here, and if the numbers don't separate the approaches,
the remaining difference is usually one you have to look at.

The tell for *this* file: there is nothing to flip through and nothing to drive by hand — you want
numbers and the shape of the code side by side.

## When this is the right shape

- "Should this be a queue table or a real broker?"
- "Is the ORM fast enough here or do we need raw SQL?"
- "Which of these two API shapes survives the three hard cases?"
- Any decision that will be argued about later, where an argument costs more than an hour of code.

## The artifact

`<repo-root>/tmp/claude/prototypes/<slug>/v<N>/` — a directory per round, gitignored, run straight off
the path with the project's existing runtime (`bun tmp/claude/prototypes/queue/v1/run.ts`, `python
tmp/claude/prototypes/queue/v1/run.py`). The slug names what's being compared and never changes; each
new round is the next `vN` and earlier rounds stay put (see SKILL.md "Naming and versions"). No script
registered in `package.json` or the task runner, no production file touched, nothing in the repo
importing it.

```
tmp/claude/prototypes/<slug>/v<N>/
  QUESTION.md      <- the question, the fixture, and what would settle it
  fixture.<ext>    <- the input both implementations see, identical
  a-<name>.<ext>   <- implementation A, named for the approach, not the letter
  b-<name>.<ext>
  run.<ext>        <- runs every implementation against the fixture, prints the table
```

A second round reuses the fixture from the previous version so the numbers stay comparable — copy it
in rather than regenerating it, and say in `QUESTION.md` what this round changed.

## Process

### Phase 01 — Write the question and the deciding criterion first

Before any code, `QUESTION.md` states: the question, the two or three approaches, **what result would
decide it**, and what is out of scope. A comparison with no stated criterion always ends in "well, it
depends" — the criterion is what makes the run conclusive.

Criteria are concrete and named up front: p95 latency at N rows, memory at N rows, lines of code to
express the three hard cases, what each approach makes impossible later.

### Phase 02 — Define the one interface both sides implement

A single, small interface — the same function signatures or the same class surface — with each
approach behind it. If the two approaches can't fit one interface, that *is* the finding: say so, and
compare them on the code shape instead of forcing a fake symmetry.

### Phase 03 — Build one fixture, shared

One input, used identically by every implementation: the same rows, the same event sequence, the same
sizes — realistic ones. A fixture tuned to one approach's strengths makes the whole run worthless. If
the real data is available and safe to copy, dump a slice of it into the prototype directory.

Include the **hard cases** deliberately: the concurrent write, the duplicate, the out-of-order event,
the 10,000-row page. Those are what separate the approaches; the happy path never does.

### Phase 04 — Implement each approach for real

Real enough to be measured: actual SQL, actual network calls, actual library usage. Skip error
handling, tests, config, and abstraction — but never skip the part being compared. A mocked-out
database in a database comparison answers nothing.

Cap it: 2 approaches by default, 3 when a third is genuinely distinct. Each one is a spike, not a
product.

### Phase 05 — Run and measure

`run.<ext>` executes every implementation against the fixture and prints one table:

| Approach | p95 latency | Memory | LOC | Hard cases passed | What it precludes |
| --- | --- | --- | --- | --- | --- |
| a-sqlite-table | 4.1 ms | 22 MB | 78 | 3/3 | Multi-process consumers |
| b-redis-stream | 1.9 ms | 41 MB | 121 | 3/3 | Adds a service to deploy |

Run each more than once — a single timing is noise. State the machine and the conditions with the
numbers. Never report a measurement you didn't observe: if something couldn't be measured, print the
cell as "not measured" and say why.

### Phase 06 — Report, and don't decide

Give the table, then the **objective differences**: what each approach makes easy, what it makes
impossible, what it costs to operate, what it would take to switch later. Name the criterion from
`QUESTION.md` and say which approach met it — a measured verdict is fine, because it's measured. What
stays the user's: everything that turns on preference, appetite, or where the project is going.

Say plainly when the numbers don't separate the approaches. "Both are far under budget; this is a
maintenance-and-taste call, not a performance one" is a real and useful result.

### Phase 07 — Capture and delete

Write the answer and the numbers behind it somewhere durable — an ADR in `docs/adr/` is the natural
home for this shape, since the question was architectural. Then delete the prototype directory. The
table in the ADR is the artifact worth keeping; the code is not.

## Anti-patterns

- **Different fixtures per approach.** The single most common way to produce a confident wrong answer.
- **Measuring the wrong thing.** Timing a run that's dominated by startup, or an empty dataset, tells
  you about startup and empty datasets.
- **One approach implemented well and the other implemented grudgingly.** If one side is a strawman,
  delete the comparison — it will just launder a decision already made.
- **Comparing on style.** Readability arguments belong in the report as prose, not as a fake metric.
- **Skipping `QUESTION.md`.** Without a stated deciding criterion, the run produces a table nobody can
  act on.
- **Keeping the spike as the implementation.** It has no error handling and no tests; the winner gets
  written properly.
