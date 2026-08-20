<!-- installed by admin: agent_skill.install_agent_skill() -->
# `term-server ctl` — complete op reference

Generated from `server/control.go`'s op table (`ctlOps` / `ctlOpOrder`). Running
`term-server ctl` with no arguments prints the same list, built from that same
table, so the CLI's help cannot drift from what is implemented.

Every op needs `$TERM_CONTROL_SOCKET` in the environment. Ops marked **own pane**
resolve the pane from `$TMUX_PANE` and take no pane argument.

| Op | Usage | Own pane | What it does |
|---|---|---|---|
| `enumerate` | `enumerate` | | Every pane on the server: pane id, session, title, whether it is active, and any agent state reported for it. The `*` marks the active pane. |
| `search` | `search <query>` | | Lists panes whose visible text contains the query. Built on `enumerate` + `read`, so it sees what is on screen, not scrollback. |
| `read` | `read <pane>` | | That pane's visible content. |
| `inject` | `inject <pane> <text>` | | Types text into a pane. Does **not** press Enter — use `key`. |
| `key` | `key <pane> <key>` | | Sends one key (e.g. `Enter`, `C-c`). |
| `split` | `split [row\|col]` | ✓ | Splits your pane — `row` side by side, `col` stacked. |
| `close` | `close` | ✓ | Closes your pane. |
| `newtab` | `newtab` | ✓ | Opens a new tab in your workspace. |
| `run` | `run <command…>` | ✓ | Runs the command in a new tab and returns a run id. The tab stays open so the user can see it. |
| `result` | `result <run-id>` | | The exit code for a `run`, or a still-running report. Poll it. |
| `state` | `state <working\|awaiting\|done\|error> [message] [--model <m>] [--branch <b>] [--sha <s>]` | ✓ | Reports your status to the UI. |

Two further verbs never reach the server and have no table entry:

| Verb | What it does |
|---|---|
| `hook <event>` | Reads a Claude Code hook payload on stdin and reports the matching state automatically. |
| `hooks-snippet` | Prints the Claude Code settings snippet that wires the above up. |

## Environment

| Variable | Meaning |
|---|---|
| `TERM_CONTROL_SOCKET` | The server's control socket. Set inside every term pane; its absence means you are not in one. |
| `TMUX_PANE` | **Your** pane's id. The only correct way to address yourself. |

## Agent states

| State | Meaning | Effect |
|---|---|---|
| `working` | Doing something. | Sidebar dot; starts a git "this turn" baseline. |
| `awaiting` | Blocked on the user. | Sidebar dot + notification — the one they most need to see. |
| `done` | Finished. | Sidebar dot + notification. |
| `error` | Failed. Pass a message. | Sidebar dot + notification carrying the message. |

Reporting the same state twice is not treated as news and will not re-notify.
Report transitions.

## Getting your state reported automatically

You do not have to call `state` by hand if your agent can be wired up:

| Agent | How |
|---|---|
| Claude Code | `term-server ctl hooks-snippet` prints the settings JSON. It wires `UserPromptSubmit`, `PostToolUse`, `Notification` and `Stop`. `PostToolUse` is what clears a stale `awaiting` after you answer a permission prompt — Claude fires no event when you answer, so the next tool call is the first evidence it carried on. |
| Codex | Point `notify` in `~/.codex/config.toml` at `scripts/senders/codex-notify.sh`. It reports `awaiting` when the payload mentions approval/permission/input-needed, else `done`. |
| Anything else | Source `scripts/senders/shell-integration.sh` from your shell rc. It reports `working` when you launch a known agent and clears at the prompt. On bash the start signal needs `TERM_SHELL_INTEGRATION_DEBUG_TRAP=1`, because a sourced rc cannot tell whether the DEBUG trap slot is already taken. |
