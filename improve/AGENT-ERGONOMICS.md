# Agent ergonomics

Walk the existing system as a tower of linked abstractions and ask, at every level, whether an agent operating it has a programmatic handle and a name that holds steady across surfaces. Named for the driver-seat pass — put the agent in the driver's seat and ask what would let it drive this system correctly at the least cost.

Uses the vocabulary in [ARCHITECTURE.md](ARCHITECTURE.md) where a level of the tower coincides with a module or seam — the tower question here is a different axis (legibility to an agent), not a restatement of depth.

For the prompt this aspect embodies, see [`../grill-me/DRIVER-SEAT.md`](../grill-me/DRIVER-SEAT.md) — this file does not restate it.

## The defect this finds

There is no error and no failing test. The code works, the docs read fine on their own, the CLI does what it says.

A level of the system's tower has no programmatic handle: a feature only demonstrable by taking a screenshot and eyeballing it, a state only inspectable by "run it and watch," a workflow step that exists only as a paragraph in a doc with nothing an agent can call to drive or confirm it. Or the level has a handle, but the name for it drifts between surfaces — the code calls it `intake`, the docs call it "ingestion," the CLI flag is `--import`, and the tracker epic is titled "Loading." Each surface reads fine alone; an agent moving between them pays a name-resolution tax every hop.

The common structure: the tower exists, but some rung has nothing to stand on, or the rung has a different label depending on which surface you're standing on when you look at it.

## When to run this

- Proactively, on a plan, spec, or system whose structure is settled but has never been asked whether an agent can drive it — the planning-time counterpart of "build the agentic control surface as you go."
- After a survey turns up features or workflows with no CLI, API, admin task, or fixture behind them.
- When a name for the same concept has visibly diverged across code, docs, `admin.toml`, and the tracker.

## Process

### 1. Build the tower over the existing system

Name the system's actual levels top to bottom — not a generic template, the real shape: mission → epic → ticket → module → function, or plan → phase → component → seam, whichever applies here. Write it as one line per level.

### 2. Mark every level with no programmatic handle

For each level, ask: can an agent drive this and read the resulting state back — CLI, API, admin task, or fixture — without a human eyeballing a screen or running it by hand and reporting back? Mark the ones that fail.

### 3. Check name identity across surfaces

For each level, check the name used in code, `docs/`, `admin.toml`, CLI/API entry points, and CLAUDE.md. Flag any level where two of these surfaces use different names for the same concept.

### 4. Name the surface the fix adds

For every flagged level, name the concrete surface that would close the gap — a CLI subcommand, an `admin.toml` task, a fixture, a renamed doc section — and which surfaces it would make consistent. A finding that cannot name this surface is not a finding yet.

## Rules

- **Findings are levels, not files.** A finding names a level of the tower and the surface missing at it, not a single call site.
- **Don't propose a rename without naming every surface it touches.** A name-drift finding lists every place the divergent name appears, not just the two you noticed first.
- **A level with a handle and a consistent name gets no finding.** Silence at a level is the correct, and expected, result — see Honesty mechanics in the `driver-seat` lateral technique for why an all-findings pass is a tell.

## Findings-only invocation

When called from `improve`'s survey mode: read-only, no writes, no questions. For each level of the tower examined, return the level name, whether it has a programmatic handle, whether its name matches across code/docs/`admin.toml`/CLI/CLAUDE.md, and the concrete surface a fix would add. Mark a level `Unknown` rather than guessing when the surfaces can't all be checked.
