# web — injected context

> Semantic HTML before ARIA. Test the narrow viewport and the cold cache.

Ships in a browser. Pairs with [`ref/gui`](../gui/context.md) for the design half — this cell is the
platform half.

- **It renders on a phone, on a slow network, and with the tab backgrounded.** Test the
  narrow viewport and the cold cache deliberately, not at the end.
- **Semantic HTML before ARIA.** A `<button>` is keyboard-reachable and screen-reader
  correct for free; a `<div onclick>` is neither.
- **Nothing user-supplied reaches the DOM as markup** without escaping, and nothing secret
  reaches the client bundle.

## Files

| Open | When |
| --- | --- |
| [`testing.md`](testing.md) | Testing in a browser. |
| [`../testing/keeping.md`](../testing/keeping.md) | Writing, adding or committing a test — the four conditions a test meets to be kept. |
| [`profiling.md`](profiling.md) | Load time, bundle size, runtime cost. |
| [`profiling/browser-profiling.md`](profiling/browser-profiling.md) | Driving a browser to profile animations or leaks on a live page. |
| [`profiling/browser-profiling/css-animations.md`](profiling/browser-profiling/css-animations.md) | Proving offscreen CSS animations and canvas or WebGL loops are stopped. |
| [`profiling/browser-profiling/memory-leaks.md`](profiling/browser-profiling/memory-leaks.md) | A page leaking memory, slowing over a long session, or burning CPU or GPU while idle. |
| [`review.md`](review.md) | Reviewing a web frontend change. |
| [`review-tooling.md`](review-tooling.md) | Running npm audit, knip, madge, depcheck or tsc in a web repo review and reading their output. |
| [`images.md`](images.md) | Adding or reviewing images, backgrounds or animated media: format, size, `srcset`, metadata. |
| [`push.md`](push.md) | Writing or reviewing a service worker's push handler, notifications or offline cache. |
| [`links.md`](links.md) | Links, relative-URL resolution, referrer policy, and the no-JavaScript basics. |

Visual craft is [`ref/gui`](../gui/context.md). React specifics are [`ref/react`](../react/context.md).
