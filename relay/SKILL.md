---
name: relay
description: "Hand the next body of work forward into a clean context in the SAME pane: clear this session and feed it a distilled prompt. Invoked by `wrap-up` and `implement`. Requires HERDR_ENV=1."
---

# Relay

Control words (`go`, `park`, `dispatch`, `implement`, `verify` …) are defined in
[`../CONTEXT.md`](../CONTEXT.md).

A relay hands the next body of work **forward**: same pane, same repo, same seat, next body
of work, nothing running concurrently. This context dies so the next one starts clean.

That is a different axis from `dispatch <target>`, which hands work **sideways** — another
agent or process, picked off the target ladder, running while you keep your seat.
The two share no mechanism. Relay never touches the target ladder; dispatch never
touches `/clear` or the Stop hook.

**One seam:** when the next body of work needs a different checkout, relay cannot
carry it — a pane's cwd is fixed for its lifetime. Call `dispatch` for that case
instead of reimplementing it, then relay this pane to the orchestration/watch role.

## Preconditions — check these before proposing anything

1. `test "${HERDR_ENV:-}" = 1`. Outside herdr there is no pane to clear. Say so and
   stop — today there is no mechanism for carrying work forward outside herdr, so the session
   keeps its context and either pushes on or ends normally. Do not invent a substitute.
2. This pane's own checkout is **finished and landed** — `wrap-up` has committed,
   pushed and landed. A relay clears the context; anything uncommitted in *this*
   checkout is gone. Never relay over a dirty working tree — see §Relaying mid-pass
   below for the one case that is clean enough to allow.

## Never fire blind

Relay always proposes and waits, with one exception: the `auto` token, which takes
every default without asking.

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
- **Tracker state** — open issues, dependency frontier.

## Step 2 — the proposal

One message, same shape as [`../wrap-up/SKILL.md`](../wrap-up/SKILL.md) Phase 6 Step A's
follow-up-plus-next-work ask, which this skill's own proposal follows: the follow-up
candidates as slate rows per [`../CHAT-FORMAT.md`](../CHAT-FORMAT.md) §Slate row, then, when
proposing a next body of work, **question 2** per §Option set, with options `2A` / `2B` /
`2C`, pick marked ` — my pick`, no `(default)` marker, then the canonical park hatch from §Hatch
naming the picked next work. `no relay` is this skill's own per-row redirect word on top of that
hatch — it declines the relay half of a `go` without changing any follow-up disposition.

Plain markdown, no fenced block — a code fence renders as literal text and reads like
output rather than a question.

`go` accepts everything, including the picked next-work option, and relays into it. Anything
else is a free-text override; apply it and, when the override changes what the next prompt
should say, restate the resulting plan in one line before proceeding.

`no relay` means: apply the follow-up dispositions, then end the turn normally. The
pane stays. Nothing is cleared.

## Step 3 — apply follow-up dispositions

**fix** — do it in this session, commit, push. Do this *before* writing the
marker, since the relay is going to erase your ability to.
**file** — `backlog file` skill, filed to the tracker.
**skip** — silent. Do not mention it again.

## Step 4 — write the marker

The prompt is the artifact. **Do not write a separate summary document** — the brief below
is the whole of what the next session needs, and nothing else writes one on the user's behalf.

The marker is transport, not a record: written, consumed by the Stop hook, deleted.

**Get the directory from `~/.claude/tools/repo-slug --path`**, which prints
`/private/tmp/claude/<repo-slug>` and creates it. Never work the slug out yourself: it and
`hooks/relay-stop.sh` read the same definition (`hooks/repo-slug.sh`), and a slug you derive
by hand can differ — a worktree and its main checkout share a directory name, so guessing
puts the marker where the hook never looks and the relay silently does nothing.

Then `Write` to `<that path>/relay/next.md`, creating the `relay/` subdirectory first.

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

## Relaying mid-pass

`implement` runs a pass itself, synchronously, in one session — there is no separate
agent it dispatched that could still be running elsewhere, so there is nothing to poll
and no return value that could go missing. What can still be genuinely in flight is
this session's own unfinished pass: a branch with some commits already on it (per
`implement`'s commit-by-branch rule) but not yet through the gate.

Precondition #2 above already governs this: relay refuses over a dirty working tree.
So a mid-pass relay is only possible when the branch is currently clean — between two
of the pass's own commits, on a non-default branch or in a worktree, never mid-edit on
the default branch (nothing there is committed until `wrap-up` runs). When it is
possible, the marker's **First action** (Step 4, item 4) names the branch and worktree
and says to resume `implement` on that item from where its own git history shows it
left off — the fresh session re-verifies rather than trusting anything about the state
it inherits.

## Step 5 — carry the brief forward and stop

Write the marker, then **end the turn**. Say one line: what the next session will
work on. Nothing else — no recap, no summary, no "let me know if".

The Stop hook (`~/.claude/hooks/relay-stop.sh`) sees the marker, consumes it, and
detaches `~/.claude/hooks/relay-send.sh`, which waits for this agent to go idle,
clears the pane, waits for the session id to change, and delivers the prompt to the
new session. You do not do any of that yourself, and you never call `herdr` for it —
doing it inline sends input into a session that is still busy, and Claude Code drops
it.

If the clear fails, the sender prompts into the existing context instead of losing
the work, and logs why to `/private/tmp/claude/<repo-slug>/relay/relay.log`.

## `relay auto`

Skips Step 2 entirely: no proposal, no halt. Files every follow-up (never fix,
never skip), writes the marker, ends the turn.

Run Step 1, take the top-ranked candidate, write it up per Step 4.

The Step 1 stop conditions are how an `auto` chain terminates. An empty tracker or an
all-HITL remainder ends the chain — it does not invent work.
