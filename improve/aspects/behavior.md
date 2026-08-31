# Aspect brief: `behavior` (native)

Axis tag: `behavior`. Applicability: the product is launchable AND drivable through an existing entry point — a scripting surface, a CLI, a dev server a browser tool can reach, a test harness. No way to drive it means the aspect does not run; say so.

**Read first, in full:** [../BEHAVIOR.md](../BEHAVIOR.md) — its four decisions, feature walk, verification discipline and findings rules are your instructions. Stop before "Grilling loop (interactive follow-up)"; that section does not apply to you.

Verify that the product behaves as its code and docs claim: describe a sample of features on the fixed skeleton, then drive the running product and record what it actually did.

## What to do

1. Make the four stance decisions (unit of interaction, variant axis, interrupt list, cross-cutting order) from the nearest product kind.
2. Pick 2–4 interaction-heavy features. Draft each walk from the code and tests, with `file:line` cites for every number and threshold.
3. Drive the running product against the drafted claims — interleaved, one feature verified before the next is drafted. Record every command and its output.
4. Dedupe suspected defects against the existing tracker before writing them up.
5. Return findings.

## Aspect-specific rules

- **The evidence rule is absolute:** no claim is reported as verified without the recorded command and output beside it.
- **RULE 2 override (stated in BEHAVIOR.md):** a defect verified against the running product is a full finding with evidence and severity, not a `review-territory` line — there is no diff for `review` to run on. Suspected-but-unverified defects stay `review-territory`.
- A failed check may mean the description is wrong, not the product. Say which.
- Leave the product as you found it: restore volume, playback, open windows, working state after driving it.
- **No file writes.** The durable-prose extraction (`docs/CONTEXT.md`, per-surface docs) belongs to the interactive run; name it as a finding instead.
