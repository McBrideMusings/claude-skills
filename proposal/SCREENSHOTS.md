# Screenshot mode for a prototype

A `spike` prototype is driven by clicks and timers, so a screenshot of it lands on whatever
state the page reached. Screenshot mode makes every state the proposal shows reachable by
URL: `<slug>.html?shot=<state>` renders that state alone, at the platform's exact size, with
no harness chrome and no motion. One script then shoots every state.

## In the fragment

The harness clears `#at-stage`, clones the variant's `<template>` into it on the next frame,
then re-fires every tweak's `onChange` ([`../spike/CONTRACT.md`](../spike/CONTRACT.md) §Tweaks).
So the prototype starts from `boot()`, called from its tweaks' `onChange`, never from
top-level script. Every tweak's `onChange` ends by calling `boot()`, and a prototype always
has at least one tweak, since its states need one ([`../spike/UI.md`](../spike/UI.md) §State axes).
Each variant's template has one root element, `.screen`, which the
prototype renders into.

```js
var SHOT = new URLSearchParams(location.search).get('shot');
if (SHOT) document.documentElement.classList.add('shot');

// One function per named state, setting state directly, never by replaying clicks.
// Each starts from fresh(), so the order shots run in changes nothing.
var JUMP = {
  'start':   function () {},
  'confirm': function () { S.sheet = 'confirm'; },
  'waiting': function () { S.request = newRequest(); },
  'count':   function () { S.request = newRequest(); deliverQueued(S.request); },  // timer data, at once
  'list':    function () { deliverQueued(S.request = newRequest()); S.panel = 'list'; }
};

var screen = null, S;
function boot() {                      // from every tweak's onChange: runs after each mount
  var found = document.querySelector('#at-stage .screen');
  if (!found || found === screen) return;
  screen = found;
  S = fresh();
  if (SHOT) {
    if (!JUMP[SHOT]) { screen.textContent = 'No shot state: ' + SHOT; return; }  // a wrong name shows in the PNG
    JUMP[SHOT]();
  } else {
    startTimers();                     // faked data arrives on a timer only outside shot mode
  }
  fit(); render();
}
function fit() {                       // scale to the window only outside shot mode
  var w = screen.offsetWidth, h = screen.offsetHeight;
  screen.style.zoom = SHOT ? 1 : Math.min(1, (innerWidth - 24) / w, (innerHeight - 24) / h);
}
```

```css
/* Each platform's prototype sets its own size. */
.screen { width: var(--screen-w); height: var(--screen-h); overflow: hidden; }
/* Shot mode: the screen alone at that size, no Tweaks panel, no motion. */
.shot .at-twk, .shot .at-twk-pill { display: none !important; }
.shot .screen { border-radius: 0; box-shadow: none; }
.shot body, .shot #at-stage { margin: 0; padding: 0; }
.shot *, .shot *::before, .shot *::after { animation: none !important; transition: none !important; }
```

- **Name states for what the screen shows** (`list`, `detail-empty`), matching the
  proposal's Design table headings. The PNG name is `<platform>-<state>.png`.
- **A state that differs only by a tweak** (a closed record, an offline connection) is one
  `JUMP` entry plus that tweak in the query, not a second copy of the state.

## The shoot script

`shoot.sh` sits in the topic directory beside the prototype source. Each platform's built
prototype is its own spike slug and directory (`<topic>-phone/`, `<topic>-desktop/`, per
[`../spike/UI.md`](../spike/UI.md)), next to that topic directory. The script shoots each
state with `spike shot --platform --query`, which fixes the size per platform
([`../spike/MOCKUP.md`](../spike/MOCKUP.md) step 5), and renames the PNG into one image
directory:

```bash
#!/bin/bash
# Shoots every named state of the prototype at its platform size into ./proposal/.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
SPIKE="$HOME/.claude/skills/spike/tool/spike"
OUT="$DIR/proposal"
mkdir -p "$OUT"
shoot() { # platform variant state [extra query, starting with &]
  local slug="<topic>-$1" png
  png="$("$SPIKE" shot "$slug" --dir "$DIR/../$slug" --platform "$1" \
          --query "v=$2&shot=$3${4:-}" | tail -1)"
  mv "$png" "$OUT/$1-$3.png"
  echo "$OUT/$1-$3.png"
}
for s in start confirm waiting count list; do shoot phone 1 "$s"; done
for s in start count list;                 do shoot desktop 1 "$s"; done
```

Add `--theme dark` and a `-dark` suffix when the proposal shows both themes.

## Done when

- Every state in the proposal's Design section has a `JUMP` entry and a line in `shoot.sh`.
- One run of `shoot.sh` writes them all, and every PNG for one platform reports the same
  size: `sips -g pixelWidth -g pixelHeight "$OUT"/phone-*.png`.
- You opened each PNG and looked at it ([`../spike/CRITIQUE.md`](../spike/CRITIQUE.md)): no
  Tweaks pill, no "No shot state" text, no half-finished transition, no state left over from
  another shot.
