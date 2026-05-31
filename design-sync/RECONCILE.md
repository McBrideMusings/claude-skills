# Reconcile report — the back-sync delta

Every sync run, in **either** direction, ends by writing one file:
`tmp/claude/design/reconcile.md`. Its job is to be pasted into the **opposite end** so
the two sides converge. It is not a chat summary — it is a persistent, copy-pasteable
artifact the user carries across the gap (there is no API; the user does the paste).

## The rule that governs its contents

The target state is **zero differences** between the prototype and the running app.
This report does not exist to excuse drift — it exists to record the *only* differences
allowed to remain: deviations **you and the user explicitly agreed to**.

- An **agreed deviation** is one surfaced to the user *before* it was built and accepted
  by them — the Phase 2 triage decisions (questionable / can't-do items the user chose to
  drop, reshape, or fake differently) and any Phase 4 waiver (a delta the user explicitly
  let stand). These — and only these — are line items in the report.
- An **unagreed difference** is a bug, not a deviation. It does not go in the report.
  Close it (make the app match the prototype) before finishing. If it genuinely can't be
  closed, that itself is a decision to put to the user → once accepted it becomes an
  agreed deviation.

So the report's "Open (unresolved) differences" line must read **none**. If it can't, the
sync isn't done.

## Why it matters

IMPORT (prototype → app) forces real implementation calls the prototype never had to make:
what to drop, what to reshape, what a static mock can't express. Each such call, once
agreed, is a change the *prototype* now needs in order to match reality. This report is how
the user pushes those back into Claude Design, so the next round-trip starts aligned.
EXPORT (app → prototype) is the same idea, rarer: it records where the packaged
brief/screenshots can't fully capture the live app, so the seeded design knows what to
honour and a later IMPORT diff stays clean.

## Direction

- **IMPORT** — reconcile target is the **prototype**. The paste-back block is addressed to
  the Claude Design project: "update the prototype to match these agreed implementation
  decisions."
- **EXPORT** — reconcile target is the **code** (after the seeded design is built and
  re-imported). The paste-back block records agreed simplifications the seeded design must
  honour.

## Format

```markdown
# Design Sync — Reconcile Report

- **Direction:** IMPORT (prototype → app)   <!-- or EXPORT (app → prototype) -->
- **Source ref:** <handoff id / .zip / share link / app git SHA>
- **Date:** <YYYY-MM-DD>
- **Result:** App matches the prototype except for the agreed deviations below.
- **Open (unresolved) differences:** none

## Agreed deviations

Each was surfaced to and accepted by the user (Phase 2 triage decision or Phase 4 waiver).
To converge, the opposite end (the prototype for IMPORT; the code for EXPORT) should adopt
these.

### 1. <short title>
- **Prototype:** <what the design / handoff specifies>
- **Implemented:** <what the app does instead — exact value/behaviour>
- **Why (agreed):** <the reason the user accepted the divergence>
- **To reconcile:** <the concrete change the opposite end must make>

### 2. <short title>
- ...

## Paste-back block

Copy everything in the fenced block below into the opposite end — IMPORT → the Claude
Design chat; EXPORT → the next coding-agent import — to apply the reconciliation.

​```
The implementation diverged from the prototype in the following agreed ways.
Update <the prototype / the code> to match:

1. <title> — prototype said X; it is now Y because Z. Change: <what to do>.
2. ...

After applying these, the two sides should be identical again.
​```
```

## Procedure

1. Gather the agreed deviations: the triage decisions the user signed off in Phase 2 plus
   any Phase 4 waivers. If there were none, the report is still written — empty "Agreed
   deviations" section, result "fully in sync."
2. Confirm "Open (unresolved) differences" is `none`. If not, you are not done — close the
   difference or get it agreed first.
3. Write `tmp/claude/design/reconcile.md` in the format above. Make the paste-back block
   stand alone: the user must be able to copy *just that block* into the opposite end with
   no other context.
4. In chat, give the user the path and say the paste-back block is ready to drop into the
   opposite end. Never paste or send it anywhere yourself — the user carries it across.

Ephemeral like every `tmp/claude/design/` artifact; age out anything older than ~14 days.
