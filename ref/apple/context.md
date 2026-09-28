# apple — injected context

> Signing and provisioning are self-serve. Never ask, never call them blockers.

- **Signing, entitlements, capabilities and provisioning are self-serve here.** Never ask
  whether an account, a team, or a signing identity exists, and never call any of them a
  blocker.
- **Never write a team id or key path into a committed file.** Reference the environment
  variable; a `${VAR:-fallback}` re-leaks the value it was hiding.
- **A capability is a command, not a portal visit.**

## Files

| Open | When |
| --- | --- |
| [`simulator.md`](simulator.md) | Driving the simulator: booting, installing, capturing, `simctl`. |
| [`testing.md`](testing.md) | Writing or running XCTest, and reading its output. |
| [`profiling.md`](profiling.md) | Instruments, time profiles, memory graphs, energy. |
| [`diagnose.md`](diagnose.md) | A crash, a hang, or a build failure to track down. |
| [`review.md`](review.md) | Reviewing Apple-platform code. |
| [`react-native-navigation.md`](react-native-navigation.md) | React Native native-stack headers on iOS 26. |
| [`orchestrate.md`](orchestrate.md) | Running parallel Apple builds across herdr workers. |

Submitting to the store is [`ref/app-store`](../app-store/context.md). TV focus behaviour is [`ref/tvos`](../tvos/context.md).
