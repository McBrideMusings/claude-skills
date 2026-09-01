# Harvest mode

Overrides to the code-mode workflow in `SKILL.md` — load alongside it.

When the capability is absent from the user's repo, the job flips from comparison to acquisition: understand how the reference implements it, translate it onto the user's architecture, and leave behind planning artifacts a future implementation session can execute from. Same spine — scope, acquire, sub-agent-per-reference, portability filter — with five phase overrides.

**Phase 01 scope — lock the capability and its landing zone, not an ours-side subsystem.** There is no user subsystem to name. Instead lock: (1) the capability being brought in, (2) the reference(s), (3) where it would land in the user's architecture — which existing system stays authoritative and which invariants constrain the new piece. Read the user's repo for (3) before reading the reference; the landing zone shapes what's worth extracting. Restate in one sentence: "Harvesting <ref>'s surface-crawling vine generation into our voxel game as a rendering layer; the voxel sim stays authoritative."

**Phase 04 depth — read to reimplementation level.** Comparison can skim for differences; harvest can't. Sub-agents read the reference until each technique is explainable well enough to rebuild from the writeup alone: the algorithm, key constants, data shapes, and — highest value of all — recorded why-decisions and abandoned approaches (a README or comment saying "we tried X, it failed because Y" saves the user from re-walking that dead end).

**Phase 05 — translation map instead of diff buckets.** Build a technique-by-technique map: their mechanism → our equivalent. The load-bearing rows are the **divergences** — places where the reference's assumptions don't hold in the user's architecture (e.g. reference generates once up front; user's system mutates continuously, so generation must be incremental). Divergences dictate the design; straight ports are just labor. Each technique lands in one bucket:

- **Adopt** — ports near-verbatim; name the target module.
- **Adapt** — a divergence forces a redesign; name the divergence and the reshaped approach.
- **Reject** — fails the Filezilla rule or doesn't serve what the user's repo is trying to be. One line each.

**Phase 06 — committed analysis doc, not a tmp report.** The deliverable is a permanent reference-analysis doc in the user's docs tree (e.g. `docs/research/<ref-slug>-analysis.md`), following the repo's docs conventions: what the reference is (with source links), how it works technique by technique, then the translation map. Keep implementation sequencing OUT of the doc — that's the issues' job — so the doc stays true even as the plan shifts. Wire the doc into the repo's docs surface per its conventions (sidebar/nav, file map).

**Phase 08 terminal — dependency-ordered issue slate.** Draft one issue per subsystem of the incoming capability, ordered by dependency (`Depends on #N`), each with context citing the doc's sections, concrete scope, and acceptance criteria; plus one backlog-capture issue for techniques noticed but deliberately unscheduled, so they aren't lost. Show the user the drafted slate and get an explicit yes before filing — grill-me only for genuinely contested routing, as in code mode. Type `go` to file everything as listed, or answer per item.
