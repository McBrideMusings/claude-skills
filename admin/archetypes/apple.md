# Archetype: `apple` (macOS / iOS apps)

Load this when a project's `admin.toml` has `archetypes = [… "apple" …]`. Drives
`dev` (build → launch → stream → reload), `build`, icon generation, and the dev
banner/rename. Config lives in the `[apple]` and `[apple.icons]` tables.

---

## App icons — two gotchas that waste hours

All Apple icons go through the tool's one generator
(`admin_lib.icons.generate_icons`, via `[apple.icons]` + the `icons` command or
the dev-loop banner swap). **Never write a per-project icon script.** Authoritative
detail: admin-project-tool `docs/adr/0007-apple-icon-rendering.md`.

### 1. Alpha channel → INSET; opaque RGB → FULL-BLEED

macOS renders an app icon in the Dock based on opacity:

- **Fully opaque** (`RGB`, no alpha — or `RGBA` with every pixel α=255) →
  **full-bleed**, fills the whole Dock tile edge-to-edge.
- **Any transparency** (an alpha channel with *any* pixel α<255 — anti-aliased
  edges, a soft shadow, a deliberate transparent margin) → macOS **insets** it
  into a smaller padded tile. Looks shrunken/wrong next to other apps.

It's invisible in an image viewer — two icons that look identical render
differently. Only the pixels tell:

```python
from PIL import Image
im = Image.open("icon_1024.png")
im.mode                                          # 'RGB' → no alpha → full-bleed
                                                 # 'RGBA' → has alpha → suspect
im.convert("RGBA").split()[-1].getextrema()[0]   # min alpha; <255 → renders inset
```

The **DEV banner** is the classic trap: its rotated, anti-aliased red stripe (and
sub-255 fill) drops min alpha below 255, so a bannered icon that *looks* fine
renders inset. `generate_icons` therefore **ALWAYS flattens output to opaque RGB**
(strips the alpha channel). Any new icon path must flatten too.

- **iOS**: the system masks the rounded shape and forbids alpha — full-bleed
  opaque squares. Flatten-to-RGB is correct there too.
- **macOS**: the system does NOT mask the artwork; the PNG shows as-is. Full-bleed
  *requires* an opaque, no-alpha square. The classic macOS "icon grid" with a
  ~10% transparent margin (≈824px art in 1024px) is the *alternative*,
  non-full-bleed look — but that margin is alpha<255, so it triggers the inset
  treatment. **You cannot have a transparent margin AND full-bleed; pick one.**

### 2. The Dock hover tooltip = the `.app` FILENAME, not `CFBundleName`

A dev variant's name comes from different sources per surface:

| Surface | Source |
| --- | --- |
| Dock hover tooltip / Finder | the **`.app` filename** (`MyApp.app` → "MyApp") |
| Menu-bar app menu | `CFBundleName` — patched post-build by `dev_macos_postprocess` |
| Some Finder/system surfaces | `CFBundleDisplayName` — patched post-build too |
| In-app strings (window title, welcome screen) | hardcoded unless they read `Bundle.main`'s `CFBundleDisplayName` |

Naming the dev variant in the menu bar and naming it in the Dock are two
different jobs, and `mac_dev_product_name` does both. Set `[apple]
mac_dev_product_name = "<Name> Dev"` and the dev loop's `dev_macos_postprocess`
renames the built app → `<Name> Dev.app` (the only thing the Dock tooltip reads),
patches `CFBundleName` **and** `CFBundleDisplayName` to match, and re-signs with
the stable identity (TCC grants survive).

Both plist keys are patched post-build rather than set in the project spec
because a project with `GENERATE_INFOPLIST_FILE = YES` cannot set `CFBundleName`
in the spec at all — Xcode derives it from `PRODUCT_NAME`, there is no
`INFOPLIST_KEY_CFBundleName` to override it with, and `PRODUCT_NAME` has to stay
put or `TEST_HOST` and the built `.app` name move with it. Setting
`INFOPLIST_KEY_CFBundleName` in `project.yml` looks right and does nothing. Keep `PRODUCT_NAME` stable so the build's `.app` (and `TEST_HOST`) is
unaffected. Make in-app strings read `Bundle.main`'s `CFBundleDisplayName` so the
variant labels itself everywhere.

---

## Code signing & TCC permissions — the reinstall re-prompt trap

**Symptom:** a Mac app re-requests every restricted permission (camera, Documents,
Automation, screen recording, …) on each reinstall, even though you "already
granted" them.

**Cause:** macOS TCC keys each grant to the app's **code-signing designated
requirement**, not its path or bundle ID alone.

- A **stable identity** (an `Apple Development` / `Developer ID` cert) →
  designated requirement is Team-ID + bundle-ID based → **stable across every
  rebuild** → grants persist.
- **Ad-hoc** signing (`CODE_SIGN_IDENTITY = "-"`) → the designated requirement
  *is the raw cdhash*, which changes on **every single build** → macOS treats
  each reinstall as a brand-new app and re-prompts for everything.

Verify what an installed app actually is:

```sh
codesign -dvvv /Applications/App.app 2>&1 | grep -iE 'Signature|TeamIdentifier'
codesign -d -r- /Applications/App.app 2>&1 | grep -i designated
# adhoc / "TeamIdentifier=not set" / "designated => cdhash H\"…\""  → will re-prompt
# "Authority=Apple Development…" / a Team-ID-based requirement       → grants persist
```

### `sign_identity` only covers the paths the archetype itself drives

`[apple] sign_identity = "Apple Development"` makes the tool resolve a concrete
keychain hash (`admin_lib.apple.resolve_signing_identity`, a case-insensitive
substring match — no hardcoded hash) and pass it to **xcodebuild for the
archetype's own `apple`-kind actions** (`dev_mac`, `build_mac`, `deploy_mac`).
That's the whole fix — *for those paths*.

**The trap:** if a project routes its release/install build through a separate
script instead (a `mise` task, `scripts/build.sh`, a Makefile), `sign_identity`
**never touches it**. That path signs with whatever the Xcode project's Release
config says — usually `CODE_SIGN_IDENTITY = "-"` (ad-hoc) — so `./admin dev` keeps
its grants while `./admin install` re-prompts on every reinstall. The two paths
sign differently and only the dev one is fixed.

### `development_team` pointing at a variable nothing exports

`[apple] development_team = "${SOME_VAR}"` used to resolve to `""` when `SOME_VAR`
was unset or exported empty, and `_compose_sign_settings` dropped the empty result —
so no `DEVELOPMENT_TEAM` reached `xcodebuild`, macOS fell back to
`CODE_SIGN_IDENTITY = -`, and **ad-hoc signing strips every entitlement that needs a
provisioning profile**. The build still printed `** BUILD SUCCEEDED **` and `deploy`
still installed the app. This shipped an app with no iCloud entitlement for weeks.

Since ADR-0013 the tool refuses instead: `admin check` names the key and the variable
before a build runs, and `resolve_env` exits 2 at dispatch. Nothing to work around —
but two habits still matter:

- **Check the variable name against `~/.claude/.env` when you write the manifest.**
  The team id is exported as `IOS_DEVELOPMENT_TEAM` and shared across every Apple
  project; a project-specific name like `${HERMES_DEV_TEAM}` is a variable you now
  also have to create.
- **Verify signing from the installed app, not the build log.** A correctly signed
  build carries the entitlements the app actually asked for:

```bash
codesign -d --entitlements - /Applications/YourApp.app
# good: com.apple.developer.ubiquity-kvstore-identifier, .aps-environment, .team-identifier
# bad:  com.apple.security.get-task-allow and nothing else  → ad-hoc, entitlements stripped
codesign -dvvv /Applications/YourApp.app 2>&1 | grep -E 'Authority|TeamIdentifier'
```

### Pattern: thread the stable identity through a custom build script

Reuse the tool's abstraction — **do not** re-implement `security find-identity`
matching in bash. Make the build script honor an env override that **defaults to
ad-hoc**, then have a `python` action resolve the identity and export it:

```sh
# scripts/build.sh (committed — shared with CI). Default "-" keeps CI / public
# artifacts ad-hoc, byte-for-byte unchanged; a local caller can override.
CODE_SIGN_IDENTITY="${CODE_SIGN_IDENTITY:--}"
xcodebuild … CODE_SIGN_IDENTITY="$CODE_SIGN_IDENTITY" archive
```

```toml
# admin.toml — a python action resolves the identity and exports it before the
# build. run_cmd inherits os.environ, so the env var reaches the subprocess.
[actions.install]
kind = "python"
run  = '''
ident = resolve_signing_identity(globals().get("_APPLE_CONFIG") or {})
if ident:
    os.environ["CODE_SIGN_IDENTITY"] = ident
rc = run_cmd("mise run build && mise run install-app")
if rc != 0:
    sys.exit(rc)
'''
```

Why split it this way: keep stable signing **local-only**. A CI runner has no
`Apple Development` cert, and a public release shouldn't carry your personal one —
so the committed script stays ad-hoc by default and the stable identity is opted
in only by the local (often gitignored) `admin.toml`.

**Expect one last prompt.** Switching an already-installed app from ad-hoc to a
stable identity changes its designated requirement once, so macOS re-prompts on
the *first* install after the change — then never again.

---

## `[apple]` / `[apple.icons]` config

### Generated projects — `prebuild_cmd`

An `.xcodeproj` produced by XcodeGen or Tuist is usually gitignored, so it is
absent on a fresh clone and stale after a spec edit. Declare the generator once:

```toml
[apple]
prebuild_cmd = "xcodegen generate"
```

It runs once per invocation from `_detect_project_path` (`appleProject` in the
Go port), which every `build`/`dev`/`deploy` apple action funnels through, so
they all get a project matching its spec. A non-zero exit aborts the command.
Do **not** add a project-level `generate` command alongside it — that's a
second way to do the same thing.

The Go port (`internal/kinds/apple_darwin.go`) dropped this call entirely
until 2026-09-03 — every apple verb failed with `"<project>" does not exist`
on a fresh clone or after a `project.yml` edit, with no mention of
`prebuild_cmd` anywhere in the error. Fixed by wiring `appleProject` through
the same prereq-once-per-process gate the Python original had. If a project
on an older installed `admin` hits this, `bash
~/projects/admin-project-tool/install.sh` picks up the fix.

```toml
[apple]
project_path         = "App.xcodeproj"
mac_scheme           = "App"
mac_build_config     = "Debug"
mac_bundle           = "com.example.app"
mac_dev_bundle       = "com.example.app.debug"
sign_identity        = "Apple Development"   # stable re-sign → keep TCC across rebuilds
mac_dev_product_name = "App Dev"             # → dev app renamed "App Dev.app" (Dock name)

[apple.icons]
mac_asset_dir = "App/Assets.xcassets/AppIcon.appiconset"
# glyph_svg / glyph_text / bg_color → generate the icon from a glyph (regenerate path)
# omit the glyph → the dev-loop swap overlays the DEV banner on the committed art
```

- Refresh production icons: `admin icons regenerate`
- The dev build auto-gets: DEV banner (overlaid → flattened to RGB → restored
  after build) and the renamed `.app`.

## Signature check as a scheme build post-action

Every apple-archetype project can wire the same shared script as a scheme
build post-action to warn (ad-hoc → TCC re-prompts every rebuild) or fail
(ad-hoc + embedded code → hardened runtime refuses to launch) on a bad
signature, instead of a silent `BUILD SUCCEEDED` on an app that dies on
double-click:

```yaml
postBuildScripts:
  - name: Assert code signature
    script: '"$HOME/.admin/admin_lib/resources/assert-mac-signature.sh"'
```

It reads `CODESIGNING_FOLDER_PATH` from the Xcode build environment (or takes
a path as `$1` when run by hand) — no per-project config. Fully generic;
**never fork a per-project copy** of this script.

## tvOS: `dev tv` is the simulator, `deploy tv` is the Apple TV

`tv_scheme` in `[apple]` turns on all three — `build tv`, `dev tv` (tvOS
simulator, pinned with `tv_device` / `TV_DEVICE`), and `deploy tv` (Release
build → install on a paired Apple TV over the network, via `devicectl`).

**Pairing is one-time, network-only, and not something `admin` can do.** Apple
TV: Settings → Remotes and Devices → Remote App and Devices, leave it open;
Mac: Xcode → Window → Devices and Simulators → select the Apple TV → type the
PIN. Before that, `devicectl` does not list the device at all, so it looks like
`deploy tv` is broken rather than not-yet-paired.

## Seeding the launched process's environment — `[apple] dev_env`

`dev_ios` / `dev_tv` / `dev_device` build, install and launch, but nothing in
the archetype used to let a project hand the launched app an environment
variable — no equivalent of the shell-script pattern `SIMCTL_CHILD_FOO=...
xcrun simctl launch`. That mattered for a project seeding its own debug
session (Keychain, a feature flag, a fixture path) at launch time, which
otherwise had to fall back to a hand-written `interactive-shell` action
duplicating `install_and_launch_sim`/`dev_loop_device`.

```toml
[apple]
dev_env = { MYAPP_DEBUG_JAR = "${MYAPP_JAR:-$HOME/.admin/myapp/jar.txt}" }
```

- Values go through `resolve_env` (`${VAR}` / `${VAR:-default}`), same as any
  other `[apple]` string — but only `dev_env`'s values get this treatment;
  other free-form `[apple]` keys do not auto-resolve.
- **Simulator** (`dev_ios`/`dev_tv`): delivered via `SIMCTL_CHILD_<NAME>` on
  the `simctl launch` subprocess's environment — the only mechanism `simctl`
  recognizes; there is no direct `-e` flag the way `devicectl` has.
- **Device** (`dev_device`): delivered via `devicectl device process launch
  -e '<json>'`, merged over the archetype's own `OS_ACTIVITY_DT_MODE=YES`
  (dev_env values win on key collision).
- A caller can still pass `env={...}` directly to `dev_simulator`/`dev_ios`/
  `dev_tv`/`dev_device` from a `kind="python"` action body to override or
  compute it per-invocation; `[apple] dev_env` is only the config-driven
  default used when no explicit `env` is passed.

## Dev-output streaming

If a `dev`/launch command's output collapses or elides, the action needs
`interactive-shell` (raw stream), not `pty=True`. See the main SKILL.md
"Fixing the collapsing/elided dev-output box" note.

---

## Signing without a person: the App Store Connect API key

If a machine has these three exported (they are in `~/.claude/.env` on the main
Mac), the archetype signs and provisions with no Apple ID in Xcode:

```
APP_STORE_CONNECT_KEY_PATH  APP_STORE_CONNECT_KEY_ID  APP_STORE_CONNECT_ISSUER_ID
```

`admin appid` then covers what used to need the developer portal — `admin appid`
alone reports on the project's identifiers, `--capability icloud` enables one,
`--name` registers a new one.

### The trap that makes a correct App ID look broken

```
error: "<app>" requires a provisioning profile with the iCloud feature.
```

Reads as *the capability is missing from the App ID*. Usually it is not. Check,
in this order:

1. **Is something forcing manual signing?** `CODE_SIGN_STYLE=Manual` with an
   empty `PROVISIONING_PROFILE_SPECIFIER` tells `xcodebuild` never to create a
   profile, so `-allowProvisioningUpdates` and the API key are both ignored and
   it falls back to the wildcard team profile. `[apple] sign_identity` used to
   do this unconditionally; since 2026-08-12 it only does so for apps whose
   entitlements need no profile.
2. **Is Xcode signed out?** It does not say so — same error. Its preferences
   lie about it too: the account row outlives the keychain credential.
3. **Only then, the App ID.** `admin appid <bundle-id>` answers it in one call.

Automatic signing also refuses an identity *hash* — pass the name
(`"Apple Development"`).
