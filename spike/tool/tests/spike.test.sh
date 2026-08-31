#!/usr/bin/env bash
# Tests for skills/spike/tool/spike — the widget registry and the source stamping that
# annotation depends on. explainer has its own copy of the stamping code and its own
# tests; nothing here is shared with it.
#
# The behaviour under test is the part a reader of the output cannot see: whether a pin
# made in the browser can name the line of the fragment that produced the element. If
# data-src is missing, wrong, or points at a line inside a <script>, every comment comes
# back naming the wrong place and the whole round trip is worse than useless.
#
# Browser-side behaviour (pin placement, reattachment after rebuild, the device frame's
# real viewport) is exercised by driving headless Chrome; that is not repeated here.
#
#   skills/spike/tool/tests/spike.test.sh
set -uo pipefail

ART="$(cd "$(dirname "$0")/.." && pwd)/spike"
[ -x "$ART" ] || { echo "cannot find spike at $ART" >&2; exit 2; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

pass=0; fail=0
say() {
  if [ "$1" = ok ]; then pass=$((pass+1)); printf 'ok    %s\n' "$2"
  else fail=$((fail+1)); printf 'FAIL  %s\n' "$2"; fi
}
has() { grep -qF "$2" "$1"; }

cat > "$WORK/frag.html" <<'EOF'
<style>
  .card { color: #222; }
</style>
<section class="card">
  <h2>Real heading</h2>
  <p>A line of body copy.</p>
  <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="">
  <svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"></circle></svg>
</section>
<script>
  var notATag = "<div>this lives inside a script</div>";
</script>
EOF

echo "--- stamping ---"
"$ART" build --kind wireframe --title "Stamp test" \
  --fragment "$WORK/frag.html" --out "$WORK/wf.html" >"$WORK/out.txt" 2>/dev/null
OUT="$WORK/wf.html"

has "$OUT" '<section data-src="frag.html:4"' && say ok "section carries its fragment line" \
  || say f "section is missing data-src"
has "$OUT" '<h2 data-src="frag.html:5"' && say ok "h2 carries its fragment line" \
  || say f "h2 line number is wrong or missing"
has "$OUT" '<p data-src="frag.html:6"' && say ok "p carries its fragment line" \
  || say f "p line number is wrong or missing"
has "$OUT" '<svg data-src="frag.html:8"' && say ok "svg is stamped as one unit" \
  || say f "svg opening tag is not stamped"
has "$OUT" '<circle data-src' && say f "svg internals were stamped (they are one unit)" \
  || say ok "svg internals left alone"
has "$OUT" '<img data-src' && say f "void element was stamped" \
  || say ok "void elements left alone"
has "$OUT" '<div data-src="frag.html:11"' && say f "a tag inside <script> text was stamped" \
  || say ok "script contents are not scanned for tags"
grep -q 'stamped=[1-9]' "$WORK/out.txt" && say ok "build line reports the stamp count" \
  || say f "build line does not report stamped="

echo "--- widget registry ---"
has "$OUT" 'name="folio-build"' && say ok "build id meta present" || say f "no build id meta"
has "$OUT" 'name="folio-fragment"' && say ok "fragment path meta present" || say f "no fragment meta"
has "$OUT" 'at-notes-layer' && say ok "annotate ships on kind wireframe" || say f "annotate missing on wireframe"
has "$OUT" '<button class="at-theme"' && say ok "theme toggle ships on kind wireframe" || say f "theme toggle missing on wireframe"
has "$OUT" 'at-vp-item' && say f "viewport shipped on wireframe (default is prototype only)" \
  || say ok "viewport withheld from kind wireframe"

"$ART" build --kind wireframe --title T --fragment "$WORK/frag.html" --out "$WORK/no.html" \
  --without annotate,contrast >/dev/null 2>&1
has "$WORK/no.html" 'at-notes-layer' && say f "--without annotate still shipped it" \
  || say ok "--without annotate leaves it out"
has "$WORK/no.html" 'data-src=' && say f "stamping happened with annotate off" \
  || say ok "stamping is skipped when nothing needs it"

"$ART" build --kind wireframe --title T --fragment "$WORK/frag.html" --out "$WORK/with.html" \
  --with viewport --device phone >/dev/null 2>&1
has "$WORK/with.html" 'data-at-device-frame="phone"' && say ok "--with viewport adds it to a wireframe" \
  || say f "--with viewport did nothing"
# The viewport widget is what makes --device meaningful, so it is required with it and
# refused without it, on every kind rather than only on prototype.
"$ART" build --kind wireframe --title T --fragment "$WORK/frag.html" --out "$WORK/nodev2.html" \
  --with viewport >/dev/null 2>&1
[ $? -ne 0 ] && say ok "--with viewport without --device is rejected" \
  || say f "--with viewport built with no --device"
"$ART" build --kind wireframe --title T --fragment "$WORK/frag.html" --out "$WORK/stray.html" \
  --device phone >/dev/null 2>&1
[ $? -ne 0 ] && say ok "--device without the viewport widget is rejected" \
  || say f "--device built on a kind with no viewport"

"$ART" build --kind wireframe --title T --fragment "$WORK/frag.html" --out "$WORK/bad.html" \
  --with nosuchwidget >/dev/null 2>&1
[ $? -ne 0 ] && say ok "unknown widget name is an error" || say f "unknown widget name was accepted"

echo "--- prototype ---"
cat > "$WORK/proto.html" <<'EOF'
<template data-variant="Quiet"><div class="frame"><button>Go</button></div></template>
<template data-variant="Loud"><div class="frame"><button>GO NOW</button></div></template>
EOF
"$ART" build --kind prototype --title P --fragment "$WORK/proto.html" \
  --device phone --out "$WORK/p.html" >/dev/null 2>&1
has "$WORK/p.html" 'at-vp-host' && say ok "viewport ships on a prototype" || say f "viewport missing on prototype"
has "$WORK/p.html" '<button class="at-theme"' && say f "theme toggle shipped on a prototype" \
  || say ok "theme toggle withheld from prototype"
has "$WORK/p.html" '<button data-src="proto.html:1"' && say ok "variant contents are stamped" \
  || say f "elements inside <template> were not stamped"

echo "--- device ---"
# ONE device, required, no default and no `fit`.
"$ART" build --kind prototype --title P --fragment "$WORK/proto.html" \
  --device panel --out "$WORK/dev.html" >/dev/null 2>&1
has "$WORK/dev.html" 'data-at-device-frame="panel"' && say ok "--device reaches the document" \
  || say f "--device did not reach data-at-device-frame"
has "$WORK/dev.html" 'at-oc-menubar' && say ok "panel frame ships its menu bar chrome" \
  || say f "panel frame has no menu bar chrome"
"$ART" build --kind prototype --title P --fragment "$WORK/proto.html" \
  --device desktop --window bar --out "$WORK/one.html" >/dev/null 2>&1
has "$WORK/one.html" 'data-at-device-frame="desktop"' && say ok "a desktop build carries its frame" \
  || say f "--device desktop did not reach data-at-device-frame"
"$ART" build --kind prototype --title P --fragment "$WORK/proto.html" \
  --out "$WORK/nodev.html" >/dev/null 2>&1
[ $? -ne 0 ] && say ok "a prototype without --device is rejected" \
  || say f "a prototype built with no --device"
"$ART" build --kind prototype --title P --fragment "$WORK/proto.html" \
  --device fit --out "$WORK/fit.html" >/dev/null 2>&1
[ $? -ne 0 ] && say ok "the unframed 'fit' device is gone" || say f "--device fit still builds"
"$ART" build --kind prototype --title P --fragment "$WORK/proto.html" \
  --device phone,panel --out "$WORK/list.html" >/dev/null 2>&1
[ $? -ne 0 ] && say ok "a device list is rejected" || say f "--device took a list"
"$ART" build --kind prototype --title P --fragment "$WORK/proto.html" \
  --device laptop --out "$WORK/bad.html" >/dev/null 2>&1
[ $? -ne 0 ] && say ok "an unknown device is rejected" || say f "unknown device 'laptop' built"
# --window is desktop-only furniture: a panel has no title bar to put lights in.
"$ART" build --kind prototype --title P --fragment "$WORK/proto.html" \
  --device panel --window bar --out "$WORK/bad2.html" >/dev/null 2>&1
[ $? -ne 0 ] && say ok "--window without the desktop frame is rejected" \
  || say f "--window built against a panel device"
# A desktop app IS a window: saying nothing gets the real thing, and opting out is explicit.
"$ART" build --kind prototype --title P --fragment "$WORK/proto.html" \
  --device desktop --out "$WORK/deskdef.html" >/dev/null 2>&1
has "$WORK/deskdef.html" 'data-at-window="bar,lights"' \
  && say ok "a bare --device desktop defaults to a real window" \
  || say f "--device desktop did not default to bar,lights"
"$ART" build --kind prototype --title P --fragment "$WORK/proto.html" \
  --device desktop --window none --out "$WORK/desknone.html" >/dev/null 2>&1
# On the <html> line only: viewport.js's own source mentions the attribute it reads.
grep -q '^<html[^>]*data-at-window' "$WORK/desknone.html" \
  && say f "--window none still wrote window chrome" \
  || say ok "--window none opts out of the title bar"
grep -q '^<html[^>]*data-at-window="bar,lights"' "$WORK/deskdef.html" \
  && say ok "the default window chrome is on :root" \
  || say f "bar,lights did not reach the <html> element"
"$ART" build --kind prototype --title P --fragment "$WORK/proto.html" \
  --device desktop --window none,bar --out "$WORK/deskmix.html" >/dev/null 2>&1
[ $? -ne 0 ] && say ok "--window none cannot be combined" || say f "--window none,bar built"
# `fill` is the window itself — a real device answer, and the one that frames nothing.
"$ART" build --kind prototype --title P --fragment "$WORK/proto.html" \
  --device fill --out "$WORK/fill.html" >/dev/null 2>&1
has "$WORK/fill.html" 'data-at-device-frame="fill"' && say ok "--device fill reaches the document" \
  || say f "--device fill did not build"

echo "--- the tweaks panel ---"
cat > "$WORK/twk.html" <<'EOF'
<template data-variant="Quiet"><div class="frame"><button>Go</button></div></template>
<template data-variant="Loud"><div class="frame"><button>GO NOW</button></div></template>
<script>atTweaks.add('dark', false, { onChange: function () {} });</script>
EOF
"$ART" build --kind prototype --title P --fragment "$WORK/twk.html" \
  --device phone --out "$WORK/twk.out.html" >/dev/null 2>&1
has "$WORK/twk.out.html" 'class="at-twk"' && say ok "the panel ships on a prototype" \
  || say f "no .at-twk in a switch-picker prototype"
has "$WORK/twk.out.html" 'class="at-twk-pill"' && say ok "the pill ships beside it" \
  || say f "no .at-twk-pill — closing the panel would strand it"
# The stub has to be in <head>: a fragment's own <script> is in the body and runs first.
sed -n '1,/<\/head>/p' "$WORK/twk.out.html" | grep -q 'window.atTweaks=' \
  && say ok "the atTweaks stub is in <head>" \
  || say f "the atTweaks stub is not ahead of the fragment"
has "$WORK/twk.out.html" 'class="at-twk-meta"' && say ok "the meta strip is built" \
  || say f "no meta strip — the device readout has nowhere to go"
has "$WORK/twk.out.html" 'data-at-tweaks' && say ok "the root says the panel is present" \
  || say f "data-at-tweaks missing from :root"
# The rail is gone entirely, markup-declared axes with it.
has "$WORK/twk.out.html" 'class="at-rail"' && say f "the rail is still being built" \
  || say ok "the rail is gone"
has "$WORK/twk.out.html" 'at-twk-tabs' && say ok "the panel carries its tab strip" \
  || say f "no tab strip — Checks and Comments have nowhere to go"
has "$WORK/twk.out.html" 'data-pane="tweaks"' && say ok "the Tweaks pane holds the variant group" \
  || say f "no tweaks pane"
# Three segments side by side is the ceiling; a fourth choice is a dropdown.
has "$WORK/twk.out.html" 'at-twk-variant"' && say ok "two variants get the segmented chooser" \
  || say f "the variant chooser is not segmented"
cat > "$WORK/many.html" <<'EOF'
<template data-variant="One"><div class="frame"><button>a</button></div></template>
<template data-variant="Two"><div class="frame"><button>b</button></div></template>
<template data-variant="Three"><div class="frame"><button>c</button></div></template>
<template data-variant="Four"><div class="frame"><button>d</button></div></template>
EOF
"$ART" build --kind prototype --title P --fragment "$WORK/many.html" \
  --device phone --out "$WORK/many.out.html" >/dev/null 2>&1
has "$WORK/many.out.html" 'at-twk-variant-select' \
  && say ok "four variants get the dropdown instead" \
  || say f "four variants still rendered as segments"

echo "--- the at: event vocabulary ---"
# Every at:* event a harness file listens for must be one some harness file dispatches.
# `at:axis` outlived the rail by two commits: checks.js stopped re-running on a tweak and
# viewport.js stopped syncing the device frame, both silently, because a listener for an
# event nobody fires throws nothing and logs nothing.
python3 - "$HOME/.claude/skills/spike/tool/harness" <<'PY' && say ok "every at: listener has a dispatcher" || say f "a harness file listens for an at: event nothing dispatches"
import glob, os, re, sys
d = sys.argv[1]
src = "".join(open(f).read() for f in glob.glob(os.path.join(d, "*.js")))
fired = set(re.findall(r"(?:CustomEvent|Event)\(\s*'(at:[a-z]+)'", src))
heard = set(re.findall(r"addEventListener\(\s*'(at:[a-z]+)'", src))
dead = sorted(heard - fired)
if dead:
    print("dead listeners:", ", ".join(dead))
sys.exit(1 if dead else 0)
PY

echo "--- retired kinds ---"
# page/deck are gone; explainer belongs to the explain skill and its own tool.
# argparse rejects an unknown --kind choice, so each of these must be a non-zero exit.
for k in page deck explainer; do
  "$ART" build --kind "$k" --title T --fragment "$WORK/frag.html" \
    --out "$WORK/dead.html" >/dev/null 2>&1
  [ $? -ne 0 ] && say ok "kind '$k' is rejected" || say f "kind '$k' still builds"
done

echo "--- tui scaffold ---"
# A terminal prototype is a Go program, not HTML, so it is a subcommand rather
# than a --kind. The harness is what makes it a spike instead of hand-rolled Go:
# the variant picker, the state axes and — the part that actually catches bugs —
# the geometry assertion, which is why a wrong-width row must fail the dump.
TUI="$WORK/tui"
"$ART" tui --out "$TUI" --title "Smoke" >/dev/null 2>&1
for f in harness.go variants.go go.mod; do
  [ -f "$TUI/$f" ] && say ok "tui scaffolds $f" || say f "tui did not write $f"
done

# --kind tui must NOT exist: the HTML assembler cannot produce a Go program, and
# a kind that silently emitted HTML for a terminal design is the whole mistake.
"$ART" build --kind tui --title T --fragment "$WORK/frag.html" \
  --out "$WORK/dead.html" >/dev/null 2>&1
[ $? -ne 0 ] && say ok "--kind tui is rejected" || say f "--kind tui still builds"

# variants.go is the author's file; a re-scaffold must not silently eat it.
echo "// mine" >> "$TUI/variants.go"
"$ART" tui --out "$TUI" --title "Smoke" >/dev/null 2>&1
grep -q '// mine' "$TUI/variants.go" \
  && say ok "re-scaffold keeps variants.go" || say f "re-scaffold clobbered variants.go"
"$ART" tui --out "$TUI" --title "Smoke" --force >/dev/null 2>&1
grep -q '// mine' "$TUI/variants.go" \
  && say f "--force did not reset variants.go" || say ok "--force resets variants.go"

# Inside an existing module the project's own deps are what a prototype should
# use, so a second go.mod would shadow them.
mkdir -p "$WORK/mod/inner" && printf 'module host\n\ngo 1.22\n' > "$WORK/mod/go.mod"
"$ART" tui --out "$WORK/mod/inner" --title "Inner" >/dev/null 2>&1
[ -f "$WORK/mod/inner/go.mod" ] \
  && say f "wrote a go.mod inside an existing module" \
  || say ok "no go.mod inside an existing module"

if command -v go >/dev/null 2>&1; then
  cat > "$TUI/variants.go" <<'GOV'
package main

const (
	DumpWidth  = 10
	DumpHeight = 2
)

var Axes = []Axis{}

var Variants = []Variant{
	{Name: "Short", Render: func(s State) string { return Pad("a", 10) + "\n" + Pad("b", 10) }},
	{Name: "Wrong", Render: func(s State) string { return "abc\n" + Pad("b", 10) }},
}
GOV
  ( cd "$TUI" && go mod tidy >/dev/null 2>&1 && go run . -dump -dir . >"$WORK/tui.out" 2>&1 )
  grep -q 'FAIL' "$WORK/tui.out" \
    && say ok "dump fails a wrong-width row" || say f "dump passed a 3-col row in a 10-col frame"
  grep -q 'short-frame\|ok   short' "$WORK/tui.out" \
    && say ok "dump names frames per variant" || say f "dump did not name per-variant frames"
else
  say ok "go absent — tui compile checks skipped"
fi

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
