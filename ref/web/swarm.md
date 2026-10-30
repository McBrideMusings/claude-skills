# Web swarm axis

Read by every `swarm` worker in a repo with a `package.json`.

## Installs

Each worktree needs its own `node_modules`. `pnpm` links packages from one store per machine, so
a second worktree's install is fast; `npm` copies everything into each worktree. Run the install
by its usual name too, so Turnstile queues it: several installs at once saturate the disk.

## Builds and tests take turns

Run type checks (`tsc`), bundler builds, unit test runs and browser test runs by
their usual name, never from `./node_modules/.bin`, so Turnstile queues them (a queued command is waiting,
not hung; exit 125 means stop). Test runners such as Vitest, Jest and Playwright start one worker
process per core by default, and Playwright launches a browser per worker on top, so two runs at
once oversubscribe the machine.

## Dev servers and ports

A dev server on the project's fixed port is a per-machine singleton: the second worker's server
fails to bind, or worse, its browser tests hit the first worker's server and pass against the
wrong code. Give each worker its own port, derived from `$SWARM_WORKER`, and stop the server
before the pass ends. The project's `swarm-worker` skill says how the port is passed in.
