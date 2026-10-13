# The test-first loop

Use when the work is test-driven: write a failing test, make it pass, repeat. The loop's tests
drive the code; only the ones that meet [`keeping.md`](keeping.md) are committed. A loop test
for a behavior that fails condition 1 or 2 is scaffolding — delete it before the commit.

## Vertical slices, never horizontal

Write one test, then the code that passes it, then the next test. Each test responds to what
the previous cycle taught. Writing every test first and every implementation after produces
tests of *imagined* behavior — the shape of types and signatures — that pass when behavior
breaks and fail when it is fine.

```
WRONG (horizontal):  test1, test2, test3, test4   →   impl1, impl2, impl3, impl4
RIGHT (vertical):    test1 → impl1 → test2 → impl2 → test3 → impl3 → ...
```

## 1. Plan

Before writing any code:

- [ ] Confirm with the user what interface changes are needed
- [ ] Confirm with the user which **behaviors** to test, in priority order, and mark the ones
      whose tests will be kept under [`keeping.md`](keeping.md) conditions 1 and 2
- [ ] Write down the **seam** for each ([`writing.md`](writing.md) § Seams) and confirm it; no
      test is written at an unconfirmed seam
- [ ] Design the interface for testability ([`mocking.md`](mocking.md), and
      `ref/architecture`); look for a deep module — a small interface over a deep
      implementation
- [ ] Get the user's approval on the plan

## 2. Tracer bullet

One test that confirms one behavior end to end.

```
RED:   write test for first behavior → fails
GREEN: minimal code to pass         → passes
```

## 3. Incremental loop

For each remaining behavior: next test → RED; minimal code → GREEN. One test at a time, only
enough code to pass it, nothing written for a later test.

## 4. Hand off

Once every planned behavior is green, run `/simplify` for reuse and cleanup rather than
refactoring inside the loop. Never refactor while RED.
