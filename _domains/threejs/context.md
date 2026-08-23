# threejs — injected context

- **Dispose what you create.** Geometries, materials, textures and render targets are not
  garbage-collected — losing the reference leaks GPU memory until the tab dies.
- **Allocate nothing in the frame loop.** A `new Vector3()` per frame is 60 allocations a
  second; reuse scratch objects held outside the closure.
- **Draw-call count is usually the ceiling, not triangle count.** Reach for instancing and
  merged geometry before simplifying meshes.

Depth: [README.md](README.md), [profiling.md](profiling.md), [diagnose.md](diagnose.md),
[testing.md](testing.md), [review.md](review.md).
