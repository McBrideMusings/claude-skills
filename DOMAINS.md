# Domain cells — label knowledge inside the `ref-*` skills

A **matrix of label × engine** knowledge that the workflow-engine skills (`review`,
`diagnose`, `profiling`, and — via `tdd`/`verify` — testing) read from at run time. Each
label's cells live inside its `ref-<label>/` skill directory (`game` → `ref-game-dev/`),
beside that skill's SKILL.md router table — extra files in a skill directory never register
as skills of their own, so the skill IS the cell and the two cannot drift apart.

## What a label is

One flat store, one kind of label. A label can describe a *stack* (`apple`, `web`, `react`,
`threejs`) or a *mode* of development (`game`); the store doesn't distinguish — every label is a
directory of engine cells that stacks with every other label in scope, detected the same way (see
`_detect.md`). A repo carries several labels at once — a game on an iPhone is `apple` (how you
build/test/ship on Apple), `mobile` (what a phone app is regardless of vendor), and `game` (how
games are built regardless of device) simultaneously.

Which labels apply to which repo is resolved from a map held outside this store, path-scoped per
repo; see `_detect.md`. Nothing is written into a project repo, and the per-repo `.claude/domain`
marker this store used to rely on was removed on 2026-08-23.

The **issue backend** is not a label. Beads is the standing assumption for every repo, carried in
the `issues` skill description, which is in context every session without a map lookup. Only a
departure from that assumption earns a label: `beads:stealth` for a repo that carries beads and
commits none of it, and `tracker:github` for one with no beads yet. Cells live in
[`issues/`](issues/README.md).

## Layout

```
_detect.md              <- at the skills root: how labels resolve, map grammar, classifier heuristic
ref-<label>/
  SKILL.md              <- the label's router table — one row per cell, when to open it
  context.md            <- two tiers: a `> ` headline INJECTED at session start in every repo
                           carrying this label, and a body engines read on demand (see below)
  review.md             <- lens the `review` engine adds when this label is in scope
  diagnose.md           <- what to instrument / watch, read at diagnose's instrument phase
  profiling.md          <- profiler catalog / performance gate, read by the `profiling` engine
  testing.md            <- frameworks/harness/idioms, read by `tdd` (write test) and `verify` (drive it)
  orchestrate.md        <- what N parallel workers must each get their own of, and how to pin to it
  design.md             <- OPTIONAL: design-time critique lenses, read by PLANNING skills (not engines)
  prototype.md          <- OPTIONAL: what a throwaway prototype answers for this label, read by `spike`
```

A cell may be absent — the engine then runs generic-only for that label. Add a label by adding its
`ref-<label>/` skill (see `_detect.md`'s "Adding a label"); add an engine column by adding that
filename across the labels that need it.

### `context.md` has two tiers

```markdown
# <label> — injected context

> The one thing that must be true before the first turn. <= 12 words.

<body: <= 120 words, the routing table proper, plus links to sibling files>
```

The **headline** is the first `> ` line under the H1. It is the only part injected at session start,
and it is injected for every label the repo carries, so its cost is paid in every session in every
such repo. Twelve words, stating the fact whose absence would cause a wrong action.

The **body** is everything below it, capped at 120 words measured with the headline excluded. It is
read on demand, by whichever engine has resolved this label into its scope.

Why two tiers rather than one 120-word cell: a per-cell cap bounds nothing about the total, and the
total is what a session actually pays. One repo reached 1,174 injected words with only 19 of 32
labels covered. Tiering makes the cost scale with how many labels a repo carries rather than with
how much each cell has to say, which is the only version that stays bounded as coverage fills in.

A cell with a body but no headline is a broken cell: session start prints a placeholder naming it
rather than staying silent, because silence there is indistinguishable from "no label applies".

## Who reads what

| Engine | Reads | When |
| --- | --- | --- |
| `review` | `ref-<label>/review.md` | Phase 04 — added as one extra lens sub-agent per matched label |
| `diagnose` | `ref-<label>/diagnose.md`, `ref-<label>/profiling.md` (perf) | Phase 04 (Instrument) |
| `profiling` | `ref-<label>/profiling.md` | after label detect |
| `tdd` | `ref-<label>/testing.md` | Phase 01/02 (write the failing test) |
| project `verify` | `ref-<label>/testing.md` | when a repo's own `.claude/skills/verify-project/` drives the change |
| `orchestrate` | `ref-<label>/orchestrate.md` | step 3 (fan out) and step 7 (retire), per worker |

The built-in `verify`/`run` skills are compiled into the Claude Code binary and cannot read this
store directly. The testing axis reaches verification two ways instead: `tdd` reads it when writing
tests, and a **project-local** `verify` skill (which built-in `verify` bootstraps per repo) can read
`ref-<label>/testing.md` for stack-specific drive/harness knowledge.

The store also feeds planning skills, not just engines. A `design.md` cell holds design-time critique
lenses (for `game`: MDA, and Burgun's toy/puzzle/contest/game); `grill-me`, `iron-out`, and
`ref-game-dev`'s design phase read it optionally when the label is in scope. Design cells name structure
and tradeoffs — they never deliver a fun/good verdict.

## No precedence

Stacked cells can contradict each other — `ref-apple/review.md` and `ref-gui/review.md` both carry
motion knowledge today. There is deliberately no precedence table: a conflict is reported as a
finding, because ranking the cells would guard a duplication that should be removed instead. See
`_detect.md`'s "No precedence".

## Current state

Every label in the vocabulary now carries a `context.md`, except `node` and `docs-site`.
Those two are deliberately empty for the same reason `tracker:github` is: each sits on half
of all repos, so a cell would fire constantly to say what was already assumed.

`ref-apple/` has all five engine cells (`review`, `diagnose`, `profiling`, `testing`, `orchestrate`);
`ref-web/` has `profiling` + `testing` + `review`; `ref-react/` has `review`; `ref-threejs/` has
`review` + `diagnose` + `profiling` + `testing` (WebGL stack only — game knowledge lives in
`ref-game-dev/`). `orchestrate` exists only for `apple` today — that column fills the first time a
swarm runs on a stack with a shared device, port, or database.

`ref-game-dev/` — all four engine cells + a `design.md` planning cell + `prototype.md` (feel vs.
numbers questions, the throwaway surface per engine, isolate-one-mechanic discipline), seeded from
majidmanzarpour/threejs-game-skills. Its SKILL.md also carries the build arc that conducts
end-to-end game builds over this store and adds the `game` label on scaffold.

`ref-gui/` (formerly `ui/` — hard rename, no alias) — `design.md` (planning-time critique lenses) +
`review.md` (motion **defect** lens for the `review` engine — jank, interruptibility/state-stranding,
accessibility) + `opportunities.md` (the **opportunity** half: the four-question gate, the hunt-seam
sweep, and the required rejected-candidates section, read by `gui` critique mode, which is what
`improve`'s `gui` aspect loads) + `slop.md` (objective AI-slop banned-patterns catalog, read by
`gui` critique mode and the `review`/`verify` engines; harvested from pbakaus/impeccable +
Leonxlnx/taste-skill) + `direction.md` (choosing the visual world: the external-dice mechanism, the
challenger deal, the comp discipline, and the single path to image generation via `generate`) +
`amplitude.md` (volume changes on a shipped surface — bolder, quieter, distill, overdrive) +
`states.md` (empty/error/loading/permission states, i18n, overflow, onboarding, interface copy) +
`fidelity.md` (structural surface audit, from jamiemill/layers-skills) +
`prototype.md` (the craft bar and divergence axes for `spike`'s UI shape) + `vocabulary.md` (a
reference — the reverse motion-term glossary, read by `gui` and `explain`, not an engine cell) +
`libraries.md` (a reference — curated web/React library picks, read by `gui` and `implement`).
Seeded from emilkowalski/skills. The `gui` skill is the planning orchestrator over this store;
the implementation-level values live in `ref-web/review.md` and `ref-apple/review.md`.

The `review` / `improve` line inside `ref-gui/`: **`review.md` is what's broken, `opportunities.md`
is what's missing or weak.** Craft judgements never enter a code review; defects never wait for an
improvement pass.

`gui/layers/` — the six problem-space and solution-space design layers that used to live
here as `product/`, now outside this store entirely (it was never a label a repo carries):
`observed-behaviour.md`, `user-needs.md`, `domain.md`, `product-strategy.md`, `conceptual-model.md`,
`interaction-flow.md`. Adapted from jamiemill/layers-skills (MIT). The `gui` orchestrator
conducts the layer work over that directory; `interaction-flow.md` hands its breadboard to that same
skill's sketch mode, and `grill-me` pulls `user-needs.md` + `domain.md` for elicitation discipline.

Add labels as new kinds of software or new stacks appear.

## Attribution

Adapted from [MengTo/Skills](https://github.com/MengTo/Skills) — see that repo's LICENSE:
- `ref-apple/` — `swiftui-pro` (Paul Hudson), `swiftui-debugging`, `performance-profiling`.
  `ref-apple/profiling/*.md` copied verbatim from its `performance-profiling/references/`.
- `ref-web/profiling.md` (+ `ref-web/profiling/browser-profiling.md`) — `optimize-web-animations`.
- `ref-web/review.md` and `ref-apple/review.md`'s motion block — emilkowalski/skills
  (`emil-design-eng`, `apple-design`, `review-animations`). The platform-agnostic design principles
  behind them live in `ref-gui/`.
