# game — injected context

- **Feel is a feature and it is measured in frames.** Input latency, hitstop, coyote time
  and animation cancel windows are the work, not polish applied afterwards.
- **The loop must be playable before anything else is built on it.** A vertical slice that
  runs beats any amount of systems written against a loop nobody has held.
- **Fixed-timestep simulation, interpolated rendering.** Physics tied to frame rate makes
  behaviour differ per machine, which is the bug you cannot reproduce.

Depth: [design.md](design.md), [prototype.md](prototype.md), [testing.md](testing.md),
[profiling.md](profiling.md), [diagnose.md](diagnose.md), [roblox.md](roblox.md).
