# Aspect brief: `tests` (delegated → `tdd`)

Axis tag: `tests`. Applicability: always — an absent suite is the lead finding, not a reason to skip.

**Read:** `../../tdd/SKILL.md`, the **audit section** (the build loop's criteria applied retrospectively, around line 91) and its **Findings-only invocation** contract. Run steps 1–4 of the audit. Do not read past the audit into the build loop; you are not writing tests.

Judge the existing suite by the same criteria the build loop uses: does each test verify behavior through a public interface, or is it welded to an implementation detail that makes the module unrefactorable?

## Aspect-specific rules

- **No suite is the finding.** Return it as one card naming the first vertical slice worth covering and the seam it would cross — not "add tests".
- Evidence is `file:line` into real test files. A finding about coverage with no test file cited is ungrounded.
- **Coverage percentage is not a finding.** A number with no named uncovered behavior behind it says nothing about what would break.
- **Too many tests is as real a finding as too few.** Run the audit's low-value pass (step 4) too, not just its coverage pass — existence tests, type-check-only tests, external-provider-shape tests, contract-not-feature tests, and UI/UX or command-registration tests. The proposed fix is deletion, or a redesigned seam-crossing test where real behavior exists underneath; never "keep it but make it better."
- Where a test is welded to implementation, the proposed fix names the interface the test should cross instead — that is the same seam vocabulary `architecture` uses, and the two aspects will legitimately land on the same module. Say so; Phase 06 merges them.
