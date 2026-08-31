# Three.js review axis

Read by the `review` engine when the platform is `threejs`. Added as one extra lens sub-agent at
Phase 04. Covers the three.js/WebGL *stack* — resource lifetime, reuse, resize/DPR, loader error
handling, and common misuse. Not game design.

Adapted from majidmanzarpour/threejs-game-skills.

## Dispose discipline (the #1 three.js leak source)

GPU resources are **not** garbage-collected — GC frees the JS wrapper, the VRAM stays allocated.

| On removing/replacing | Must call |
| --- | --- |
| A mesh | `geometry.dispose()`, `material.dispose()` |
| A material with maps | `texture.dispose()` for every map (`map`, `normalMap`, `envMap`, …) |
| A render target / composer pass | `renderTarget.dispose()` |
| A whole scene swap | traverse + dispose all of the above; drop cached references |

- Flag any `scene.remove()` / reassignment that drops a mesh with no matching dispose.
- Flag textures/geometries created inside the RAF loop (per-frame allocation → GC churn + leak).
- Flag `renderer.dispose()` missing on teardown of a whole viewer.

## Reuse — share, don't re-create

- Geometries and materials for repeated props should be **shared** references, not new instances.
- Repeated meshes (same geometry+material, differing transform) → `InstancedMesh`, not N meshes.
- Textures loaded once and reused; watch for the same URL loaded multiple times.
- Material *roles* shared across meshes; unique material count grows faster than geometry count.

## Resize & DPR handling

- On resize, all of: `camera.aspect` + `updateProjectionMatrix()`, `renderer.setSize(w,h)`,
  composer/pass `setSize()`, and any manual CSS. Missing one → stretched or clipped output.
- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap))` — an uncapped DPR on a
  high-density display is a silent 2-4x fragment-cost multiplier. Flag uncapped DPR.
- Resize handler debounced or idempotent; not allocating new targets every event.

## Loader error handling

- `GLTFLoader` / `TextureLoader` calls have an `onError` (or `.catch` on the promise) that surfaces
  the failure — silent load failures read as a blank scene later.
- Asset URLs respect the Vite `base` path; assets live in `public/` or are import-resolved, not
  hardcoded absolute paths that break on a subpath deploy.
- Draco/Meshopt/KTX2 decoders are configured when the assets need them.
- Texture color space set (`SRGBColorSpace` for color maps); `flipY` correct for the source.

## Common three.js misuse

- Multiple `requestAnimationFrame` loops running at once (each render call double-counts + fights).
- `renderer.info` read before the first frame, or with `autoReset` misunderstood.
- Lit material (`MeshStandardMaterial`) in a scene with no lights → black; flag as a likely bug.
- Mutating `instanceMatrix` without `needsUpdate = true`, or setting it every frame needlessly.
- Loading/decoding on the main thread blocking the first frame with no loading state.
- Console left noisy in production (see the testing axis' console-error gate).

## Review checklist

**Lifetime** — every removed/replaced GPU resource is disposed; no per-frame resource creation.
**Reuse** — shared geometries/materials/textures; instancing for repeated meshes.
**Sizing** — resize updates camera+renderer+composer+CSS; DPR capped.
**Loading** — loaders have error paths; asset URLs honor the base path; decoders configured.
**Correctness** — one RAF loop; lights present for lit materials; color spaces set.
