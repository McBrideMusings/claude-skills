---
run: gated
when:
  - jev:
      noul: "The diff introduces a new pattern or abstraction, calls the API of an external versioned dependency, or is non-trivial in size; a trivial or purely mechanical edit does not count."
      min_p: 0.5
      min_confidence: 0.5
      state: diff
---

# Best-practices-vs-live-docs lens

Is the diff using its external dependencies the way **current official docs** recommend?

When this lens runs is its frontmatter, which [`../tool/lens-gate`](../tool/lens-gate) evaluates.

**Split ownership — this lens does NOT verify; it only flags.** This sub-agent has no reliable doc access, so it must **never assert a deviation as fact**. It only **flags** version-sensitive surface worth confirming — "this uses the `X` SDK in a way worth checking against current docs" — giving the `file:line`, the specific API/pattern in question, and *why* it's version-sensitive. Claude verifies every flag against live docs in **Phase 04b** before any of them can become a finding.

**Only flag usage with a concrete cost if wrong.** Never flag idiom or style differences. Surface a flag only when a deviation from current docs would carry a concrete cost: deprecation, security, performance, or a correctness footgun.

Axis tag: `best-practice`. (Flags from this lens are not findings yet — they pass through Phase 04b verification first. A surviving finding **must carry a source URL + confidence** in its report entry.)
