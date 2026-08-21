# Apple — driving the iOS/tvOS simulator

Read this before driving a simulator from a project's own `verify` skill, or from `run`, `implement` or `diagnose` on an Apple project. Generic Apple build and signing knowledge is in `~/.claude/docs/apple-signing.md`; **reliability traps** (screenshot timing, focus assumptions) are in `~/.claude/docs/driving-apple-uis.md`. This file covers the mechanics.

The scripts live in [`simulator/`](simulator/) next to this file. They are **vendored**, not a plugin — see "Provenance" at the bottom.

---

## ⛔ The rule that matters most

**Do not drive `idb` directly, one call per tap.** That is the single largest source of wasted round trips in Apple work here: measured over 24h of session logs, **438 raw `idb ui …` Bash calls** were made while the composed scripts that already exist were invoked **8 times ever**. Every one of those calls is a full round trip that re-reads the whole conversation context to return a line or two.

The scripts below compose the common sequences. Use them.

---

## The scripts, by what you actually want to do

Every script takes `--help` and speaks JSON on `--json`. Run them with `python3 <abs-path>`; none need installing.

### Getting a simulator ready

| want | script |
|---|---|
| pick the right device without listing 200 of them | `simulator_selector.py` |
| list devices with progressive disclosure | `sim_list.py` |
| boot and **wait until actually ready** | `simctl_boot.py` |
| create / erase / delete / shut down | `simctl_create.py`, `simctl_erase.py`, `simctl_delete.py`, `simctl_shutdown.py` |
| check the whole toolchain is healthy | `sim_health_check.sh` |

`simctl_boot.py` waiting for readiness is the important one. A bare `simctl boot` returns before the device can accept input, and every "the tap did nothing" mystery starts there.

### Building and testing

| want | script |
|---|---|
| build or test an Xcode project and get a parsed result | `build_and_test.py` |

It parses the `.xcresult` bundle (`xcode/xcresult.py`) rather than scraping stdout, which is why its failure list is trustworthy where a `grep` over raw `xcodebuild` output is not.

**Still prefer the `build-runner` subagent** (unless the session forbids subagents — see `implement`'s stage rules). `build_and_test.py` returns a parsed summary, but a full build's output is large enough that it should not land in a pass's context regardless.

### Driving the UI

| want | script |
|---|---|
| find and interact with an element by meaning, not coordinates | `navigator.py` |
| swipes and multi-touch | `gesture.py` |
| text entry and hardware buttons | `keyboard.py` |
| what is on screen right now | `screen_mapper.py` |
| accessibility tree audit | `accessibility_audit.py` |

`navigator.py` is the one that replaces most raw `idb ui tap` usage — it resolves an element by label or role and taps it, so a UI change that moves a button by 40 points does not silently start tapping the wrong thing.

### State and inspection

| want | script |
|---|---|
| capture app state (defaults, files, screenshots) as one bundle | `app_state_capture.py` |
| Core Data / SwiftData contents | `model_inspector.py` |
| launch / terminate / reinstall | `app_launcher.py` |
| stream and filter logs | `log_monitor.py` |
| permissions and privacy prompts | `privacy_manager.py` |
| status bar (time, battery, signal) for clean screenshots | `status_bar.py` |
| push notifications | `push_notification.py` |
| clipboard | `clipboard.py` |
| compare two screenshots | `visual_diff.py` |
| record a session as a replayable test | `test_recorder.py` |

---

## Assessment — read this before trusting a script

Reviewed at vendoring time (34 files, ~10k lines). What is actually true of them:

**Good, and the reason to keep them.**
- **No third-party dependencies.** Standard library only — `json`, `subprocess`, `argparse`, `pathlib`. Nothing to install, nothing to break on a Python upgrade.
- **A real shared layer.** `common/` holds device resolution, `idb` invocation, screenshot handling and a progressive-disclosure cache; `xcode/` holds build execution and `.xcresult` parsing. The scripts are not 24 copies of the same subprocess boilerplate.
- **`xcresult.py` parses the bundle properly** instead of scraping stdout. That is the difference between a reliable failure list and a guess.
- **`cache_utils.py` implements progressive disclosure** — large outputs are written to a cache and summarized, with the full text fetchable by key. That is exactly the right instinct for this problem and it is why these are worth vendoring rather than rewriting.

**Gaps, stated honestly.**
- **No composite flow script.** The chatty pattern is still tap → wait → screenshot → describe as separate invocations. Nothing here takes a list of steps and returns one end-state. That is the missing piece and it is why raw `idb` kept winning: for a three-step flow, three script calls felt no better than three `idb` calls. **This is the one gap worth closing, and it has not been built.**
- **tvOS is unaddressed.** Everything assumes touch. `iptv-mac` targets tvOS, where the interaction model is a focus engine driven by a remote — `navigator.py`'s tap-by-label model does not map onto it. Treat tvOS as unsupported here until someone writes the focus-navigation equivalent.
- **I have not executed any of them.** This assessment is from reading the code and its structure, not from running the suite against a live simulator. Treat the "good" list as informed reading, not verification.

---

## How a project uses this

A project's own `verify` skill references this file rather than restating it:

> Simulator driving: see `~/.claude/skills/_domains/apple/simulator.md`. Device: iPhone 16 Pro, iOS 18.2. App bundle id: `com.example.app`.

Project-specific things — which device, which bundle id, which screens matter, what "working" looks like for this app — belong in the project's skill. Everything above is generic and stays here, once.

---

## Provenance

Vendored from the `ios-simulator-skill@conorluddy` marketplace plugin (MIT-licensed skill + scripts; no MCP server). Copied here so projects can reference one copy and so the content is not subject to a marketplace update changing under us.

`UPSTREAM-SKILL.md` in [`simulator/`](simulator/) is the original SKILL.md, kept verbatim for reference. It is **not** loaded as a skill — this file supersedes it.

**The marketplace plugin is still installed and is currently enabled on the nine Apple projects.** It should be removed once these vendored scripts have been exercised on a real project; until then, leaving it enabled means a working path exists if something here is wrong.
