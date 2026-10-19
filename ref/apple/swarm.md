# Apple swarm axis

Read by every `swarm` worker in a repo that builds for an Apple platform. Supplies the commands
behind swarm's runtime-neutral rule: *a worktree isolates source and nothing else — whatever
verification touches beyond it, each worker gets its own and pins every command to it by id*.

Only relevant when more than one worker builds and verifies at once. A single `implement` pass
needs none of this except the simulator pool, which every session on the machine goes through.

## Builds take turns

Run every `xcodebuild` and `swift build`/`swift test` through `swarm heavy -- <command>`. One
Xcode build already uses every core; two at once each take twice as long and starve the
simulators. Each worker keeps its own DerivedData tree ([`swarm/derived-data.md`](swarm/derived-data.md)).

## A simulator comes from the machine-wide pool

Every session on the machine, swarm worker or not, gets a simulator from `~/.claude/tools/sim`,
which caps how many run at once (`cap` in `~/.claude/tools/sim-pool.toml`). Each booted iOS 26.5
device runs about 270 processes, so this cap, not the worker count, decides the machine's load.

```bash
udid=$(~/.claude/tools/sim acquire)    # Bash timeout 600000; waits up to 9 min for a slot, prints the UDID
…                                      # every command pinned to $udid
~/.claude/tools/sim release            # shuts it down and frees the slot
```

`hooks/sim-pool-guard.sh` denies `simctl boot`/`create`/`clone`, and any simulator command naming
a UDID the session does not lease, so there is no other route. The lease belongs to the session:
`sim acquire` again prints the same UDID, and the lease ends on its own when the session exits or
its device sits unused for `idle_minutes`. With the default cap of 1, a worker that reaches its
verification step while another holds the slot waits; `sim status` names the holder.

`sim acquire --device <type> --runtime <id>` gives an iPad, an Apple TV or another iOS version from
the same pool.

Pool devices are slimmed with simslim, which turns off about 170 iOS background services. When a
check fails because a service is off (push, StoreKit, universal links, Keychain), confirm it with
`simslim doctor <udid> --requires <feature>`, then `sim release` and
`sim acquire --full --reason "<what slim broke>"` for a stock device.

Pool devices are reused and never deleted, so a device carries the previous holder's apps.
`xcrun simctl uninstall <udid> <bundle-id>` before installing when stale app state would matter.

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

**A separate device also isolates the app's stored state, including
`NSUbiquitousKeyValueStore`.** It persists inside the device's own data directory
(`Devices/<udid>/data/Containers/Data/InternalDaemon/…/com.apple.kvs/…/<team>.<identifier>`),
simulators carry no iCloud account, and there is no host-side store they proxy into. Checked
2026-08-12: three devices running the same app held three distinct files with three different
checksums. So workers that appeared to overwrite each other's seeded state were doing it *through
the shared device*, not through iCloud, and separating the devices separates the stores.

## Release the simulator before the pass ends

```bash
~/.claude/tools/sim release
```

A worker that skips it holds the slot until its session exits or the idle timeout runs out, and
every other session waits that long.

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
