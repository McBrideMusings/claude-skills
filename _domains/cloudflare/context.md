# cloudflare — injected context

> `wrangler` is the path, never the dashboard. Secrets via `wrangler secret put`.

Implies [../web/](../web/). A change made in the dashboard has no diff and no history.

- **`wrangler.toml` / `wrangler.jsonc` is the source of truth** for bindings, routes and
  environments. A binding that exists only in the dashboard breaks the next deploy from a
  clean checkout.
- **Account, zone, KV, D1 and R2 ids are configuration, not secrets** — they belong in the
  tracked config beside the bindings that need them. API tokens are secrets, and belong in
  `wrangler secret put`.
- **Workers run at the edge, not in Node.** No filesystem, no long-lived process, and a CPU
  budget per request. Check the runtime API before reaching for an npm package.
