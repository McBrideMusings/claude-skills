---
name: ref-threejs
description: Three.js and WebGL — resource disposal, frame-loop allocation, scene graph, GPU profiling. Load before writing, debugging or reviewing 3D scene code.
---

# Three.js knowledge

| Open | When |
| --- | --- |
| [`../_domains/threejs/context.md`](../_domains/threejs/context.md) | The core rules: dispose geometries, materials and textures; allocate nothing in the frame loop. |
| [`../_domains/threejs/README.md`](../_domains/threejs/README.md) | Orientation to what this cell covers and how its files fit together. |
| [`../_domains/threejs/testing.md`](../_domains/threejs/testing.md) | Testing scene code — what is assertable without a GPU. |
| [`../_domains/threejs/profiling.md`](../_domains/threejs/profiling.md) | Draw calls, frame budget, GPU memory. |
| [`../_domains/threejs/diagnose.md`](../_domains/threejs/diagnose.md) | Something renders wrong, leaks, or drops frames. |
| [`../_domains/threejs/review.md`](../_domains/threejs/review.md) | Reviewing 3D code. |

Game loops and feel are [`ref-game`](../ref-game/SKILL.md).
