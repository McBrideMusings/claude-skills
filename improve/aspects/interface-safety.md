# Aspect brief: `interface-safety` (native)

Axis tag: `interface-safety`. Applicability: always — every repo has a seam with callers.

**Read first, in full:** [../INTERFACE-SAFETY.md](../INTERFACE-SAFETY.md). Its "Findings-only invocation" section at the end is the contract you run under; steps 4 and 5 of its Process (delete the bypasses, prove the pit) describe the fix, not your job.

Ask the one question no other aspect asks: **can a caller do the obvious thing and get the wrong result?**

## What to do

1. **Find the seams with callers** — exported functions, hook return values, setters, component props, route bodies, schemas, command surfaces. Prioritise the ones with many callers or many future callers.
2. **Enumerate the callers of each.** Not a sample — grep them all. If they can't be enumerated, mark that seam `Unknown` and move on rather than guessing.
3. **Run the footgun test** on each: if someone does the obvious thing without knowing the hidden helper or convention, does behavior break?
4. **Name the rung** the fix would take, from INTERFACE-SAFETY.md's ladder: (1) make the existing API do the safe thing, (2) narrow the type or schema so the bad state can't be represented, (3) rename or split so the dangerous path is explicit, (4) add a helper. Take the highest rung that works, not the easiest. "Add a comment" is not a rung.

## Aspect-specific rules

- **Both halves, concretely.** Every finding states the natural call a maintainer would type *and* what it produces versus what it should produce — real values, never "an incorrect state".
- **The seam is the finding, never the call site.** A finding that says "fix this one caller" has misread the aspect.
- This is the proactive half of the footgun test that `review`'s `contracts` axis runs read-only on a diff. If the thing you found is already producing wrong output today, that is review's, not yours — tag it `review-territory`.
- Include the caller count in the finding. It is what makes the size of the win checkable.
