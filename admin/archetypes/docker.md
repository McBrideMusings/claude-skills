# Archetype: `docker-unraid` (Docker images deployed to an Unraid host)

Load when `admin.toml` has `archetypes = [… "docker" …]`. Builds a Docker image
and deploys it to an Unraid server (over SSH, or locally when on the host).

The archetype was called `docker-unraid` before it was renamed to `docker`. A
manifest still saying `archetypes = ["docker-unraid"]` fails with `unknown
archetype` after the tool is reinstalled — change it to `"docker"`.

## Two things deploy, and they are separate sub-targets

`admin deploy` routes on its first arg:

| Sub-target | What goes to the host |
| --- | --- |
| `image` (default, and bare `admin deploy`) | rebuild the image, recreate the container |
| `files` | rsync the `[deploy]` mirror directory — config, appdata, assets |
| `all` | `files` first, then `image` |

`--dry-run` and `--force` work on all three.

**The container does NOT have to exist first, as long as `[docker_run]` is
declared.** With that table, deploy renders `docker run` from it and creates the
container outright — no Unraid GUI step. Only the legacy no-`[docker_run]` path
(inspect the live container, replay its config) requires a container to already
exist; that's what the "Create it from the Unraid Docker GUI" error means.

## `[deploy]` — the mirror directory

```toml
[deploy]
src     = "deploy/appdata"                       # repo-relative, required
dest    = "/mnt/user/appdata/my-app"             # path on the target, required
host    = "${UNRAID_USER:-root}@${UNRAID_HOST}"  # omit for a local copy
exclude = ["*.log"]
delete  = false                                  # default false
```

`delete` defaults to false because appdata usually holds files the *app* writes
(state, databases, logs) that no local copy should be allowed to delete. Set it
true only when the repo owns the whole directory. `host` is checked against the
current machine first, so the same manifest works run from a laptop or on the
Unraid box itself.

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
