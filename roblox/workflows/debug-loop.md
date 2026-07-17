# Workflow: debug loop

Fix a runtime error in a Rojo project by cycling console → disk → playtest. Bounded to **5 attempts** — if not fixed by then, stop and reassess the approach rather than thrashing.

## Preconditions
- `rojo serve` is running and connected in Studio (disk edits sync live).
- Active Studio verified: `list_roblox_studios` → `set_active_studio` if needed.

## Loop

1. **DETECT** — `get_console_output`. Parse the error for the failing script path and line number, and the message. If nothing reproduces yet, `start_stop_play(is_start: true)` to trigger it, then read console again.

2. **LOCATE** — find the source on disk, not in Studio:
   - `script_grep(query)` or `script_search(keywords)` to find the script if the path is unclear.
   - Map the Studio path back to the disk file via the Rojo naming table (`references/rojo-tooling.md`) — e.g. `ServerScriptService.Combat` ← `src/server/Combat.server.luau`.
   - Read the disk file (Read tool) around the reported line.

3. **DIAGNOSE** — before editing, confirm the cause. If an API's behavior is uncertain, `execute_luau(code, datamodel_type)` a tiny probe snippet and read the result — verify, don't assume. Check `references/sharp-edges.md` — a large share of Roblox runtime errors are one of SE-1…SE-12 (nil `WaitForChild` yield, disconnected connection leak, `wait()` timing, sparse-table `#`, etc.).

4. **FIX** — edit the **disk** `.luau` file (Edit/Write). Rojo syncs it into the running place. Do **not** `multi_edit` the script in Studio — that fights the sync.
   - For an edit-time bulk change to instances (not scripts), set an undo waypoint first: `execute_luau` → `ChangeHistoryService:SetWaypoint("Before: <desc>")`.

5. **VERIFY** — stop and restart play to load the synced fix: `start_stop_play(false)` then `start_stop_play(true)`. `get_console_output` again. Confirm the error is gone and the intended behavior happens (`inspect_instance` / a probe `execute_luau` to check state).

6. **ITERATE** — if still failing and attempts < 5, return to DETECT with the new console output. Track what you changed each pass so you don't loop on the same edit.

## Stop conditions
- Fixed and verified → done.
- 5 attempts spent → stop, summarize what was tried and the current hypothesis; the bug is likely structural (wrong architecture, not a one-line fix) — escalate to reading the surrounding modules.
