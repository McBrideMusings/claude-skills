# macOS-app workers: find the singletons

Part of [`orchestrate.md`](../orchestrate.md) — the per-worker simulator and UDID pinning rules are there.

Everything in [`../orchestrate.md`](../orchestrate.md) is iOS. A **macOS-app** worker builds and runs on the host itself, so there is no
device to hand out. What it collides on instead is every per-machine singleton the app binds by a
fixed name:

| Singleton | Typically | Isolate with |
|---|---|---|
| a debug/control socket | one hardcoded path under `~` | an env var naming the path |
| `UserDefaults` | one domain per bundle id | a build setting suffixing the bundle id |
| the installed app | one `/Applications/<App>.app` | run from the build directory, never install |

Ask what the app opens by a fixed name and give each worker its own. Create them in **step 3**
beside the worktree; state them in the brief; remove them in **step 7**.

**Before handing out a bundle-id suffix, check what the entitlements key off it.** A suffix is the
obvious way to split `UserDefaults` and an app group, and it is silently unusable whenever the
entitlements file names a cloud container derived from the bundle id — an iCloud container,
a push environment, a keychain access group. Those identifiers have to be **registered with Apple**,
and a per-worker suffix invents one that never has been, so the build dies at `GatherProvisioningInputs`
with `doesn't include the iCloud capability` / `doesn't support the iCloud.<id> iCloud Container`
**before a single Swift file compiles**. It reads like a signing misconfiguration on the machine
rather than a consequence of the isolation you just chose, and forcing `CODE_SIGN_IDENTITY="-"` or
`CODE_SIGNING_REQUIRED=NO` does not get past it — provisioning is resolved before compilation either
way. Check with `grep -l icloud <target>/*.entitlements` before choosing the suffix.

Two routes when the entitlements do key off the bundle id, and the repo usually already has one:

- **A worker entitlements file** with the cloud containers stripped, selected by a build setting —
  `SCRATCHPAD_ENTITLEMENTS=…/Scratchpad-worker.entitlements` in `apple-notepad`. This is the one
  to prefer: it keeps the per-worker suffix *and* builds. Look for an existing `*-worker.entitlements`
  before concluding there is no route.
- **Otherwise, keep the one registered suffix and serialise the macOS-app workers**, per the rule
  below. A shared container that two workers take turns with beats a suffix neither can build.

Observed 2026-08-31 on `apple-notepad`: two macOS workers ran concurrently on `.dev.rmback` and
`.dev.neither`. The first found the worker-entitlements route and verified; the second did not,
correctly refused to disable signing or abandon its isolation, and returned `SKIP` — a whole slice's
verification lost to an isolation scheme that had no working build behind it.

**Worked example — `term-wheelhouse`.** Both of its singletons are parameterised, so N workers run
concurrently:

```bash
# step 3, per worker
WHEELHOUSE_DEBUG_SOCKET=/tmp/orch-<slug>.sock      # DebugStateServer.socketPath honours it
WHEELHOUSE_BUNDLE_ID_SUFFIX=.orch-<slug>           # project.yml builds PRODUCT_BUNDLE_IDENTIFIER from it
# step 7, per worker
rm -f /tmp/orch-<slug>.sock
defaults delete <bundle-id>.orch-<slug>
```

**Worked example — `iptv-mac`.** One variable moves every debug listener, and `admin.toml`'s
`test_cmd` re-exports it under the `TEST_RUNNER_` prefix, without which `xcodebuild` swallows it
(see `../testing.md`). Give each worker a base at least 200 apart — the suite's own offsets reach
`+ 100`:

```bash
# step 3, per worker
IPTV_PORT_BASE=49100        # DebugPorts.base; DemoServer and DebugControlChannel derive from it
# step 7: nothing to remove — the temp directories are namespaced by the same base
```

**Finding the second shared thing is the part that takes the time.** On `iptv-mac` the ports were
obvious and were not the whole story: the demo server's media directories lived under one shared
prefix in the user's temporary directory, and each process swept the lot on startup. Two runs on
perfectly isolated ports still deleted each other's directories, and the symptom was a 120-second
timeout that read as a starved encoder. **After isolating the obvious resource, run two full suites
at once and check they both pass before dispatching a round** — one measured run is worth more than
any amount of reading, and it is how both of that repo's collisions were found.

**The symptom of getting this wrong is the same one the simulator rules in `../orchestrate.md` warn about, and it is
worse here because the theft is silent.** A Unix-socket server typically calls `unlink(path)` before
binding, to clear a socket a crashed run left behind — so the second app does not fail to bind, it
*takes over*. Both workers then read the second app's state through what each believes is its own
socket, and worker A reports its own new tab, row or field missing. That reads as a broken change.
Observed on `term-wheelhouse` 2026-08-13: the path was hardcoded, and it had to be fixed
(`WHEELHOUSE_DEBUG_SOCKET`) before more than one macOS-app issue could be in flight at all.

**A worker kills only its own build, by bundle id — never by app name.** A macOS-app worker ends by
tidying up the app it launched, and the obvious command is a name match:

```bash
pkill -f Wheelhouse            # ← kills the human's running copy too
pkill -f "Wheelhouse.app/Contents/MacOS/Wheelhouse"   # ← so does this
```

The developer is usually running the real app on the same machine, and it matches both. Match the
worker's own bundle id or its own build path instead, and say so in the brief. Observed 2026-08-13:
a swarm of three ended with the developer's own `/Applications/Wheelhouse.app` no longer running —
nothing in any verdict mentioned it, because from inside a worker it looked like successful cleanup.

**Also assign a scratch server port per worker** when the app talks to a local server. Three workers
each defaulting to the project's usual port is the same collision wearing different clothes, and it
surfaces as one worker's app showing another's data.

**When the app has no override, dispatch ONE macOS-app worker at a time and say so in the report.**
A serialized lane is a real cost; a lane that silently interleaves two workers' verifications is a
wrong answer, which is worse. Non-macOS issues still run alongside it — the constraint is on
macOS-app workers, not on the swarm.
