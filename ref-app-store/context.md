# app-store — injected context

> Review is a queue, not an API. Budget days, not minutes.

Stacks with [../apple/](../apple/), which owns signing and provisioning. This is the
distribution half. The control surface is `asc` — uploads, TestFlight, metadata,
submission and review status all run from the terminal: [asc.md](asc.md).

- **Submission is asynchronous and human.** A rejection costs another round trip, so
  metadata, screenshots, privacy answers and age rating ship *with* the build.
- **A build number can never be reused**, and a version in review is locked. Bump
  deliberately rather than discovering it at upload.
- **Privacy declarations must match what the binary does**, including transitively
  pulled SDKs that collect data.
- **TestFlight reaches a real device before release**; an external group gets its own review.
