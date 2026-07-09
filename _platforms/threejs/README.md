# Three.js platform axis

The WebGL-stack column for `_platforms/`. These four cells cover the three.js / WebGL
*stack* only — renderer setup, draw-call/triangle/VRAM budgets, `dispose()` discipline,
DPR/RAF cost, post-processing, GLB/GLTF loading, resize, bundle size, static-host base
paths, and console-error gating.

Game knowledge — game-loop determinism, game-feel, playtest, level design, difficulty —
is **not** here. It lives in the game *domain* axis under `_domains/game/`.

Detection: a `package.json` depending on `three`, or `*.js`/`*.ts` importing `three` /
`three/addons`, resolves the platform to `threejs`. When a repo mixes three.js with a
React/Vue host, load both this axis and `web/`.

Adapted from majidmanzarpour/threejs-game-skills — `threejs-debug-profiler`,
`threejs-qa-release`, and the technical-art portions of `threejs-aaa-graphics-builder`.
