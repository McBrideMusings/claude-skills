---
name: roblox
description: >-
  Build and interact with Roblox games from Claude Code — driving Roblox Studio
  live via the official Studio MCP server (read the data model, run Luau,
  playtest, read console output) and editing Luau scripts on disk through Rojo
  filesystem sync. Use for any Roblox / Roblox Studio / Luau / Rojo work:
  writing or debugging Luau, exploring or inspecting a place, running or
  playtesting a game, DataStore/RemoteEvent/security questions, project setup,
  ".rbxl" places, or looking up the Roblox engine API. Triggers: "roblox",
  "roblox studio", "luau", "rojo", "playtest my game", "debug this roblox
  script", "inspect the workspace", "set up a rojo project".
---

# Roblox

Personal skill for building Roblox games with Claude Code. Two halves, one workflow:

- **Rojo (disk)** — Luau scripts are real `.luau` files on disk, git-tracked. You edit them here.
- **Studio MCP (`mcp__Roblox_Studio__*`)** — a live bridge to an open Studio session. You read, inspect, run Luau, playtest, and read console output here.

## The one rule that shapes everything

**MCP reads; disk writes.** With Rojo, disk `.luau` files are the source of truth and `rojo serve` projects them into Studio. So the Studio MCP is for **read / inspect / execute / playtest / debug** — script edits go to disk (Edit/Write the file), and Rojo syncs them in. **Never `multi_edit` a Rojo-managed script** — the next sync clobbers it. (`multi_edit` is only for non-Rojo projects or throwaway scratch scripts.)

## Step 0 — detect the environment

1. **Studio MCP connected?** Check for `mcp__Roblox_Studio__*` tools. If they aren't loaded this session, load with ToolSearch (`select:mcp__Roblox_Studio__list_roblox_studios,...`). If the server isn't configured, tell the user to enable it (Studio → Assistant Settings → MCP Servers, or `claude mcp list`).
   - **Connected → live mode:** `list_roblox_studios` → `set_active_studio` if needed → `get_studio_state`. You can inspect, run Luau, and playtest.
   - **Not connected → offline mode:** edit disk files, use `scripts/api-dump.js` + `http_get` docs for API facts. No live verification — flag that to the user.
2. **Rojo running?** Look for `default.project.json` in the project. If present, follow the disk-write rule. If `rojo serve` isn't running, disk edits won't sync until it is.

## Routing — load the file for the task

| Task | Load |
|---|---|
| Any Studio MCP tool / driving Studio / playtest | `references/studio-mcp.md` |
| Rojo setup, file naming, project.json, packages, LSP types | `references/rojo-tooling.md` |
| A runtime error / crash / unexpected behavior | `workflows/debug-loop.md` |
| Bugs, leaks, footguns, "why is this wrong" | `references/sharp-edges.md` |
| RemoteEvent/RemoteFunction validation, exploits, server-authority | `references/security.md` |
| Luau idioms, `task` library, typed Luau, gotchas | `references/luau-idioms.md` |
| Exact API type / enum / class members | `scripts/api-dump.js` (offline) or `http_get` (live docs) |

## Looking up the API — don't guess

- **Offline, exact types/enums/inheritance:** `scripts/api-dump.js`. Cold cache needs a fetch first:
  ```bash
  node scripts/api-dump.js fetch                       # once; 7-day cache
  node scripts/api-dump.js class Part --inherited      # properties/methods/events + tags
  node scripts/api-dump.js enum Material
  node scripts/api-dump.js members Touched --type Event # which classes have it
  node scripts/api-dump.js search Humanoid
  ```
  Source is the community Roblox-Client-Tracker dump (MIT). Types/tags/inheritance are exact; some default-value fields show placeholder tokens — ignore those.
- **Live prose docs (guides + reference):** the MCP's own `http_get`, allow-listed to `create.roblox.com/docs/...`:
  ```
  http_get(url: "https://create.roblox.com/docs/reference/engine/classes/Part.md", query: "Anchored")
  ```
- **Verify behavior live:** `execute_luau` a probe snippet and read the result. Best source of truth when in a Studio session.

## Core quick reference

**Service hierarchy (where things live):**
- `ServerScriptService` — server `Script`s (never replicated to client).
- `ReplicatedStorage` — shared `ModuleScript`s + `RemoteEvent`/`RemoteFunction` (both sides see it). **No secrets here** — clients read it.
- `StarterPlayer.StarterPlayerScripts` — client `LocalScript`s.
- `Workspace` — the 3D world.
- `ServerStorage` — server-only assets, not replicated.

**Script types:** `Script` = server, `LocalScript` = client, `ModuleScript` = shared library (`require`d). On disk (Rojo): `*.server.luau` / `*.client.luau` / `*.luau`.

**Client↔server:** only `RemoteEvent` (fire-and-forget) and `RemoteFunction` (request/response) cross the boundary. **The client is hostile** — validate every argument on the server and compute all outcomes server-side (`references/security.md`).

**Persistence:** player data uses a session-locked wrapper (ProfileService), never raw `DataStore:SetAsync` per change (`references/sharp-edges.md` SE-1).

## Top sharp edges (full list + fixes in `references/sharp-edges.md`)

| # | Footgun | Fix |
|---|---|---|
| SE-1 | Raw DataStore for player data → data loss on collision | ProfileService / session locking |
| SE-4 | `:Connect()` never disconnected → memory leak per player | Trove/Janitor, clean on `PlayerRemoving` |
| SE-10 | `wait()` / `spawn()` — imprecise, swallows errors | `task.wait` / `task.spawn` (errors propagate) |
| SE-11 | `WaitForChild(x)` with no timeout → infinite yield | always pass a timeout arg |
| SE-12 | Luau string patterns treated as regex | `%d` not `\d`; patterns ≠ regex |

## After changing code

Fix on disk → Rojo syncs → in live mode, `start_stop_play(false)` then `start_stop_play(true)` to reload, and `get_console_output` to confirm. Match the project's existing conventions; keep modules under ~300 lines; `--!strict` on critical ones.
