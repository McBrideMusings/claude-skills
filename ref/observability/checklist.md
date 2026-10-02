# Observability checklist

The one standard for "this feature can be diagnosed after the fact". `implement` writes to
it at plan time, a project's `verify-project` proves it, and `improve observability` audits
an existing repo against it. Each item is a yes/no a program can check.

## 1. Logs — every boundary, raw values

A **boundary** is any place data or control enters or leaves the feature. For each one the
feature crosses, it writes one line per event:

| Boundary | What the line carries |
| --- | --- |
| Data in from outside (an HTTP response, a push, a file read, a subprocess) | source, the identifiers the source assigned (document id, row id, URL), every timestamp at full precision, the fields the feature uses — before any formatting for display |
| A user action | the action, its target, and the state it changed from and to |
| A failure | where, the error itself verbatim, and the input that caused it (identifiers, not payloads) |
| A background job (a poll, a crawl, a listener) | start, each unit of work, stop, and why it stopped |

- **Raw, not displayed.** If the screen shows `13:53`, the log has `13:53:07.412Z`. A
  question about the data is answerable only from what the data actually said.
- **One line per event**, prefixed with an ISO 8601 timestamp and a category, so `grep` and
  `sort` work on it without a parser.
- **Never** a credential, a token, a cookie, or a whole request or response body. Log the
  shape and the identifiers.

## 2. Where logs live

- **A file on disk, at the platform's log directory**, one file per category or one file
  with a category column:
  - macOS: `~/Library/Logs/<App Name>/`
  - Linux: `$XDG_STATE_HOME/<app>/log/` (default `~/.local/state/<app>/log/`)
  - Windows: `%LOCALAPPDATA%\<App>\Logs\`
  - A container or service: stdout, collected by its runtime — the runtime is the file.
- **Bounded**: rotated or capped by size, so a long-running process never fills the disk.
- **Mirrored, not replaced**: a platform log (the macOS unified log, journald) can still
  receive the same lines; it is not a substitute for the file, because it ages out and needs
  a platform-specific query to read.
- **Discoverable**: the program's control surface (CLI flag, state query, admin task,
  endpoint) returns the log directory's path.

## 3. State — what is shown, not a summary

The program's state query — whatever its control surface is — returns, for each feature:

- **What the feature currently shows**, item for item: the rows of a list, the value of a
  field, the selected item — with the same raw identifiers and timestamps the log carries,
  so the screen and the source can be compared in one call.
- **What the feature is waiting on**: an in-flight request, an open listener, a retry
  timer.

A count (`trackCount: 10`) or a single current item is not enough on its own: a wrong row
is invisible in a count.

## 4. Proof

A feature passes when a program, with no human looking at the screen, can:

1. trigger the feature through the control surface;
2. read the state query and see the feature's items with their raw values;
3. read the log file at the path the control surface reported and find one line per
   boundary event the trigger caused.
