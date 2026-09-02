# `issues` — shared issue-tracker knowledge

A skill holding shared issue-tracker knowledge, read at run time by every skill that
creates, reads, updates, or closes tracked items.

## Why it exists

Before this skill existed, `gh issue …` was hardcoded in 19 files across 13 skills. Adding a
second backend meant editing all 19 the same way and keeping them in step forever. Instead each
skill holds its *process* once and stays backend-agnostic: it resolves the backend via
[`_detect.md`](_detect.md), then reads the one verb table for the backend actually in scope.

## Layout

```
issues/
  SKILL.md          <- the map: which file to open for which task
  README.md         <- this file — orientation and who-reads-what
  _detect.md        <- confirms beads and resolves what varies: mirror mode, stealth
  breakdown.md      <- standard practice at pickup: slicing one issue + verify/land bookends
  labels.md         <- the label schema, backend-independent: area: / mode: / platform:
  beads.md          <- verb table for beads (`bd`) — dependency-aware, local Dolt DB
  beads-stealth-context.md  <- injected in a stealth repo: the posture, not the verbs
  beads-mirror-context.md   <- injected where GitHub Issues mirrors beads: read/write rules
  github.md         <- verb table for a repo with no beads yet (`gh`)
```

There is deliberately no file-based fallback. A repo with neither backend stops and offers
`bd init`; it does not get a markdown list. A tracker nobody maintains collects work that is
never picked up again, and it puts a must-not-delete file inside a disposable tree.

## Labels are backend-independent

The verb tables say *how* to attach a label. [`labels.md`](labels.md) says *which* — one
vocabulary across every backend and every repo, on three prefixed axes (`area:`, `mode:`,
`platform:`). Any skill that labels an issue reads it before picking a label, and never
invents a bare one.

## Who reads what

| Skill | Uses | Notes |
| --- | --- | --- |
| `to-tickets` | create, epic/parent, dep | publishes a slate of tickets; every set ends in the `breakdown.md` bookends |
| `triage` | list, ready, show | `bd ready` replaces hand-rolled blocker reasoning on beads |
| `implement` | show, claim, close, comment | one item start→finish |
| `implement` | list, ready, claim, close | selector resolution lives in `implement/SELECTORS.md` |
| `iron-out` | list, create, dep, label | files open questions, wires blockers |
| `followups` | create, list | halts when neither backend resolves |
| `papercut` | create | promotes a logged papercut to a tracked item |
| `wrap-up` | close, comment, list | plus PR work, which is always `gh` |
| `review` | comment, create | PR review flow is always `gh` (see below) |
| `summary`, `debate`, `repo-analysis`, `spike` | list, show | read-only references |

## Pull requests are always GitHub

Beads has no pull-request concept. Anything touching a PR — `review`'s PR queue and
`unblock`'s FEEDBACK.md, `wrap-up`'s landing phase, `summary`'s branch read — keeps using `gh pr …`
unchanged regardless of which issue backend resolved. Only *issues* route through this skill.

## Adding a backend

Add `issues/<name>.md` with the same verb-table headings and a detection row in `_detect.md`.
No skill changes — they already read `issues/<resolved>.md`.
