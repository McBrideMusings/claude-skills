# Cua Driver — background desktop automation

MIT-licensed, open source: [`trycua/cua`](https://github.com/trycua/cua), the `libs/cua-driver`
component. Speaks MCP over stdio; also has a `cua-driver call <tool>` CLI (JSON on stdin) for
one-off calls outside an agent loop. Cross-platform (macOS/Windows/Linux), evaluated here on
macOS only.

## How it avoids stealing focus — verified, not just documented

Two addressing modes for the `click`/`type_text`/etc. tools, and which one runs determines the
behavior:

- **AX (accessibility) path** — pass `element_token` (or `element_index` + `snapshot_id`) from a
  prior `get_window_state` call. Driver calls the macOS Accessibility API directly on the target
  process (e.g. `AXPress` on that element). **No cursor movement, no CGEvent, no focus change.**
  This is the default and the one to prefer.
- **Pixel path** — pass `x, y` (window-local screenshot pixels). Only needed for canvas/video/
  custom-drawn surfaces with no AX tree. Synthesizes a real `CGEvent`, but posts it directly to
  the target process rather than the system-wide event queue — your cursor still doesn't move,
  but it is a real synthesized input event, not an AX API call.

**From a script, run one `cua-driver mcp` session, not several `cua-driver call`s.** A
`get_window_state` snapshot, with its `element_token`s and screenshot context, lives only as
long as the process that took it. A `click` from a second `cua-driver call` is refused with
`stale_element_token` (or `screenshot_context_missing` on the pixel path), and a bare
`element_index` with `snapshot_id_required`. Spawn `cua-driver mcp`, send `initialize`, then
`tools/call` for `list_windows`, `get_window_state` and `click` as JSON-RPC lines over its
stdin, and the token stays valid. A WKWebView's DOM shows up in the AX tree, so a page
button's `aria-label` is its `label`.

`delivery_mode: "background"` (the default) uses whichever of the above without fronting the
window. `delivery_mode: "foreground"` briefly fronts the window, acts, then restores the prior
frontmost app — only needed for modifier-key clicks (macOS needs to observe physical modifier
state) or when background delivery is refused.

**Known gotcha, not fully solved upstream**: [trycua/cua#4277](https://github.com/trycua/cua/issues/4277)
— a background-delivery click can briefly (~250ms) deactivate whatever app you're actively using,
despite being reported as background. Design intent and observed behavior in our test both match
"doesn't steal focus," but this edge case exists.

## Install (macOS)

```
/bin/bash -c "$(curl -fsSL https://cua.ai/driver/install.sh)"
```

Installs `CuaDriver.app` to `/Applications`, symlinks `cua-driver` into `~/.local/bin`, sets up a
weekly auto-updater, and enables pseudonymous telemetry by default (`cua-driver telemetry disable`
to turn off). Requires macOS 14+.

Then grant permissions — **this needs a human clicking through System Settings dialogs, cannot be
done from a terminal**:

```
cua-driver permissions grant   # launches CuaDriver.app, requests Accessibility + Screen Recording
cua-driver permissions status  # read-only check afterward
```

`cua-driver permissions grant` can time out waiting on the dialog if the approval doesn't happen
fast enough — just re-run it after granting in System Settings → Privacy & Security.

Verify the whole setup: `cua-driver health_report` or `cua-driver doctor`.

## Reference example worth reusing, not reinventing

`libs/cua-driver/examples/jev-use/` in the `trycua/cua` repo is a real, maintained
observe→decide→act→verify loop, not a toy: candidate construction from the AX tree
(`sources.py`, `native_tasks.py`), a closed-candidate decision contract (`decision_models.py`),
and a runnable harness (`run_native.py`) against purpose-built test apps
(`tests/fixtures/apps/macos/appkit`, plus Windows/Linux equivalents). Building a fresh glue loop
from scratch when this exists is redundant — sparse-checkout just this directory tree rather than
cloning the full ~500MB repo.
