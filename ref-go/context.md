# go — injected context

> `go test ./...`, `go vet`, gofmt. Check every error, never discard one.

- **The gates:** `go build ./...`, `go vet ./...`, `go test ./...`, gofmt — or the project's
  `golangci-lint` config if it has one.
- **Every returned error is checked.** `_ = doThing()` and a bare `if err != nil { return err }`
  that loses context are the two common ways a failure disappears. Wrap with `fmt.Errorf`
  and `%w` so the chain survives.
- **A goroutine needs a way to stop.** Pass a `context.Context`, honour cancellation, and
  know which goroutine closes a channel — a send on a closed channel panics.
- **Slice aliasing is the silent data bug.** `append` may share backing memory with the
  slice it grew from.
