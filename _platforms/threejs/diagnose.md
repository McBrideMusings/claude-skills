# Three.js diagnose axis

Read by the `diagnose` engine at Phase 04 (Instrument) when the platform is `threejs`.
Says *what to watch* for three.js render/runtime bugs — the observable signals that separate
a scene/camera fault from a loader, resize, or context fault. Perf regressions branch to
`profiling.md`.

Adapted from majidmanzarpour/threejs-game-skills.

## Triage order (do not skip)

1. Reproduce locally with the same command and URL; confirm the server is serving *this* build.
2. Read the **first** console error, page error, and failed network request before editing.
3. Identify the owning module: renderer, scene, camera, RAF loop, loaders, resize, or build/base path.
4. Fix the root cause in that module; retest the exact broken path with a screenshot + non-blank pixel check.

## Symptom → what to instrument

| Symptom | Watch |
| --- | --- |
| Blank canvas | canvas in DOM; CSS size nonzero; drawing-buffer size nonzero; one active RAF loop |
| Blank, context ok | camera aspect/near/far/projection; scene has visible objects in frustum; material opacity/`transparent`/`side`/depth/color-space; lights present for lit materials; background ≠ object color |
| Lost WebGL context | `webglcontextlost`/`webglcontextrestored` events; GPU memory exhaustion; too many contexts; unhandled `renderer.forceContextLoss` |
| GLB/GLTF load failure | URL + Vite `base` path; `public/` vs imported path; external buffers/textures; Draco/Meshopt decoder present; CORS/MIME; casing; expired provider URL |
| Texture wrong/missing | color space (`SRGBColorSpace`), `flipY`, mipmaps, load-error fallback vs silent fail |
| Animation not playing | `AnimationMixer.update(delta)` called; delta in **seconds** not ms; clip bound to correct root; action `.play()` and not stopped by a state transition |
| Resize breakage | on resize: `camera.aspect` + `updateProjectionMatrix()`, `renderer.setSize()`, composer `setSize()`, CSS; DPR re-applied |
| NaN transforms | `position`/`quaternion`/`scale` finite; division by zero delta; uninitialized physics/body values; `Number.isNaN` on inputs to `lookAt`/`setFromEuler` |
| Nothing responds | one RAF loop only (not several); loop actually started once; tab-visibility pause not stuck |

## Renderer diagnostics snippet

Expose a live diagnostic object so counters are observable at runtime:

```ts
window.__THREE_DIAGNOSTICS__ = { info: renderer.info };
```

Useful fields: `info.render.calls`, `.triangles`, `.points`, `.lines`,
`info.memory.geometries`, `info.memory.textures`, `info.programs`.

## Common mistakes

- Guessing without reproducing, or optimizing the dev server instead of production preview.
- Fixing sizing in CSS when the renderer/camera/DPR sizing is actually wrong.
- Ignoring console/page errors because the canvas *looks* non-blank.
- Treating delta as milliseconds; not clamping delta after a slept tab.
- Not disposing replaced assets on scene swap, then blaming a "leak" elsewhere.
- Shipping a GLB without checking scale, pivot, bounds, texture memory, or base path.

## Verify the fix

Screenshot, sample canvas pixels for non-blank output + color variance, confirm console/page
errors are gone, and re-drive the exact path that was broken (including after a resize).
