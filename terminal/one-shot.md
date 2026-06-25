# One-shot mode

Spawn a visible Terminal.app window, run **one** command in it, block until it finishes, read its output, and return. The window is left open at an idle login shell for the user to read at their own pace.

```
terminal run [--headless] <cmd-file> <outfile>
```

- `<cmd-file>` — a file containing the shell to run (the payload). The caller writes this. It's bash'd inside the pane, so it can be multiple lines, a pipeline, whatever.
- `<outfile>` — where the command's combined stdout+stderr lands. Output is `tee`'d to **both** the window (so the user watches it live) and this file (so you read it back).
- `--headless` — skip the window entirely: run the payload as a plain subprocess, output straight to `<outfile>`, no AppleScript. Use it where there's no GUI session to open a window in (cron, SSH, scheduled agents) — the windowed default needs Terminal.app plus the one-time Automation grant, which a headless run can't satisfy. The visible window stays the default for interactive use.

## Calling pattern

```bash
T="$HOME/.claude/skills/terminal/terminal"
cmd="$(mktemp -t terminal-payload.XXXXXX)"
cat > "$cmd" <<'PAYLOAD'
npm run build
PAYLOAD
out="/tmp/<slug>-terminal.md"
"$T" run "$cmd" "$out"      # run this with the Bash tool's BACKGROUND mode
# when it returns, read "$out" for the output
```

Run `terminal run` with the Bash tool's **background** mode when the command can take minutes — backgrounding keeps the Claude session free, and the harness notifies you when the script (and thus the command) exits, at which point you read `<outfile>`.

## How it works under the hood

1. The payload is wrapped in a temp script so the AppleScript string stays trivial (just `bash /tmp/xxx`) and there's no do-script quoting to fight. The wrapper:
   ```
   cd <caller's PWD>
   bash <cmd-file> 2>&1 | tee <outfile>
   printf "\n__TERMINAL_DONE__\n" >> <outfile>
   # then: print a "finished" line, delete itself ($0), and exit — leaving the
   #       window open at an idle shell (it does NOT close itself; see step 4)
   ```
2. **Cold-start guard.** If Terminal wasn't already running, launching it opens a blank default window — so the wrapper runs **in that window** (`do script … in window 1`) instead of letting `do script` spawn a second one and orphan the blank. If Terminal was already running, a plain `do script` opens a fresh window so it never hijacks one of the user's. Either way: exactly one window, never an orphaned blank.
3. Polls `<outfile>` for the `__TERMINAL_DONE__` sentinel — the source of truth. The window is visible the whole time; output is `tee`'d to it, so the user watches the command run live.
4. On the sentinel: strips it from `<outfile>` and **returns**. The window is left open at its idle login shell showing the full output. The skill never closes it; the user does (Cmd-W / red button). This is deliberate — closing a window *from inside* while a process is still live makes Terminal pop its "terminate running processes?" dialog, whereas a window at an idle login shell closes with no prompt. On timeout (~40m): same, but exits nonzero.

The wrapper self-deletes via `$0`; the caller's `<cmd-file>` is the caller's to clean up.
