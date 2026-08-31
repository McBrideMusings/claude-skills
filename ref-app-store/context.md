# app-store — injected context

> Review is a queue, not an API. Budget days, not minutes.

Stacks with [../apple/](../apple/), which owns signing and provisioning. This is the
distribution half.

- **Submission is asynchronous and human.** A rejection costs another round trip, so the
  metadata, screenshots, privacy answers and age rating are part of shipping the build, not
  paperwork to do afterwards.
- **A build number can never be reused**, and a version already in review is locked. Bump
  deliberately rather than discovering it at upload.
- **Privacy declarations must match what the binary actually does.** Every SDK that collects
  data has to be declared, including ones pulled in transitively.
- **TestFlight is how it reaches a real device before release**, and an external group goes
  through its own review.
