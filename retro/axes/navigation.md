# Navigation lens — what did it cost to find the thing?

Search cost. Not reading, not deciding — **locating**. The agent knew what it needed and
spent turns discovering where it lives. Every such hunt has a one-line fix available (a
pointer naming the location) and no other lens proposes it.

## Boundary against `friction`

These two look at the same tool calls and must not double-report.

| | `friction` | this lens |
| --- | --- | --- |
| The unit | a **repeat** — the same file read twice, the same command re-run | a **hunt** — several *different* reads and greps converging on one fact |
| The verdict | the repeat was wasted; the agent already had it | the search was necessary *given what was in context*, and a pointer removes the need |
| Where the fix goes | papercut, or discipline in the owning skill | a pointer line in `CLAUDE.md`, a doc, or the skill that should have named it |

A session that read the same file three times is `friction`. A session that read six
*different* files before finding the one that answers the question is this. When a cluster
is genuinely both, file it once here and say so.

## Method

From `analyze.py`, reconstruct the read/search sequence per session and look for:

- **A convergent hunt** — a run of `Grep`/`Glob`/`Read` calls with no intervening edit or
  answer, ending on one file that then gets used. The length of that run is the cost.
- **A wrong-first-guess chain** — the agent opened two or more files that turned out not to
  hold the answer before the one that did.
- **Re-discovery across sessions.** The same hunt, run again in a later session, is the
  strongest finding available: the first session learned the location and nothing wrote it
  down. Count the sessions.
- **A hunt for something the environment already answers** — the agent grepped for a command
  that `admin.toml` or `--help` names. The fix is a pointer at the lookup, not a cache of it.

## Rank by hunts repeated across sessions, not by length

One eight-call hunt is a bad afternoon. The same three-call hunt in five separate sessions is
a missing pointer, and it will keep charging until one is written. Rank on recurrence.

## What is not a finding

- Exploration that *was* the task. Reading a subsystem to understand it is the work.
- A first-ever visit to an unfamiliar repo. There is no pointer that would have helped.
- A hunt that ended in a pointer being written. That is the system working; say so.
- A search the agent ran to *verify* a fact it already believed. That is the verify rule
  being obeyed, and it is not waste.

## The fix is a pointer, so it inherits the pointer rules

A proposed pointer that names a file and describes its contents is an index entry, and index
entries are read in 0.8–3.1% of sessions. Write it to
[`../../improve/POINTERS.md`](../../improve/POINTERS.md)'s three rules — front-loaded leading
word, one trigger per branch, no identity the body already carries — and state the branch
that should trigger it. **Prefer putting it where a skill will carry it** over a cold
`CLAUDE.md` line; the same pointer fires 2–9× better warm.

## Finding format

> **`<the fact being hunted>` cost `<n>` calls across `<m>` sessions.**
> Example: `<session>:<timestamp>` — `<the call sequence, trimmed>`, landing on `<file>`.
> **Where it should have been named:** `<file the pointer goes in>`.
> **Proposed pointer:** `<the actual line, written to POINTERS.md's rules>`.
> **Warm or cold:** `<the skill that would carry it | cold CLAUDE.md line, and why>`.

Axis tag: `navigation`.

**Before writing the `Fix:` line, test it against all five fix shapes** —
[../FIX-SHAPES.md](../FIX-SHAPES.md). Two matter most here. `SKILL-SHAPE`'s last rung, **add a
load trigger**, is the one this lens hits: the material existed and nothing pointed at it. And
`INFORMATION-ACCESS` is the boundary — a hunt for a fact that is not written down anywhere is
not a pointer problem, it is a missing surface.
