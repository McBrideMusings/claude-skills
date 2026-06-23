# Archetype: `docker-unraid` (Docker images deployed to an Unraid host)

Load when `admin.toml` has `archetypes = [… "docker-unraid" …]`. Builds a Docker
image and deploys it to an Unraid server (over SSH, or locally when on the host).

## Lifecycle order (baked in)

This archetype bakes the standard `build → test → deploy` order with **`deploy`
always last** in the lifecycle group. Never reorder these three.

## `DEPLOY_LOCAL` → `ADMIN_LOCAL` (local-vs-remote deploy)

Shipped on `deploy`, `logs`, `diff`, `install-template`. `ADMIN_LOCAL=true` tells
the SSH/scp/rsync helpers in `admin_lib` to run **locally** instead of over SSH
(`_is_local_host()` checks it before IP comparison).

- **Set `DEPLOY_LOCAL=true`** in `.env` on machines that ARE the Unraid host
  (bare, or a container running on Unraid).
- **Leave unset** on a Mac / remote workstation deploying over the network.

Setup:
1. `.env.example` (committed): `DEPLOY_LOCAL=    # true when on the Unraid host`
2. `.env` on the Unraid host (gitignored): `DEPLOY_LOCAL=true`

Secondary detection: `_is_local_host()` also matches via `hostname -I`;
`DEPLOY_LOCAL` is the explicit escape hatch when IP comparison fails (e.g. a
container's bridge IP).

## Privacy

Host, registry, paths, account names live in `.env` (gitignored) and are
referenced as `${VAR}` in committed config — never hardcoded. See the main
SKILL.md env-injection and log-tailing sections for the general mechanisms.
