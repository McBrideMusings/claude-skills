# Mocking Guidance

Read this when deciding whether / how to mock at a seam.

## Mock at system boundaries only

- External APIs (payment, email, third-party services)
- Databases (sometimes — prefer a real test DB)
- Time / randomness
- File system (sometimes)

**Don't mock** your own classes, internal collaborators, or anything you control.

## Design for mockability at boundaries

### Dependency injection

Pass the external client in; don't construct it inside.

```ts
// Easy to mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

### SDK-style over generic fetchers

Specific functions per operation mock cleanly. A generic `api.fetch(endpoint, options)` forces conditional logic inside the mock.

```ts
// GOOD — independently mockable
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// BAD — every mock needs conditional logic
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

The SDK approach gives:

- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which endpoints a test exercises
- Type safety per endpoint
