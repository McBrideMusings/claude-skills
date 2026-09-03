# Good vs Bad Test Examples

Read this when grounding test-shape decisions or evaluating an existing test for whether it survives refactors.

## Good vs bad

```ts
// GOOD — behavior through interface
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});

// BAD — coupled to implementation
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});

// BAD — bypasses interface to verify
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// GOOD — verifies through interface
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

## Tautological tests

```ts
// BAD — recomputes the expected value the same way the code does
test("add sums two numbers", () => {
  const a = 2, b = 3;
  expect(add(a, b)).toBe(a + b); // passes by construction, can't disagree with the code
});

// GOOD — expected value comes from an independent source of truth
test("add sums two numbers", () => {
  expect(add(2, 3)).toBe(5);
});
```

A tautological test derives its expected value the same way the implementation computes it — a hand-derived snapshot, a constant asserted equal to itself, or `a + b` standing in for what `add(a, b)` should return. It passes by construction and can never catch a real bug. Expected values must come from an independent source: a known-good literal, a worked example, the spec.

## Red flags

- Mocking internal collaborators
- Asserting on call counts / order
- Test name describes HOW not WHAT
- Test breaks when you refactor without behavior change
- Verifying through external means (raw SQL) instead of the public interface
- Expected value computed the same way the code computes it (tautological)

## Low-value tests to prune

These pass, cost maintenance time, and catch nothing — not because they're coupled to
implementation (that's the red-flag list above), but because there's no real behavior
underneath the assertion. Read this when auditing a suite for tests to delete, not just
tests to rewrite.

### a. Existence tests

Confirms a symbol, route, or component is *present*, not that it *does* anything.

```ts
// BAD
test("PaymentService exists", () => {
  expect(PaymentService).toBeDefined();
});

test("checkout page renders", () => {
  render(<Checkout />);
  expect(screen.getByText("Checkout")).toBeInTheDocument(); // proves nothing about behavior
});
```

If the thing didn't exist, the build would already fail. Delete it, or replace it with a
test of what it does.

### b. Type-check tests

A test whose only failure mode is a type error the compiler already catches.

```ts
// BAD
test("createUser accepts a name string", () => {
  const input: CreateUserInput = { name: "Alice" };
  expect(input.name).toBe("Alice"); // TypeScript already guarantees this compiles
});
```

If the assertion would fail to compile before it fails to run, the type system is already
the test. Delete it.

### c. External-provider-shape tests

Hardcodes a third-party API's current response shape and asserts the adapter parses
*that exact shape*.

```ts
// BAD — encodes Discord's shape as of today as ground truth
test("parses a Discord interaction payload", () => {
  const payload = { type: 2, data: { name: "roll", options: [{ name: "sides", value: 20 }] } };
  expect(parseInteraction(payload)).toEqual({ command: "roll", args: { sides: 20 } });
});
```

This fails the moment the provider changes its shape — unrelated to whether the adapter's
real-world parsing works — and passes even when the adapter is broken against the *actual*
current API. An adapter still needs tests, but at the seam it owns: given the values the
adapter's own parser extracts, does the handler get called correctly? Don't encode the
provider's serialization as a fixture; that's the provider's contract, not this codebase's.
Push exact-shape validation to a sandbox/integration check that talks to the real API, not
the unit suite.

### d. Contract tests standing in for feature tests

Tests a function's signature or a schema's shape instead of what calling it accomplishes.

```ts
// BAD
test("rollDice has the right signature", () => {
  expect(typeof rollDice).toBe("function");
  expect(rollDice.length).toBe(2);
});
```

Same failure as (a) and (b) under a different name: the type system already enforces the
signature. If there's real behavior underneath (`rollDice(20, 3)` returns three values
between 1 and 20), test that instead; if there isn't, delete it.

### e. UI/UX and registration tests

Tests that a `/command` registers, a button renders, a menu exists. Cull these heavily —
they verify wiring, not behavior, and a broken registration surfaces immediately at
startup/runtime rather than needing a test to catch it. Keep one only where the
registration logic has real branching (e.g., conditional registration behind a feature
flag) — then test the branching, not the registration.

**Prune, don't just flag.** A finding in this category proposes deletion outright, or a
redesigned test that crosses a real seam if actual behavior exists underneath — never
"this test could be better," which just relocates the low-value test instead of removing
it.
