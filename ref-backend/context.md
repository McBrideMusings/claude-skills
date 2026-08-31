# backend — injected context

> Pairs with api for the contract. Never log secrets, tokens or payloads.

The wire contract — versioning, idempotency, pagination — is [../api/](../api/), and that
cell carries the rules. This one is the process behind it.

- **Never log a credential, a token, or a whole request body.** Logs get shipped, indexed and
  read by people who were never meant to see the payload. Log the shape and the identifier.
- **Every outbound call needs a timeout.** A dependency that hangs turns into your outage,
  and a default of "no timeout" is common enough to be worth checking rather than assuming.
- **A migration runs once, forward, against real data.** Write it so a partial run is safe.
