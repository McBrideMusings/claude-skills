# threejs — injected context

> Dispose geometries, materials and textures. Allocate nothing in the frame loop.

- **Dispose what you create.** Geometries, materials, textures and render targets are not
  garbage-collected — losing the reference leaks GPU memory until the tab dies.
- **Allocate nothing in the frame loop.** A `new Vector3()` per frame is 60 allocations a
  second; reuse scratch objects held outside the closure.
- **Draw-call count is usually the ceiling, not triangle count.** Reach for instancing and
  merged geometry before simplifying meshes.

## Files

| Open | When |
| --- | --- |
| [`scope.md`](scope.md) | What this label covers and what belongs to `game` instead; how the label is detected. |
| [`testing.md`](testing.md) | Testing scene code. |
| [`profiling.md`](profiling.md) | Draw calls, frame budget, GPU memory. |
| [`diagnose.md`](diagnose.md) | Something renders wrong, leaks, or drops frames. |
| [`review.md`](review.md) | Reviewing 3D code. |

Game loops and feel are [`ref/game`](../game/context.md).
