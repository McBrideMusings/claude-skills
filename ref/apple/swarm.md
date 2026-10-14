# Apple swarm axis

Read by every `swarm` worker in a repo that builds for an Apple platform. Supplies the commands
behind swarm's runtime-neutral rule: *a worktree isolates source and nothing else — whatever
verification touches beyond it, each worker gets its own and pins every command to it by id*.

Only relevant when more than one worker builds and verifies at once. A single `implement` pass
needs none of this; it is alone on the machine.

## Builds take turns

Run every `xcodebuild` and `swift build`/`swift test` through `swarm heavy -- <command>`. One
Xcode build already uses every core; two at once each take twice as long and starve the
simulators. Each worker keeps its own DerivedData tree ([`swarm/derived-data.md`](swarm/derived-data.md)).

## One simulator per worker

Each worker creates its own before its first run, named after its bead, and keeps the UDID it
prints for every later command.

```bash
xcrun simctl create "swarm-$SWARM_WORKER" \
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

A repo's own verify skill often names a device by name. A worker overrides that with its own
UDID, and never boots, installs onto or drives any other simulator: a surface shared with
sibling workers corrupts their runs as well as its own. A worker that cannot reach its device
skips that check and says so rather than routing around it.

Never write the UDID into the worktree's `CLAUDE.local.md`. That file is symlinked back to the
primary checkout by `worktree-link-locals.sh`, so appending to it edits the *shared* file every
sibling worker reads.

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

## Retire the simulator before the pass ends

```bash
xcrun simctl shutdown <udid> && xcrun simctl delete <udid>
```

Skip it and a long run ends with one booted simulator per issue, each holding memory. It survives
its worker; nothing else cleans it up.

## Signing

Apple projects here sign with `${IOS_DEVELOPMENT_TEAM}`, already exported. Never let a worker stall
asking which team — put the value in the brief if the build needs it stated.

## Also read

The rest of this axis, one page per thing a swarm collides on, in [`swarm/`](swarm/):

| When | Page |
| --- | --- |
| The app is React Native — Metro is a second per-machine singleton | [`swarm/react-native-metro.md`](swarm/react-native-metro.md) |
| The app is a macOS app — no simulator, so isolate its sockets, defaults and ports | [`swarm/macos-singletons.md`](swarm/macos-singletons.md) |
| Cleanup, and why workers never share one DerivedData tree | [`swarm/derived-data.md`](swarm/derived-data.md) |
| A macOS GUI worker runs unattended, when the display may sleep | [`swarm/sleeping-display.md`](swarm/sleeping-display.md) |

`testing.md` in this directory — it carries two Apple build facts a swarm hits immediately: never
locate a build by globbing DerivedData, and `xcodebuild test` outruns the Bash tool's default
timeout. Both are true of a single build too, which is why they live there rather than here.
