---
name: todo
description: "Session continuation notes for ONE worktree — what to do next to finish this branch, injected at the start of the next session here. Author one (/todo <message>), list them (/todo list), close one (/todo done <n>), or capture the open threads at session end (bare /todo). Writes <worktree-root>/.claude/todos.local.md; not tracked issues, not papercuts."
disable-model-invocation: true
---

A todo is a **session continuation note**: what you need to do next to finish the work in *this worktree*, written so tomorrow's session doesn't have to reconstruct it. No id, no assignee, no status field, no lifecycle beyond "done, delete it".

The boundary, in one line each:

- **Todo** — my next action on this branch. `hooks/todo-inject.sh` reads it back at the start of the next session here. Dies when the branch is finished.
- **Papercut** (`papercut`) — friction the repo caused me. Belongs to the repo, survives the branch, lands in `.claude/papercuts.md` on the MAIN checkout.
- **Issue / follow-up** (`followups`, `triage`) — work anyone could pick up, that needs to exist after this worktree is deleted.

If the note would still matter to someone else after this branch merges, it is not a todo.

## The writer — always route through the CLI

```
"$HOME/.claude/tools/todo" "finish wiring the SessionStart entry"   # append
"$HOME/.claude/tools/todo" list                                     # numbered
"$HOME/.claude/tools/todo" done 2 3                                 # close by number
"$HOME/.claude/tools/todo" --path                                   # path; exit 4 if none
"$HOME/.claude/tools/todo" --root                                   # resolved worktree root
"$HOME/.claude/tools/todo" --dir DIR "..."                          # operate on DIR
```

Call it by that literal path even from the work profile — `tools/` isn't symlinked into `~/.claude-work`, and the script resolves the worktree itself. Never hand-edit `todos.local.md`; entry numbers are line positions and the writer is what keeps them stable.

**One list per worktree, not per repo.** The path resolves with `git rev-parse --show-toplevel`, which stays inside a linked worktree. `~/.worktrees/foo-123` and `~/Projects/foo` carry different lists on purpose — that separation is the reason this exists rather than being a mode of `papercut`, which does the opposite and collapses every worktree onto the main checkout.

The file is `<worktree-root>/.claude/todos.local.md`, gitignored globally via `~/.config/git/ignore`. Not under a temp root: the next session here might be next month, and macOS reaps `/private/tmp` after three days idle. Deleting the worktree deletes its todos, which is correct — they only existed to finish that branch.

## A resolved todo is ALWAYS closed, in the same turn

The list is what is **still outstanding**. The moment its work lands, the entry goes — without being asked, in whatever session happened to do the work, whether or not this skill was invoked.

This is the half that keeps the list worth reading. An entry whose work already landed is worse than noise: at the start of the next session a reader can't tell it from a live one without re-checking the code, so one stale entry makes the whole injected block untrustworthy.

The injected block at session start names the close command for exactly this reason. Finish something it lists → `"$HOME/.claude/tools/todo" done <n>` immediately, and say so in one line.

Partial: if an entry covers three things and one landed, edit it down to what's left rather than closing it whole — close it, re-add the remainder.

Promotion: a todo that turns out to be real tracked work goes to `followups` as an issue, and the entry is closed in the same turn. One thing, one home.

## Mode A — author one (`/todo <message>`)

Append verbatim, lightly cleaned to a single actionable line. Don't invent detail, don't expand it into a plan.

```
"$HOME/.claude/tools/todo" "<message>"
```

Confirm with the one-line path the script prints. Nothing else.

## Mode B — capture the session's open threads (bare `/todo`)

The session-end use: you're stopping mid-branch and want tomorrow to pick up cleanly.

1. From the current session, name every thread that is genuinely unfinished in this worktree — a half-applied change, a decision deferred, a verification not run, a file left mid-edit.
2. Drop anything the session actually finished, anything already in the list (run `list` first), and anything that belongs in the tracker instead.
3. Show the candidate lines in chat, numbered, and take one batched reply — never `AskUserQuestion`, never one at a time. Close with: *"Type `go` to add all, or answer per item (`1 add, 3 skip, rest add`)."*
4. Append the survivors, one `todo` call each.
5. Report the count and the path.

## Mode C — read and close (`/todo list`, `/todo done <n>`)

`list` prints the numbered list and the path; exit 4 means there are none. `done <n>` closes by that number and is safe with several at once — the tool resolves every number to a file line before deleting any, so the list can't renumber under itself.

## Why this skill is manual-only

`disable-model-invocation: true` is deliberate. The read path is already automatic — `hooks/todo-inject.sh` fires on `SessionStart` and puts the list in context with no skill involved — and the write path is a decision about when a session is ending, which is yours. The skill exists for the three explicit invocations above and for the boundary rules on this page, not to be routed to.

The one thing that *is* automatic without invoking this skill: closing a resolved entry, per the rule above.
