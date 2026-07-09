# Web profiling axis

Read by the `profiling` engine (and `diagnose`'s perf branch) when the platform is `web`. Emphasis
on frontend runtime performance: animation cost, offscreen work, long-session memory growth, janky
scroll, RAF/canvas/WebGL loops. The engine's measure→baseline→isolate→fix→re-measure loop is
unchanged; this axis says what to measure, how, and the common fixes.

Adapted from MengTo/Skills `optimize-web-animations`. Live-evidence evaluator payloads (CSS
animation scan, memory sampler, route-cycle audit) are in
[profiling/browser-profiling.md](profiling/browser-profiling.md).

## Core rule

Measure the **real page** before editing. The goal isn't to remove motion — it's to make offscreen
work stop, visible motion resume correctly, and route/unmount cleanup release long-lived resources.
Drive the browser with the Playwright plugin or claude-in-chrome (see the evaluator reference).

## Baseline — what to sample

- Profile at **top, mid, footer, and one mobile viewport** — a single top-of-page reading lies on
  long pages.
- Count CSS animations by computed `animationName` / `animationPlayState` / visibility, **including
  `::before` and `::after`**. Record which animation names run **offscreen** and their DOM owners.
- Inspect `<canvas>`/WebGL separately — CSS profiling does **not** prove RAF loops stopped.
- For memory / "slows down over time" asks: record element / canvas / image / iframe counts, JS heap
  (`performance.memory`, may be `null`), a 10–30s idle sample, and a bounded route-cycle sample.
  Keep stress tests bounded; a tab crash is evidence of overload, not a diagnosis.

Target for a page optimization: `offscreenRunningCount: 0` at every sampled state, and canvas/WebGL
runtime signal inactive when offscreen.

## Isolate → fix (patch the smallest owner that controls the motion)

- Prefer an existing page reveal/visibility hook; else add an `IntersectionObserver` (threshold
  ~0.01) toggling a stable `is-offscreen` class on sections **and** animated children.
- Pause CSS with targeted rules — `animation-play-state: paused` on `.is-offscreen` descendants;
  include `::before`/`::after` for skeletons/glimmers; pause marquee/ticker tracks when offscreen.
- **JS RAF loops can't be paused by CSS** — gate them directly: start on intersect, `cancelAnimation
  Frame` when offscreen, resume on re-entry, cancel on cleanup.
- Respect `prefers-reduced-motion` where the component already does; don't add React render loops for
  scroll/animation state.

## Leak hardening (effect cleanup)

Clear every timeout/interval; cancel RAF before unmount and before restarting; disconnect
`IntersectionObserver`/`ResizeObserver`/`MutationObserver` and custom subscriptions; remove
window/document listeners with the same handler ref; dispose Three/WebGL textures, materials,
geometries, renderers and remove renderer DOM nodes; kill GSAP tweens/timelines; stop media streams;
guard async loaders with an `isDisposed` flag; cap physics frame deltas after a paused frame.

## Verify

Reload, rerun top/mid/footer/mobile, confirm visible motion still runs on scroll-in, RAF reports
inactive offscreen. For leaks, compare before/after route cycles and idle samples — counts should
return to baseline (small async deltas OK; investigate monotonic growth). If heap counters are
`null`, say so — do **not** claim a leak was ruled out.

## Avoid

Removing all animation to pass the profile; pausing visible hero motion via too-broad ancestor
selectors; assuming `animation-play-state` covers pseudo-elements or JS RAF loops; trusting a single
top-of-page measurement; treating unavailable heap counters as proof of no leak; screenshots as
performance proof.
