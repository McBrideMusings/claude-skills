# Three.js profiling axis

Read by the `profiling` engine (and by `diagnose`'s perf branch) when the platform is `threejs`.
Supplies the tool catalog, render budgets, and ground rules for the three.js/WebGL stack. The
engine's measure→baseline→isolate→fix→re-measure loop is platform-agnostic; this file says *which
counter to read and where the budget sits*.

Adapted from majidmanzarpour/threejs-game-skills.

## Pick the workflow before changing code

| Problem | Tool | Key metric |
| --- | --- | --- |
| Too many draw calls | `renderer.info.render.calls` | calls/frame vs budget; material switches |
| High triangle/vertex load | `renderer.info.render.triangles` | triangles/frame; dense shadows |
| Geometry/material churn | `renderer.info.memory.geometries` / `.programs` | count growth across frames |
| Texture VRAM pressure | `renderer.info.memory.textures` + est. bytes | texture count, dimensions, compression |
| GPU frame breakdown | Spector.js | per-draw cost, redundant state, overdraw |
| Fragment/overdraw/post cost | Chrome DevTools ▸ Performance (GPU track) | GPU time, post-pass count, DPR |
| Main-thread stalls | Chrome DevTools ▸ Performance (long tasks) | RAF task duration, per-frame allocations, GC |
| Bundle/asset weight | `vite build` report / source-map-explorer | JS bytes, largest GLB/texture assets |

"Feels slow" → read `renderer.info` first (draw calls + triangles), then Chrome Performance for
CPU vs GPU split. Pre-release audit → walk all rows + the checklist below.

## Render budget starting points (worst active-play view, not idle)

These are starting contracts, not universal limits — measure the actual scene and document every
deliberate overrun as a tradeoff.

| Metric | Desktop | Mobile |
| --- | --- | --- |
| Draw calls (`info.render.calls`) | <= 300 | <= 150 |
| Triangles (`info.render.triangles`) | <= 750k | <= 300k |
| Geometries (`info.memory.geometries`) | <= 300 | <= 200 |
| Textures (`info.memory.textures`) | <= 60 | <= 40 |
| Texture memory (est.) | <= 256 MB | <= 128 MB |
| Shadow-casting lights | <= 2 | 1 |
| Shadow map size | <= 2048 | <= 1024 |
| DPR cap | 2 | 1.5-2 |
| Post passes (beyond render+output) | <= 2 | 0-1 |

## Ground rules (measurements are worthless if these slip)

- Profile the **production build** (`vite build && vite preview`), not the dev server — HMR and
  unminified code distort hot paths.
- Measure after warmup, in the worst gameplay scenario, at a fixed viewport and DPR.
- Read `renderer.info` *after* a rendered frame; it resets per frame unless `info.autoReset` is off.
- Classify before optimizing: CPU (sim/allocations/GC), GPU-draw (calls, material switches),
  GPU-fragment (overdraw, post, high DPR), GPU-vertex (triangles, shadows), memory (undisposed
  textures/targets), network (bundle/assets).
- Change **one** thing, then re-measure the same scenario. Keep before/after numbers.

## How to spend within budget

- Draw calls → `InstancedMesh` for repeated props; merge by shared material.
- Triangles → spend on near-camera silhouettes; `LOD` / impostors for far detail.
- Materials → share named roles; unique material count grows faster than geometry.
- Textures → compress (KTX2/Basis), keep small, mipmap; no unique 2K for tiny props.
- Fragment → cap DPR, cut post passes, reduce transparent overdraw.
- Memory → `dispose()` geometries/materials/textures/render-targets on scene change.

## Review checklist

**Draw/GPU** — instanced repeated meshes; shared geometries/materials; frustum/distance culling;
shadow casters scoped to hero objects.
**Fragment** — DPR capped; post chain minimal and gameplay-justified; transparent overdraw bounded.
**Memory** — no undisposed resources across scene swaps; bounded texture atlases; render targets
released.
**Loop** — no per-frame allocations in RAF; no layout reads (`getBoundingClientRect`) per frame;
one RAF loop, not many.
