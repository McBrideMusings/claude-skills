# Phase 05 — Populate PRD (delegates to /to-tickets)

**Spec/PRD content generation is owned by `/to-tickets`, not this skill.** `docs` is the librarian — it creates the `docs/PRD.md` stub during bootstrap and places it in the VitePress site, but it does not synthesize the content.

## When this phase runs

- Phase 02 finishes and the PRD.md it just stubbed is empty.
- Phase 03 detects PRD.md exists but is empty / stub-only.
- Phase 04 finishes migration with an empty PRD.
- The user asks to write/populate the PRD from inside a `docs` run.

## What to do

Don't synthesize here. Hand off:

> *"The PRD stub is in place at `docs/PRD.md`. To fill it from the conversation, run `/to-tickets` — its Phase 03 synthesizes the spec, and it offers to write it here before slicing the work into tickets."*

Name the step and stop; don't auto-invoke `/to-tickets`. If the user is mid-`docs`-run and clearly wants the content now, invoking it on their say-so is fine — but the generation logic and existing-content handling live in `/to-tickets`, and the template plus seams-confirmation live in `../to-tickets/SPEC-TEMPLATE.md`. Never duplicated here.

**A PRD is a by-product of cutting tickets, not a standalone deliverable.** If the user only wants the document and no tickets, they can stop `/to-tickets` after the Phase 03 approval — say so rather than offering to write the PRD by hand.
