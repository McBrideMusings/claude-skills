# Delegation backend — Terminal.app

How to staff work out to a second agent running in a **macOS Terminal.app** window, driven over AppleScript. This is the shared "how do I spawn, drive, and read another agent" reference for the delegation skills (`dual-audit`, `delegated-iterate`).

## Why Terminal.app is the one documented backend

Driving another agent needs three capabilities: **spawn** a pane, **type into** it, and — the hard one — **read its output back**. Terminal.app is the only macOS terminal that does all three through a stable public scripting interface:

- `do script` spawns and runs a command.
- `history` / `contents` read the pane's scrollback (this is the capability that matters — it's how you get the delegate's findings back).
- `busy` tells you when the command has finished.

Other backends are deliberately **out of scope for now**:
- **Ghostty** can spawn, split, and type via AppleScript, but its `terminal` object exposes no contents/scrollback property — it is write-only, so it cannot return a delegate's findings. The maintainer treats output-reading as an unsolved security question, so this is not expected to change soon.
- **MacTerm** has a read-capable socket bridge (`mtctl read`) but isn't ready for general use yet.
- The **Codex MCP** path (`mcp__codex__codex`) still works and needs no terminal at all; it's the fallback if Terminal.app driving is unavailable, but it is not documented here.

If you need a different backend later, add it as a sibling doc — don't widen this one.

## The delegate: `codex exec`

Run Codex **non-interactively** so there is no approval prompt to babysit:

- `codex exec "<prompt>"` — run a task non-interactively; the prompt may also come from stdin.
- `codex exec review` / `codex review` — a dedicated non-interactive code review against the current repo. Use this for review-only delegation (it's read-only).

Non-interactive mode is the whole point: an interactive Codex pane gates every shell command and has to be hand-approved, which is fragile. `codex exec` runs to completion on its own and exits, so the done-signal is simply "the process finished."

## Prerequisites

- macOS with `/System/Applications/Utilities/Terminal.app`.
- `codex` on `PATH` (`command -v codex`).
- **Automation (TCC) permission.** The first time the controlling process drives Terminal via `osascript`, macOS shows a one-time "allow … to control Terminal" prompt. It must be granted once per controlling app; it cannot be granted from a script. If `osascript` returns a `-1743` / "Not authorized to send Apple events" error, surface that to the user — they have to approve it in System Settings → Privacy & Security → Automation.

## Slug for /tmp paths

Sibling worktrees must not collide on their findings files. Derive a slug once and paste its **literal** value into every `/tmp/<slug>-…` path — never write a shell variable into an osascript string; the AppleScript context won't have it set.

```bash
git rev-parse --show-toplevel 2>/dev/null | xargs basename || basename "$PWD"
```

## Core verbs

Write every AppleScript through a quoted-heredoc `osascript` call so nothing in the body is shell-expanded.

### Spawn a delegate in a new window, and capture a durable handle

`do script` with no `in` clause opens a **new window** and runs the command. Terminal windows have a stable integer `id` — capture it in the same call and address the tab as `tab 1 of window id N` for the rest of the run.

```bash
win=$(osascript <<'EOF'
tell application "Terminal"
  do script "cd /abs/repo/path && codex exec review > /tmp/<slug>-codex.md 2>&1; echo __CODEX_DONE__ >> /tmp/<slug>-codex.md"
  id of front window
end tell
EOF
)
```

Redirecting the delegate's output to the `/tmp/<slug>-…md` file (rather than scraping the pane) is the reliable way to capture findings. The trailing `__CODEX_DONE__` sentinel line is an explicit end-marker.

### Read the delegate's output

The pane's scrollback is readable directly — this is Terminal.app's distinguishing capability:

```bash
osascript -e "tell application \"Terminal\" to history of tab 1 of window id $win"   # full scrollback
osascript -e "tell application \"Terminal\" to contents of tab 1 of window id $win"  # visible region only
```

Prefer reading the redirected `/tmp/<slug>-codex.md` file with the Read tool for the actual findings; use `history` for progress peeking or to see an unexpected interactive prompt.

### Detect "done"

Two independent signals — require both before treating the run as complete:

1. **The sentinel.** Poll the findings file for the `__CODEX_DONE__` marker (Read tool, or `grep -q __CODEX_DONE__ /tmp/<slug>-codex.md`). This is the source of truth.
2. **`busy`.** `osascript -e "tell application \"Terminal\" to busy of tab 1 of window id $win"` returns `false` when no process is running in the tab. Use it as a secondary check — on its own it can flip to `false` in the gap between commands, so never rely on it alone.

### Drive input (only if the delegate blocks on a prompt)

`codex exec` shouldn't prompt, but if a delegate ever blocks:

```bash
osascript -e "tell application \"Terminal\" to do script \"1\" in tab 1 of window id $win"  # type "1" + Return
osascript -e "tell application \"Terminal\" to do script \"\" in tab 1 of window id $win"   # bare Return
```

`do script "<text>" in <tab>` types the text into the running program's stdin and presses Return. For raw control keys (Ctrl-C), fall back to `System Events` keystrokes targeting Terminal while it's frontmost — but that's a last resort; prefer a non-interactive delegate that never needs it.

### Close the window when done

```bash
osascript -e "tell application \"Terminal\" to close (every window whose id is $win)"
```

Leave the window open instead if the run failed and the user should inspect it.

## Done-signal pattern (summary)

1. Spawn with output redirected to `/tmp/<slug>-…md` plus a trailing sentinel line.
2. Poll the file for the sentinel (primary) and `busy = false` (secondary).
3. Read the file with the Read tool for findings.
4. Close the window (or leave it open on failure for inspection).

## Cautions

- **`history` exposes whatever is on that pane's screen — including secrets** another command may have printed (tokens, `.env` values). Don't echo it back into chat; summarize and flag.
- **Spawning, typing, and closing windows are outward-facing side effects** on the user's desktop. Reading (`history`/`contents`/`busy`) is safe to do unprompted; mutating verbs follow the invoking skill's own confirmation rules.
- **Never write a shell variable into an osascript heredoc body** — it isn't expanded there. Interpolate via the surrounding `osascript -e "...$win..."` form (double-quoted, variable outside the AppleScript string), or paste literal values.
