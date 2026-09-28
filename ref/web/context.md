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

Visual craft is [`ref/gui`](../gui/context.md). React specifics are [`ref/react`](../react/context.md).
