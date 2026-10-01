# game — injected context

> Feel is measured in frames. Playable loop first. Fixed timestep, interpolated rendering.

- **Feel is a feature and it is measured in frames.** Input latency, hitstop, coyote time
  and animation cancel windows are the work, not polish applied afterwards.
- **The loop must be playable before anything else is built on it.** A vertical slice that
  runs beats any amount of systems written against a loop nobody has held.
- **Fixed-timestep simulation, interpolated rendering.** Physics tied to frame rate makes
  behaviour differ per machine, which is the bug you cannot reproduce.

## Files

| Open | When |
| --- | --- |
| [`design.md`](design.md) | Designing a mechanic, a loop, or a progression. |
| [`prototype.md`](prototype.md) | Building a throwaway to find out whether something is fun. |
| [`testing.md`](testing.md) | Testing gameplay — what is worth asserting and what has to be felt. |
| [`profiling.md`](profiling.md) | Frame budget, spikes, allocation in the loop. |
| [`diagnose.md`](diagnose.md) | Debugging a physics, timing or state bug. |
| [`review.md`](review.md) | Reviewing gameplay code. |
| [`roblox.md`](roblox.md) | The target is Roblox — Luau, DataStores, replication. |
| [`build-arc.md`](build-arc.md) | Building a whole game end to end — the seven phases and what each hands off to. |

3D rendering craft is [`ref/threejs`](../threejs/context.md).
