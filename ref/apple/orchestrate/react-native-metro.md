# React Native: Metro is a second singleton

Part of [`orchestrate.md`](../orchestrate.md) — the per-worker simulator and UDID pinning rules are there.

A React Native app loads its JS bundle from a Metro server, and the port is per-machine. Two
workers on two simulators still fetch from one Metro, so each can be running the other's bundle —
the same "my own change is missing" symptom as a shared device, from a different cause.

**`RCT_METRO_PORT` as a shell environment variable does not work.** It is an Xcode *build setting*,
and exporting it in the shell that invokes `xcodebuild` does not reach the build. A worker told
`RCT_METRO_PORT=8111 xcodebuild …` builds an app that still points at 8081. Observed on `term`,
2026-08-31: a worker spent most of a pass testing against a sibling's Metro before spotting the
port mismatch in the unified log, and only then forced its own.

**On React Native 0.86 the build setting does not work either — only the runtime default does.**
0.86 ships React-Core as a *prebuilt* xcframework (`Pods/React-Core-prebuilt/React.xcframework`)
whose `RCTBundleURLProvider.mm` Meta compiled with `RCT_METRO_PORT=8081` baked in. An
`xcodebuild … RCT_METRO_PORT=<port>` override resolves correctly in `-showBuildSettings` for the
React-Core pod target and still cannot reach that binary: the app's first request is literally
`http://localhost:8081/status`, after a full DerivedData wipe and clean rebuild. Confirmed
independently by two workers on `term`, 2026-09-01. Symptom when Metro is not running on 8081 at
all: a red screen reading `No script URL provided`.

So the build-setting line below is **the 0.75-era route, and it is not enough on 0.86**. Use the
runtime override, which `RCTBundleURLProvider` supports for exactly this case:

```bash
# 1. Start this worker's own Metro, in its own worktree.
npx react-native start --port <port>

# 2. Point the INSTALLED APP at it. Pass the build setting AND set the runtime
#    default — on RN 0.86 only the second one actually takes effect:
xcodebuild -destination "id=<udid>" RCT_METRO_PORT=<port> …
xcrun simctl spawn <udid> defaults write <bundle-id> RCT_jsLocation -string "localhost:<port>"
xcrun simctl terminate <udid> <bundle-id>   # the default is read at launch
xcrun simctl launch <udid> <bundle-id>
```

Note the bundle id is the *installed* one — a Debug build may carry a `.dev` suffix
(`term`'s does), and writing the default under the release id silently does nothing.

**Have the worker prove which Metro it is on before it trusts a single observation**, because
nothing about the wrong one looks wrong:

```bash
xcrun simctl spawn <udid> log stream --style compact --predicate 'eventMessage CONTAINS "8081"'
```

Give each worker a port at least 10 apart from its siblings, state it in `constraints` alongside
the UDID, and treat "my change is not on screen" as a Metro question before it is a code question.
