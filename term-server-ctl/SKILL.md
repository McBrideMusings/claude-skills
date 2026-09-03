---
name: term-server-ctl
description: Use when the $TERM_CONTROL_SOCKET environment variable is set — that's how you know you're running inside a pane of term, a terminal multiplexer. Control it from inside one of its panes — read other panes, split, open tabs, run commands and collect their exit codes, and report your own working/awaiting/done/error state so it shows on the user's sidebar.
---

<!-- installed by admin: agent_skill.install_agent_skill() -->

# term-server ctl

You are running inside a pane of **term**, a terminal multiplexer whose panes are
visible to the user in a GUI client. `term-server ctl` is how you talk to it: to
look at other panes, restructure the workspace, and — most usefully — to tell the
user what you are doing without them having to watch your output.

## Am I in a term pane?

Only if `$TERM_CONTROL_SOCKET` is set. If it is not, none of this applies and
`ctl` will refuse to run. Check before using anything here.

```sh
[ -n "$TERM_CONTROL_SOCKET" ] && echo "in a term pane"
```

## ⚠️ Address yourself with `$TMUX_PANE`, never "the current pane"

**The pane the user is looking at is not your pane.** They can click into any
pane at any moment, and several agents can run at once. Every op that takes a
pane argument takes an explicit id, and yours — and only yours — is `$TMUX_PANE`.

```sh
term-server ctl inject "$TMUX_PANE" "text for my own pane"   # correct
```

Guessing, or reusing an id you saw in `enumerate` output earlier, will act on
someone else's pane. Ids are stable while a pane lives and are reused after it
closes, so re-enumerate rather than caching one across a long task.

## Report your state — the highest-value thing here

The user's sidebar shows a status dot per workspace, and the desktop and phone
clients post a notification when an agent finishes or needs input. None of that
happens unless you say so.

```sh
term-server ctl state working                       # I have started
term-server ctl state awaiting "needs your approval"  # I am blocked on the user
term-server ctl state done                          # finished
term-server ctl state error "build failed"          # something went wrong
```

Optional context, shown alongside the state:

```sh
term-server ctl state working --model opus --branch feature/x --sha a1b2c3d
```

Two things worth knowing:

- **Report the transition, not a heartbeat.** The server treats a repeated
  identical report as nothing new — it will not re-notify — so reporting on a
  timer is harmless but pointless. Report when your state actually changes.
- **`working` starts a turn.** The git pane can show "what did this turn
  change", measured from the moment you reported `working`. Reporting it at the
  start of real work makes that view meaningful.

## Reading and driving other panes

```sh
term-server ctl enumerate                  # every pane: id, session, title, agent state
term-server ctl search "connection refused"  # panes whose visible text contains this
term-server ctl read %3                    # a pane's visible content
term-server ctl inject %3 "some text"      # type text into a pane (no Enter)
term-server ctl key %3 Enter               # send a key
```

`read` returns what is on screen, not scrollback.

## Restructuring the workspace

```sh
term-server ctl split row     # split your pane side by side
term-server ctl split col     # split it stacked
term-server ctl close         # close your pane
term-server ctl newtab        # open a new tab
```

These act on **your** pane, resolved from `$TMUX_PANE`; they take no pane
argument.

## Running a command and getting its exit code

`run` opens a new tab, runs the command there, and returns a run id. The tab
stays open so the user can see what happened.

```sh
id=$(term-server ctl run npm test)
term-server ctl result "$id"     # exit code once it finishes
```

`result` reports that the run is still going if it has not exited yet — poll,
do not assume.

## Everything else

`term-server ctl` with no arguments prints the full usage line, which is
generated from the same table that implements the ops, so it cannot drift from
what actually exists. See `reference/ops.md` for the complete list with
arguments.
