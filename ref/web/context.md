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
| [`profiling.md`](profiling.md) | Load time, bundle size, runtime cost. |
| [`review.md`](review.md) | Reviewing a web frontend change. |
| [`images.md`](images.md) | Adding or reviewing images, backgrounds or animated media: format, size, `srcset`, metadata. |
| [`push.md`](push.md) | Writing or reviewing a service worker's push handler, notifications or offline cache. |
| [`links.md`](links.md) | Links, relative-URL resolution, referrer policy, and the no-JavaScript basics. |

Visual craft is [`ref/gui`](../gui/context.md). React specifics are [`ref/react`](../react/context.md).
