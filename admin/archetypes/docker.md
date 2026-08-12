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
| `image` | rebuild the image, recreate the container |
| `files` | rsync the `[deploy]` mirror directory — config, appdata, assets |
| `all` | `files` first, then `image` |

`--dry-run` and `--force` work on all three.

Bare `admin deploy` **asks** which one, via the same `pick_target` menu
`admin logs` uses — but only when the project declares a `[deploy]` table. With
no mirror directory there is only one thing it could deploy, so it goes straight
to the image. Non-TTY (a script, a hook) also skips the menu and deploys the
image rather than hanging on a prompt.

**The container does NOT have to exist first, as long as `[docker_run]` is
declared.** With that table, deploy renders `docker run` from it and creates the
container outright — no Unraid GUI step. Only the legacy no-`[docker_run]` path
(inspect the live container, replay its config) requires a container to already
exist; that's what the "Create it from the Unraid Docker GUI" error means.

## The Unraid template — `deploy` installs it, and three things hide that

**`admin deploy` already installs the Unraid GUI template. You never scp it by
hand, and there is no missing feature here.** `admin_lib/docker.py` calls
`ensure_docker_template(...)` as part of `deploy image`. Do not go looking for a
gap; go looking for which of the three silent no-ops below you have hit.

| Silent no-op | What it looks like | Fix |
| --- | --- | --- |
| **The call is inside `if not dry_run:`** | `admin deploy --dry-run` shows no template step at all | Nothing. A dry run skips it *by design* — the dry run is not evidence about this feature, ever |
| **Default src is `deploy/unraid-template.xml`, and a missing file returns early** | Deploy runs green, the host never gets the template, nothing is printed | The project named its file something else. Set `[install_template] src = "deploy/<actual-name>.xml"` |
| **`UNRAID_HOST` unset** | Same silence | Set it in `.env` |

```toml
[install_template]
src  = "deploy/my-plexdb.xml"   # default: deploy/unraid-template.xml
name = "plexdb"                 # default: slug of APP_IMAGE, minus registry and tag
```

The destination is `/boot/config/plugins/dockerMan/templates-user/my-<name>.xml`,
where `<name>` defaults to the `APP_IMAGE` slug — `plexdb:latest` → `my-plexdb.xml`.
**A project whose template file is already called `my-<name>.xml` still needs the
`src` override**, because the default *source* path is the archetype's generic
filename, not the destination's. That mismatch is the whole trap: the file is
sitting right there, correctly named for where it is going, and the install
walks past it.

It also self-skips when the template is already on the host (`test -f`), so
re-deploys cost nothing, and a failed `scp` warns rather than failing the deploy
— a bad template must never block shipping the image.

### Diagnosing it, in the right order

Burned a long session on this once by reasoning from a dry run and concluding the
feature did not exist. It does. Check in this order:

1. `ssh <host> ls /boot/config/plugins/dockerMan/templates-user/ | grep <name>` —
   is it already there? Then it worked, possibly on a deploy months ago.
2. `ls deploy/` in the project — does the filename match `[install_template].src`,
   or the `deploy/unraid-template.xml` default if there is no override?
3. Only then read `admin_lib/unraid.py`.

**`admin install-template` is not a command every docker project has.** It is
declared per project, so an unknown-command fallback printing the menu means the
project did not declare it — not that template install is unimplemented. Deploy
does it either way.

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

### `post_sync` — fix up what the sync just wrote (the ownership trap)

`[deploy]` accepts six keys: `delete, dest, exclude, host, post_sync, src`.

**Use `post_sync` for the rsync ownership trap.** rsync carries the *sending*
machine's uid/gid onto the directories it creates under `dest`, so a container
running as `99:100` can read them but not write. The app dies on its first write
and, under `restart: unless-stopped`, keeps dying — every service on that box
down until someone chowns by hand.

```toml
[deploy]
src       = "deploy/appdata"
dest      = "${APPDATA}"
host      = "${USER}@${HOST}"
post_sync = "chown -R ${UID:-99}:${GID:-100} ${APPDATA}"
```

It runs **where the files landed** — over SSH for a remote target, locally when
the target is this machine. `${VAR}` is expanded; a dry run prints the command
instead of running it; a failing hook is reported loudly but does not fail the
sync (the files are already there, and claiming success would hide a
half-finished deploy).

The `chown` on `[[docker_run.bind_mounts]]` does **not** substitute for this — it
owns the mount root only, not the subdirectories the sync writes into it, and it
fires on `deploy image` while this breakage is on `deploy files`, the cheap
deploy.

> Historical note: `post_sync` was in `DEPLOY_KEYS` but unwired for a while, so a
> manifest could declare it, pass `admin check`, and silently never run it.
> Fixed 2026-08-09 (`admin_lib/remote.py`). If you are on an older installed
> tool, `bash ~/projects/admin-project-tool/install.sh`.

## `[docker_build]` — build on the target instead of locally

By default `deploy image` builds locally for `linux/amd64` and ships the result with
`docker save | ssh docker load`. That's the wrong shape twice over for some projects:
an ARM Mac emulating amd64 through QEMU is slow, and a project whose code is
**bind-mounted** from the host doesn't need a new image at all for a code change.

```toml
[docker_build]
on_host = true                 # build on the deploy target, skip the image transfer
context = "${APPDATA_DIR}"     # build-context path ON the host (required with on_host)
```

Deploy then runs `cd <context> && docker build -t $APP_IMAGE .` over SSH (or locally
when the target is this machine) and skips the transfer entirely. `admin build`
honors the same flag. `${VAR}` in `context` is expanded; `on_host` without a
`context` is a manifest error rather than a silent local build.

## `[docker_run]` — provisioning bind-mount dirs (`mkdir` / `chown`)

A bind mount whose host dir doesn't exist yet gets created by Docker **as root**,
and a root-owned dir is one an unprivileged container user cannot write. On Unraid
(containers run as `nobody:users` = `99:100`) this surfaces as an opaque
`Permission denied` thrown from inside the container, far from its cause.

Declare it on the mount and `deploy image` prepares the dir before `docker run`:

```toml
[[docker_run.bind_mounts]]
host      = "${APPDATA_DIR}/data"
container = "/app/data"
mkdir     = true        # create the host dir first
chown     = "99:100"    # then own it
```

`chown` implies `mkdir` — you can't chown a dir that isn't there, so a `chown`
alone still creates it. `${VAR}` in `host` is expanded from the environment (an
unresolved var skips that dir with a warning, same as the mount itself). Commands
run on the deploy target — locally or over SSH, matching the rest of the deploy.

### The `${VAR}` in `host` is resolved from TWO different environments in one deploy

**Known tool bug, confirmed in source, not yet fixed.** With `[docker_run].remote_env_file`
set, the `-v` argument and the `mkdir`/`chown` for the *same mount* read the same
`${VAR}` from different places:

| What | Reads from |
| --- | --- |
| the `-v` flag | the **remote** env file, over ssh |
| the `mkdir` / `chown` | the **local** `os.environ` |

`admin_lib/docker.py:591` builds `run_env_vars = _read_remote_env_file(host, remote_env_file)`
and hands it to the run-args rendering. `admin_lib/docker.py:640` is the provisioning
call and simply omits it:

```python
provision = _provision_commands(target_cfg) if target_cfg is not None else []
```

`_provision_commands(cfg, env_vars=None)` then falls back to `env_vars = os.environ`
(`docker.py:1079`). So on a workstation deploying to a remote host, provisioning
sees nothing.

**What it looks like** — one deploy, both lines, and the second one is the mount
the first one said it was skipping:

```
docker_run.bind_mounts: host '${PLEXDB_APPDATA}' references unset env var — skipping provision
...
docker run -d --name plexdb -v /mnt/user/appdata/plexdb:/data ...
```

**Why it reads as harmless and isn't.** On an existing host the directory is already
there, so nothing breaks and the warning looks cosmetic. On a *fresh* host it is the
exact failure `mkdir`/`chown` exist to prevent: Docker creates the dir itself as root,
the container runs as `99:100`, and the app dies on its first write with a
`Permission denied` far from its cause — under `restart: unless-stopped`, forever.

**Do not "fix" this by putting the value in the local `.env`.** A `remote_env_file`
exists precisely because those paths name directories on the *target*; a local value
that ever won would bind-mount a workstation path onto the server. The fix is passing
`run_env_vars` at `docker.py:640`, in the tool.

## `[docker_run.health]` — post-deploy health gate

`docker run` returning 0 only means the container was **created**, not that the app
inside came up. Without this, a container that crash-loops on boot still reports a
successful deploy. Declare a health URL and deploy polls it before calling the
deploy good:

```toml
[docker_run.health]
url      = "http://127.0.0.1:${UI_PORT}/"
expect   = 200    # default 200
timeout  = 40     # seconds, default 30
interval = 2      # seconds between polls, default 2 (floored at 1)
```

The poll runs **on the deploy target**, so a `127.0.0.1:PORT` url resolves against
the published port on the host rather than the machine running `admin`. Uses `curl`.
On timeout, deploy exits non-zero and points at `docker logs <container>`. Omit the
table to skip the check entirely. `--dry-run` prints the poll it would run.

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
