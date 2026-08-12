# Platform: Apple (iOS / macOS simulators and Xcode builds)

Read this **only** when the swarm's project builds with Xcode and verification runs on a simulator. Everything here is one instance of [SKILL.md](SKILL.md) → A worktree isolates source and nothing else; that section states the rule, this file states the Apple commands.

## One simulator per worker

Create it in **step 3**, beside the worktree, and record the UDID with the handle.

```bash
xcrun simctl create "orch-<slug>" \
  com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro \
  com.apple.CoreSimulator.SimRuntime.iOS-26-5      # returns the UDID
xcrun simctl boot <udid>
```

Pick a device type and runtime the machine actually has — `xcrun simctl list devicetypes` and `xcrun simctl list runtimes`. The identifiers above are examples, not constants; a missing runtime fails the create with a message that reads like a permissions problem.

## Pin every command to the UDID, never a device name

- `xcodebuild -destination 'id=<udid>'` — **not** `-destination 'name=iPhone 17 Pro'`, which resolves to whichever device happens to answer to that name and is how siblings end up on the same phone.
- `xcrun simctl install <udid>` / `launch <udid>`, `idb --udid <udid>`.

The brief must carry the worker's own UDID and this pinning rule, or the worker will reach for a name.

## Never locate a build by globbing DerivedData

**Never `find DerivedData -name '*.app' | head -1`.** DerivedData is per-worktree, so `head -1` returns an arbitrary sibling's output; an orchestrator did exactly this and reported a shipped feature as missing. Ask the build system instead:

```bash
xcodebuild -showBuildSettings | grep BUILT_PRODUCTS_DIR
```

## Builds are long — foreground with an explicit timeout

An `xcodebuild test` on a real project runs several minutes and the Bash tool's default timeout is 120 seconds, so the obvious workaround is to background it — which is exactly what [BRIEF.md](BRIEF.md) forbids. Name a timeout that fits the build instead.

## The iCloud key-value store is not a second sharing problem

**One device per worker also isolates the app's stored state, including `NSUbiquitousKeyValueStore`.** It persists inside the device's own data directory (`Devices/<udid>/data/Containers/Data/InternalDaemon/…/com.apple.kvs/…/<team>.<identifier>`), simulators carry no iCloud account, and there is no host-side store they proxy into. Checked 2026-08-12: three devices running the same app held three distinct files with three different checksums. So workers that appeared to overwrite each other's seeded state were doing it *through the shared device*, not through iCloud, and separating the devices separates the stores.

## Retire the simulator in step 7

```bash
xcrun simctl shutdown <udid> && xcrun simctl delete <udid>
```

Skip it and a long run ends with one booted simulator per issue, each holding memory. It survives its worker; nothing else cleans it up.

## Signing

Every Apple project here signs with `${IOS_DEVELOPMENT_TEAM}`, already exported. Never make a worker ask which team; put the value in the brief if the build needs it stated.
