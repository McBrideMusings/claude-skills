# web — injected context

> Semantic HTML before ARIA. Test the narrow viewport and the cold cache.

Ships in a browser. Pairs with [../gui/](../gui/) for the design half — this cell is the
platform half.

- **It renders on a phone, on a slow network, and with the tab backgrounded.** Test the
  narrow viewport and the cold cache deliberately, not at the end.
- **Semantic HTML before ARIA.** A `<button>` is keyboard-reachable and screen-reader
  correct for free; a `<div onclick>` is neither.
- **Nothing user-supplied reaches the DOM as markup** without escaping, and nothing secret
  reaches the client bundle.

Depth: [review.md](review.md), [testing.md](testing.md), [profiling/](profiling/).
