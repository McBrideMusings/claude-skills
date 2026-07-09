# Apple testing axis

Read by `tdd` (writing the failing test) and `verify` (driving the change) when the platform is
`apple`. Supplies the frameworks, harness locations, and idioms for testing Swift/SwiftUI code.

**The tooling is `ios-simulator-skill`.** For anything that builds, boots a simulator, drives UI,
or checks accessibility, invoke that skill — it owns the 22 scripts (build automation, semantic UI
navigation, a11y testing, simulator lifecycle). This axis is the *knowledge layer* on top: what to
write, at which seam, in which framework.

## Frameworks — pick by seam

| Seam under test | Framework | Notes |
| --- | --- | --- |
| Pure logic, models, view-models | **Swift Testing** (`@Test`, `#expect`) on modern targets; XCTest otherwise | fastest; no simulator |
| Async / concurrency | Swift Testing or XCTest with `async` test funcs | avoid `XCTestExpectation` where `await` works |
| A view's observable behavior | test the view-model behind it, not the pixels | SwiftUI bodies are not a good direct seam |
| Full-screen flows, navigation, taps | **XCUITest** driven via `ios-simulator-skill` | slow; reserve for critical paths |
| Snapshot / visual regression | a snapshot library if the project already uses one | don't add one unprompted |

## Idioms

- Test **behavior through the public interface** (the `tdd` core principle), not `private` internals
  or view structure. A test that breaks when you rename an internal function was testing the wrong
  thing.
- Prefer a logic seam (view-model, reducer, service) over a UI seam — XCUITest is the last resort,
  not the default, because it's slow and flaky relative to a unit test.
- Mock at system boundaries only (network, clock, `URLSession`, persistence) via protocol-witness or
  dependency injection — not internal collaborators. See `tdd`'s MOCKING.md.
- Inject `Date`/`UUID`/randomness so tests are deterministic.
- Name tests as specs in the project's `docs/CONTEXT.md` vocabulary.

## Running

Use `ios-simulator-skill` for build + simulator-boot + XCUITest runs. For a plain logic-test suite,
the project's admin runner (`./admin test`) or `xcodebuild test` / `swift test` is enough and
doesn't need a booted simulator — prefer it for speed in the `tdd` red→green loop.
