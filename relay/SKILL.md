---
name: relay
description: "Hand the next body of work forward into a clean context in the SAME pane: clear this session and feed it a distilled prompt, so one pane runs indefinitely at near-zero context carryover. Invoked at the end of `wrap-up` as its final step, and by `iterate` between passes. Requires HERDR_ENV=1. Handing work SIDEWAYS to another agent or process is `dispatch`, not this."
---

# Relay

A relay is a **forward** handoff: same pane, same repo, same seat, next body of work,
nothing running concurrently. This context dies so the next one starts clean.

That is a different axis from `dispatch`, which is a **sideways** handoff — another
agent or process, picked off the target ladder, running while you keep your seat.
The two share no mechanism. Relay never touches the target ladder; dispatch never
touches `/clear` or the Stop hook.

**One seam:** when the next body of work needs a different checkout, relay cannot
carry it — a pane's cwd is fixed for its lifetime. Call `dispatch` for that case
instead of reimplementing it, then relay this pane to the orchestration/watch role.

## Preconditions — check these before proposing anything

1. `test "${HERDR_ENV:-}" = 1`. Outside herdr there is no pane to clear. Say so and stop.
2. The current work is **finished and landed** — `wrap-up` has committed, pushed and
   landed. A relay clears the context; anything uncommitted is gone. Never relay over
   dirty work.

## Never fire blind

Relay always proposes and waits, with one exception: the `auto` token (passed by
`iterate`), which takes every default without asking.

The proposal is **one message, plain markdown, one free-text reply**. Never
`AskUserQuestion`, never a chip-picker — the answer is free-form (numbers, ranges,
"go", "B skip 3", "no relay"), which a fixed-option schema cannot express.

## Step 1 — decide whether there is a next body of work at all

A relay that manufactures busywork is worse than no relay. Stop conditions, checked
in order — if any holds, **decline the relay**, say which condition fired in one
line, and let the session end normally with the pane intact:

- The tracker (`gh` or beads, whichever the repo uses) has no open items in scope.
- Every remaining item needs the user in the loop — an HITL-labelled ticket, an open
  question, a decision, a credential, a device.
- The user's stated intent for the session is complete and nothing follows from it.

Otherwise, build 2–3 candidates. Rank them on all four of these, not just the tracker:

- **Stated intent** — the feature set, milestone, or goal the user named. Highest weight.
- **What just landed** — the natural next slice of the thing that was finished.
- **Cheap unblocker first** — a small piece of X that makes Y faster, even when Y is
  the stated goal. Say so explicitly when you rank one of these first.
- **Tracker state** — open issues, dependency frontier, `followups.md`.

## Step 2 — the proposal

One message. **Every default rides on the item it belongs to, and the ask is one
sentence.** Numbered so a reply can be terse.

> ⛔ **Never close with a block that restates the sections as a question.** Repeating
> *"Follow-ups — … / Next work — … / Relay — …"* under headings the reader just read is
> the same content twice, and a terminal renders the block-quote glyph so it looks like
> the message is quoting itself. The lists say what the choices are; the ask only says
> how to answer.

Plain markdown, no fenced block — a code fence renders as literal text and reads like
output rather than a question:

**Follow-ups**
1. **&lt;title&gt;** — one line. *[fix now]*
2. **&lt;title&gt;** — one line. *[file]*
3. **&lt;title&gt;** — one line. *[skip]*

**Next work**
- **A** *(default)* — &lt;title&gt;. &lt;one line: why this one&gt;
- **B** — &lt;title&gt;. &lt;one line&gt;
- **C** — &lt;title&gt;. &lt;one line&gt;

Then one sentence: *Reply* `go` *for the defaults — A, relay on — or override: e.g.*
`fix 1, B, no relay`.

Add a **Relay** line only when the default is not yes — relay unavailable, or you are
recommending against it. A yes-by-default relay is already named in that sentence.

`go` accepts everything. Anything else is a free-text override; apply it and, when
the override changes what the next prompt should say, restate the resulting plan in
one line before proceeding.

`no relay` means: apply the follow-up dispositions, then end the turn normally. The
pane stays. Nothing is cleared.

## Step 3 — apply follow-up dispositions

**fix now** — do it in this session, commit, push. Do this *before* writing the
marker, since the relay is going to erase your ability to.
**file** — `followups` skill, filed to the tracker.
**skip** — silent. Do not mention it again.

## Step 4 — write the marker

The prompt is the artifact. **Do not write a handoff document** — that is the
`handoff` skill, and only when the user asks for one by name.

The marker is transport, not a record: written, consumed by the Stop hook, deleted.

Resolve the repo root in its own Bash call — `git rev-parse --show-toplevel` — and
build every path absolute from it. `mkdir -p <root>/tmp/claude/relay` as a separate
call. Then `Write` to `<root>/tmp/claude/relay/next.md`.

### What goes in the prompt

Distil, don't compact. A compacted transcript is mostly noise the next session pays
for and does not need. Write the prompt a competent stranger could act on cold:

1. **The task** — one or two sentences, concrete. Not a feature name.
2. **Where it lives** — repo, the specific files or subsystem, `file.ts:265` style.
3. **The constraints that are not in the code** — decisions made and alternatives
   ruled out, and *why*. This is the only part that is genuinely unrecoverable.
4. **First action** — the exact first thing to do, specific enough to start without
   asking a question.
5. **How it ends** — name the skill that closes it out (usually `wrap-up`), so the
   loop continues rather than stopping after one hop.

Omit anything the next session can read for itself. No conversation replay, no
summary of what was just built beyond what constrains what comes next.

Redact secrets, hostnames, and personal infrastructure. Never write those into a file.

### Format

```markdown
<task, 1–2 sentences>

Repo: <absolute root>. <files / subsystem>.

Context you can't get from the code:
- <decision and why>
- <alternative ruled out and why>

Start by: <exact first action>

When it's done and landed, run /wrap-up.
```

## Step 5 — hand off and stop

Write the marker, then **end the turn**. Say one line: what the next session will
work on. Nothing else — no recap, no summary, no "let me know if".

The Stop hook (`~/.claude/hooks/relay-stop.sh`) sees the marker, consumes it, and
detaches `~/.claude/hooks/relay-send.sh`, which waits for this agent to go idle,
clears the pane, waits for the session id to change, and delivers the prompt to the
new session. You do not do any of that yourself, and you never call `herdr` for it —
doing it inline sends input into a session that is still busy, and Claude Code drops
it.

If the clear fails, the sender prompts into the existing context instead of losing
the work, and logs why to `<root>/tmp/claude/relay/relay.log`.

## `relay auto`

Skips Step 2 entirely: no proposal, no halt. Files every follow-up (never fix-now,
never skip), writes the marker, ends the turn.

Two callers, and they differ in who writes the prompt:

- **`iterate` and `orchestrate` hand you the brief.** They know what the next chunk or
  round is — the remaining queue, the iteration count, the frontier — and none of it is
  rediscoverable from the tracker. Write their brief through to the marker; do **not**
  run Step 1's ranking and do not substitute your own pick.
- **Everyone else** — run Step 1, take the top-ranked candidate, write it up per Step 4.

The Step 1 stop conditions still apply either way, and they are how an `auto` chain
terminates. An empty tracker or an all-HITL remainder ends the chain — it does not
invent work. A caller-supplied brief that says the run is over ends it too.
