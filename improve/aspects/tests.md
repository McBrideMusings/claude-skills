# Aspect brief: `tests`

Axis tag: `tests`. Applicability: always — an absent suite is the lead finding, not a reason to skip.

**Read:** a test stays only when it meets all four conditions:

1. It catches a failure nothing cheaper catches — the typechecker, the linter, a five-minute manual run.
2. That failure is expensive — lost data, an auth or privacy hole, drift between two processes, a race.
3. It asserts behavior at a stable boundary — a public interface, a wire contract, a stored format.
4. No other kept test covers it.

*Knowledge base: search it for "keeping and writing tests", "<this stack> testing". If you have none, skip this line and don't mention it.*

No file writes, no commits, no questions.

## The audit

1. **Inventory** — locate the test files and the runner entry point (an `admin` task or a package script). No entry point and no tests is itself the lead finding.
2. **Run the suite** through that existing entry point only — never install or configure tooling to make it runnable. Record pass/fail, count, wall time. Red, flaky, or absent outranks every static finding.
3. **Keep pass** — check every test against the four conditions above. A test that fails one is a finding whose fix is deletion; name the condition it fails. The commonest failures: a test that only checks a symbol exists, re-checks what the type system guarantees, pins a third-party API's response shape, or checks that a UI element renders.
4. **Static pass** over the tests that survive step 3: behavior vs implementation (would the test survive an internal refactor?), public interface only, mocking at system boundaries only (an internal collaborator mocked is a finding), and **seam coverage** — which public seams carrying an expensive failure (condition 2 above) have no test at all.
5. **Findings**, each grounded in a named test file or a named uncovered seam, returned structured: finding, evidence `file:line`, impact `P0`–`P3` per [`../../review/REVIEW-CORE.md`](../../review/REVIEW-CORE.md) §Axis tags, proposed fix.

## Aspect-specific rules

- **No suite is the finding.** Return it as one card naming the first behavior worth covering under the four conditions and the seam it would cross — not "add tests".
- **Coverage percentage is not a finding.** A number with no named uncovered behavior behind it says nothing about what would break.
- **Too many tests is as real a finding as too few.** The fix for a test that fails the keep pass is deletion, or a redesigned seam-crossing test only where an expensive behavior exists underneath; never "keep it but make it better."
- Where a test is welded to implementation, the proposed fix names the interface the test should cross instead — that is the same seam vocabulary `architecture` uses, and the two aspects will legitimately land on the same module. Say so; Phase 06 merges them.
