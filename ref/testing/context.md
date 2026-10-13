# testing — injected context

> Commit a test only when it meets all four conditions in `keeping.md`.

Applies to every automated test in every repo — unit, integration, end to end. Stack specifics
(framework, harness, preferred seam) live in each stack label's `testing.md`; this cell holds
what is true whatever the stack.

## Files

| Open | When |
| --- | --- |
| [`keeping.md`](keeping.md) | Creating or editing a test file, or deciding whether to add, commit, keep or delete any test. |
| [`writing.md`](writing.md) | Choosing what a test asserts and at which seam, golden or comparison tests, property tests for an invariant. |
| [`loop.md`](loop.md) | Test-first or red→green work: planning the behaviors, the tracer bullet, the vertical-slice loop. |
| [`mocking.md`](mocking.md) | Deciding what to mock, or designing an interface so a test can substitute an external system. |
| [`examples.md`](examples.md) | Judging whether a test is good, or auditing a suite for tests to delete. |
