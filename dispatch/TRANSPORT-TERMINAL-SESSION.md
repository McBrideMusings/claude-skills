# Session mode

Open a **persistent** Terminal.app pane, then send it commands repeatedly over time, read its scrollback, and close it when done. Unlike one-shot, the pane survives across commands — the shell stays live and keeps its state (cwd, env, running background jobs) between `send` calls.

```
terminal open  <id>                       spawn a persistent pane, register it as <id>
terminal send  <id> <cmd-file> <outfile>  run <cmd-file> in that pane, wait, capture to <outfile>
terminal read  <id> [outfile]             dump the pane's scrollback (stdout, or to [outfile])
terminal close <id>                       close the pane and forget <id>
```

`<id>` is any label you pick (e.g. `build`, `server`, `repl`). It's how you address the same pane across calls.

## How a pane is tracked

`open` spawns the window and captures the pane's **tty** (e.g. `/dev/ttys003`) as a stable handle, storing it in `/tmp/terminal-session-<id>`. Every later `send`/`read`/`close` finds the pane by matching that tty against all Terminal tabs — so it always targets the exact pane you opened, even if the user has other windows. If the user closes the window by hand, the tty no longer matches and the verb errors cleanly ("no open session").

## Calling pattern

```bash
T="$HOME/.claude/skills/dispatch/terminal"

"$T" open server

cmd="$(mktemp -t terminal-payload.XXXXXX)"
echo 'npm run dev' > "$cmd"
"$T" send server "$cmd" /tmp/server-start.md     # background mode if it's long-running

# ... later, send another command to the SAME pane ...
echo 'curl -s localhost:3000/health' > "$cmd"
"$T" send server "$cmd" /tmp/server-health.md

"$T" read server /tmp/server-scrollback.md       # full scrollback any time

"$T" close server                                 # done
```

## Behavior details

- **`send`** wraps the payload so output is `tee`'d to both the pane (live, visible) and `<outfile>`, then appends the `__TERMINAL_DONE__` sentinel and polls `<outfile>` for it — same completion mechanism as one-shot, but into the existing pane instead of a fresh window. `<outfile>` is truncated at the start of each `send`, so it holds only that command's output. The wrapper self-deletes, leaving the pane clean for the next `send`.
  - For a command that's *meant* to keep running (a dev server, a watcher), it won't hit the sentinel until it exits — so either run that `send` in background mode and move on, or start it with the payload backgrounding it (`npm run dev &`) so the `send` returns and the job keeps running in the pane.
- **`read`** dumps the pane's full scrollback via Terminal's `history`. Reads can expose secrets printed earlier in the pane — summarize and flag rather than echoing sensitive lines (see SKILL.md cautions).
- **`close`** exits the shell first (so there's no live process), waits a beat, then closes the window — avoiding Terminal's "terminate running processes?" dialog — and removes the state file. If a command is still actively running, that dialog may still appear; let the user dismiss it.

## One-shot vs session — which to use

Use **one-shot** (`run`, see [TRANSPORT-TERMINAL-ONESHOT.md](TRANSPORT-TERMINAL-ONESHOT.md)) when you have a single command and just want to see it run and read its result. Use **session** when you need the shell to persist — multiple commands sharing state, a long-running process you check on later, or an interactive flow you feed step by step.
