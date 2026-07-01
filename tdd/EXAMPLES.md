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
