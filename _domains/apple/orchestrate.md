# Apple orchestrate axis

Read by `orchestrate` at step 3 (fan out) and step 7 (retire) when the platform is `apple`.
Supplies the commands behind that skill's platform-neutral rule: *a worktree isolates source and
nothing else — whatever verification touches beyond it, give each worker its own and pin every
command to it by id*.

Only relevant when more than one worker builds and verifies at once. A single `/implement` pass
needs none of this; it is alone on the machine.

## One simulator per worker

Create it in **step 3**, beside the worktree, and record the UDID with the handle.

```bash
xcrun simctl create "orch-<slug>" \
  com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro \
  com.apple.CoreSimulator.SimRuntime.iOS-26-5      # returns the UDID
xcrun simctl boot <udid>
```

Pick a device type and runtime the machine actually has — `xcrun simctl list devicetypes` and
`xcrun simctl list runtimes`. The identifiers above are examples, not constants; a missing runtime
fails the create with a message that reads like a permissions problem.

## Pin every command to the UDID, never a device name

- `xcodebuild -destination 'id=<udid>'` — **not** `-destination 'name=iPhone 17 Pro'`, which
  resolves to whichever device happens to answer to that name and is how siblings end up on the
  same phone.
- `xcrun simctl install <udid>` / `launch <udid>`, `idb --udid <udid>`.

The worker's brief carries its own UDID and this rule, or the worker reaches for a name.

**Pass it as `constraints`, not by editing the worktree.** On the workflow transport that is a per-item
`constraints` string on the `workflow('implement', …)` call; `implement.js` injects it into the Verify
stage above its own instructions, prefixed with *"a surface you are told not to touch is shared with
sibling workers, and driving it corrupts their runs as well as yours"* — which is exactly the failure
this section describes. A worker told to `SKIP` rather than route around a constraint is the behaviour
you want when a device is genuinely unreachable.

Do **not** write the UDID into the worktree's `CLAUDE.local.md` instead. That file is symlinked back to
the primary checkout by `worktree-link-locals.sh`, so appending to it edits the *shared* file every
sibling worker reads — each worker would end up seeing every other worker's UDID, which is worse than
telling it nothing. Copy it if you must write there at all; `constraints` is the supported path.

```js
constraints: [
  `Your simulator is ${udid}. Pin every command to it by id — \`xcodebuild -destination 'id=${udid}'\`,`,
  `\`xcrun simctl install|launch ${udid}\`, \`idb --udid ${udid}\`. Never a device name: the repo's own`,
  `verify skill names a device by name, and a name resolves to whichever simulator answers to it.`,
  `Do not boot, install onto, or drive any other simulator.`,
].join(' ')
```

**The symptom of getting this wrong does not look like a collision.** A worker reports its own new
button missing, or a timed observation comes out wrong, and both read as a bug in the change under
test. Suspect the shared device before the diff whenever a worker reports its own change absent.

## The iCloud key-value store is not a second sharing problem

**One device per worker also isolates the app's stored state, including
`NSUbiquitousKeyValueStore`.** It persists inside the device's own data directory
(`Devices/<udid>/data/Containers/Data/InternalDaemon/…/com.apple.kvs/…/<team>.<identifier>`),
simulators carry no iCloud account, and there is no host-side store they proxy into. Checked
2026-08-12: three devices running the same app held three distinct files with three different
checksums. So workers that appeared to overwrite each other's seeded state were doing it *through
the shared device*, not through iCloud, and separating the devices separates the stores.

## A macOS app has no simulator — find its singletons instead

Everything above is iOS. A **macOS-app** worker builds and runs on the host itself, so there is no
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
defaults delete com.piercemakes.wheelhouse.macos.orch-<slug>
```

**Worked example — `iptv-mac`.** One variable moves every debug listener, and `admin.toml`'s
`test_cmd` re-exports it under the `TEST_RUNNER_` prefix, without which `xcodebuild` swallows it
(see `testing.md`). Give each worker a base at least 200 apart — the suite's own offsets reach
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

**The symptom of getting this wrong is the same one the simulator section warns about, and it is
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

## Retire the simulator in step 7

```bash
xcrun simctl shutdown <udid> && xcrun simctl delete <udid>
```

Skip it and a long run ends with one booted simulator per issue, each holding memory. It survives
its worker; nothing else cleans it up.

## Prune DerivedData in step 7, and never share one tree between workers

Each worker's git worktree is a different absolute path, so Xcode builds it a DerivedData tree of
its own — 6.2–6.9 GB on iptv-mac. Worktree teardown removes the worktree; nothing removes the tree.
Thirteen of them took a 926 GB disk to 6.1 GiB free on 2026-08-20 and killed a round with `ENOSPC`.
So, after retiring the worktrees:

```bash
~/.claude/tools/prune-derived-data --delete --root ~/.worktrees/<repo>
```

It deletes only trees whose `info.plist` `WorkspacePath` no longer exists, so a live worker's tree
is never a candidate. `--root` matters whenever a worker passed an explicit `-derivedDataPath`
beside its worktree: those trees carry the same plist and leak the same way, but they are nowhere
near `~/Library/Developer/Xcode/DerivedData` and nothing else would ever find them. Two such trees,
8.1 GB, sat under `~/.worktrees/iptv-mac/` for two days after their worktrees were gone.

A worker that builds through `admin` needs nothing extra: `hooks/worktree-link-locals.sh` symlinks
`admin.toml` back to the main checkout (its patterns live in `~/.config/wtree/config.toml`), so the
worktree runs the same manifest and gets the shared clone directory for free. Verified 2026-08-20 on
a fresh iptv-mac worktree.

A worker that calls `xcodebuild` directly bypasses all of that and has to pass the flag itself:

```bash
xcodebuild … -clonedSourcePackagesDirPath ~/Library/Developer/Xcode/SharedSourcePackages/<repo>
```

**Do not "fix" this by pointing every worker at one `-derivedDataPath`.** Measured 2026-08-20, two
worktrees building the same scheme at once into one tree: the loser dies with `unable to attach DB:
… build.db: database is locked`, rc 65 — xcodebuild fails outright rather than waiting its turn the
way cargo does. And both write the same `Build/Products/<Config>/<app>`, so the winner's binary
silently replaces the loser's while the loser prints `BUILD SUCCEEDED`. It is racy, so a swarm sees
it intermittently.

What *is* safe to share is the SwiftPM clone directory: same test, per-worktree DerivedData plus one
`-clonedSourcePackagesDirPath`, both workers rc 0 with their own products, 2.1 GB held once instead
of per worktree and the second worker's cold build 55s → 19s. `admin` does this automatically for
every Apple project — see `shared_spm_clone_dir()` in `admin_lib/apple.py`.

## A sleeping display makes a macOS GUI worker unverifiable, and no worker can wake it

An unattended run happens late, on an idle machine, which is exactly when the display sleeps. A
Metal-backed view has no drawable then, so anything read *out of the rendered surface* comes back
empty rather than wrong — a terminal grid reports zero rows, a snapshot field derived from layout
reports nothing. Empty is indistinguishable from broken, and the natural reading is that the change
under test failed.

**It cannot be fixed from inside the run.** Checked 2026-08-13 on macOS 15: `caffeinate -u -t 300`,
`caffeinate -d -i -t 600` and a synthetic `System Events` key event all left `screencapture`
returning an all-black frame. Waking a sleeping display needs real hardware input.

So, when gating macOS-app issues for an unattended swarm, prefer the ones whose verification reads
**state** rather than **pixels** — a JSON snapshot of which tab is active, an HTTP route's response,
a file on disk. Send anything that has to inspect rendered output to a run with a human at the
screen, and say in the report that it was held back rather than letting a worker return an empty
read as a pass.

## Signing

Apple projects here sign with `${IOS_DEVELOPMENT_TEAM}`, already exported. Never let a worker stall
asking which team — put the value in the brief if the build needs it stated.

## Also read

`testing.md` in this directory — it carries two Apple build facts a swarm hits immediately: never
locate a build by globbing DerivedData, and `xcodebuild test` outruns the Bash tool's default
timeout. Both are true of a single build too, which is why they live there rather than here.
