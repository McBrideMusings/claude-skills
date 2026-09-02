---
name: relay
description: "Hand the next body of work forward into a clean context in the SAME pane: clear this session and feed it a distilled prompt. Invoked by `wrap-up` and `implement`. Requires HERDR_ENV=1. Handing work SIDEWAYS is `dispatch`, not this."
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

1. `test "${HERDR_ENV:-}" = 1`. Outside herdr there is no pane to clear. Say so and
   stop — today there is no forward-handoff mechanism outside herdr, so the session
   keeps its context and either pushes on or ends normally. Do not invent a substitute.
2. This pane's own checkout is **finished and landed** — `wrap-up` has committed,
   pushed and landed. A relay clears the context; anything uncommitted in *this*
   checkout is gone. Never relay over a dirty working tree.

   This does not forbid relaying while passes dispatched from this session are still
   running, or while a branch they returned sits unlanded in its own worktree — that
   is live state in a different checkout, not dirty work in this one, and it is
   carried forward by the in-flight manifest (below), not left behind.

## Never fire blind

Relay always proposes and waits, with one exception: the `auto` token (passed by
a queued `implement`), which takes every default without asking.

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

One message. **Every default rides on the item it belongs to, and the ask is one
sentence.** Numbered so a reply can be terse.

The closing line is one plain sentence asking how to answer — the lists above already say what the choices are.

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
`fix 1, B, no relay`. `no relay` is this skill's `park`.

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

## Relaying mid-run — the in-flight manifest

A session that dispatches passes also lands them — that is the architecture, and it
makes this session the bottleneck. Relay is its only valve. But a relay that carries
only "the next body of work" drops the state that is genuinely in flight: passes
still running, and branches already returned but not yet landed. Neither is next
work — both are live state, in worktrees this session alone knows about. Lose them
and the worktrees still sit on disk, but nothing in the fresh context knows they
exist, and `tools/git-sweep.sh` only collects branches it can prove merged — an
unlanded branch is stranded, and its commit is the only copy of that work.

So a mid-run relay appends a manifest section to the marker, one entry per pass that
is either running or returned-but-unlanded:

```markdown
## In-flight passes

- item: <id>
  branch: <branch>
  worktree: <absolute path>
  workflow: running | returned
  base: <sha the pass started from>   # when workflow: running
  run_id: <id>                 # breadcrumb for a human reading /workflows — a fresh
                                # session cannot query it; when workflow: running
  ok: true | false              # when workflow: returned
  halted_on: <reason or ->      # when workflow: returned
  verdict: <absolute path or -> # when a verdict file was written
  recheck: <command>            # repeat per not-yet-run recheck command
  recheck: <command>
```

**The refusal.** A pass whose `Workflow` call has not returned has no outcome this
session can write — relay does not guess it and does not sit and wait for it either.
`resumeFromRunId` is same-session only, so a fresh session has no way to query a run
id; a run id in the manifest is a breadcrumb for a human reading `/workflows`, never
an instruction to the fresh session. Record the pass as `workflow: running` with its
worktree and the base sha it started from, and put these four on-disk checks in the
prompt's **First action** field (Step 4, item 4) so they are the first thing the
fresh session does:

- `git -C <worktree> log --oneline <base>..HEAD` — did a commit appear after the relay?
- `git -C <worktree> status --short` — a dirty tree means it stopped mid-edit
- `ls $(~/.claude/tools/repo-slug --path <worktree>)/verify/` — was a verdict written?
- `pgrep -f <worktree>` — is anything still working in it?

Those four answer whether the pass finished and whether its work is safe, but they
cannot recover its return value — a relay loses `recheck`, `blockers`, `followups`,
and `review` for any pass still running at relay time. A pass with a commit and a
verdict on disk is verifiable from those artifacts; one with neither is work to redo.
If a pass is in flight and this session cannot even name its worktree — visibility
genuinely lost, not just still running — refuse the relay: say which pass it cannot
account for and stop rather than clearing over it.

This applies to `relay auto` too. A queued/mid-run `implement` skips Step 2's
proposal, but the manifest is not one of the defaults it gets to skip — every running
or unlanded pass still gets an entry.

**Worked example** — one pass still running, one returned and unlanded:

```markdown
## In-flight passes

- item: cc-7qz
  branch: cc-7qz
  worktree: /Users/pierce/.worktrees/claude-skills/cc-7qz
  workflow: running
  base: 3f1a76d2c9e8b4a015f6d7c2e1b0a9f8d7c6b5a4
  run_id: run_01HXYZ9K2M   # breadcrumb only — a fresh session cannot query this
  recheck: bash /Users/pierce/.claude/tools/tests/implement-workflow.test.sh

- item: cc-8rf
  branch: cc-8rf
  worktree: /Users/pierce/.worktrees/claude-skills/cc-8rf
  workflow: returned
  ok: true
  halted_on: -
  verdict: /private/tmp/claude/claude-skills/verify/cc-8rf.json
  recheck: bash /Users/pierce/.claude/tools/tests/implement-workflow.test.sh
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
the work, and logs why to `/private/tmp/claude/<repo-slug>/relay/relay.log`.

## `relay auto`

Skips Step 2 entirely: no proposal, no halt. Files every follow-up (never fix-now,
never skip), writes the marker, ends the turn.

Two callers, and they differ in who writes the prompt:

- **A multi-item `implement` run hands you the brief.** It knows what the rest of the run
  is — the remaining queue, the item count, the frontier — and none of it is
  rediscoverable from the tracker. Write its brief through to the marker; do **not**
  run Step 1's ranking and do not substitute your own pick.
- **Everyone else** — run Step 1, take the top-ranked candidate, write it up per Step 4.

The Step 1 stop conditions still apply either way, and they are how an `auto` chain
terminates. An empty tracker or an all-HITL remainder ends the chain — it does not
invent work. A caller-supplied brief that says the run is over ends it too.
