# Aspect brief: `observability` (native)

Axis tag: `observability`. Applicability: only when named — `improve observability`. A
survey never selects it on its own.

**Read first, in full:** [../../ref/observability/checklist.md](../../ref/observability/checklist.md).
That file is the standard; this brief only says how to audit against it.

Ask the one question no other aspect asks: **which feature, after something went wrong
yesterday, leaves nothing on disk and nothing in the state query to say what it received?**

## What to do

1. **List the features** — from the control surface (scripting dictionary, CLI commands,
   routes, admin tasks) and the user-facing docs, one line each.
2. **For each feature, list its boundaries** — every place data or control enters or
   leaves it — with `file:line` for where each one is handled.
3. **Check each boundary against checklist §1** — is there a log call, does it reach a
   file (§2), and does it carry the raw values rather than a formatted one?
4. **Check the state query against §3** for each feature — does it return the items the
   feature shows, or only a count?
5. **Drive one feature per §4** if the product launches; report what the log file and state
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
