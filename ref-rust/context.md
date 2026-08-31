# rust — injected context

> `cargo test`, `cargo clippy`, `cargo fmt`. A shipped `unwrap` is a crash.

- **The gates:** `cargo build`, `cargo clippy -- -D warnings`, `cargo test`,
  `cargo fmt --check`.
- **`unwrap` and `expect` are panics with extra steps.** They are fine in a test or behind an
  invariant you can state in a comment. In a code path a user reaches, propagate with `?` and
  give the error type somewhere to go.
- **Reach for the borrow checker's answer, not around it.** `.clone()` sprinkled to make an
  error go away usually means the data's ownership model is wrong; `unsafe` to the same end
  means it definitely is.
- **Check the feature flags** before concluding a crate cannot do something.
