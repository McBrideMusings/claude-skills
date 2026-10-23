---
name: relay
description: "Hand the next body of work forward into a clean context in the SAME pane: clear this session and feed it a distilled prompt. Invoked by `wrap-up` and `implement`. Requires a herdr pane (HERDR_ENV=1) or a Wheel terminal pane (WHEEL_ENV=1)."
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
carry it — a pane's cwd is fixed for its lifetime. When the user asked for a relay, say so in
one line and ask whether to `dispatch` it instead; never dispatch in place of a relay they
named. When relay chose itself, call `dispatch` rather than reimplementing it, then relay this
pane to the orchestration/watch role.

## Preconditions — check these before writing the marker

1. `test "${HERDR_ENV:-}" = 1 || test "${WHEEL_ENV:-}" = 1`. Outside herdr and Wheel there is
   no pane to clear. Say so and stop — there is no mechanism for carrying work forward outside
   them, so the session keeps its context and either pushes on or ends normally. Do not invent
   a substitute.
2. This pane's own checkout is **finished and landed** — `wrap-up` has committed,
   pushed and landed. A relay clears the context; anything uncommitted in *this*
   checkout is gone. Never relay over a dirty working tree — see §Relaying mid-pass
   below for the one case that is clean enough to allow.

## Never fire blind

Relay always proposes and waits, with one exception: an `implement … auto` run
([§Auto](#auto)), where the user's one command already covered every hop.

The proposal is **one message, plain markdown, one free-text reply**. Never
`AskUserQuestion`, never a chip-picker — the answer is free-form (numbers, ranges,
"go", "go iron-out label:client", "no relay"), which a fixed-option schema cannot express.

## Ending

The one way a run ends. `wrap-up` Phase 6 calls it; no other procedure ranks or proposes next
work. It never ranks by hand and never offers lettered
next-work options: the tracker's answer is `next-work`'s verdict.

1. **Run `next-work`.** `~/.claude/tools/next-work <repo> --focus "<focus>"`, where `<focus>` is
   the selector the run started with, exactly as typed, or `ready` when none was given. Add
   `--auto` in an `auto` run. A free-text focus is resolved here with `issues next focus=`, and
   the ids go in `--scope-ids`. On a GitHub-tracked repo, run `gh issue list --state open`
   beside it. The focus is resolved again at every hop, so beads filed mid-run join it.
2. **Print its output in chat**, unedited: the session line, the scope, the ranked rows and the
   `Next: <command> — <reason>` line. The `Next:` line is the pick. A message written without
   this output printed is not ready to send.
3. **Slate, then `Next:`.** When the caller has a follow-up slate (`wrap-up` Step A, a swarm's
   or iron-out's own), it goes under the output as slate rows per
   [`../CHAT-FORMAT.md`](../CHAT-FORMAT.md) §Slate row, and the `Next:` line comes last.
4. **Close with the hatch** from [`../CHAT-FORMAT.md`](../CHAT-FORMAT.md) §Hatch, byte-for-byte:
   - next work pending: "Type `go` to apply my picks and continue into <the `Next:` command>,
     or `park` to apply them and stop, or answer per row (`1 fix, 3 skip`)."
   - no next work (verdict `none`, or `focus finished` in an auto run): "Type `go` to apply my
     picks as described, or answer per row (`1 fix, 3 skip, rest file`)." — `go` alone, no
     `park`.

   `go` takes every pick and relays into the `Next:` command. `park` applies the same
   dispositions and ends the turn with the pane intact. A typed override replaces the command
   and keeps everything else: `go iron-out label:client` relays into
   `issues iron-out label:client` and carries that selector as the new focus. `no relay` stays
   this skill's redirect word: apply the follow-up dispositions, end the turn, clear nothing.
5. **Session limits change what `go` does, never the output.**
   - Outside herdr and Wheel (Precondition 1 fails) there is no pane to clear: `go`
     continues in this context. The tool already replaces a `swarm` verdict with the top bead's
     `implement` pass.
   - In a linked worktree (`git rev-parse --git-dir` differs from `--git-common-dir`), print the
     `Next:` line as information, with no `go` into it and no `park`; follow-ups stay available
     and close with the no-next-work sentence. A worktree is retired when its pass lands, so no
     new work starts in it.
6. **Apply the follow-up dispositions** (Step 3), then write the marker (Step 4) for the
   `Next:` command, carrying the `Focus:` line.

Preconditions 2 and the worktree seam gate the marker, never the printed output. Precondition 1
stops only the pane clear: outside herdr and Wheel, §Ending still prints the verdict and `go` continues in
this context. When the user asked for a relay by name and the verdict is `none`, name that in
one line and let them choose: relay anyway, `dispatch`, or end here.

## Step 3 — apply follow-up dispositions

**fix** — do it in this session, commit, push. Do this *before* writing the
marker, since the relay is going to erase your ability to.
**file** — `issues file` skill, filed to the tracker.
**skip** — silent. Do not mention it again.

## Step 4 — write the marker

The prompt is the artifact. **Do not write a separate summary document** — the brief below
is the whole of what the next session needs, and nothing else writes one on the user's behalf.

The marker is transport, not a record: written, consumed by the Stop hook, deleted.

**Stop this session's subagents first.** A clear erases the memory of every subagent this
session spawned but leaves each one registered, so the next context answers "is anything
still running?" wrongly. Run `ListAgents`, `TaskStop` every subagent in it that is not
`killed` (`completed` included: a subagent can hand back its report and stay open), then run
`ListAgents` again and name any that are still open in the one line Step 5 says.

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
Focus: <selector as typed, or `ready`>

Context you can't get from the code:
- <decision and why>
- <alternative ruled out and why>

Start by: <the Next: command from §Ending, or the typed override>

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
new session. You do not do any of that yourself, and you never call `herdr` or `wheel` for it —
doing it inline sends input into a session that is still busy, and Claude Code drops
it.

If the clear fails, the sender prompts into the existing context instead of losing
the work, and logs why to `/private/tmp/claude/<repo-slug>/relay/relay.log`.

## Auto

Invoked by `wrap-up` Step D inside an `implement … auto` run
([`../implement/AUTO.md`](../implement/AUTO.md)), and by `swarm` §6 when the swarm ends an auto run. There is no proposal and no halt, and
`wrap-up` already settled the follow-ups (Step 3 does not run again).

0. **Run `next-work` with `--auto`** per §Ending step 1 and follow its `Next:` line
   ([`../implement/AUTO.md`](../implement/AUTO.md) §Routing each hop lists every form). A session
   whose environment carries `SWARM_WORKER` skips this skill entirely: its pass ends after its one
   bead.
   - `Next: implement <id>`: continue with steps 1 and 3 below; `Start by:` is
     `implement <id> auto`, the verdict's own command plus `auto`.
   - `Next: swarm <focus>`: continue with steps 1 and 3, but `Start by:` is `swarm <focus>`, the
     verdict's own command. The brief's run-state block is what the swarm reads its budget from
     ([`../swarm/SKILL.md`](../swarm/SKILL.md) §Run budget). In a linked worktree no swarm can
     start ([`../swarm/SKILL.md`](../swarm/SKILL.md) §1): continue in this context as
     `implement <id> auto` for the top bead `next-work` ranked, and say why in one line.
   - `Next: issues iron-out <focus>`: the run ends here, not relayed. Print the auto report
     ([`../implement/AUTO.md`](../implement/AUTO.md) §The report); its last line is `Next: issues
     iron-out <focus>`.
   - `Next: none — …`: the run ends with the auto report, its last line the `none — …` verdict.
1. **Stop when the count is spent.** The run-state block's `Used` at or past its `Limit` ends the
   run: decline the relay, stop this session's subagents as Step 4 says, and print the auto report
   ([`../implement/AUTO.md`](../implement/AUTO.md) §The report). `all` never runs out.
2. **The next item is the verdict's.** Never re-rank: `Start by:` carries the bead or focus
   `next-work` named, with `auto parked` items already dropped by its scope. Of the checks above,
   only Preconditions #1 (`HERDR_ENV` or `WHEEL_ENV`) and §Ending's linked-worktree condition apply, and either
   one continues the run in this context rather than ending it. A remainder that needs the user
   ends the run with the report, not a declined relay.
3. **Write the marker per Step 4, with the run-state block first in the brief**, copied as it
   stands ([`../implement/AUTO.md`](../implement/AUTO.md) §Run state), then a `Next:` line (`Next: <id>
   "<title>"` for an implement verdict, `Next: swarm <focus>` for a swarm verdict). Then the usual
   brief: task, where it lives, constraints not in the code, and the `Start by:` above, ending
   with `When it's done and landed, run /wrap-up.` for an implement verdict. The block's `Focus:`
   line is the run's selector as typed. The next session
   reads `Limit` and `Used` from the block, so the count survives the clear.
4. **End the turn** per Step 5.

Outside herdr and Wheel, or in a linked worktree, there is no pane to clear: the run continues in this
context, keeping the same block current.
