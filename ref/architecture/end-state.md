# Designing from the intended end state

When reworking an existing change, the reference point is the shape the code *should* have if it had been built that way from day one — not the smallest diff from the shape history happens to have produced. Adapted from jnsahaj/skills `zero-tech-debt`. Vocabulary: [depth.md](depth.md).

1. **State the intended end state** in one or two sentences before touching anything.
2. **Grep for real callers** of every compat path, per the zero-callers rule in [depth.md](depth.md). Delete what has none.
3. **Reshape around the final surface.** One clear flow beats a flow plus mode flags. Split only where a real boundary appears — separate state, separate layout, separate controls, separate domain commands.
4. **Move shared rules to one owner.** Feature flags, permissions, route gating, URL state, command naming — these duplicate across pages and hide inside view components. One place each.
5. **Verify the intended flow**, including the assumptions the deletions invalidated — navigation, permissions, persisted state.

**Write the rework first, then run the tests.** The tests check finished work; they do not steer it. A refactor built by fixing failing tests one at a time bends each edit back toward what the old code did, and a behaviour change slips through as a quiet edit to test setup, so the suite ends green while certifying the bug. When a test fails after the rework, decide from the end state which side is wrong — the code or the test's expectation — before touching either.

Bounds: don't invent a generic framework for one feature, keep the rework scoped to what makes the final shape coherent, and prefer names describing product intent over implementation history.

## Designing for testability

Good interfaces make testing natural — use this as a lens to recognise testable vs untestable shape, not as advice to emit unanchored:

1. **Accept dependencies, don't create them.**

   ```typescript
   // Testable
   function processOrder(order, paymentGateway) {}

   // Hard to test
   function processOrder(order) {
     const gateway = new StripeGateway();
   }
   ```

2. **Return results, don't produce side effects.**

   ```typescript
   // Testable
   function calculateDiscount(cart): Discount {}

   // Hard to test
   function applyDiscount(cart): void {
     cart.total -= discount;
   }
   ```

3. **Small surface area.** Fewer methods = fewer tests needed. Fewer params = simpler test setup.
