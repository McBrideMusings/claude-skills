# Web testing axis

Read by `tdd` (writing the failing test) and a project's `verify` when the platform is `web`.
Supplies frameworks, seams, and idioms for testing frontend/JS code.

**End-to-end / browser tooling is the Playwright plugin** (`mcp__plugin_playwright_playwright__*`).
Don't wrap it or migrate it into this store — invoke the plugin directly for navigation, clicks,
form fills, and assertions against a running page, the same way the apple axis defers to
`ios-simulator-skill`.

## Frameworks — pick by seam

| Seam under test | Framework | Notes |
| --- | --- | --- |
| Pure logic, utils, reducers, hooks | **Vitest** (Vite/modern) or Jest | fastest; no browser |
| Component behavior (render + interaction) | Testing Library (`@testing-library/*`) on Vitest/Jest + jsdom | assert on accessible roles/text, not internals |
| Full user flows, navigation, cross-page | **Playwright plugin** | slow; reserve for critical paths |
| Visual / snapshot | a snapshot tool the project already uses | don't add one unprompted |

## Idioms

- Test **behavior through the public interface** (the `tdd` core principle) — query by role/label/
  text like a user, not by test-id or DOM structure. A test that breaks on an internal rename was
  testing the wrong thing.
- Prefer the cheapest seam that still exercises the real behavior: a logic/hook/component test over a
  full Playwright e2e. e2e is the last resort, not the default — it's slow and flakier.
- Mock at system boundaries only (network via MSW or route interception, `Date`, `crypto`,
  `fetch`) — not internal collaborators. Inject clock/randomness for determinism.
- Name tests as specs in the project's `docs/CONTEXT.md` vocabulary.

## Running

Unit/component: the project's admin runner (`./admin test`) or `vitest` / `jest` — no browser, fast,
right for the `tdd` red→green loop. Full flows: the Playwright plugin against the dev server.
