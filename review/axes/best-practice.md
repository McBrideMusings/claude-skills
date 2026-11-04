---
run: gated
when:
  - jev:
      noul: "The diff introduces a new pattern or abstraction, calls the API of an external versioned dependency, hand-writes functionality a library or platform commonly provides (parsing, a protocol client, retries, diffing, caching, argument parsing, UI widgets), or is non-trivial in size; a trivial or purely mechanical edit does not count."
      min_p: 0.5
      min_confidence: 0.5
      state: diff
---

# Best-practices-vs-live-docs lens

Two questions, both answered against live sources:

1. Is the diff using its external dependencies the way **current official docs** recommend?
2. Does the diff **hand-write something it didn't need to** — functionality a maintained library, the platform or language's own built-ins, or a function already in this repo provides? Parsing a structured format with regexes or string slicing, a protocol client or server (HTTP, WebSocket, MCP, SSE), retries and backoff, diffing, fuzzy matching, argument parsing, date maths, caching, signing, UI widgets the project's UI kit already ships. Flag it with the `file:line` range, what the code does, and the candidate replacement by name. A second copy of a function already in the repo is the strongest flag: name both locations.

When this lens runs is its frontmatter, which [`../tool/lens-gate`](../tool/lens-gate) evaluates.

**Split ownership — this lens does NOT verify; it only flags.** This sub-agent has no reliable doc access, so it must **never assert a deviation as fact**. It only **flags** version-sensitive surface worth confirming — "this uses the `X` SDK in a way worth checking against current docs" — giving the `file:line`, the specific API/pattern in question, and *why* it's version-sensitive. Claude verifies every flag against live docs in **Phase 04b** before any of them can become a finding.

**A hand-rolled flag needs a reason the replacement would be better, not just shorter**: a bug class the library already handled (Unicode width, escaping, edge cases in a format), maintenance the library takes over, or a host dependency it removes. Don't flag under about 40 lines with no such reason, and don't flag code that does something the candidate can't — say in one line that you looked.

**Only flag usage with a concrete cost if wrong.** Never flag idiom or style differences. Surface a flag only when a deviation from current docs would carry a concrete cost: deprecation, security, performance, or a correctness footgun.

Axis tag: `best-practice`. (Flags from this lens are not findings yet — they pass through Phase 04b verification first. A surviving finding **must carry a source URL + confidence** in its report entry.)
