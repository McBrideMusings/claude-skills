# Rust swarm axis

Read by every `swarm` worker in a repo with a `Cargo.toml`. What collides when several workers
build one Rust workspace on one machine, and what `swarm launch` already sets up for it.

## What swarm sets for you

- **`CARGO_TARGET_DIR=<worktree>/target`, cloned from the main checkout's `target/`.** `launch`
  copies the main target with an APFS clone (`cp -c`; `cp --reflink=auto` elsewhere), so
  dependencies start built and the copy shares disk blocks until a build rewrites them. Your
  first build recompiles only the workspace's own crates.
- **The `rust-analyzer-lsp` plugin is off** in workers. Each rust-analyzer runs its own
  `cargo check --workspace`, a second compile per worker that nobody reads.

Do not override either.

## Why not one shared target

A target directory shared across worktrees holds one `debug/<binary>` per name, so a worker that
runs a binary it just built can run the one another worker wrote a second later. Cargo also
names a path crate's artifacts without its path, so worktrees on different branches overwrite
each other's build of the same workspace crate, and a fingerprint that misses the change leaves
a worker linking another branch's code.

## Builds take turns

- Run `cargo build`, `cargo test`, `cargo clippy` and `cargo check` through
  `swarm heavy -- <command>`. The lock also covers what a build alone does not: a test binary
  running after the build finished, a `cargo run`, a benchmark.
- Each build uses every core by default (`--jobs` is the CPU count). Turn-taking keeps that
  right; two at once would each get half and both take longer.
- `cargo clean` in a worker empties only its own target; the next build starts cold.

## Tests that need more than CPU

A test that binds a fixed port, writes a fixed path, or talks to a local daemon collides between
workers the same way a shared simulator does. The project's `swarm-worker` skill names those and
says how a worker gets its own: a port derived from `$SWARM_WORKER`, a temp directory under the
worktree, a daemon started per worker.
