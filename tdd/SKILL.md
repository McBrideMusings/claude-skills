---
name: tdd
description: "Test-driven development via vertical-slice tracer bullets (one test → one impl → repeat — NOT all tests first); tests verify behavior through public interfaces, not implementation. Also owns the test-suite audit — judging an existing suite by the same criteria."
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
- [ ] Design the interface for testability (see `MOCKING.md` and `improve`'s [ARCHITECTURE.md](../improve/ARCHITECTURE.md))
- [ ] Look for deep-module opportunities (small interface, deep implementation — same file)
- [ ] List the behaviors to test, in priority order
- [ ] Get user approval on the plan

Ask: *"What should the public interface look like? Which behaviors are most important to test?"*

You can't test everything. Confirm with the user exactly which behaviors matter most — focus on critical paths and complex logic, not every possible edge case.

**Seam gate.** A **seam** is the public boundary a test observes behavior at, without reaching inside. Write down the seams under test and confirm them with the user before writing any test — no test is written at an unconfirmed seam. This is the mechanism that makes "confirm which behaviors to test" above a hard gate rather than a checklist formality.

**Domain labels.** Resolve the labels in scope via [`../_domains/_detect.md`](../_domains/_detect.md). For each matched label with a `testing.md` cell, read it for the framework, harness location, and idioms before writing the tracer bullet — it names which seam to prefer (e.g. a view-model over a slow UI test) and which tooling to invoke. No matching label → use the project's existing test setup.

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

## Audit mode — judging an existing suite

The build loop's criteria, applied retrospectively. Use when asked to audit or improve existing tests (including `improve`'s `tests` aspect).

1. **Inventory** — locate the test files and the runner entry point (an `./admin` task or a package script). No entry point + no tests is itself the lead finding.
2. **Run the suite** through that existing entry point only — **never install or configure tooling** to make it runnable. Record pass/fail, count, wall time. Red, flaky, or absent outranks every static finding.
3. **Static pass** with the same criteria the loop uses: behavior vs implementation ([EXAMPLES.md](EXAMPLES.md) red flags — would the test survive an internal refactor?), public-interface-only, mocking at system boundaries only ([MOCKING.md](MOCKING.md) — internal collaborators mocked = finding), and **seam coverage**: which public seams have no tests at all. Read the matched label's `testing.md` (as in Phase 01) for the stack's idioms before judging harness choices.
4. **Findings**, each grounded in a named test file or a named uncovered seam — no generic "add more tests".

### Findings-only invocation

When another skill (e.g. `improve`'s survey) invokes the audit: no file writes, no commits, no questions — run steps 1–4 and return the findings structured (finding, evidence `file:line`, strength `Strong`/`Worth exploring`/`Speculative`, proposed fix).

## Per-Cycle Checklist

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive an internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```
