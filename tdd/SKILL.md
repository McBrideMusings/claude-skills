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
- [ ] Look for deep-module opportunities (small interface, deep implementation — see `improve-codebase-architecture`)
- [ ] Get user approval on the behavior list

You can't test everything. Force a priority order on the behaviors before writing the first test.

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

### Phase 04 — Refactor

After all tests pass:

- [ ] Extract duplication
- [ ] Deepen modules (move complexity behind simple interfaces)
- [ ] Run tests after each refactor step

**Never refactor while RED.** Get to GREEN first.

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
