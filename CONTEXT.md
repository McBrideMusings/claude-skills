# Control Vocabulary

The glossary of every typed control word used across `claude-skills` — the words that mean
something specific when backticked in a typed-answer position (a slate row, a disposition, an
invocation). The ordinary English sense of any word below is fine in prose; only the backticked,
typed-answer sense is reserved.

## Language

### Dispatch

**dispatch**:
The one verb for giving a brief to another executor and taking its result back —
`dispatch <target>`. Bare `dispatch` with no target is bounced with the target list.
_Avoid_: hand off, handoff, spawn, delegate, separate session

**agent**:
A dispatch target — the harness `Agent` tool: a subagent in this session, invisible, dies with
the session.
_Avoid_: delegate

**split**:
A dispatch target — a new pane in the current herdr workspace.

**workspace**:
A dispatch target — a new herdr workspace.
_Avoid_: space

**window**:
A dispatch target — a Terminal.app window.

**codex** / **reasonix**:
Dispatch targets naming another vendor's coding agent. The surface (split/workspace/window) is
resolved by the `dispatch transport` resolver, never asked.

**inline**:
Not a dispatch — an escape hatch: `implement <issue> inline` implements in whatever checkout the
session sits in, this session, this checkout, no worktree.

**run**:
Not a dispatch — this session executing a `Workflow` script; the script's agents are internal to
it. Not the default for `implement`.

**relay**:
Not a dispatch — clear this pane and continue in it with a distilled brief. Forward, not
sideways.

### Process

**implement**:
The four-step process plan → fix → verify → land, independent of where it runs. Bare
`implement <issue>` means `dispatch agent`: one `implementer` agent works the item in its own worktree. A place word follows: `implement 12 inline`,
`implement 12 dispatch split`, `implement 12 relay`. Work happens in a worktree unless the user
says otherwise; `inline` is that exception.

**swarm**:
An arity modifier on any process — several items at once.
_Avoid_: fan out

**queue**:
An arity modifier on any process — one item after another.

### Verify

**verify**:
The third step of `implement`. Six methods — `test`, `mutation`, `smoke`, `drive`, `fuzz`,
`human`.
_Avoid_: validate

**test**:
A verify method — the repo's automated suite.

**mutation**:
A verify method — reverse the diff, rerun the new tests, they must fail.

**smoke**:
A verify method — one cheap real command against the built thing.

**drive**:
A verify method — the agent operates the real program through a programmatic surface (PTY,
Playwright, Apple Events, HTTP) and reads back its state, including screenshots. A drive that
verifies something visual always reports the absolute path of the image it inspected, even when
the agent judged it itself.

**fuzz**:
A verify method — randomized input.

**human**:
A verify method — the user operates it; what "Manual testing steps" hands them.

**harness**:
The Claude Code runtime, never a test rig; a project's test rig is its `verify-project`.

### Dispositions

**go**:
Apply every stated pick and continue into proposed next work. The only accept word; `yes`,
`approve`, `ok`, `confirm`, `send` are never accepts.

**park**:
Apply every stated pick and end the turn. Slate-level only, never on a row.

**fix** / **post** / **skip** / **file** / **hold**:
Row-level disposition verbs. `hold` leaves an issue open and blocked.

**no** / **edit** / **stop**:
Redirect words — free, not accept words.

Shape and canonical wording for slate rows and the hatch: [`CHAT-FORMAT.md`](CHAT-FORMAT.md).
This file owns what each word means; that one owns how a message using them is shaped.

## Reserved marking

Every word in this file is reserved: its ordinary English sense is allowed in prose, and its
typed sense is the only one in a backticked, typed-answer position.
