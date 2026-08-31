# Three.js testing axis

Read by `tdd` (write the failing test) and a project-local `verify` (drive the change) when the
platform is `threejs`. Covers headless canvas verification, visual-regression baselines, the
production-preview + static-host base-path check, and the console-error-free gate — the WebGL
stack, not gameplay.

Adapted from majidmanzarpour/threejs-game-skills.

## Headless canvas smoke harness

Drive the built app in headless Chromium (Playwright) and assert the canvas actually rendered.
This is the cheap always-run gate — it does not replace screenshot baselines for polished screens.

- Launch the preview URL headless; wait for fonts, GLTFs, textures, and the first frame.
- Assert canvas exists, CSS size nonzero, drawing-buffer size nonzero.
- Sample canvas pixels: assert **non-blank** output and color variance above a floor.
- Read `renderer.info` via a runtime diagnostics hook and assert counts are within budget.
- Exit nonzero on blank canvas, any console error, or any page error.

Expose deterministic hooks so a scene can be frozen for capture:

```ts
window.__THREE_TEST_HOOKS__ = {
  seed(n: number) {},              // seed RNG
  setPausedForScreenshot(p: boolean) {},  // freeze animation/particles
  setReducedMotion(on: boolean) {},       // kill camera shake / time-based post
  hideDebugUi(hidden: boolean) {},        // hide FPS meters / overlays
};
```

## Visual-regression baseline — decide, don't default

Add `expect(page).toHaveScreenshot()` baselines only when the visual state is valuable enough to
protect **and** deterministic enough to compare.

| Add a baseline when | Skip (canvas smoke only) when |
| --- | --- |
| Release-ready / showcase screen | Exploratory prototype |
| HUD/menu layout regressed before | Scene is intentionally random, hard to seed |
| Imported asset must be proven visible | Particles/noise dominate; masking hides the assertion |
| Need per-release desktop+mobile evidence | Only need "is the canvas non-blank" |

Even when skipped, record the skip reason. Before baselining: seed RNG, pause particles, freeze
camera shake / time-based post, hide debug overlays, wait for all assets + first frame, use a
fixed viewport + device profile. Thresholds: low `maxDiffPixelRatio` for stable UI; allow a
slightly higher ratio for WebGL antialiasing/post — never so high real layout/asset failures pass.

```bash
npx playwright test tests/visual-regression.spec.ts --update-snapshots
npx playwright test tests/visual-regression.spec.ts
```

## Production preview + static-host base path

The dev server hides the failures that hit users. Verify the built output:

- `vite build` (or the project build) passes clean.
- `vite preview` (or a static server) serves the built files.
- Asset URLs resolve under the intended Vite `base` — a subpath deploy (`/game/`) breaks
  root-absolute asset paths; this is the most common "works locally, blank in prod" cause.
- Main interaction works in the preview build, desktop **and** mobile viewport.
- Bundle size and largest assets (GLB, textures) reviewed.

## Console-error-free gate

- Production preview console must be clean: no errors, no unhandled rejections, no failed
  network requests.
- Debug UI, FPS meters, and test hooks are gated out of the production build unless intentional.
- The harness exits nonzero if any console error or page error appears — a non-blank canvas does
  **not** excuse console errors.

## Report

Lead with pass/fail. Include: build/preview commands, URL, harness decision (smoke only /
baselines added / skipped + reason), states covered, screenshot update+compare commands, baseline
artifact paths, thresholds, `renderer.info` numbers, and residual risks.
