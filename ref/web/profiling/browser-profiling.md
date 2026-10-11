# Web animation profiling — browser evaluator

Use this reference when the task needs live evidence that offscreen CSS animations and canvas/WebGL loops are stopped.

## Driving the browser

The evaluator payloads in the two pages below are plain page-context JavaScript — driver-agnostic. Run them through
whatever browser tooling is already set up:

- **Playwright plugin** (`mcp__plugin_playwright_playwright__browser_evaluate`) — pass the payload
  as the `function` body; `browser_navigate` to the route first. Preferred for localhost.
- **claude-in-chrome** (`mcp__claude-in-chrome__javascript_tool`) — pass the payload as the script.

The code in those pages is written against a `tab.playwright.evaluate(fn, arg, opts)` shape from the original
source; when running via the plugin or claude-in-chrome, lift the inner `(profileLabel) => { … }`
function body out and hand it to that tool's evaluate — the DOM/animation/heap logic is identical.
Do not use Codex Browser. If a profiling attempt crashes a tab, don't evaluate the crash `data:`
page — open a clean tab on the localhost route and retry.

## The evaluators

| When | Page |
| --- | --- |
| Proving offscreen CSS animations and canvas/WebGL loops are stopped, at top, mid, footer and mobile | [`browser-profiling/css-animations.md`](browser-profiling/css-animations.md) |
| Leaks, long-session slowdown, runaway CPU/GPU: the heap sampler, idle and route-cycle checks | [`browser-profiling/memory-leaks.md`](browser-profiling/memory-leaks.md) |
