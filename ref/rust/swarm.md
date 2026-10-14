# Rust swarm axis

Read by every `swarm` worker in a repo with a `Cargo.toml`. What collides when several workers
build one Rust workspace on one machine, and what `swarm launch` already sets up for it.

## What swarm sets for you

- **`CARGO_TARGET_DIR=<main checkout>/target`.** Every worker builds into the main checkout's
  target directory instead of a fresh `target/` per worktree. Dependencies are compiled once and
  reused; a new worktree otherwise rebuilds the whole dependency graph from nothing.
- **The `rust-analyzer-lsp` plugin is off** in workers. Each rust-analyzer runs its own
  `cargo check --workspace`, a second compile per worker that nobody reads.

Do not override either. A worker that sets its own `CARGO_TARGET_DIR` goes back to a cold build.

## Builds take turns

- Cargo takes a file lock on the target directory, so two workers building into the shared one
  run one after the other; the second prints `Blocking waiting for file lock on build directory`.
  That is the intended behaviour, not a hang.
- Still run `cargo build`, `cargo test`, `cargo clippy` and `cargo check` through
  `swarm heavy -- <command>`. The heavy lock also covers what cargo's lock does not: a test
  binary running after the build finished, a `cargo run`, a benchmark.
- Each build uses every core by default (`--jobs` is the CPU count). Turn-taking keeps that
  right; two at once would each get half and both take longer.

## What a shared target costs

- Workers on different branches rebuild the workspace's own crates when they take their turn,
  because the sources differ. Dependencies stay built. Expect a turn to recompile your crates,
  not the world.
- The main checkout's own `cargo` waits on the same lock while a worker builds.
- `cargo clean` in a worker deletes every worker's build. Never run it in a swarm.

## Tests that need more than CPU

A test that binds a fixed port, writes a fixed path, or talks to a local daemon collides between
workers the same way a shared simulator does. The project's `swarm-worker` skill names those and
says how a worker gets its own: a port derived from `$SWARM_WORKER`, a temp directory under the
worktree, a daemon started per worker.
