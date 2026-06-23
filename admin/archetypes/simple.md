# Archetype: `simple` (generic shell commands)

Load when `admin.toml` has `archetypes = [… "simple" …]`. The minimal archetype —
just `kind = "shell"` command/action wrappers, no platform machinery.

No archetype-specific gotchas. Everything is in the manifest; defer to the main
SKILL.md for general workflow (command order, env injection, inline-code policy,
logs).
