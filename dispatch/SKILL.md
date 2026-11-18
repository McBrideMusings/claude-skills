---
name: dispatch
description: "`dispatch <target>` — hand work to another session and step away: this session writes the brief from what it already knows, starts the worker where the person names (`workspace`: a herdr space or a Wheel space or pane; `window`: a Terminal.app window; a vendor: `codex`, `reasonix`), says where it went in one line, and is done. No watching, no reading back, no landing — the worker is the person's. With no place named, ask which. When this session must watch the worker and report on it, that is `delegate`, not this. Never an in-session subagent (the Agent tool). Load for 'dispatch this', 'open a new space and tell it to…', 'spin up a session for each of these', and when wiring or debugging the launcher both skills share."
---

# Dispatch

**Dispatch only when the user asked for another session, or a calling skill names this target.
Work the user asked this session to do runs here, however large; size is never a reason to
dispatch.**

Control words (`go`, `park`, `dispatch`, `delegate`, `implement`, `verify` …) are defined in
[`../CONTEXT.md`](../CONTEXT.md).

`dispatch` is a fork. This session already holds the context — the request, what it read, what
it decided — and uses it to write the brief another session starts from. Once that session has
the brief, this one is not involved: it does not poll the worker, read its pane, verify its
result, land its branch or remove its worktree. The person runs the worker from its own pane,
and the brief is their opening prompt to it.

When the work comes back to this session — it waits on the result, reports progress, or lands
what the worker made — use [`../delegate/SKILL.md`](../delegate/SKILL.md) instead. The test is
who owns the result once the worker starts: the person (dispatch) or this session (delegate).

## Steps

1. **Place.** The worker goes to the space, pane, window or vendor the person named. With none
   named, ask which, as one question with the options, before launching
   ([TARGETS.md](TARGETS.md) § The order).
2. **Checkout.** A worker that writes code gets its own worktree; one that only reads runs on the
   main checkout ([TARGETS.md](TARGETS.md) § Where the work happens).
3. **Brief.** Write what the worker needs to start without this conversation: the goal in the
   person's words, what this session already found (files, lines, values, commands run), what is
   ruled out, and where it stops. A worker that writes code gets the commit contract and the
   `Mode: dispatched` line from TARGETS.md verbatim. Never write `/<skill>` into a brief; write
   "call `Skill(<name>)` first, then …".
4. **Launch.** `"$HOME/.claude/skills/dispatch/dispatch" exec --job <job> --name "<what the work
   is>" <brief>` from the checkout the worker works in, with no mode flag
   ([LAUNCH.md](LAUNCH.md) for the resolver, vendors and transports). It returns once the worker
   has the brief.
5. **Say where it went, then stop.** One line: target, the space or pane `exec` printed, and
   what the worker does. Nothing follows it about this worker unless the person asks.

## Files

| File | Holds |
| --- | --- |
| [TARGETS.md](TARGETS.md) | Where a worker goes, which checkout it works in, the brief's ending contract, who lands and who cleans up. Shared with `delegate`. |
| [LAUNCH.md](LAUNCH.md) | The `dispatch` script's verbs (`exec`, `alive`, `check`, `agent`, `transport`, `config`), vendor selection, credentials and the herdr, Wheel and Terminal.app transports. Shared with `delegate`. |
| [TRANSPORT-TERMINAL.md](TRANSPORT-TERMINAL.md) | The Terminal.app window transport and its one-shot and session modes. |
