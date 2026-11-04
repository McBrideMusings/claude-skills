# Aspect brief: `observability` (native)

Axis tag: `observability`. Applicability: only when named — `improve observability`. A
survey never selects it on its own.

**The standard** (each item is a yes/no a program can check):

1. **Logs at every boundary, raw values.** A boundary is any place data or control enters or leaves the feature: data in from outside, a user action, a failure, a background job. Each event writes one line carrying the source, the identifiers, full-precision timestamps and the fields used, before any formatting. One line per event, ISO 8601 timestamp and a category first. Never a credential, token, cookie or whole body.
2. **Where logs live.** A file in the platform's log directory, bounded by rotation or size, optionally mirrored to the platform log, with its path returned by the program's control surface.
3. **State shows what is shown.** The state query returns each feature's items with the same raw identifiers and timestamps the log carries, and what the feature is waiting on. A count alone is not enough.
4. **Proof.** A program with no human looking can trigger the feature, read the state and find one log line per boundary event.

*Knowledge base: search it for "observability checklist". If you have none, skip this line and don't mention it.*

This brief says how to audit against that standard.

Ask the one question no other aspect asks: **which feature, after something went wrong
yesterday, leaves nothing on disk and nothing in the state query to say what it received?**

## What to do

1. **List the features** — from the control surface (scripting dictionary, CLI commands,
   routes, admin tasks) and the user-facing docs, one line each.
2. **For each feature, list its boundaries** — every place data or control enters or
   leaves it — with `file:line` for where each one is handled.
3. **Check each boundary against standard item 1** — is there a log call, does it reach a
   file (item 2), and does it carry the raw values rather than a formatted one?
4. **Check the state query against item 3** for each feature — does it return the items the
   feature shows, or only a count?
5. **Drive one feature per item 4** if the product launches; report what the log file and state
   query actually contained.

## Aspect-specific rules

- **The feature is the finding**, never a single missing log call. One card per feature,
  listing every unlogged boundary inside it.
- **No log file at all is the lead finding** — one card, ahead of the per-feature ones.
- **A log line that formats before logging is a finding**: cite the format call and the
  precision it throws away.
- **A boundary that logs only on failure is a finding** when the feature can receive wrong
  data without failing.
- Evidence is `file:line` and, where the product ran, real lines from the log file and real
  fields from the state query.
