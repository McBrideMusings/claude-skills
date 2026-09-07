## Always-on user services (`[launchd]`) — macOS launchd, Linux systemd --user, or remote over SSH

A project with a process that should be alive at login (on this machine, or as
standing infra on another one) declares `modules = ["launchd"]` plus a
`[launchd]` table, and wires a `service` command. **Do not write a
per-project shell script that generates a plist/unit and drives
`launchctl`/`systemctl`, and do not write one that pushes a binary over SSH and
installs it remotely** — that is what this module replaced (`admin_lib/launchd.py`).
It is a module, not an archetype: a Go supervisor, a Python daemon and a shell
script all register identically, so it composes with whatever stack archetype
the project already uses. The config table is called `[launchd]` for historical
reasons but drives all three targets — the same table, same verb names, works
unmodified on macOS or Linux.

```toml
modules = ["launchd"]

[launchd]
label       = "com.example.myserver"      # required
program     = "~/go/bin/myserver"         # required, absolute after ~ expansion — the INSTALLED path
source      = "server/myserver"           # optional — a freshly built binary elsewhere; `install`
                                           # atomically swaps it into `program` before touching the service
args        = ["-wait-for-lock"]
stdout      = "${HOME}/.myserver/out.log"
stderr      = "${HOME}/.myserver/err.log"
working_dir = "${HOME}"
throttle    = 10
# also: env, inherit_path (default true), inherit_home (default true),
#       keep_alive (true), run_at_load (true), process_type ("Background", macOS only),
#       nice, start_interval

[commands.service]
desc = "Manage the service (install|uninstall|status|restart|stop|start)"
steps = ["service"]
group = 3
priority = 1

[actions.service]
kind = "python"
run  = '''
launchd_service(globals().get("_LAUNCHD_CONFIG") or {}, args)
'''
```

Three things worth knowing before you debug something here:

- **`install` is deliberately not always a re-registration.** macOS 13+ Background
  Task Management records every launchd item and posts an "App Background
  Activity" notification the first time it sees one, keyed on the plist being
  installed rather than the process starting — so a `deploy` that rewrote an
  identical plist and did `bootout` + `bootstrap` produced a notification on
  every deploy. `install` renders the plist and compares it with what is on disk:
  identical and already loaded → `launchctl kickstart -k` only, no write, no new
  BTM record. It writes and re-registers only on a genuine change, a missing
  plist, or an unloaded agent. A `service install` that prints "restarted …
  (plist unchanged)" is working correctly, not skipping work. The Linux side
  mirrors this with `systemctl --user`; there is no BTM equivalent to worry
  about, but a byte-identical unit still skips the rewrite.
- **`source` triggers an atomic binary swap, not a plain copy.** Overwriting a
  file a running daemon has mapped corrupts the running image (macOS refuses to
  spawn the new file — `OS_REASON_CODESIGNING`; Linux hits `ETXTBSY`). With
  `source` set, `install` stops the service, writes the new binary to a sibling
  temp path (its own inode), ad-hoc re-signs it on macOS, and renames it into
  place — and skips the whole thing if the source is byte-identical to what's
  already installed and loaded, so a redeploy of unchanged code doesn't bounce
  a live process. Without `source`, `program` is assumed already built in place
  (the historical behavior — unaffected by this key existing).
- **`inherit_path` writes the invoking shell's PATH into the plist/unit.**
  launchd hands an agent `/usr/bin:/bin:/usr/sbin:/sbin` and nothing else, so a
  process that shells out to anything from Homebrew or a language toolchain
  starts fine and then fails on its first real unit of work. Leave it on unless
  the program genuinely needs a pinned PATH.

`${VAR}` placeholders resolve at run time and nest, so `${GOPATH_BIN:-${HOME}/go/bin}`
means what it reads. A default is only expanded when it is actually used.

Note `admin service install` is also usually a step inside `deploy`, since a
deploy replaces the binary the agent is running.

### Remote install over SSH — `service_deploy_remote`

For pushing the same service to another machine (a home-lab box, a VPS) rather
than running it here: call `service_deploy_remote(cfg, host, dist_dir, binary)`
from a `deploy` action. It arch-detects the host, picks the matching binary out
of a `[go_dist]`-built matrix (`<binary>-<os>-<arch>` + `VERSION`), and pushes
it plus a portable POSIX-sh installer
(`admin_lib/resources/install_service_remote.sh`) over scp — no Python or the
admin tool needs to be installed on the remote host. That installer duplicates
a small slice of the launchd/systemd rendering logic in shell rather than
importing `admin_lib.launchd`, on purpose: the remote host is not assumed to
have the tool.

```toml
[actions.deploy]
kind = "python"
run  = '''
host = args[1] if len(args) > 1 else None
if host:
    build_go_dist(globals().get("_GO_DIST_CONFIG") or {})
    service_deploy_remote(globals().get("_LAUNCHD_CONFIG") or {}, host,
                           dist_dir="dist", binary="myserver")
else:
    launchd_service(globals().get("_LAUNCHD_CONFIG") or {}, ["install"])
'''
```

---
