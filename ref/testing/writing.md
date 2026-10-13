# Writing a test

Tests verify **behavior through public interfaces**, not implementation. Code can change
entirely; tests shouldn't.

A good test reads like a spec — `"user can checkout with valid cart"`. It survives refactors
because it doesn't care about internal structure. Warning sign: rename an internal function,
tests fail, behavior didn't change → those tests were testing implementation. Grounded
good-vs-bad examples and red flags: [`examples.md`](examples.md).

Name tests in `docs/CONTEXT.md` vocabulary so they match the project's language, and respect
the ADRs in `docs/adr/` for the area under test.

## Seams

A **seam** is the public boundary a test observes behavior at, without reaching inside. Pick
the seam before writing the test. Each stack label's `testing.md` (`ref/<label>/testing.md`,
labels resolved via [`../../_detect.md`](../../_detect.md)) names the framework, the harness
location, and which seam to prefer — a view-model over a slow UI test, say. No matching label →
use the project's existing test setup.

Mock at system boundaries only — external APIs, time, randomness, sometimes the filesystem and
databases. Never internal collaborators. Patterns: [`mocking.md`](mocking.md).

## Tests that pass for broken code

**A golden or comparison test proves nothing until a bug would change its output.** An all-zero
result, a value clamped at its maximum, or a round trip through a lossy step all match the saved
output whether the code is right or wrong. After writing one, break the code under test on
purpose (flip a sign, drop a term), run the test, and watch it fail, then restore the code. It
is the same check `implement` runs as `mutation.discriminates`
([`../../implement/VERDICTS.md`](../../implement/VERDICTS.md)), done by hand.

**An invariant whose failure meets [`keeping.md`](keeping.md) condition 2 gets one property
test.** When a comment, commit message or issue states a "never" or "always" claim about data,
auth, a contract, or a race, test it with generated inputs across the whole range, including the
edges and the points where the input crosses from one regime to another. Hand-picked examples
show the claim holds somewhere; a property test checks the claim itself. For numeric code,
"no NaN or infinity" is part of every such claim. One test per such invariant, not a coverage
target.

## Checklist, per test

```
[ ] Meets all four conditions in keeping.md
[ ] Describes behavior, not implementation
[ ] Uses the public interface only
[ ] Would survive an internal refactor
[ ] Fails when the code under test is broken on purpose
```
