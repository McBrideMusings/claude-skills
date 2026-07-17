# Studio MCP — driving Roblox Studio from Claude Code

The official Roblox Studio MCP server (`mcp__Roblox_Studio__*`) bridges Claude Code to a running Studio session. Tool names and params below are verified against the live server (binary `/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP`). If a tool isn't documented here with params, load its schema with ToolSearch (`select:mcp__Roblox_Studio__<name>`) before calling — don't guess params.

## Golden rule (Rojo projects): MCP reads, disk writes

When the project uses Rojo, the `.luau` files on disk are the source of truth and `rojo serve` projects them into Studio. So:

- **Script edits go to disk files** (Edit/Write the `.luau` file). Rojo syncs them into Studio.
- **The Studio MCP is for READ / INSPECT / EXECUTE / PLAYTEST / DEBUG — not authoritative script writes.**
- **Do NOT `multi_edit` a Rojo-managed script.** The next `rojo serve` sync overwrites your Studio-side edit — you lose the change and confuse the source of truth.

`multi_edit` is only the right tool when: the project is **not** using Rojo, the script lives outside the Rojo tree, or you're writing a throwaway experiment script you'll delete. Otherwise edit the disk file.

## Always verify the active Studio first

Multiple Studio windows can be open. Before ANY modifying or state-changing call:

1. `list_roblox_studios` → returns `{name, id, active}` per instance.
2. If the intended instance isn't active, `set_active_studio(studio_id)` using the exact `id`.

All subsequent tool calls hit the active instance. Skipping this risks running code against the wrong place.

## `execute_luau` needs a datamodel, and which ones exist depends on play state

`execute_luau(code, datamodel_type)` — `datamodel_type` is **required**, one of `Edit` / `Client` / `Server`.

- Call `get_studio_state` first — it returns current mode + available datamodels.
- **In edit mode only `Edit` is available.** `Client` and `Server` datamodels exist only during a playtest.
- To run server- or client-context code, `start_stop_play(is_start: true)` first, then target `Server`/`Client`.

`execute_luau` runs in a command-bar-equivalent context with full service access — use it to **verify API behavior live**: run a snippet, read the result, instead of guessing how an API behaves.

## Tool reference

### Session & state
| Tool | Params | Use |
|---|---|---|
| `list_roblox_studios` | — | List open Studio instances; check which is active. Call before edits. |
| `set_active_studio` | `studio_id` | Make an instance active (use `id` from list). |
| `get_studio_state` | — | Current mode (Edit/play) + available datamodel types. Call before `execute_luau`. |

### Explore (read-only)
| Tool | Params | Use |
|---|---|---|
| `search_game_tree` | `path?`, `instance_type?` (IsA, case-sensitive e.g. `BasePart`/`BaseScript`/`Model`), `keywords?` (comma/space list), `max_depth?` (default 3, max 10), `head_limit?` (default 200) | Flat-JSON hierarchy explorer. Beyond `max_depth`, children are summarized with counts. |
| `inspect_instance` | `path` (dot notation, case-insensitive) | All readable properties, attributes, children summary, `uniqueId`. Use after `search_game_tree` to drill into one instance. |
| `script_search` | `keywords` (comma list) | Fuzzy match on script **names**. Capped 10 results. No wildcards. |
| `script_grep` | `query` (string or Luau pattern) | Search across all script **contents**. Capped 50 matches. Luau patterns, not regex (`%d` not `\d`). |
| `script_read` | `target_file` (dot path), `should_read_entire_file?` (default true) or `start_line_one_indexed`/`end_line_one_indexed_inclusive` | Read a script, returned as `LINE→CONTENT`. Reads existing scripts only. |

### Execute & playtest
| Tool | Params | Use |
|---|---|---|
| `execute_luau` | `code`, `datamodel_type` (Edit/Client/Server, required) | Run Luau live. Verify API behavior, inspect runtime state, do bulk edit-time ops. |
| `start_stop_play` | `is_start` (bool) | Enter (`true`) / exit (`false`) playtest. Play unlocks Client/Server datamodels. |
| `get_console_output` | — | Read the Studio output log (errors, prints). The debug loop's eyes. |
| `wait_job_finished` | (load schema) | Await a long-running async job (e.g. generation tools). |

### Write (sparingly under Rojo — see Golden rule)
| Tool | Params | Use |
|---|---|---|
| `multi_edit` | `file_path` (dot path), `edits[]` (`old_string`/`new_string`/`replace_all?`), `datamodel_type` (**Edit only**), `className?` (required to create: Script/LocalScript/ModuleScript) | Create or edit a script **inside Studio**. First edit with empty `old_string` sets initial content of a new script. Atomic — all edits apply in order or none. **Avoid on Rojo-managed scripts.** |

### Assets
| Tool | Params | Use |
|---|---|---|
| `search_asset` | `query?`, `assetType?`, `scope?` (auto/creator_store/user/group/universe), price/tag filters | Find assets in Creator Store + inventory before inserting. |
| `insert_asset` | `assetId`, `assetName?`, `assetType?`, `parentPath?` | Insert an asset by numeric ID (models, meshes, images, audio, video, animations, packages). |

### Generation, media, input (load schema before use)
`generate_mesh`, `generate_material`, `generate_procedural_model` — AI asset generation (async → `wait_job_finished`). `screen_capture(capture_id, camera_position?, look_at_position?)` — grab an edit-time viewport image; optionally position the camera. `store_image` / `upload_image` — image assets. `user_keyboard_input` / `user_mouse_input` / `character_navigation` — simulate input / drive the avatar for playtest automation. `skill` / `subagent` — the server's own helper tools.

### Live docs (no Context7 needed)
`http_get(url, query?, context_lines?, return_full?)` — fetches **official Roblox docs only** (allow-listed to `create.roblox.com/docs/...`, URLs must end `.md` or be `llms.txt`). This is the built-in live API reference — prefer it over guessing an API.

- Class API: `http_get(url: "https://create.roblox.com/docs/reference/engine/classes/Part.md")`
- Narrow to a member: add `query: "Anchored"` (returns only matching sections) or `return_full: true`.

For exact type signatures / enums / inheritance **offline**, the `scripts/api-dump.js` helper (see SKILL.md) is faster and needs no network after the first fetch.

## Safety guidelines (adapted for read/execute, not blind writes)

- **Verify active Studio** (`list_roblox_studios`) before any modifying op.
- **Read before write.** `script_read` a script before changing it (whether on disk or via `multi_edit`).
- **Set an undo waypoint before bulk/destructive edit-time ops:** run `execute_luau` with `game:GetService("ChangeHistoryService"):SetWaypoint("Before: <desc>")` first, so the user can Ctrl-Z.
- **Stop the playtest before applying disk fixes.** DataModel changes made during play are discarded when play stops, and Rojo won't sync cleanly mid-play. `start_stop_play(is_start: false)`, then edit the disk file.
- **Don't run heavy build code during a live playtest** — target the wrong datamodel and you mutate throwaway play state.
- **Only touch Studio when the user is actively working in it.** These tools act on a live session; confirm intent before mutating a real place.
