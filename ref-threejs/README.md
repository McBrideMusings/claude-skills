# Three.js label

The WebGL-stack label's cells, living beside this skill's SKILL.md. They cover the three.js / WebGL
*stack* only — renderer setup, draw-call/triangle/VRAM budgets, `dispose()` discipline,
DPR/RAF cost, post-processing, GLB/GLTF loading, resize, bundle size, static-host base
paths, and console-error gating.

Game knowledge — game-loop determinism, game-feel, playtest, level design, difficulty —
is **not** here. It lives in the `game` label under `ref-game-dev/`, stacked alongside
this one when both apply.

Detection: a `package.json` depending on `three`, or `*.js`/`*.ts` importing `three` /
`three/addons`, resolves the label to `threejs`. When a repo mixes three.js with a
React/Vue host, mark both this label and `web` in `.claude/domain`.

Adapted from majidmanzarpour/threejs-game-skills — `threejs-debug-profiler`,
`threejs-qa-release`, and the technical-art portions of `threejs-aaa-graphics-builder`.
