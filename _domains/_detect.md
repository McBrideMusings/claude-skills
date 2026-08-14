# Domain detection

Every engine that reads from `_domains/` decides which labels are in scope the same way. A label is
a directory of engine cells — `apple`, `web`, `react`, `threejs`, `gui`, `game`, and any other name
added to the vocabulary below. There is no split between "stack" labels and "mode" labels: both kinds
stack the same way, in the same store.

Resolve in this order, stop at the first that answers:

1. **Explicit argument.** The invocation named a label (e.g. `review game`) → use it, skip the marker.
2. **Marker.** A committed `.claude/domain` file in the repo root → resolve labels from it (grammar
   below) and load every matched label's cell. This is the steady state — read the marker, zero
   classification cost.
3. **No marker → classify ONCE, then persist.** Read the files in scope (the diff / target dir / file
   under discussion — never the whole repo) against the old `_platforms/_detect.md` file-signature
   table below as a heuristic, plus `README.md`/`CLAUDE.md`/`docs/CONTEXT.md` prose for labels with no
   file signature ("player", "levels", "score" → `game`; "component", "layout", "animation", "design
   system" → `gui`). Write the result as a marker (grammar below) so this never runs again. If
   confidence is low, ask one plain-chat question before writing. Do **not** re-classify a repo that
   already has a marker.
4. **No `_domains/<label>/` fits** the classified label → offer to author a stub:
   `_domains/<label>/{review,diagnose,profiling,testing}.md` (seeded), then set the marker to it. This
   is how new labels are born; don't silently fall back to generic-only without offering the stub.
5. **No label / user declines → write an empty marker.** Nothing applies here — a plain-text config
   repo, a docs-only repo. Write `.claude/domain` as an empty file (zero rules). This is a classified
   state, not an unclassified one: an empty marker means "classified, no labels apply" and stops step 3
   from ever re-running here, the same way a populated marker does. No overlay loaded either way.
   Graceful, never blocks.

## Marker grammar

`.claude/domain`, committed, one rule per line, first-token glob, colon, comma-separated labels:

```
App/**:     apple, mobile, gui, game
Server/**:  go, backend
**:         cli
```

An **empty file (zero rules)** is itself a valid classified state — it means this repo was
classified and no label applies, not "not yet classified". Step 2 (Marker) still matches on an empty
file: the marker exists, so `labels(scope_paths)` resolves to the empty set and generic-only runs,
without falling through to step 3's classify-once. Distinguish this from a *missing* `.claude/domain`
file, which is what sends resolution to step 3.

Resolution:

```
labels(scope_paths) =
  ⋃ { rule.labels | rule ∈ marker, any(p matches rule.glob for p in scope_paths) }
```

`scope_paths` is the diff / target dir / file under discussion, never the whole repo. A repo with
several targets (e.g. a mac app + an iOS app + a web dashboard) resolves to the labels of the code
actually being worked on.

## Stacking, not layering

Load `_domains/<label>/<engine>.md` for **every** matched label — there is no "platform first, domain
on top" order, because both kinds of label are the same kind of thing now. A missing cell for a
matched label is a no-op (see step 4 above for a missing *directory*; a missing *file* inside an
existing directory is just silently skipped).

## No precedence

If two matched labels' cells disagree (e.g. `apple/review.md` and `gui/review.md` both carry motion
guidance), there is no tiebreak. The engine emits a finding naming both files — ranking the cells
would guard a duplication that should be removed instead.

## Vocabulary

`apple, android, web, react, threejs, python, go, mobile, desktop, gui, cli, tui, backend, game,
library, data`

## Adding a label

Create `_domains/<name>/` with the engine files that apply; the detector picks it up via the marker.
No code change needed — engines already read `_domains/<resolved>/<engine>.md` and no-op when absent.

## Classifier heuristic (former `_platforms/_detect.md` signature table)

Used only at classify-once time (step 3 above), never as a runtime step:

| Signal in scope | Label |
| --- | --- |
| `*.swift`, `*.xcodeproj`, `*.xcworkspace`, `Package.swift`, `Info.plist` | `apple` |
| `package.json` with `react` / `vue` / `svelte` / `next` / `vite`, or `*.tsx`/`*.jsx` | `web` |
| `package.json` with `react` or `next` (dep), or `*.tsx`/`*.jsx` in scope | `react` (also implies `web`) |
| `package.json` with `three` (dep), or `import ... from 'three'` in scope | `threejs` (also implies `web`) |
| `wrangler.toml`, `wrangler.jsonc` | `cloudflare-workers` |
| `pyproject.toml`, `setup.py`, `*.py` | `python` |
| `go.mod` | `go` |
