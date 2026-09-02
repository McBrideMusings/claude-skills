# Worked Example: Making a Ticket Backlog Drivable by an Agent

A real session. The target was a settled plan — a five-epic backlog already sliced into tickets, structure locked, about to be handed to `implement` for autonomous runs:

> "Run driver-seat over this backlog before we start burning through it."

## Opening framing

> The backlog already has a shape: epics, tickets, acceptance criteria. Staying inside that shape only asks "is the wording clear?" Driver-seat asks a different question: if *I* were the agent picking up ticket 14 of 40 with no memory of this conversation, what would let me understand where I am and drive the rest correctly, at the least cost? That means walking the backlog as a tower — epic, ticket, acceptance criterion, verification step — and checking each level for a programmatic handle and a consistent name, not just readable prose.

## The tower

1. Epic (5 of them, in the tracker as parent issues)
2. Ticket (40, each `blocked-by` its dependencies)
3. Acceptance criteria (prose bullets inside each ticket body)
4. Verification step (what a human or agent runs to confirm the ticket landed)

## Per-level questions

### Level: Epic

- **Agent-intuitive:** epic titles in the tracker ("Billing rework") don't match the section headers in `docs/PRD.md` ("Payments overhaul") — same concept, two names. An agent reading the PRD for context and the tracker for status has to infer they're the same thing.
- **Agent-ergonomic:** `bd list --parent <epic-id>` returns every ticket under an epic — this one already has a programmatic handle.
- **Agent-accretive:** nothing yet forwards epic-level state to the next epic; not a defect at this level, just nothing to report.

No change on ergonomic or accretive. One change on intuitive: rename the PRD section headers to match tracker epic titles exactly.

### Level: Ticket

- **Agent-intuitive:** ticket titles match tracker and body consistently. No gap.
- **Agent-ergonomic:** `bd show <id> --json` returns the full body — drivable. No gap.
- **Agent-accretive:** ticket 14's body references "the pattern from ticket 9" in prose, with no link and no shared fixture — an agent working ticket 14 cold has no path back to what ticket 9 actually built.

`Level: ticket → no gap found; already carries file:line and a runnable command.` — shown as the honest no-change result for two of the three questions at this level, then one real gap on accretive.

Change: add a `blocked-by` edge from 14 to 9 in the tracker (currently only a prose reference) and name the shared fixture ticket 9 leaves behind, in ticket 14's body.

### Level: Acceptance criteria

- **Agent-intuitive:** phrased as prose sentences with no anchor to a file or command — "the dashboard should load fast enough."
- **Agent-ergonomic:** nothing here is machine-checkable; "fast enough" has no programmatic handle at all.
- **Agent-accretive:** the next ticket's criteria don't build on this one's threshold — each ticket restates its own vague performance bar from scratch.

Change: replace prose thresholds with a checkable command and number where one exists (`admin bench dashboard` under 400ms) across every ticket in this epic, and note in the epic body that later tickets should extend the same fixture rather than write a new one.

### Level: Verification step

- **Agent-intuitive:** the "Run/Look for" pair the acceptance flow already requires (per CLAUDE.md) is present on every ticket. No gap.
- **Agent-ergonomic:** already programmatic by construction — no gap.
- **Agent-accretive:** verification commands are copy-pasted per ticket rather than calling a shared `admin verify <slice>` task — 40 near-identical blocks, no shared surface.

Change: extract the shared verification shape into one `admin.toml` task with a slice argument; point every ticket's verification step at it instead of repeating the block.

## Driver-seat changes

- **Renamed PRD section headers to match tracker epic titles** — closes the intuitive gap between "Billing rework" (tracker) and "Payments overhaul" (PRD); same concept now has one name across both surfaces.
- **Added a `blocked-by` edge from ticket 14 to ticket 9, and named the shared fixture in ticket 14's body** — the prose "pattern from ticket 9" reference had no programmatic path back to what 9 actually built; the accretive gap is now a real dependency edge.
- **Replaced vague acceptance thresholds ("fast enough") with `admin bench dashboard` and a number (400ms) across the epic** — turns an unmeasurable criterion into one an agent can run and read back.
- **Added an `admin.toml` `verify <slice>` task and pointed all 40 tickets' verification steps at it** — removes 40 copy-pasted blocks in favor of one shared, accretive surface the next epic's tickets can also call.

Next moves, your call: run driver-seat again once the next epic is sliced, or start `implement` on ticket 1 now that the tower has handles at every level.
