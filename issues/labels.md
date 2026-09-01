# Label schema — every tracker, every repo

One vocabulary for issue labels, backend-independent. Read this before adding a label to any
issue, and before inventing a new label anywhere.

**The rule that makes the rest work: a label carries an attribute the tracker's own fields do
not already carry.** `bd` has `issue_type` (feature/task/bug/epic/decision), `priority`,
`status`, and `parent`. GitHub has type, milestone, assignee, state. A label named
`enhancement`, `bug`, or `p1` is a second copy of a field that already exists, and second
copies drift. Delete them.

## The two axes

Every prefixed label belongs to exactly one axis and carries its axis as a prefix. The prefix is
not decoration — it is what lets `area:` be swept, counted, and grepped without matching a
platform by accident, and what stops the next label from landing on the wrong axis.

| Axis | Prefix | Answers |
| --- | --- | --- |
| Area | `area:` | Which part of the product does this touch? |
| Platform | `platform:` | Which build does this ship in? |

An issue carries **zero or more `area:`** and **zero or more `platform:`**.

**One bare label is legal, and only one: `human`.** It is not an axis — it is the name `bd human`
queries on, so it is a tracker field wearing a label's clothes. See below.

**The `<prefix>:<value>` shape is beads' own convention, not ours** — `bd set-state --help`
documents it and ships examples (`patrol:active`, `health:healthy`). That means prefixes are a
shared namespace, and **`mode:`, `patrol:` and `health:` belong to beads**. `bd set-state` writes
a dimension's label by *removing any existing label for that dimension first*, so a label parked
in a beads-owned prefix is a label beads will delete. Never define an axis on one of those names.

## `area:` — the nine

Fixed and global. These nine exist in every software product; do not rename them per repo.

| Label | Owns | The test |
| --- | --- | --- |
| `area:ui` | Presentation: layout, theme, typography, colour, icons, chrome, spacing. | Pixels change. |
| `area:ux` | Interaction and flow: shortcuts, navigation, defaults, empty states, affordances. | Behaviour changes, no visual redesign. |
| `area:data` | Model, storage, persistence, migration, sync, conflict resolution. | Something written down changes shape. |
| `area:api` | Any contract someone else calls: public interfaces, protocols, CLI, endpoints, the agentic control surface. | Breaking it breaks a caller you don't own. |
| `area:perf` | Time, memory, battery, bandwidth, cost. | The complaint is a number. |
| `area:reliability` | Crashes, error handling, retries, degraded states, correctness under failure. | It works until something goes wrong. |
| `area:security` | Auth, secrets, permissions, sandboxing, privacy, entitlements. | Getting it wrong leaks or grants. |
| `area:infra` | Build, CI, tooling, release, deploy, dev environment, scripts. | Ships to developers, not users. |
| `area:docs` | Documentation, ADRs, READMEs, comments. | The deliverable is words. |

**`area:ui` vs `area:ux`** is the pair that gets confused, so: `area:ui` means the pixels
change — a theme, a layout, an icon. `area:ux` means the flow changes without a visual
redesign — a hotkey, a default, where focus lands. **Both when both**, which is common and
correct. "Presentation of the app at a glance" is `bd list --label-any area:ui,area:ux`.

An issue with no `area:` is unclassified, not neutral. Sweep it.

## `human` — the one bare label, and it isn't ours

Needs a person: hardware, an account, a physical device, a judgement call, an offline step.
Autonomous passes skip it.

**Do not invent a prefix for this.** `bd` ships the queries keyed on the literal string `human`:

```bash
bd human list                      # every issue awaiting a person
bd human respond <id> "<answer>"   # comments and closes in one call
bd human dismiss <id>
bd human stats
```

Prefixing it (`mode:hitl`) would break every one of those. Pair it with `-t decision` when the
whole content of the issue is an unmade call.

**Unlabelled means AFK.** There is no `mode:afk` and no positive marker for "an agent can do
this alone" — the absence of `human` is the answer. A second label saying the same thing in
reverse is a second copy of a field, and second copies drift.

## `platform:` — the axis is global, the values are per repo

Only for repos that genuinely ship more than one build. The prefix is fixed; the values are
declared in that repo's `CLAUDE.md` and nowhere else. Typical: `platform:macos`,
`platform:ios`, `platform:web`, `platform:android`, `platform:server`, `platform:cli`.

A single-platform repo uses no `platform:` label at all. Labelling every issue with the one
platform you have is noise.

## Reconciling an off-schema label — always, unasked

**When you touch a tracker and see a label this file does not define, fix it in the same pass.**
Do not ask, do not file a ticket to do it later, do not treat it as the repo's local convention.
An off-schema label is drift by definition: this file is the vocabulary, and a label outside it
carries an attribute nobody else's tooling can read.

Three outcomes, in order of preference:

1. **Maps onto the schema** — rewrite it. `hitl` → `human`. `area:companion` on an iOS bug →
   `area:ui` + `platform:ios`.
2. **Restates a tracker field, or restates another label in reverse** — delete it outright, no
   replacement. `afk` is the whole of this case: absence of `human` already means AFK.
3. **Genuinely doesn't map** — it is a tenth `area:`, so it gets a line in that repo's
   `CLAUDE.md` under a "Labels" heading saying what it owns. An undocumented tenth is drift
   wearing a prefix.

**A label whose name collides with a word the repo already spends on something else is renamed,
even if it is otherwise legal.** `area:harness` in a repo that was building its own agent harness
read as that harness; it meant Claude Code's. The reader cannot tell, and the reader is who the
label is for.

## Extending

- **The nine `area:` values do not grow globally.** A repo that needs a tenth — a subsystem
  that genuinely doesn't map — declares it in its own `CLAUDE.md` under a "Labels" heading,
  with one line saying what it owns. Undocumented labels are drift, not vocabulary.
- **New axes need a real question they answer**, one the existing three don't. Adding an axis
  means editing this file, not a repo.
- **Never label from the ticket title alone.** Read what the issue actually changes.

## Setting it up in a repo

```bash
# beads — labels are free-form; nothing to create up front.
bd label add <id> area:ui
bd label remove <id> enhancement
bd label propagate <parent-id> area:ui                 # push a label to every child
bd list --label-any area:ui,area:ux --status open      # the presentation sweep
bd label list-all                                      # audit for drift; `human` is the only legal bare label
bd human list                                          # the awaiting-a-person queue

# GitHub — labels must exist before use.
gh label create area:ui --description "Presentation: layout, theme, typography, icons, chrome" --color 1D76DB
gh issue edit <n> --add-label area:ui --remove-label enhancement
gh issue list --label area:ui --state open
```

Colour convention on GitHub, so the label reads at a glance in the issue list:

| Label | Colour |
| --- | --- |
| `area:` | `1D76DB` (blue) |
| `human` | `B60205` (red) |
| `platform:` | `5319E7` (purple) |

## What to delete on adoption

`enhancement`, `bug`, `documentation`, `question`, `duplicate`, `invalid`, `wontfix`,
`good first issue`, `help wanted` — every one restates `issue_type`, `status`, a close reason,
or an assignee. GitHub ships them by default; that is not a reason to keep them.
