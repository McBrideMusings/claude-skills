# Domain detection

Every engine that reads from `_domains/` decides which **domain** (if any) is in scope the same
way. A domain is a *mode of software development* — `game`, and others as they appear — that layers
extra knowledge on top of the platform axis. Unlike platforms, **domains have no file signature**: a
game and a data-viz dashboard on the same three.js stack are byte-identical. So detection is
marker-first and classification runs at most **once** per repo, never on every invocation.

Resolve in order, stop at the first that answers:

1. **Explicit argument.** The invocation named a domain (e.g. `review game`) → use it.
2. **Marker.** A `.claude/domain` file (one domain name per line) or a `domain:` field in
   `docs/CONTEXT.md` → trust it, load `_domains/<name>/<engine>.md`. This is the steady state — read
   the marker, zero classification cost.
3. **No marker → classify ONCE, then persist.** Read `README.md` + `CLAUDE.md`/`docs/CONTEXT.md`
   prose and infer the domain from plain language ("player", "levels", "score" → `game`). Write the
   result to `.claude/domain` so this never runs again. If confidence is low, ask the user one
   plain-chat question before writing. Do **not** re-classify a repo that already has a marker.
4. **No `_domains/<x>/` fits → offer to author a stub.** If classification lands on a domain with no
   store dir yet — or nothing fits — proactively offer to scaffold
   `_domains/<name>/{review,diagnose,profiling,testing}.md` (seeded) and set the marker to it. This
   is how new domains are born; don't silently fall back to generic-only without offering the stub.
5. **No domain / user declines → generic-only.** No overlay loaded. Graceful, never blocks.

## The marker is never committed

`.claude/domain` (and `.claude/platform`) are ignored globally via `~/.config/git/ignore`, so they
stay local to each clone and never enter any repo's history — including collaborative `~/Work` repos.
A fresh clone with no marker just pays the one-time classification again. To share a domain with a
team that also runs these skills, un-ignore the file in that repo by hand.

## Loading order — overlay, not replacement

The domain overlay is read **in addition to** the platform axis, never instead of it. An engine loads
`_platforms/<p>/<engine>.md` first (the stack), then `_domains/<d>/<engine>.md` (the mode), and
applies both. A game on three.js gets three.js stack rules **and** game-mode rules.

## Adding a domain

Create `_domains/<name>/` with the engine files that apply; the detector picks it up. Most domains
only ever need a marker — the classify step is just the bootstrap that writes one.
