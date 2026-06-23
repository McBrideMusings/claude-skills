# Archetype: `unraid-plugin` (Unraid `.plg` plugins)

Load when `admin.toml` has `archetypes = [… "unraid-plugin" …]`. Builds/installs
an Unraid plugin (`.plg` + package) onto an Unraid host.

## `DEPLOY_LOCAL` → `ADMIN_LOCAL`

Same local-vs-remote mechanism as `docker-unraid` — shipped on `deploy`, `logs`,
`diff`, `install-template`. Set `DEPLOY_LOCAL=true` in `.env` when on the Unraid
host; leave unset on a remote workstation. See `archetypes/docker-unraid.md` for
the full setup.

## Privacy

Host, paths, account names live in `.env` (gitignored), referenced as `${VAR}`.
Defer to the main SKILL.md for general workflow.
