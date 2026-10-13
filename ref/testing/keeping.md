# Keeping a test

A test goes into a commit only when it meets all four conditions. One that fails any of them
is deleted before the commit, whoever wrote it and however it was written.

1. **It catches a failure nothing cheaper catches.** The typechecker, the linter, the repo's
   static and package-boundary checks, and a five-minute manual run-through of the change
   would all miss it.
2. **That failure is expensive.** Lost or corrupted data, an auth or privacy hole, contract
   drift between two processes or services (a Worker and its client, a server and a stored
   format), or a race or retry bug.
3. **It asserts behavior at a stable boundary** — a public interface, a wire contract, a
   persisted format. Never internal calls, call counts, or DOM structure.
4. **No other kept test already covers it.**

Write about one test per behavior the task states, and only for behaviors that pass 1 and 2.

## Applying them

- **To a diff:** every test file the diff adds or changes is checked against all four. Name the
  condition a test fails beside its path; the fix is deletion, never a rewrite of the same
  test.
- **To a suite:** the same check, run over every existing test.
  [`examples.md`](examples.md) § "Low-value tests to prune" lists the kinds that fail most
  often — existence, type-check-only, external-provider-shape, contract-in-place-of-feature,
  and UI or registration tests — with a worked example of each.
- **A stated invariant** ("never NaN", "always idempotent") whose failure meets condition 2
  gets one property test; [`writing.md`](writing.md) says how.
