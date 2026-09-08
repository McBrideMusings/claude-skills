# Chat format

The shapes a chat reply takes when it puts a choice, a slate of dispositions, a proposed doc body, or a finding in front of the user, and how each one closes. For the shape of an answer that draws a **structure** — a plan, a call chain, a component tree, a diff, a layout — see [`show-shape/SKILL.md`](show-shape/SKILL.md) instead; this file does not cover that.

## Option set

**When it applies.** A decision point with two or more mutually exclusive courses of action — before significant work, and at every decision point inside it (an interview question, a skill's routing step).

**The shape.** Numbered question, lettered options beneath it. Each option is a bolded line naming what physically happens — which file gets edited, what value gets written where, which process computes it, when — never a noun with no location. Bullets beneath state the strongest case for that option; the last bullet is always the cost. The option you'd pick is marked ` — my pick` on its bolded line, not with a separate marker. Options under one question are mutually exclusive; when two could sensibly combine, write the combination as its own lettered option rather than leaving it for the reader to compose.

**Worked example:**

> **1. Where does the retry count live?**
> **1A. Add a `retry_count` column to `jobs` in `queue.db`, incremented in the worker's catch block** — *my pick*
> - Survives a process restart — the count is durable, not in-memory
> - Cost: one migration, plus a backfill for in-flight rows
>
> **1B. Track it in a `Map<jobId, count>` inside the worker process**
> - No schema change, ships in one file
> - Cost: resets to zero on every worker restart, so a flaky deploy silently un-caps retries
>
> Answer `1A`, or type `go` to take every pick.

## Slate row

**When it applies.** A list of found items each needing a disposition — review findings, follow-up candidates, migration rows, anything with more than one item waiting on a per-item verb.

**The shape.** One numbered row per item: a **bolded action naming what physically happens and where** — which file, which tracker, which branch — optionally followed by one to three lines of specifics, with the default `[verb]` bracket at the end of the row's first line. The bracket is the default, not a separate sentence. A row with no default is malformed: `go` would have nothing to mean.

Definitions of `go`, `park`, and the row verbs (`fix`, `post`, `skip`, `file`, `hold`, …): [`CONTEXT.md`](CONTEXT.md).

**Worked example:**

> 1. **File slices 1–6 as beads issues** under a new epic, dependencies wired 1→2→3 and 4→5 `[file]`
> 2. **Add three terms to `docs/CONTEXT.md`** — Archive, Savings Band, Potential Savings, bodies quoted below `[write]`
> 3. **Write `docs/adr/0004`** — savings estimated per band from each Pipeline's own history, body quoted below `[write]`
>
> Type `go` to apply my picks as described, or answer per row (`1 fix, 3 skip, rest file`).

## Proposed body

**When it applies.** Any time a session is about to write a passage into a tracked file it doesn't own outright — a `docs/CONTEXT.md` term, an ADR, a PR description quoted before posting, a review verdict body. The rule from `CLAUDE.md`: content like this never lands unseen.

**The shape.** The full text goes in chat first, as a blockquote, exactly as it would be written — never a summary of what it will say. For a change to something that already exists, show the current body immediately beside the proposed one (`From:` / `To:`, or two blockquotes back to back) so the diff is readable without opening the file. Wait for the disposition before writing it.

**Worked example:**

> 1. **Write `docs/adr/0012-queue-backend.md`** `[write]`
>
> > ## Queue backend: Redis, not Postgres LISTEN/NOTIFY
> >
> > Job volume crossed 500/s; Postgres NOTIFY drops payloads over 8KB silently. Redis gives us reliable delivery and native retry counters.
>
> Type `go` to apply my picks as described, or answer per row (`1 write`).

## Finding

**When it applies.** A single reported defect or observation inside a review, audit, or survey pass — the unit that a slate row's title summarizes.

**The shape.** Each finding is exactly three parts, in this order, with **no blank line between them**:

1. **A numbered heading** — `### 1. <claim>`. The claim, not the topic. "relay never cleared the context, 3 attempts out of 3" beats "relay issues".
2. **One paragraph.** The evidence and the reasoning, run together as continuous prose. Quote the timestamp or the line inside the sentence. This paragraph is where the whole argument lives.
3. **One bolded fix line** — `**Fix:** …`. Exactly one, the recommended one.

Then **one blank line**, then the next finding.

**Hard rules:**

- **No line breaks inside a finding's paragraph.** Not for evidence, not for a quote, not for emphasis. If a quote is long enough to want its own line, it is long enough to paraphrase and cite instead.
- **No sub-lists inside a finding.** No `a)`/`b)`, no bullets, no nested numbering. A finding that seems to need branches is two findings, or one finding whose alternatives belong in a single sentence.
- **One fix, and it is bolded.** Rejected alternatives go in the paragraph as a clause — *"a `Stop` hook would fire at 10% precision, so the wording fix wins"* — never as their own line or option list.
- **No blockquote blocks.** Inline the quoted line with backticks inside the sentence.
- **No table of findings.** The numbered headings are the index.
- **Counts inline.** `3 of 12 sessions`, `7 of 9 blocked calls`, `334 of 830 turns` — inside the sentence, never as a separate stat line.

**Worked example.** The two below are the same finding. The first is the failure mode.

**Wrong — unreadable:**

```
## 1. relay failed to clear

The log shows three attempts:

> [09:08:51] agent never went idle

> [09:22:48] agent never went idle

Each gave up after 120s.

The consequence:

- 334 of 830 turns at 500k+ context
- 469 cache-reads per output token

**Fix shapes tested.**

(a) HOOKS: already a hook, nothing new.

(b) Raise the timeout.

(c) Diagnose the idle-wait.
```

**Right:**

```
### 1. relay never cleared the context — 3 attempts, 3 failures

All three relays this session logged `agent never went idle; prompting without clearing` at 09:08:51, 09:22:48 and 10:45:11, each giving up after exactly 120s, and `session before clear` stayed `2e434af4…` throughout — so no clear ever happened and every relay degraded to its fallback. That is the whole spend profile: 334 of 830 turns ran above 500k context at 469 cache-read tokens per token produced. The fallback itself worked perfectly three times out of three, so the thing to keep is the degradation path and the thing to fix is the idle-wait; raising the 120s window is the cheap guess, but every relay this session followed a `/loop`, which makes a pending `ScheduleWakeup` the likelier culprit and the first thing to test.

**Fix:** relay should say out loud when it could not clear, instead of degrading silently — the failure was only discoverable by reading `relay.log` afterwards.
```

## Hatch

**When it applies.** The end of every option set, slate, or findings list — anything waiting on the user closes with an escape hatch. `go` is the only accept word, whatever the shape of the ask; never `yes`, `post`, `approve`, `ok`, `confirm`, `send`, or a keyword lifted from the action itself.

Definitions of `go`, `park`, and the row verbs: [`CONTEXT.md`](CONTEXT.md). This file owns their shape on the page; that one owns what each word means.

**The three canonical sentences, byte-for-byte up to and including the opening parenthesis of the trailing example, and ending at `).` with nothing after it on the line.** Only the parenthetical's contents vary from site to site — it names two of that slate's own verbs, number-first (`1 run, 3 skip`, `1 fix, 3 skip, rest file`, `1 write, 2 skip`), never a generic placeholder and never trailing prose after the close paren.

Slates and findings, no next work pending:

> Type `go` to apply my picks as described, or answer per row (`1 fix, 3 skip, rest file`).

Slates and findings, with next work pending (a slate that also proposes what to do next names `park` beside `go` — both apply the identical dispositions, skips included, then `go` starts the next work and relays while `park` ends the turn):

> Type `go` to apply my picks and continue into <next work>, or `park` to apply them and stop, or answer per row (`1 fix, 3 skip`).

Option sets (reply grammar is number-first — `1A 2C`, not `A1 C2`):

> Answer `1A 2C`, or type `go` to take every pick.

**Worked example:**

> 1. Rewrite the retry backoff to exponential `[fix]`
> 2. Add a dead-letter queue for jobs that exhaust retries `[file]`
> 3. Migrate the queue schema — blocked on the retention-policy decision `[hold]`
>
> Type `go` to apply my picks and continue into the dead-letter-queue design, or `park` to apply them and stop, or answer per row (`1 fix, 2 skip, 3 hold`).

## Closing sections

**When it applies.** The end of every coding task, whatever skill produced it.

**The shape.** Three sections:

- **Files changed** — every file touched, one line each.
- **Unchanged** — only files a reader would have expected touched and weren't, each with the reason. "Nothing" is a real answer.
- **Follow-up needed** — what's left, if anything.

Then manual testing steps, always, unasked: **Run:** the exact commands, one per line. **Look for:** what a pass looks like.

**Worked example:**

> **Files changed**
> - `worker.py:142` — widened the retry catch to include `ConnectionResetError`
>
> **Unchanged**
> - `queue.db` schema — the fix doesn't need a new column
>
> **Follow-up needed**
> - Nothing
>
> **Run:** `pytest tests/test_worker.py -k retry`
> **Look for:** all 4 retry tests passing, including the new `test_connection_reset_retries` case
