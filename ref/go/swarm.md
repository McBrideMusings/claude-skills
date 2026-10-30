# Go swarm axis

Read by every `swarm` worker in a repo with a `go.mod`.

## The build cache is already shared

Go keeps one build cache per user (`go env GOCACHE`) and one module cache (`go env GOMODCACHE`),
whichever worktree builds. A second worktree reuses what the first compiled, so nothing needs
setting up. Do not point `GOCACHE` at the worktree.

## Builds and tests take turns

Run `go build ./...`, `go test ./...`, `go vet` and linters such as `golangci-lint` by
their usual name so Turnstile queues them (a queued command is waiting, not hung; exit 125 means
stop). `go test ./...` runs packages in parallel up to `GOMAXPROCS`, so two
at once oversubscribe the machine.

## Tests that need more than CPU

Tests that bind a fixed port, use a fixed temp path or a shared local database collide between
workers. Use `t.TempDir()` and a port of `0`; the project's `swarm-worker` skill names any fixed
resource the tests still need and how a worker gets its own.
