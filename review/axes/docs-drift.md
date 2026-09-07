# Docs-drift lens

**Repo mode only.** A diff review has no standing documentation-drift check unless the diff itself
touches public surface (`negative-space`'s "Docs" bullet covers that narrow case: surface the diff
changes without a doc update). This lens is broader and repo-mode only because it needs the whole
codebase to compare a doc's claim against, not a diff: if invoked outside repo mode, output
`Skipped — docs-drift is repo-mode only.` and exit.

**Two sources feed this lens:**

1. **The architecture-description paragraph from Phase 01r**, compared against the repo's README.
   This is the one place that paragraph is used — Phase 01r writes it and hands the contradiction
   check (not the paragraph itself) to this lens as a specific brief: *"The architecture as read is:
   <paragraph>. The README claims: <quoted README section>. Where do they disagree?"* A disagreement
   here is the primary finding this lens exists to catch, since it's the only documentation-drift
   check in either review mode that fires with no diff to anchor it.
2. **Direct reading, within the slice in scope**, for the two narrower categories below.

**What to look for:**

- **A contradiction between the architecture paragraph and the README**, from source 1 above. Quote
  both sides — the README's exact claim and the paragraph's contradicting observation — and name the
  concrete thing a reader following the README would get wrong (a setup step that doesn't work, a
  described component that doesn't exist, a claimed constraint the code doesn't enforce).
- **A README claim the code doesn't satisfy**, found directly: a documented API that no longer has
  that shape, a "requires X" that isn't checked anywhere, a documented default that the code no longer
  defaults to. Quote the README line and cite the contradicting `file:line`.
- **A comment that contradicts the line beneath it.** A doc comment describing behavior the function
  body no longer has (parameter renamed, early return added, a described side effect removed) — the
  comment drifted after a change that updated the code but not the comment above it. Cite the comment
  and the line it's wrong about.

**Do not flag** a README that's simply thin (missing sections, no examples) — that's a documentation
gap, not drift, and gaps aren't this lens's job; drift is a specific claim contradicted by a specific
fact.

Axis tag: `docs-drift` (flat — name the sub-kind in the headline prose, e.g. "README contradicts
architecture as read", "README claim not satisfied by code", "doc comment contradicts function body").
