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

## Retire the simulator in step 7

```bash
xcrun simctl shutdown <udid> && xcrun simctl delete <udid>
```

Skip it and a long run ends with one booted simulator per issue, each holding memory. It survives
its worker; nothing else cleans it up.

## Signing

Apple projects here sign with `${IOS_DEVELOPMENT_TEAM}`, already exported. Never let a worker stall
asking which team — put the value in the brief if the build needs it stated.

## Also read

`testing.md` in this directory — it carries two Apple build facts a swarm hits immediately: never
locate a build by globbing DerivedData, and `xcodebuild test` outruns the Bash tool's default
timeout. Both are true of a single build too, which is why they live there rather than here.
