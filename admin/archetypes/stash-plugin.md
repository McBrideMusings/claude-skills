# Archetype: `stash-plugin` (Stash plugins)

Load when `admin.toml` has `archetypes = [… "stash-plugin" …]`. Builds/installs a
plugin for a Stash server.

No archetype-specific gotchas documented yet — add them here as they're found.
Defer to the main SKILL.md for general workflow. Connection details (Stash URL,
API key) live in `.env`, referenced as `${VAR}`.
