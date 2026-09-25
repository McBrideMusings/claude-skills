---
name: implement
description: "Autonomous work on one tracked item at a time. In herdr, `implement <issue>` launches a worker — its own claude session in its own worktree and herdr workspace — that sends its gate back to this chat and lands its own work on `go`; `auto` lets the worker land without a gate. Outside herdr, or with `inline`, this session works the item itself in the checkout it stands in. Bare `implement` discovers one via `backlog next`."
---

# /implement — plan, edit, verify, gate

Control words (`go`, `park`, `implement`, `verify` …) are defined in
[`../CONTEXT.md`](../CONTEXT.md).

One **pass** is one tracked item, worked end to end by this session, in the checkout it
already stands in, ending at a commit. **No subagent runs the pass.** This session plans,
edits, builds, and verifies directly — the one subagent it spawns is a blind `code-reviewer`
pass over the diff, once the build is green.

| | What happens |
|---|---|
| `implement <issue>`, in herdr | **launch a worker** (below) and return to pierce at once |
| `implement <issue>`, outside herdr, or standing in the item's own worker worktree | this session runs the steps below: plan → edit → build green → verify → blind review → gate |
| `implement <issue> inline` | this session runs the steps below, in its own checkout, even in herdr |

**This session is the item's worker** when it stands in a linked worktree whose git dir holds
a `DISPATCH-BRIEF.md` naming the item — then `implement <issue>` runs the steps here, never
launches another worker.

**Landing happens only through `wrap-up`, never inside `implement` itself.** A pass ends at
the gate with its branch standing. Typing `go` runs `wrap-up`, in the same checkout this
session just worked in, which lands it (`../wrap-up/SKILL.md`).

## Root and workers

In herdr, the chat pierce talks to is the **root**, and each item runs as a **worker**: a
full `claude` session in its own herdr workspace, standing in `~/.worktrees/<repo>/<id>` on
branch `bead/<id>`. The root plans and relays; the worker does the work and lands it.

```text
root:   implement <id>
          -> ~/.claude/skills/implement/launch <repo> <id>     # worktree + brief + workspace, detached
          -> one line to pierce: "launched <id>: <worktree>"; back to planning
worker: runs the brief (WORKER.md): implement <id> here, then
          -> herdr agent prompt <root-pane> "[worker <id>] gate: …"   (also written to GATE.md)
root:   holds an arriving gate until pierce's current thread is answered, then shows it
          pierce's reply -> herdr agent prompt "$(cat <git-dir>/WORKER-PANE)" "<reply, verbatim>"
worker: go -> wrap-up here (lands with tools/land) -> "[worker <id>] landed <sha>", stops
root:   ~/.claude/skills/implement/retire <repo> <id>          # workspace, worktree, branch
```

- **Every worker message starts `[worker <id>]`** — `gate: …`, `landed <sha>`, `parked`, or
  `halted: <reason>`. A message in that shape is a worker's report, not pierce typing.
- **Nothing about a worker lives only in the root's context.** Live workers are
  `herdr workspace list` entries whose worktree sits under `~/.worktrees/<repo>/`; a worker's
  pane id is `WORKER-PANE`, and its latest gate is `GATE.md`, both in its worktree's git dir
  (`git -C <worktree> rev-parse --absolute-git-dir`). Re-read those after a relay or
  compaction instead of asking.
- **The root reads a worker only through what the worker sends** and those two files — never
  its pane output. It never edits files in a worker's worktree, and never lands its work.
- **A reply goes to one worker.** When more than one gate is open, pierce names the item
  (`go <id>`); a bare `go` with several open is a question back, not a guess.
- **`retire` refuses** a dirty worktree or a branch that has not reached the default branch —
  report the refusal; never force past it.
- **`implement <issue> auto`** launches with `launch --auto`: the worker sends itself `go` when
  its own verification passes and nothing needs pierce, and messages the root only on a halt
  or a failing check.

## The unit is a slice

A pass takes **one slice child** — `myproj-25.1`, never `myproj-25`. A parent with no
breakdown, or a Verify/Land child, is never worked as a pass. **Verify is this session's**,
via `verify-project`; `human` stops it until a person looks. Item → pass, and the readiness
gate every item clears before it is ever offered: [`HANDOFF.md`](HANDOFF.md).

## Commit rule by branch

**On the default branch, commit nothing until `wrap-up` runs.** `wrap-up`'s own commit step
makes the first commit, deliberately — it lets its review and quality checks land in the same
commit as the change, rather than a separate housekeeping commit bolted on after.

**On any other branch, or in a worktree, commit as you go.** Ordinary commits as the plan
progresses are fine. `wrap-up` may squash the unpushed ones into one, or leave them and add a
final commit, before it pushes and lands.

## Pre-flight

On failure, print the reason and stop.

**Refuse a dirty tree:** `git status --short -- . ':(exclude).beads' ':(exclude).claude'` —
those two are exempt, both session bookkeeping rather than work in progress:

- **`.claude/`** — `scheduled_tasks.lock`, `papercuts.md`, `review-rejected.md`.
- **`.beads/`** — `issues.jsonl` and `interactions.jsonl`, rewritten by nearly every `bd`
  command including the `bd show` that resolves the item itself. Do not stash or commit them
  to clear the check.

In the primary `~/.claude` checkout, a dirty file there belongs to another concurrent session
sharing that index, not to this pass — not a halt.

**No commit-count guard.** One commit on the default branch; as many as the work needs
elsewhere, squashed by `wrap-up`.

## The steps

1. **Plan.** State the files to touch and an objective acceptance check. If you cannot, stop
   — an item that needs this is not one that cleared [`HANDOFF.md`](HANDOFF.md) §1's readiness
   gate, and it should not have been offered.
2. **Edit.** Make the change directly, in the checkout you stand in.
3. **Build green.** Run the build, test, lint or typecheck yourself, in the foreground,
   bounded — `<cmd> 2>&1 | tail -40` (add `| grep -E 'error|FAIL' | head -40` first when the
   runner is chatty). Explicit `timeout`, up to 600000; never background it.
4. **Verify at the surface.** The project's own `verify-project` skill owns what verification
   means here — read `<repo>/.claude/skills/verify-project/SKILL.md` as a file and follow it
   (never `Skill(verify)`: that is the bundled skill, disabled for model invocation). Write one
   from the repo's `README.md`, `CLAUDE.md` and `admin.toml` when none exists, naming this
   repo's real surface and commands; keep it out of git via `<repo>/.git/info/exclude`, never
   `.gitignore`. `BLOCKED` conditions and proving a touched test discriminates:
   [`VERDICTS.md`](VERDICTS.md).
5. **Blind review.** Once the build is green, spawn `code-reviewer` once — the one subagent
   this process spawns as a matter of course, and this step is what clears a session that
   otherwise carries a standing instruction not to call the `Agent` tool unasked. It gets the
   diff and the repo's standards,
   never this session's own reasoning about why the diff is correct. Fix every
   `blocking`/`major` finding it returns,
   then re-verify whatever the fix touched — one cycle, not two. `minor` findings, and anything
   still open after that cycle, go to `wrap-up`'s follow-up step rather than a second review
   round.
6. **Commit**, per the branch rule above.

## Bash command rules

An unattended pass never gets a chance to retry past a permission prompt, so none of these
shapes appears in a command this process runs:

1. **`@{u}`, `@{upstream}`, `@{push}`, or any `{…}` git refspec** typed as a bare argument —
   these trigger brace-expansion prompts unconditionally. Use `origin/$(git branch
   --show-current)` or `origin/main` instead.
2. **Compound commands where any sub-command is not allowlisted.** `&&`/`||`/`;` chaining is
   only safe when every piece would individually pass. If uncertain, run the commands
   separately.
3. **`$(…)` or backtick subshell expansion** where the inner command is not already
   allowlisted. Run the inner command first, capture the result, use it in a second call.
4. **`#` comments or newlines inside a single Bash call.**
5. **`cd /path && git <cmd>`** — triggers an "untrusted hooks" prompt. Use `git -C
   /absolute/path <cmd>`.
6. **`cat <file> || echo "not found"` existence-check compounds** — use the Read tool instead.

**Never read a screenshot into this context.** Prove a visual result from text instead — logs,
exit codes, a DOM or text dump the app already emits. If an image must be captured, save it to
a path, assert on it via text or exit code, and name the path in the summary; the one other
subagent this process may reach for is `screenshot-checker`, for a genuine human-eyes-only
check, which keeps the image out of context and returns words.

**Commit messages never attribute the work to Claude, an AI, or any tool** — no
`Co-Authored-By`, no session link, no trailer naming a model; sign as the repo's user and
nothing else. Conventional Commits, imperative, ≤72 characters of prose, item id in trailing
parens.

## Halt conditions

- Pre-flight failed.
- The item's text arrived damaged — truncated, duplicated, or naming something that does not
  exist.
- No diff; the build won't go green.
- Verification `BLOCKED` — a closed surface, or a fixture that contradicts the item's own
  model.
- A review finding and the item's own stated criteria contradict each other.

**A `BLOCKED` on a fixture is never a code problem.** The environment's data cannot express
what the criterion asks — a seed row outside the domain the item defines, a fixture predating
the schema. Fix the data or fix the criterion; never edit product code to satisfy data the
item's own model says should not exist. Verify treats doubt as `FAIL`.

## The gate

Once verification and review clear, show the gate: [`../CHAT-FORMAT.md`](../CHAT-FORMAT.md)
§Gate. The commands in **Run:**/**Look for:** are the ones already run in step 4 above — never
re-derived, never re-run just to fill the gate. When a recheck command runs inside a worktree
and the project has `admin.toml`, print it as `admin -w <worktree> <task>` when this session
stands outside the worktree, unprefixed when standing inside it — never tell the owner to `cd`
first.

`go` means run `wrap-up` now, in the checkout this pass worked in — bare `wrap-up` when
standing in it, `wrap-up <worktree>` when not. `park` leaves the branch standing, records
`bd update <id> --notes "parked at gate: <worktree-or-branch>, verified at <sha>"`, and ends
the turn — a later session finds the note and resumes at the gate.

**Owner feedback at a gate starts a new round.** If the reply names a located cause with a
small edit, fix it directly; otherwise treat the reply as a new brief and repeat the steps
above against it. Either way: re-verify (re-run what changed, plus anything the fix touched),
re-show the gate.

## Output

One line, once the gate above has been shown or the pass halted:

```
Implement complete: <one-sentence summary>. Halt: <reason | none>.
```

## Notes

- One pass works **one** item; never bundle two.
- A pass never writes to the tracker — `wrap-up` closes it after landing, once the branch is
  merged or its PR opened.
- A pass never removes a worktree it did not create.

## Read on demand

| Open | When |
| --- | --- |
| [`HANDOFF.md`](HANDOFF.md) | Clearing an item, the readiness gate, offering it as a slate row. |
| [`VERDICTS.md`](VERDICTS.md) | What verification means, `BLOCKED` conditions, proving a touched test discriminates. |
| [`WORKER.md`](WORKER.md) | The brief `launch` hands a worker, and the messages it sends back. |
