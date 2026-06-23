# Archetype: `hugo` (Hugo static sites)

Load when `admin.toml` has `archetypes = [… "hugo" …]`. `dev` runs `hugo server`
(live reload); `build` renders the static site; `deploy` publishes it.

## Dev output

If `hugo server` output collapses, use `kind = "interactive-shell"` not
`pty = true` (main SKILL.md note).

No other archetype-specific gotchas documented yet — add them here. Defer to the
main SKILL.md for general workflow (command order, env injection, logs).
