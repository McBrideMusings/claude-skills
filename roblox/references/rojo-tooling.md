# Rojo & tooling — scripts on disk

Rojo makes Roblox scripts live as real `.luau` files on disk instead of inside the binary `.rbxl`. A Studio plugin syncs saved files into the open place. This is what makes Claude Code (and git) useful for Roblox.

## Mental model: sync is one-way (disk → Studio)

Classic `rojo serve` streams **disk → Studio**. Disk is the source of truth; Studio is a live projection. Consequences:

- Edit `.luau` files on disk; save; Rojo pushes them into the running place.
- Do **not** edit Rojo-managed scripts inside Studio (or via the MCP `multi_edit`) — the next sync overwrites your change. (Rojo has a `syncback`/two-way story, but don't assume it's on.)
- The `.rbxl` place file is build output, not source — gitignore it.

## Toolchain

A toolchain manager pins tool versions per project. **rokit** is the current one (aftman/foreman are older equivalents). `rokit.toml` / `aftman.toml`:

```toml
# rokit.toml — versions are illustrative; check current releases
[tools]
rojo = "rojo-rbx/rojo@7.5.1"
wally = "UpliftGames/wally@0.3.2"     # package manager
stylua = "JohnnyMorganz/StyLua@2.0.2" # formatter
selene = "Kampfkarren/selene@0.28.0"  # linter
```

Install: `rokit install` (or `aftman install`). Then `rojo serve` and click Connect in the Studio Rojo plugin.

## `default.project.json` — maps disk folders to Roblox services

```json
{
  "name": "MyGame",
  "tree": {
    "$className": "DataModel",
    "ServerScriptService": { "$path": "src/server" },
    "ReplicatedStorage": {
      "Shared": { "$path": "src/shared" },
      "Packages": { "$path": "Packages" }
    },
    "StarterPlayer": {
      "StarterPlayerScripts": { "$path": "src/client" }
    },
    "Workspace": { "$properties": { "Gravity": 196.2 } }
  }
}
```

Do **not** put `FilteringEnabled` in `$properties` — it's a legacy/forced-on property and setting it does nothing useful.

## File naming → instance class

This table is the single most load-bearing Rojo fact:

| On disk | Becomes in Studio |
|---|---|
| `foo.server.luau` | `Script` (server) |
| `foo.client.luau` | `LocalScript` (client) |
| `foo.luau` | `ModuleScript` |
| `foo/` (folder) | `Folder` |
| `foo/init.luau` | folder `foo` becomes a `ModuleScript` |
| `foo/init.server.luau` | folder `foo` becomes a `Script` |
| `foo/init.client.luau` | folder `foo` becomes a `LocalScript` |
| `foo.meta.json` | extra properties/attributes for the adjacent `foo` |
| `foo/init.meta.json` | properties for the folder-backed instance |
| `foo.model.json` | a JSON-defined instance/model |

> **Gotcha — never put `init.server.luau`/`init.client.luau` at a folder that maps directly to a *service*.** `init.*.luau` turns the *folder instance itself* into a Script/LocalScript. That works for a normal sub-folder, but a folder mapped to `ServerScriptService`/`StarterPlayerScripts` (etc.) can't become a Script — the service already exists — so Rojo creates a **rogue duplicate** Script named after the service, sibling to the real one, and your bootstrap never runs. **Bootstraps must be child scripts:** `src/server/Main.server.luau` → `ServerScriptService.Main` (a real Script), not `src/server/init.server.luau`.

## Minimal solo layout

```
MyGame/
├── default.project.json
├── rokit.toml
├── wally.toml            # if using packages
├── .luaurc               # LSP aliases
├── selene.toml
├── stylua.toml
├── .gitignore
├── src/
│   ├── server/
│   │   └── Main.server.luau     # server bootstrap → ServerScriptService.Main (a child Script)
│   ├── client/
│   │   └── Main.client.luau     # client bootstrap → StarterPlayerScripts.Main (a child LocalScript)
│   └── shared/                  # ModuleScripts used by both
└── tests/
    └── run.luau                 # Lune headless runner
```

## `.gitignore`

```gitignore
# build output & deps
*.rbxl
*.rbxlx
*.rbxl.lock
/Packages/
/ServerPackages/
/DevPackages/
sourcemap.json
# keep editor settings
!.vscode/settings.json
```

## LSP types: sourcemap + `.luaurc`

The Luau language server needs a sourcemap to resolve `game.ReplicatedStorage.X` types:

```bash
rojo sourcemap default.project.json -o sourcemap.json
```

Point the Luau LSP extension at `sourcemap.json`. `.luaurc` gives require aliases:

```json
{
  "languageMode": "strict",
  "aliases": { "shared": "src/shared", "packages": "Packages" }
}
```

## Packages (Wally)

`wally.toml` declares deps; `wally install` writes them to `Packages/`. Treat `wally.toml` as authoritative — confirm a library is actually a dependency before recommending its API. Common picks: ProfileService (DataStore), Trove/Janitor (cleanup), Signal, Promise.

## Headless testing (Lune)

Lune runs Luau outside Roblox for build scripts and tests — no Studio needed:

```bash
lune run tests/run
```

Useful with `@lune/fs`, `@lune/process`. Pairs with a mock DataStore for save/load logic. See `references/luau-idioms.md` and `references/security.md` for testable module patterns.

## Anti-patterns

- Committing `Packages/` or `*.rbxl` (deps are reproducible; place is build output).
- Editing synced scripts inside Studio while `rojo serve` runs (clobbered on next sync).
- Files over ~300 lines — split into modules.
- No `--!strict` on critical modules — you lose type checking exactly where it matters.
