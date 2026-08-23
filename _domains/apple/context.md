# apple — injected context

- **Signing, entitlements, capabilities and provisioning are self-serve here.** Never ask
  whether an account, a team, or a signing identity exists, and never call any of them a
  blocker.
- **Never write a team id or key path into a committed file.** Reference the environment
  variable; a `${VAR:-fallback}` re-leaks the value it was hiding.
- **A capability is a command, not a portal visit.**

Depth: [testing.md](testing.md), [profiling/](profiling/), [simulator.md](simulator.md),
[diagnose.md](diagnose.md), [review.md](review.md).
