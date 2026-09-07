# Test-debt lens

**Repo mode only.** A diff review's `negative-space` lens already catches a new branch the diff itself
leaves untested — that's bound to obligations the diff creates. This lens exists for the debt that
accumulated before the diff under review: a whole codebase's relationship between its code and its
tests, which no diff-scoped lens can see because no single diff created it. If invoked outside repo
mode (a diff review, a fixed-point review, or uncommitted changes), output `Skipped — test-debt is
repo-mode only.` and exit.

**What to look for**, walking the slice's files:

- **Churn with no adjacent test.** A file `git log --since="6 months ago"` shows changing often
  (the same signal Phase 01r's slice ordering already computed — reuse it rather than re-running
  `git log`) with no test file beside it (`foo.go` / `foo_test.go`, `foo.py` / `test_foo.py`,
  `foo.ts` / `foo.test.ts`, matching the repo's own existing naming convention — check what a
  neighboring, tested file in the same directory uses before concluding a file "has no test," since a
  repo that centralizes tests in one `tests/` directory doesn't put them beside the source at all).
  A file that changes often and breaks in ways the author has to hand-verify each time is exactly
  where a regression is going to slip through.
- **A test that asserts how rather than what.** A test that mocks every internal collaborator and then
  asserts the mocks were called in a specific order/count is testing the implementation's shape, not
  its behavior — it breaks on a refactor that changes nothing observable and passes on a behavior
  change that keeps the same call shape. Flag it when the mocking is total enough that the test would
  pass against a differently-implemented version doing the wrong thing.
- **A skipped test.** `t.Skip(...)`, `@pytest.mark.skip`, `it.skip(...)`, `xit(...)`, `#[ignore]` — any
  test the suite runs past rather than runs. A skip with a tracked issue number in its reason string is
  lower priority than one with a stale or missing reason; note which.

**Bound this to files actually in scope for the slice being reviewed** — don't walk the whole repo's
test suite from every slice's lens; that's Phase 01r's slicing doing its job wrong, not this lens's to
compensate for.

Axis tag: `test-debt` (flat — name the sub-kind in the headline prose, e.g. "churned file has no
adjacent test", "test asserts call order instead of return value", "test skipped with no tracked
reason").
