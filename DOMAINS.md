# Domain cells — label knowledge inside the `ref` skill

A **matrix of label × engine** knowledge that the workflow-engine skills (`review`,
`diagnose`, `profiling`, and — via `tdd`/`verify` — testing) read from at run time. Each
label is one directory, `ref/<label>/`, inside the single `ref` skill. Its root file is
always `context.md`, which carries both the injected text and the label's file map, so the
two cannot drift apart. No label directory holds a `SKILL.md`; `ref/SKILL.md` is the one
index across all of them.

## What a label is

One flat store, one kind of label. A label can describe a *stack* (`apple`, `web`, `react`,
`threejs`) or a *mode* of development (`game`); the store doesn't distinguish — every label is a
directory of engine cells that stacks with every other label in scope, detected the same way (see
`_detect.md`). A repo carries several labels at once — a game on an iPhone is `apple` (how you
build/test/ship on Apple), `mobile` (what a phone app is regardless of vendor), and `game` (how
games are built regardless of device) simultaneously.

Which labels apply to which repo is resolved from a map held outside this store, path-scoped per
repo; see `_detect.md`. Nothing is written into a project repo.

The **issue backend** is not a label. Beads is the standing assumption for every repo, carried in
the `issues` skill description, which is in context every session without a map lookup. Only a
departure from that assumption earns a label: `beads:stealth` for a repo that carries beads and
commits none of it, `beads:mirror` for one whose beads are copied into GitHub Issues, and
`tracker:github` for one with no beads yet. Cells live in [`issues/`](issues/README.md).

## Layout

```
_detect.md              <- at the skills root: how labels resolve, map grammar, classifier heuristic
ref/SKILL.md            <- the index: one row per public label; the only SKILL.md under ref/
ref/<label>/
  context.md            <- the root file, always this name: a `> ` headline INJECTED at session
                           start in every repo carrying this label, a short body, and the label's
                           Files map (see below). The whole file is INJECTED on the session's
                           first edit of a file in this label's domain
  review.md             <- lens the `review` engine adds when this label is in scope
  diagnose.md           <- what to instrument / watch, read at diagnose's instrument phase
  profiling.md          <- profiler catalog / performance gate, read by the `profiling` engine
  testing.md            <- frameworks/harness/idioms, read by `tdd` (write test) and `verify` (drive it)
  design.md             <- OPTIONAL: design-time critique lenses, read by PLANNING skills (not engines)
  prototype.md          <- OPTIONAL: what a throwaway prototype answers for this label, read by `spike`
```

A cell may be absent — the engine then runs generic-only for that label. Any other file in a label
directory is content, named for what it holds, and listed in `context.md`'s Files map. Add a label
by adding its `ref/<label>/context.md` and its row in `ref/SKILL.md` (see `_detect.md`'s "Adding a
label"); add an engine column by adding that filename across the labels that need it.

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
against the body budget. A cell with no other files has no map.

The **headline** is the first `> ` line under the H1. It is the only part injected at session start,
and it is injected for every label the repo carries, so its cost is paid in every session in every
such repo. Twelve words, stating the fact whose absence would cause a wrong action.

The **body** is everything between the headline and `## Files`, capped at 120 words. It reaches
context three ways. `hooks/ref-edit-inject.sh` injects the whole `context.md` the first time a session
edits a file in the label's domain, once per label per session, with no model deciding. The file's
extension, or for a few files its name (`SKILL.md` → `agent-docs`, `Dockerfile` → `container`,
`wrangler.toml` → `cloudflare`), names a definite label (`.go` → `go`, `.swift` → `apple`) and
candidate labels that count only where the map carries them for that path (`.ts` → `web` under a
`web` rule). An extension with no entry injects nothing. `hooks/ref-picker.sh` asks a model, on
every prompt, to choose one label from `ref/SKILL.md`'s table or none, and injects the chosen
label's whole `context.md`; both hooks claim the label in one shared place, so a session gets
each cell once. Otherwise the body is read on demand, by whichever engine has resolved this
label into its scope.

Why two tiers rather than one 120-word cell: a per-cell cap bounds nothing about the total, and the
total is what a session actually pays. Tiering makes the cost scale with how many labels a repo carries rather than with
how much each cell has to say, which is the only version that stays bounded as coverage fills in.

A cell with a body but no headline is a broken cell: session start prints a placeholder naming it
rather than staying silent, because silence there is indistinguishable from "no label applies".

## Who reads what

| Engine | Reads | When |
| --- | --- | --- |
| `review` | `ref/<label>/review.md` | Phase 04 — added as one extra lens sub-agent per matched label |
| `diagnose` | `ref/<label>/diagnose.md`, `ref/<label>/profiling.md` (perf) | Phase 04 (Instrument) |
| `profiling` | `ref/<label>/profiling.md` | after label detect |
| `tdd` | `ref/<label>/testing.md` | Phase 01/02 (write the failing test) |
| project `verify` | `ref/<label>/testing.md` | when a repo's own `.claude/skills/verify-project/` drives the change |

The built-in `verify`/`run` skills are compiled into the Claude Code binary and cannot read this
store directly. The testing axis reaches verification two ways instead: `tdd` reads it when writing
tests, and a **project-local** `verify` skill (which built-in `verify` bootstraps per repo) can read
`ref/<label>/testing.md` for stack-specific drive/harness knowledge.

The store also feeds planning skills, not just engines. A `design.md` cell holds design-time critique
lenses (for `game`: MDA, and Burgun's toy/puzzle/contest/game); `grill-me`, `issues shape`, and
`ref/game`'s design phase read it optionally when the label is in scope. Design cells name structure
and tradeoffs — they never deliver a fun/good verdict.

## No precedence

Stacked cells can contradict each other — `ref/apple/review.md` and `ref/gui/review.md` both carry
motion knowledge today. There is deliberately no precedence table: a conflict is reported as a
finding, because ranking the cells would guard a duplication that should be removed instead. See
`_detect.md`'s "No precedence".

## Current state

Every label in the vocabulary carries a `context.md`, except `node`. It is deliberately
empty for the same reason `tracker:github` is: it sits on half of all repos, so a cell would
fire constantly to say what was already assumed. Docs are a standing assumption, not a map label:
`ref/docs/` is a cell every repo uses, reached by the picker and the edit hook rather than by `domains-map`.

`ref/apple/` has all four engine cells (`review`, `diagnose`, `profiling`, `testing`);
`ref/web/` has `profiling` + `testing` + `review`; `ref/react/` has `review`; `ref/threejs/` has
`review` + `diagnose` + `profiling` + `testing` (WebGL stack only — game knowledge lives in
`ref/game/`).

`ref/game/` — all four engine cells + a `design.md` planning cell + `prototype.md` (feel vs.
numbers questions, the throwaway surface per engine, isolate-one-mechanic discipline), seeded from
majidmanzarpour/threejs-game-skills. `build-arc.md` carries the build arc that conducts
end-to-end game builds over this store and adds the `game` label on scaffold.

`ref/gui/` — `design.md` (planning-time critique lenses) +
`review.md` (motion **defect** lens for the `review` engine — jank, interruptibility/state-stranding,
accessibility) + `opportunities.md` (the **opportunity** half: the four-question gate, the hunt-seam
sweep, and the required rejected-candidates section, read by `critique.md`) + `critique.md` (the
design-quality passes run against a screenshot, which is what `improve`'s `gui` aspect loads) +
`slop.md` (objective AI-slop banned-patterns catalog, read by `critique.md` and the
`review`/`verify` engines; harvested from
Leonxlnx/taste-skill) + `direction.md` (choosing the visual world: the external-dice mechanism, the
challenger deal, the comp discipline, and the single path to image generation via `generate`) +
`amplitude.md` (volume changes on a shipped surface — bolder, quieter, distill, overdrive) +
`states.md` (empty/error/loading/permission states, i18n, overflow, onboarding, interface copy) +
`fidelity.md` (structural surface audit, from jamiemill/layers-skills) +
`prototype.md` (the craft bar and divergence axes for `spike`'s UI shape) + `vocabulary.md` (a
reference — the reverse motion-term glossary, read by `explain`, not an engine cell) +
`libraries.md` (a reference — curated web/React library picks, read by `implement`) +
`sketch.md` (ASCII layouts in chat, the lowest rung of `spike`'s fidelity ladder, with the
`seed.monojson` blank canvas it copies). Seeded from emilkowalski/skills. The implementation-level
values live in `ref/web/review.md` and `ref/apple/review.md`.

The `review` / `improve` line inside `ref/gui/`: **`review.md` is what's broken, `opportunities.md`
is what's missing or weak.** Craft judgements never enter a code review; defects never wait for an
improvement pass.

`ref/gui/layers/` — the six problem-space and solution-space design layers beneath the screen:
`observed-behaviour.md`, `user-needs.md`, `domain.md`, `product-strategy.md`, `conceptual-model.md`,
`interaction-flow.md`. Adapted from jamiemill/layers-skills (MIT). `ref/gui/working-layers.md`
carries the seven-layer framework and how to apply a cell; `ref/gui/orient.md` names the bottleneck
layer and is what `improve`'s `product` aspect runs. `interaction-flow.md` hands its breadboard to
`sketch.md`, and `grill-me` pulls `user-needs.md` + `domain.md` for elicitation discipline.

Add labels as new kinds of software or new stacks appear.

## Attribution

Adapted from [MengTo/Skills](https://github.com/MengTo/Skills) — see that repo's LICENSE:
- `ref/apple/` — `swiftui-pro` (Paul Hudson), `swiftui-debugging`, `performance-profiling`.
  `ref/apple/profiling/*.md` copied verbatim from its `performance-profiling/references/`.
- `ref/web/profiling.md` (+ `ref/web/profiling/browser-profiling.md`) — `optimize-web-animations`.
- `ref/web/review.md` and `ref/apple/review.md`'s motion block — emilkowalski/skills
  (`emil-design-eng`, `apple-design`, `review-animations`). The platform-agnostic design principles
  behind them live in `ref/gui/`.
