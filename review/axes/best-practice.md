# Best-practices-vs-live-docs lens

Is the diff using its external dependencies the way **current official docs** recommend?

**Gated on complexity — skip by default.** Run this lens **only** when the change introduces new patterns/abstractions, uses an external versioned dependency, or is non-trivial in size. For a trivial or purely mechanical diff, output `Skipped — diff too trivial for a best-practice pass.` and exit. Most reviews skip this lens.

**Split ownership — this lens does NOT verify; it only flags.** This sub-agent has no reliable doc access, so it must **never assert a deviation as fact**. It only **flags** version-sensitive surface worth confirming — "this uses the `X` SDK in a way worth checking against current docs" — giving the `file:line`, the specific API/pattern in question, and *why* it's version-sensitive. Claude verifies every flag against live docs in **Phase 04b** before any of them can become a finding.

**Only flag usage with a concrete cost if wrong.** Never flag idiom or style differences. Surface a flag only when a deviation from current docs would carry a concrete cost: deprecation, security, performance, or a correctness footgun.

Axis tag: `best-practice`. (Flags from this lens are not findings yet — they pass through Phase 04b verification first. A surviving finding **must carry a source URL + confidence** in its report entry.)
