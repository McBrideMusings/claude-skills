---
name: tdd
description: "Test-driven development via vertical-slice tracer bullets (one test → one impl → repeat — NOT all tests first). Tests verify behavior through public interfaces, not implementation. Triggers: 'tdd', 'red green refactor', 'test first', 'write a failing test', 'build this with TDD', 'tracer bullet this'."
---

# TDD

## Core principle

Tests verify **behavior through public interfaces**, not implementation. Code can change entirely; tests shouldn't.

A good test reads like a spec — `"user can checkout with valid cart"`. It survives refactors because it doesn't care about internal structure. Warning sign: rename an internal function, tests fail, behavior didn't change → those tests were testing implementation.

For grounded good-vs-bad test examples and red flags, see [EXAMPLES.md](EXAMPLES.md).

When exploring the codebase, use `docs/CONTEXT.md` vocabulary so test names match the project's language. Respect ADRs in `docs/adr/` for the area you're touching.

## Anti-pattern: horizontal slices

**Do NOT write all tests first, then all implementation.** That's horizontal slicing — RED = "write all tests", GREEN = "write all code".

Produces crap tests: bulk-written tests verify *imagined* behavior (the shape of types and signatures), not actual behavior. They pass when behavior breaks and fail when behavior is fine.

**Vertical slices via tracer bullets.** One test → one impl → repeat. Each test responds to what you learned from the previous cycle.

```
WRONG (horizontal):  test1, test2, test3, test4   →   impl1, impl2, impl3, impl4
RIGHT (vertical):    test1 → impl1 → test2 → impl2 → test3 → impl3 → ...
```

## Workflow

### Phase 01 — Planning

Before writing any code:

- [ ] Confirm with the user what interface changes are needed
- [ ] Confirm with the user which **behaviors** to test (not implementation steps)
- [ ] Design the interface for testability (see `MOCKING.md` and `improve-codebase-architecture`)
- [ ] Look for deep-module opportunities (small interface, deep implementation — see `improve-codebase-architecture`)
- [ ] List the behaviors to test, in priority order
- [ ] Get user approval on the plan

Ask: *"What should the public interface look like? Which behaviors are most important to test?"*

You can't test everything. Confirm with the user exactly which behaviors matter most — focus on critical paths and complex logic, not every possible edge case.

**Seam gate.** A **seam** is the public boundary a test observes behavior at, without reaching inside. Write down the seams under test and confirm them with the user before writing any test — no test is written at an unconfirmed seam. This is the mechanism that makes "confirm which behaviors to test" above a hard gate rather than a checklist formality.

**Platform axis.** Detect the platform via [`../_platforms/_detect.md`](../_platforms/_detect.md). If `../_platforms/<platform>/testing.md` exists, read it for the framework, harness location, and idioms for this stack before writing the tracer bullet — it names which seam to prefer (e.g. a view-model over a slow UI test) and which tooling to invoke. No axis → use the project's existing test setup.

### Phase 02 — Tracer Bullet

Write ONE test that confirms ONE thing end-to-end.

```
RED:   write test for first behavior → fails
GREEN: minimal code to pass         → passes
```

This proves the path works. Don't over-build it.

### Phase 03 — Incremental Loop

For each remaining behavior:

```
RED:   next test → fails
GREEN: minimal code to pass → passes
```

Rules:

- One test at a time
- Only enough code to pass the current test
- Don't anticipate future tests
- Keep tests focused on observable behavior

### Refactoring is not part of this loop

Once every planned behavior is green, hand off to `/simplify` for reuse/simplification/efficiency cleanup rather than refactoring inline here — that keeps the red→green cycle from drifting into quality work with its own separate concerns. **Never refactor while RED** regardless — get to GREEN first, then hand off.

## Mocking

Mock at **system boundaries only** (external APIs, time, randomness, sometimes filesystem and DBs). Don't mock internal collaborators.

See [MOCKING.md](MOCKING.md) for design-for-mockability patterns: dependency injection, SDK-style interfaces, and concrete examples.

## Per-Cycle Checklist

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive an internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```
