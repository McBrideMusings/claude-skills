# The `project-logs` skill

`<repo>/.claude/skills/project-logs/` lets a session answer "last night the container did
X", or "something weird just happened on my phone", by fetching the lines itself: no device in
hand, no log pasted in. It is the project's production logging strategy, written down where
the session that needs it will read it.

The standards it applies: what a line carries (one line per event, an ISO 8601 timestamp, a category, raw values, never a credential), the local file in the platform's log directory, and, for getting lines off the device and reading them back, one queryable store labelled by app and device.
*Knowledge base: search it for "observability checklist" and "production logs". If you have none, skip this line and don't mention it.*

## What project-logs answers

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

**A repo run through `admin`** writes each command's output to `tmp/<route>.log` (`admin dev ios` →
`tmp/dev-ios.log`), with the previous runs at `.log.1`–`.log.3`. Its dev section names those
files and how to read them: the top 80 lines for a build that never launched, the bottom 80 for
a run that launched and misbehaved, `.log.1` when the current file is empty or unrelated, the whole
file only when the targeted reads fall short.

A container counts as shipped only when a Loki query for its label returns its lines: a collector
running on the host is not proof, because its allowlist may omit the container.

A runtime that cannot ship its lines anywhere a session can read is a gap: write the shipping
code (Create step 4 in [`SKILL.md`](SKILL.md)), never leave the section saying "ask the user".
A library with no process of its own has one line here saying so.

## Audit

For each runtime, run its fetch command over the last 24 hours. A runtime that ran and
returns no lines is drift or a broken shipper — find which. Then check each fetched line
against the checklist (raw timestamps, identifiers, no secrets or payloads), and confirm the
retention the section states still matches the store's configuration.
