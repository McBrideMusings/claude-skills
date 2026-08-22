# Roblox — stack cell

Roblox/Luau/Rojo work has a full knowledge store of its own. This cell exists so the
game engines (`game-dev`, `review`, `diagnose`, `profiling`, `spike`, `testing`)
can find it without the global catalog paying for a description every turn.

**The store moved out of the global catalog on 2026-08-20.** It now lives per-project,
model-invocable inside each Roblox repo and costing nothing anywhere else:

- `~/Projects/roblox-shooter/.claude/skills/roblox/`
- `~/Projects/roblox-plants/.claude/skills/roblox/`

Outside those two repos there is no `roblox` skill — this cell is the whole of it.
The routing table below points at the project copy; read it from whichever repo you
are in. If a third Roblox project appears, copy the skill directory into it too.

## The one rule that shapes everything

**MCP reads; disk writes.** With Rojo, disk `.luau` files are the source of truth and
`rojo serve` projects them into Studio. The Studio MCP (`mcp__Roblox_Studio__*`) is for
read / inspect / execute / playtest / debug only. Script edits go to disk.
**Never `multi_edit` a Rojo-managed script** — the next sync clobbers it.

## Where things live

- `ServerScriptService` — server `Script`s, never replicated to client.
- `ReplicatedStorage` — shared `ModuleScript`s + `RemoteEvent`/`RemoteFunction`. **No secrets** — clients read it.
- `StarterPlayer.StarterPlayerScripts` — client `LocalScript`s.
- `Workspace` — the 3D world. `ServerStorage` — server-only, not replicated.

On disk (Rojo): `*.server.luau` / `*.client.luau` / `*.luau`.

**The client is hostile** — validate every argument on the server, compute all outcomes
server-side.

## Routing into the store

| Task | Read |
|---|---|
| Studio MCP / driving Studio / playtest | `.claude/skills/roblox/references/studio-mcp.md` |
| Rojo setup, project.json, packages, LSP types | `.claude/skills/roblox/references/rojo-tooling.md` |
| Runtime error / crash / unexpected behavior | `.claude/skills/roblox/workflows/debug-loop.md` |
| Bugs, leaks, footguns | `.claude/skills/roblox/references/sharp-edges.md` |
| Remote validation, exploits, server-authority | `.claude/skills/roblox/references/security.md` |
| Luau idioms, `task` library, typed Luau | `.claude/skills/roblox/references/luau-idioms.md` |
| Exact API type / enum / class members | `.claude/skills/roblox/scripts/api-dump.js` |

## Top sharp edges

| # | Footgun | Fix |
|---|---|---|
| SE-1 | Raw DataStore for player data → data loss on collision | ProfileService / session locking |
| SE-4 | `:Connect()` never disconnected → memory leak per player | Trove/Janitor, clean on `PlayerRemoving` |
| SE-10 | `wait()` / `spawn()` — imprecise, swallows errors | `task.wait` / `task.spawn` |
| SE-11 | `WaitForChild(x)` with no timeout → infinite yield | always pass a timeout |
| SE-12 | Luau string patterns treated as regex | `%d` not `\d`; patterns ≠ regex |

## Projects on this machine

- `~/Projects/roblox-plants` — a git repo.
- `~/Projects/roblox-shooter` — **not a git repo** as of 2026-08-20.
