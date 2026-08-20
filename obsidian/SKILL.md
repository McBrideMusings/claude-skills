---
name: obsidian
disable-model-invocation: true
description: "Use the Obsidian CLI to read, search, create, and modify notes in the user's vault headlessly — daily notes, tasks, searches, note creation."
user_invocable: true
---

# Obsidian

Drive the Obsidian vault from the command line. The CLI exposes everything the GUI exposes, so use it for reads, writes, searches, automation — no clicking required.

Reference: <https://obsidian.md/cli>

## Prerequisites

- **Obsidian app must be running** for most commands. The CLI talks to the live app over a local IPC channel.
- CLI must be activated: **Settings → General → Command line interface**, then "Register the CLI".
- On macOS the registration symlinks the binary at `/usr/local/bin/obsidian`. If `which obsidian` fails after registering, open a new terminal (PATH refresh) or check the symlink directly: `ls -la /usr/local/bin/obsidian`.
- If `obsidian` isn't on PATH at all, invoke via `/usr/local/bin/obsidian <command>` directly.

## When the CLI isn't available

Fall back to plain file ops on the vault directory:

```bash
# Search by filename
find <vault-path> -name "*.md" | grep -i "keyword"

# Search by content
grep -rl "keyword" <vault-path> --include="*.md"

# Find backlinks to a note
grep -rl '\[\[Note Title\]\]' <vault-path>
```

Ask the user for the vault path if you don't know it; it's typically under `~/Documents/Obsidian Vault/` or wherever they pointed Obsidian at.

## Discovery

```bash
obsidian help              # full command list
obsidian                   # TUI mode with autocomplete
obsidian help <command>    # detail per command (when stuck)
```

Always run `obsidian help` first when unsure — the CLI is evolving and this skill may lag the real catalog.

## Core commands

### Reading

```bash
obsidian read                                   # current file (whatever the GUI has open)
obsidian read file="path/to/Note"               # specific note
obsidian search query="meeting notes"           # full-text search
obsidian search query="status::active" \
  vault="Notes" --format=json                   # scope to one vault, JSON output (when supported)
obsidian tasks daily                            # list tasks in today's daily note
obsidian tags counts                            # all tags with frequency
obsidian files sort=modified limit=5            # recent files
obsidian unresolved                             # links pointing nowhere
```

### Daily note

```bash
obsidian daily                                  # open today's daily note
obsidian daily:append content="- [ ] Buy groceries"
obsidian daily:append content="- [ ] Review inbox"
```

`daily:append` is the workhorse for any "add this to my daily note" request. It respects the user's daily-note template/location.

### Create / edit

```bash
obsidian create name="Trip to Paris"            # blank note
obsidian create name="Trip to Paris" template=Travel
obsidian diff file=README from=1 to=3           # version diff
```

For arbitrary edits to existing notes the cleanest path is usually to read with `obsidian read`, modify the content with `Edit` against the file path on disk, and let Obsidian's filesystem watcher pick it up.

## Developer / scripting commands

```bash
obsidian devtools                               # open the embedded Chrome devtools
obsidian plugin:reload my-plugin                # reload a plugin in-place during dev
obsidian dev:screenshot file=shot.png           # capture app screenshot
obsidian dev:errors                             # JS errors from the app
obsidian dev:css selector=".workspace"          # computed CSS for elements
obsidian dev:dom selector=".nav"                # DOM query
obsidian eval "app.vault.getFiles().length"     # arbitrary JS against the Obsidian API
```

`obsidian eval` is the escape hatch — anything the Obsidian JS API can do (`app.vault`, `app.workspace`, `app.metadataCache`, etc.) is reachable. Use it when no dedicated command exists.

## Headless / server mode

For non-interactive use (cron jobs, CI, agentic tools without a GUI), Obsidian Sync supports a **headless** mode — see <https://obsidian.md/help/sync/headless>. The CLI then runs against a synced vault on a server, no GUI session needed.

Useful patterns:

- **Cron-driven aggregation** — script that reads recent daily notes, writes a weekly summary note via `obsidian create`.
- **Agent access to vault** — give a remote agent a CLI session against a synced-but-restricted vault without exposing the whole machine.
- **Auto-tagging / link validation** — `obsidian unresolved` in a nightly job; pipe output into issue tracking or a notification.

## Common scripted patterns

```bash
# Morning routine
obsidian daily
obsidian daily:append content="- [ ] Review inbox"
obsidian daily:append content="- [ ] Check calendar"
obsidian files sort=modified limit=5 --copy     # last 5 modified files → clipboard

# Append from another tool
echo "- [ ] Follow up with finance" | obsidian daily:append content="-"

# Quick vault status check
obsidian unresolved
obsidian tags counts | head
```

## Output formats

Many commands accept `--format=json` for machine consumption (verify with `obsidian help <command>` since support varies). When piping to another tool prefer JSON over scraping human-readable output.

## Anti-patterns

- **Editing vault files via the CLI while the app isn't running** — the daemon-driven commands silently fail or queue. Either start the app first or fall back to plain file ops.
- **Long-running `obsidian eval` scripts** — the eval blocks the GUI thread. Keep eval payloads short; for anything bigger, write a real plugin and reload it with `plugin:reload`.
- **Hardcoding vault paths in scripts** — let `obsidian` pick the active vault, or pass `vault=<name>` explicitly. Hardcoded paths break across machines.
- **Ignoring `obsidian help`** — the catalog evolves; this skill won't always be current.

## When NOT to use this skill

- User is asking about Obsidian *plugin development* in depth — that's the plugin-dev plugin's wheelhouse.
- User wants vault-organization advice (wikilink conventions, index-note structure, naming) — that's a separate problem from "drive the CLI."
- Obsidian isn't installed or the CLI isn't registered — fall back to plain `find` / `grep` on the vault path.
