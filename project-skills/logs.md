# The project skill's `logs.md`

`<repo>/.claude/skills/project/logs.md` lets a session answer "last night the container did
X", or "something weird just happened on my phone", by fetching the lines itself: no device in
hand, no log pasted in. It is the project's production logging strategy, written down where
the session that needs it will read it.

The standards it applies: [`../ref/observability/checklist.md`](../ref/observability/checklist.md)
for what a line carries and the local file, [`../ref-cells/observability/production.md`](../ref-cells/observability/production.md)
for getting lines off the device and reading them back.

## What logs.md answers

One section per runtime the project really runs in — dev on this Mac, a Mac app on the
user's machines, an iOS app on a phone, a server process, a Docker container, a CLI. For each:

1. **Where the lines go.** The local file path, and the production destination: the Loki
   stream labels (`{app="<name>"}` plus `device`, `container` or `host`), or, for an
   exception, the file or service and why Loki is not used.
2. **How they get there.** The code that writes and ships them, by file and function — the
   outbox and push for an app, the Alloy source or stdout collection for a container — and
   what happens while the device is offline or asleep.
3. **The fetch command.** The exact command that returns the lines for a time window and a
   device, runnable as written:
   `logcli query --since=2h '{app="<name>", device="<device>"}'`, with `LOKI_ADDR` from
   `~/.claude/.env`. A session reads the user's "last night" or "just now" as a window, says
   the window it used in UTC beside the user's local time, and widens it once before saying
   nothing was found.
4. **Devices and hosts.** The names the user says ("my phone", "the tower", "the laptop")
   mapped to the label values the lines carry.
5. **Retention.** How long lines stay, so "two weeks ago" gets an honest "gone" instead of an
   empty query.
6. **From a line to a fix.** Which state query or verify drive reproduces what a line shows,
   and that the path from there is `diagnose`, then an `implement` pass, then shipping as the
   project ships.

A runtime that cannot ship its lines anywhere a session can read is a gap: write the shipping
code (Create step 4 in [`SKILL.md`](SKILL.md)), never leave the section saying "ask the user".
A library with no process of its own has one line here saying so.

## Audit

For each runtime, run its fetch command over the last 24 hours. A runtime that ran and
returns no lines is drift or a broken shipper — find which. Then check each fetched line
against the checklist (raw timestamps, identifiers, no secrets or payloads), and confirm the
retention the section states still matches the store's configuration.
