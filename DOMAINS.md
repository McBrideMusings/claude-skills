# Domain labels — label knowledge in the knowledge base

A **matrix of label × engine** knowledge that the workflow-engine skills (`review`,
`diagnose`, `profiling`, and — through writing and driving tests — testing) read at run time. The
matrix lives in the knowledge base, not in the skills: each label is one directory,
`~/Knowledge/ref/<label>/`, and private labels live under `~/Knowledge/ref/local/<label>/`. The label
index is `~/Knowledge/ref/INDEX.md`. Each label's root file is always `context.md`, which carries both
the injected text and the label's file map, so the two cannot drift apart. No label directory holds
a `SKILL.md`; `INDEX.md` is the one index across all labels.

A reader with no knowledge base has no label pages. Every engine then runs its generic process, and
label resolution (`_detect.md`) still works, because it reads the domains-map and not the pages.

## What a label is

One flat store, one kind of label. A label can describe a *stack* (`apple`, `web`, `react`,
`threejs`) or a *mode* of development (`game`); the store doesn't distinguish — every label is a
directory of engine pages that stacks with every other label in scope, detected the same way (see
`_detect.md`). A repo carries several labels at once — a game on an iPhone is `apple` (how you
build/test/ship on Apple), `mobile` (what a phone app is regardless of vendor), and `game` (how
games are built regardless of device) simultaneously.

Which labels apply to which repo is resolved from a map held outside this store, path-scoped per
repo; see `_detect.md`. Nothing is written into a project repo.

The **issue backend** is not a label. Beads is the standing assumption for every repo, carried in
the `issues` skill description, which is in context every session without a map lookup. Only a
departure from that assumption earns a label: `beads:stealth` for a repo that carries beads and
commits none of it, `beads:mirror` for one whose beads are copied into GitHub Issues, and
`tracker:github` for one with no beads yet. Their pages live in [`issues/`](issues/README.md).

## Layout

```
_detect.md                          <- in the skills: how labels resolve, map grammar, classifier heuristic
~/Knowledge/ref/INDEX.md            <- the index: one row per public label
~/Knowledge/ref/<label>/
  context.md            <- the root file, always this name: a `> ` headline INJECTED at session
                           start in every repo carrying this label, a short body, and the label's
                           Files map (see below). The whole file is INJECTED on the session's
                           first edit of a file in this label's domain
  review.md             <- lens the `review` engine adds; opens with `run: gated` / `when: - labels:
                           [<label>]` frontmatter, which review/tool/lens-gate evaluates
  diagnose.md           <- what to instrument / watch, found by diagnose's instrument phase
  profiling.md          <- profiler catalog / performance gate, found by the `profiling` engine
  testing.md            <- frameworks/harness/idioms, found when writing a test and when driving the change
  design.md             <- OPTIONAL: design-time critique lenses, found by PLANNING skills (not engines)
  prototype.md          <- OPTIONAL: what a throwaway prototype answers for this label, found by `spike`
~/Knowledge/ref/local/<label>/      <- a private label, same shape, listed nowhere public
```

A page may be absent — the engine then runs generic-only for that label. Any other file in a label
directory is content, named for what it holds, and listed in `context.md`'s Files map. Add a label
by creating its `~/Knowledge/ref/<label>/context.md` and engine pages and adding its row to
`INDEX.md` (see `_detect.md`'s "Adding a label"); add an engine column by adding that filename
across the labels that need it.

### `context.md` has two tiers and a map

```markdown
# <label> — injected context

> The one thing that must be true before the first turn. <= 12 words.

<body: <= 120 words, what to know before working in this domain>

## Files

| Open | When |
| --- | --- |
| [`review.md`](review.md) | <when to open it> |
```

The **Files** map lists every other file in the directory, one row each, and is not counted
against the body budget. A label with no other files has no map.

The **headline** is the first `> ` line under the H1: twelve words stating the fact whose absence
would cause a wrong action. The **body** is everything between the headline and `## Files`, capped
at 120 words.

`~/.claude/hooks/knowledge-inject.sh` finds a label's pages through a qmd search when a prompt is
sent or a skill loads, has a model judge each hit, and injects the pages that apply, once per
session. Otherwise a page is read on demand, by whichever engine has resolved its label into scope.

## Who reads what

Engines reach a label's page by searching the knowledge base with a line of the form "search it for
`<label> <engine>`" (for example "apple diagnose"); the line says to skip it when there is no
knowledge base. `review` is the exception: `review/tool/lens-gate` reads each `review.md` directly.

| Engine | Page | When |
| --- | --- | --- |
| `review` | `<label>/review.md`, read by `lens-gate` | Phase 04 — added as one extra lens sub-agent per matched label |
| `diagnose` | `<label>/diagnose.md`, `<label>/profiling.md` (perf) | Phase 04 (Instrument) |
| `profiling` | `<label>/profiling.md` | after label detect |
| writing a test | `<label>/testing.md` | choosing the seam and harness for a test |
| `project-verify` | `<label>/testing.md` | when a repo's own `.claude/skills/project-verify/` drives the change |

The built-in `verify`/`run` skills are compiled into the Claude Code binary and cannot read this
store directly. A repo's own `project-verify` skill (written by `project-skills`) can search the knowledge
base for `<label> testing` to get stack-specific drive/harness knowledge.

The store also feeds planning skills, not just engines. A `design.md` page holds design-time critique
lenses (for `game`: MDA, and Burgun's toy/puzzle/contest/game); `grill-me`, `issues organize`, `issues iron-out`, and
the `game` label's design phase search for it when the label is in scope. Design pages name structure
and tradeoffs — they never deliver a fun/good verdict.

## No precedence

Stacked pages can contradict each other — the `apple` and `gui` `review.md` pages both carry
motion knowledge. There is deliberately no precedence table: a conflict is reported as a
finding, because ranking the pages would guard a duplication that should be removed instead. See
`_detect.md`'s "No precedence".

## Current state

Every label in the vocabulary carries a `context.md`, except `node`. It is deliberately
empty for the same reason `tracker:github` is: it sits on half of all repos, so a page would
fire constantly to say what was already assumed. Docs are a standing assumption, not a map label:
the `docs` pages in the knowledge base are used by every repo, reached by the picker and the edit
hook rather than by `domains-map`.

The `review` / `improve` line inside the `gui` label: **`review.md` is what's broken,
`opportunities.md` is what's missing or weak.** Craft judgements never enter a code review; defects
never wait for an improvement pass.

Add labels as new kinds of software or new stacks appear.

## Attribution

Adapted from [MengTo/Skills](https://github.com/MengTo/Skills) — see that repo's LICENSE:
- the `apple` label — `swiftui-pro` (Paul Hudson), `swiftui-debugging`, `performance-profiling`.
  Its `profiling/*.md` pages are copied verbatim from `performance-profiling/references/`.
- the `web` label's `profiling.md` (+ `profiling/browser-profiling.md`) — `optimize-web-animations`.
- the `web` label's `review.md` and the `apple` label's `review.md` motion block — emilkowalski/skills
  (`emil-design-eng`, `apple-design`, `review-animations`). The platform-agnostic design principles
  behind them live in the `gui` label.
