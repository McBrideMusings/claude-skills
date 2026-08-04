# Platform detection

Every engine that reads from `_platforms/` decides which platform is in scope the same way.
Resolve in this order and stop at the first that answers:

1. **Explicit argument.** If the invocation named a platform (e.g. `profiling apple`), use it.
2. **Project override.** If `docs/CONTEXT.md` or a `.claude/platform` marker names the platform(s),
   trust it. This handles repos whose file mix is ambiguous.
3. **Auto-detect from the files in scope** — the diff, the target dir, or the file under
   discussion. **Not the whole repo.** A repo with several targets (e.g. a mac app + an iOS app +
   a web dashboard) should resolve to the platform of the code actually being worked on, so the
   engine loads one axis, not three.

   | Signal in scope | Platform |
   | --- | --- |
   | `*.swift`, `*.xcodeproj`, `*.xcworkspace`, `Package.swift`, `Info.plist` | `apple` |
   | `package.json` with `react` / `vue` / `svelte` / `next` / `vite`, or `*.tsx`/`*.jsx` | `web` |
   | `package.json` with `react` or `next` (dep), or `*.tsx`/`*.jsx` in scope | `react` (also implies `web` — load both) |
   | `package.json` with `three` (dep), or `import ... from 'three'` in scope | `threejs` (also implies `web` — load both) |
   | `wrangler.toml`, `wrangler.jsonc` | `cloudflare-workers` |
   | `pyproject.toml`, `setup.py`, `*.py` | `python` |
   | `go.mod` | `go` |

4. **No matching axis file** for the resolved platform → run the generic engine and load nothing.
   Detection never blocks the engine; a missing axis is a no-op, not an error.

## Multiple platforms in scope

If the scope genuinely spans more than one platform (a diff touching both Swift and web files),
load each matched axis. If more than two match, ask the user which target to focus on rather than
loading everything — one plain-chat question, not a structured prompt.

## Adding a platform

Create `_platforms/<name>/` and add a detection row above. The engines need no change — they
already read `_platforms/<resolved>/<engine>.md` and no-op when it's absent.
