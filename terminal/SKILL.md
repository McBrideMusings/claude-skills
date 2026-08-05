---
name: terminal
description: "Drive a visible Terminal.app window on the macOS desktop — spawn a window the user can watch, run commands in it, read output back (via AppleScript). ONE-SHOT mode is the transport `delegate` falls back to outside herdr; SESSION mode keeps a persistent pane over time. Use when the user should see a real terminal or watch a long-running process live."
---

# terminal — drive a visible Terminal.app window

Spawn and control a Terminal.app window on the desktop. The user sees the window and watches the work live; Claude drives it through a stable AppleScript interface (`do script` to run, `history`/`contents` to read, `tty`/`busy` to track a pane).

Call the executable by absolute path so it works from either profile (the `skills/` dir is the same real directory for both):

```
$HOME/.claude/skills/terminal/terminal <verb>
```

## Two modes — load the reference file for the one you need

| Mode | When | Reference |
|---|---|---|
| **One-shot** | Run one command in a visible window, wait for it, read its output. The window is left open at an idle shell for the user to read. This is one of `delegate exec`'s two transports — the one it falls back to outside herdr (see [../delegate/TARGETS.md](../delegate/TARGETS.md)). | [one-shot.md](one-shot.md) |
| **Session** | Open a persistent pane, then send it commands repeatedly over time, read its scrollback, and close it when done. New, richer capability — the pane survives across commands. | [session.md](session.md) |

Don't load both unless the task spans both. The verbs:

```
terminal run [--headless] <cmd-file> <outfile>   # one-shot — see one-shot.md
terminal open  <id>                              # session  — see session.md
terminal send  <id> <cmd-file> <outfile>         # session
terminal read  <id> [outfile]                    # session
terminal close <id>                              # session
```

## Why Terminal.app

Among *desktop* terminals it's the one supported transport, because it can both **drive** and **read** a pane through a scripting interface — `do script` to run, `history`/`contents` to read, `tty` to address a specific pane, `busy` to detect activity. Ghostty can spawn and type but exposes no contents property, so it can't return output; that's why this skill (and `delegate` under it) uses Terminal.app rather than the user's everyday Ghostty terminal.

## Cautions (apply to both modes)

- **The first AppleScript control of Terminal triggers a one-time macOS Automation (TCC) prompt.** It must be granted once and can't be granted from a script. If a verb fails with `-1743` / "Not authorized to send Apple events," surface that — the user approves it in System Settings → Privacy & Security → Automation.
- **`history`/`contents` expose whatever is on the pane — including secrets** another command may have printed. `run`/`send` redirect output to a file rather than scraping the pane; if you ever `read` a pane directly, summarize and flag sensitive lines rather than echoing them.
- **The window is an outward-facing side effect.** This skill owns the **spawn** (and the cold-start single-window guard so a freshly-launched Terminal never orphans a blank window). It does **not** close one-shot windows — a finished one-shot pane is deliberately left at an idle login shell so it closes without Terminal's "terminate running processes?" prompt; the user closes it by hand. Session panes are closed explicitly with `terminal close`.

## Adding another transport

The executable is the only place AppleScript/Terminal.app appears. A second transport (e.g. iTerm2) would be a new branch inside the verbs in `terminal`; the verb interface and these docs don't change.
