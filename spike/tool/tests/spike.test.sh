#!/usr/bin/env bash
# Tests for skills/spike/tool/spike and spike-export: the three HTML kinds, the mockup
# cell contract that `spike shot` depends on, the Tweaks panel, the TUI scaffold and the
# export folder. Browser-side behaviour of the prototype is exercised by looking at it.
#
#   skills/spike/tool/tests/spike.test.sh
set -uo pipefail

TOOL="$(cd "$(dirname "$0")/.." && pwd)"
ART="$TOOL/spike"
EXP="$TOOL/spike-export"
[ -x "$ART" ] || { echo "cannot find spike at $ART" >&2; exit 2; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

pass=0; fail=0
say() {
  if [ "$1" = ok ]; then pass=$((pass+1)); printf 'ok    %s\n' "$2"
  else fail=$((fail+1)); printf 'FAIL  %s\n' "$2"; fi
}
has() { grep -qF -- "$2" "$1"; }

cat > "$WORK/frag.html" <<'EOF'
<section class="card">
  <h2>Real heading</h2>
  <p>A line of body copy.</p>
</section>
EOF

echo "--- kinds ---"
"$ART" kinds | grep -q '^mockup' && say ok "kinds lists mockup" || say f "kinds does not list mockup"
for k in page deck explainer tui; do
  "$ART" build --kind "$k" --title T --fragment "$WORK/frag.html" \
    --out "$WORK/dead.html" >/dev/null 2>&1
  [ $? -ne 0 ] && say ok "kind '$k' is rejected" || say f "kind '$k' still builds"
done
# The harness widgets and device frames are gone with their flags.
for flag in "--with annotate" "--without contrast" "--device phone" "--picker list"; do
  "$ART" build --kind wireframe --title T --fragment "$WORK/frag.html" \
    --out "$WORK/dead.html" $flag >/dev/null 2>&1
  [ $? -ne 0 ] && say ok "'$flag' is rejected" || say f "'$flag' still accepted"
done

echo "--- wireframe ---"
"$ART" build --kind wireframe --title "WF" --fragment "$WORK/frag.html" \
  --out "$WORK/wf.html" >/dev/null 2>&1
has "$WORK/wf.html" '<main>' && say ok "a wireframe body is wrapped in <main>" || say f "no <main> wrapper"
has "$WORK/wf.html" '.wf-region' && say ok "wireframe stylesheet is inlined" || say f "no wireframe CSS"
has "$WORK/wf.html" 'class="at-' && say f "wireframe carries harness chrome" || say ok "wireframe carries no harness chrome"
printf '<!doctype html><p>x</p>' > "$WORK/doc.html"
"$ART" build --kind wireframe --title T --fragment "$WORK/doc.html" --out "$WORK/dead.html" >/dev/null 2>&1
[ $? -ne 0 ] && say ok "a fragment with <!doctype> is rejected" || say f "doctype in a fragment was accepted"
printf '<img src="https://example.com/a.png">' > "$WORK/net.html"
"$ART" build --kind wireframe --title T --fragment "$WORK/net.html" --out "$WORK/dead.html" >/dev/null 2>&1
[ $? -ne 0 ] && say ok "a remote src is rejected (hermetic)" || say f "a remote src was accepted"

echo "--- mockup ---"
cat > "$WORK/mock.html" <<'EOF'
<style>.btn { color: #123456; }</style>
<template data-variant="Quiet" data-state="Full"><button class="btn">Go</button></template>
<template data-variant="Quiet" data-state="Empty"><p>Nothing here</p></template>
<template data-variant="Dense Rows"><button class="btn">GO</button></template>
EOF
"$ART" build --kind mockup --title M --fragment "$WORK/mock.html" --out "$WORK/m.html" >"$WORK/m.out" 2>/dev/null
grep -q 'cells=3' "$WORK/m.out" && say ok "build reports the cell count" || say f "build line has no cells=3"
has "$WORK/m.html" 'class="mk-cell" id="quiet-full"' && say ok "variant+state becomes the cell id" || say f "no quiet-full cell"
has "$WORK/m.html" 'id="dense-rows-default"' && say ok "a template with no data-state is the default state" || say f "no dense-rows-default cell"
has "$WORK/m.html" 'at-twk' && say f "mockup carries the Tweaks panel" || say ok "mockup carries no Tweaks panel"
has "$WORK/m.html" '<script' && say f "mockup carries script" || say ok "mockup carries no script"
has "$WORK/m.html" '.btn { color: #123456; }' && say ok "the fragment's own CSS reaches the output" || say f "fragment CSS lost"
has "$WORK/m.html" '--f-3xl' && say f "mockup inlined the base type scale" || say ok "mockup inlines no house tokens"
printf '.extra { color: red; }' > "$WORK/extra.css"
"$ART" build --kind mockup --title M --fragment "$WORK/mock.html" --out "$WORK/m2.html" \
  --extra-css "$WORK/extra.css" >/dev/null 2>&1
has "$WORK/m2.html" '.extra { color: red; }' && say ok "--extra-css carries the project's real CSS" || say f "--extra-css lost"
printf '<template data-variant="A" data-state="S">1</template><template data-variant="a" data-state="s">2</template>' > "$WORK/dup.html"
"$ART" build --kind mockup --title M --fragment "$WORK/dup.html" --out "$WORK/dead.html" >/dev/null 2>&1
[ $? -ne 0 ] && say ok "two cells with one id are rejected" || say f "duplicate cell ids built"
"$ART" build --kind mockup --title M --fragment "$WORK/frag.html" --out "$WORK/dead.html" >/dev/null 2>&1
[ $? -ne 0 ] && say ok "a mockup with no templates is rejected" || say f "empty mockup built"

echo "--- shot ---"
CHROME_OK=0
for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "${SPIKE_CHROME:-}" google-chrome chromium; do
  [ -n "$c" ] && { [ -x "$c" ] || command -v "$c" >/dev/null 2>&1; } && CHROME_OK=1 && break
done
mkdir -p "$WORK/spk"
"$ART" build --kind mockup --title M --fragment "$WORK/mock.html" --out "$WORK/spk/spk.html" >/dev/null 2>&1
"$ART" shot spk --dir "$WORK/spk" --cell nope >/dev/null 2>&1
[ $? -ne 0 ] && say ok "an unknown --cell is rejected" || say f "unknown --cell accepted"
"$ART" shot Bad_Slug --dir "$WORK/spk" >/dev/null 2>&1
[ $? -ne 0 ] && say ok "a non-kebab slug is rejected" || say f "bad slug accepted"
"$ART" shot spk --dir spk >/dev/null 2>&1
[ $? -ne 0 ] && say ok "a relative --dir is rejected" || say f "relative --dir accepted"
if [ "$CHROME_OK" = 1 ]; then
  "$ART" shot spk --dir "$WORK/spk" --size 320x300 --theme both >"$WORK/shot.out" 2>&1
  [ "$(grep -c '^/.*\.png$' "$WORK/shot.out")" -eq 6 ] && say ok "shot prints one absolute path per cell and theme" \
    || say f "shot did not print 6 PNG paths: $(head -3 "$WORK/shot.out")"
  for n in quiet-full quiet-empty dense-rows-default; do
    [ -s "$WORK/spk/$n.png" ] && [ -s "$WORK/spk/$n-dark.png" ] && say ok "$n has a light and a dark PNG" || say f "$n PNGs missing"
  done
  [ -e "$WORK/spk/.spk.measure.html" ] && say f "the measuring copy was left behind" || say ok "no measuring copy is left behind"
  pgrep -f "user-data-dir=/var/folders.*tmp" >/dev/null 2>&1 && say f "a Chrome process is still running" || say ok "no Chrome process is left running"
  "$ART" build --kind prototype --title P --fragment "$WORK/mock.html" --out "$WORK/spk/proto.html" >/dev/null 2>&1
  "$ART" shot proto --dir "$WORK/spk" --size 400x300 --query 'v=2' >"$WORK/shot2.out" 2>&1
  grep -q '/proto-v-2.png$' "$WORK/shot2.out" && [ -s "$WORK/spk/proto-v-2.png" ] \
    && say ok "a prototype shoots as one PNG named for its query" || say f "prototype shot failed: $(head -2 "$WORK/shot2.out")"
else
  say ok "Chrome absent — shot render checks skipped"
fi

echo "--- video ---"
cat > "$WORK/anim.html" <<'EOF'
<style>
.pop { display: inline-block; animation: pop 400ms linear both; }
@keyframes pop { from { opacity: 0; transform: scale(.5); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .pop { animation: none; } }
</style>
<template data-variant="Pop" data-state="Win"><div class="pop">You won</div></template>
EOF
mkdir -p "$WORK/flm"
"$ART" build --kind mockup --title F --fragment "$WORK/anim.html" --out "$WORK/flm/flm.html" >/dev/null 2>&1
"$ART" video flm --dir "$WORK/flm" --cell nope >/dev/null 2>&1
[ $? -ne 0 ] && say ok "video rejects an unknown --cell" || say f "video accepted an unknown --cell"
"$ART" video flm --dir "$WORK/flm" --fps 0 >/dev/null 2>&1
[ $? -ne 0 ] && say ok "video rejects --fps 0" || say f "video accepted --fps 0"
"$ART" video flm --dir flm >/dev/null 2>&1
[ $? -ne 0 ] && say ok "video rejects a relative --dir" || say f "video accepted a relative --dir"
if [ "$CHROME_OK" = 1 ] && command -v img2webp >/dev/null 2>&1 && command -v ffmpeg >/dev/null 2>&1; then
  "$ART" video flm --dir "$WORK/flm" --size 320x200 --fps 25 --theme both >"$WORK/video.out" 2>"$WORK/video.err"
  [ "$(grep -c '^/.*\.webp$' "$WORK/video.out")" -eq 2 ] && [ "$(grep -c '^/.*-strip\.png$' "$WORK/video.out")" -eq 2 ] \
    && say ok "video prints a WebP and a frame strip per cell and theme" || say f "video output: $(head -3 "$WORK/video.out")"
  has "$WORK/flm/pop-win.webp" ANIM && say ok "the WebP is animated" || say f "the WebP has no ANIM chunk"
  grep -q 'pop-win.webp — 11 frame(s), 400 ms' "$WORK/video.err" \
    && say ok "400 ms at 25 fps is 11 frames: the length comes from the animation" || say f "video frame count: $(head -2 "$WORK/video.err")"
  [ -s "$WORK/flm/pop-win-dark.webp" ] && [ -s "$WORK/flm/pop-win-dark-strip.png" ] \
    && say ok "the dark theme gets its own pair" || say f "dark video files missing"
  "$ART" video flm --dir "$WORK/flm" --size 320x200 --reduced >"$WORK/video2.out" 2>"$WORK/video2.err"
  grep -q 'pop-win-reduced.webp — 1 frame(s)' "$WORK/video2.err" && [ -s "$WORK/flm/pop-win-reduced-strip.png" ] \
    && say ok "--reduced records the resting state: one frame, not an error" || say f "reduced video: $(head -2 "$WORK/video2.err")"
else
  say ok "Chrome, img2webp or ffmpeg absent — video render checks skipped"
fi

echo "--- prototype ---"
cat > "$WORK/twk.html" <<'EOF'
<template data-variant="Quiet"><div class="frame"><button>Go</button></div></template>
<template data-variant="Loud"><div class="frame"><button>GO NOW</button></div></template>
<script>atTweaks.add('dark', false, { onChange: function () {} });</script>
EOF
"$ART" build --kind prototype --title P --subtitle "the question" --fragment "$WORK/twk.html" \
  --out "$WORK/p.html" >/dev/null 2>&1
has "$WORK/p.html" 'class="at-twk"' && say ok "the panel ships on a prototype" || say f "no .at-twk"
has "$WORK/p.html" 'class="at-twk-pill"' && say ok "the pill ships beside it" || say f "no .at-twk-pill"
sed -n '1,/<\/head>/p' "$WORK/p.html" | grep -q 'window.atTweaks=' \
  && say ok "the atTweaks stub is in <head>" || say f "the atTweaks stub is not ahead of the fragment"
has "$WORK/p.html" 'at-twk-variant"' && say ok "two variants get the segmented chooser" || say f "chooser is not segmented"
has "$WORK/p.html" 'at-twk-tabs' && say f "the tab strip is still built" || say ok "no tab strip"
has "$WORK/p.html" 'at-vp-' && say f "device frame code shipped" || say ok "no device frame code"
has "$WORK/p.html" 'id="at-stage"' && say ok "the stage is a div" || say f "no stage"
cat > "$WORK/many.html" <<'EOF'
<template data-variant="One"><p>a</p></template>
<template data-variant="Two"><p>b</p></template>
<template data-variant="Three"><p>c</p></template>
<template data-variant="Four"><p>d</p></template>
EOF
"$ART" build --kind prototype --title P --fragment "$WORK/many.html" --out "$WORK/many.out.html" >/dev/null 2>&1
has "$WORK/many.out.html" 'at-twk-variant-select' && say ok "four variants get the dropdown" || say f "four variants still segments"
"$ART" build --kind prototype --title P --fragment "$WORK/frag.html" --out "$WORK/dead.html" >/dev/null 2>&1
[ $? -ne 0 ] && say ok "a prototype with no templates is rejected" || say f "empty prototype built"

echo "--- the URL carries only tweaks the reader changed ---"
# A default written into the query string pins it: reopening that URL after the
# fragment's default moves serves the old value to someone who never touched a control.
TW="$TOOL/harness/tweaks.js"
grep -q 'defaults\[key\] = initial' "$TW" && say ok "register records each tweak's declared default" \
  || say f "register does not record defaults"
grep -q 'String(state\[k\]) === String(defaults\[k\])' "$TW" && say ok "writeUrl compares against the default" \
  || say f "writeUrl writes every key regardless of default"
grep -q 'url.searchParams.delete(k)' "$TW" && say ok "writeUrl drops an unchanged key" \
  || say f "writeUrl never deletes"
command -v node >/dev/null 2>&1 && { node --check "$TW" 2>/dev/null && say ok "tweaks.js parses" || say f "tweaks.js has a syntax error"; }

echo "--- tui scaffold ---"
# A terminal prototype is a Go program, not HTML, so it is a subcommand rather than a --kind.
TUI="$WORK/tui"
"$ART" tui --out "$TUI" --title "Smoke" >/dev/null 2>&1
for f in harness.go variants.go go.mod; do
  [ -f "$TUI/$f" ] && say ok "tui scaffolds $f" || say f "tui did not write $f"
done
echo "// mine" >> "$TUI/variants.go"
"$ART" tui --out "$TUI" --title "Smoke" >/dev/null 2>&1
grep -q '// mine' "$TUI/variants.go" && say ok "re-scaffold keeps variants.go" || say f "re-scaffold clobbered variants.go"
"$ART" tui --out "$TUI" --title "Smoke" --force >/dev/null 2>&1
grep -q '// mine' "$TUI/variants.go" && say f "--force did not reset variants.go" || say ok "--force resets variants.go"
mkdir -p "$WORK/mod/inner" && printf 'module host\n\ngo 1.22\n' > "$WORK/mod/go.mod"
"$ART" tui --out "$WORK/mod/inner" --title "Inner" >/dev/null 2>&1
[ -f "$WORK/mod/inner/go.mod" ] && say f "wrote a go.mod inside an existing module" || say ok "no go.mod inside an existing module"
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
  grep -q 'FAIL' "$WORK/tui.out" && say ok "dump fails a wrong-width row" || say f "dump passed a 3-col row in a 10-col frame"
else
  say ok "go absent — tui compile checks skipped"
fi

echo "--- what spike-export hands over ---"
if [ -x "$EXP" ]; then
  "$EXP" --fragment "$WORK/twk.html" --slug xp --title Xp --dest "$WORK/exp" >/dev/null 2>&1
  X="$WORK/exp/xp"
  has "$X/index.html" 'class="at-twk"' && say ok "export writes the prototype as index.html" || say f "no index.html prototype"
  [ -f "$X/bare.html" ] && say f "export still writes a second build" || say ok "export writes one build"
  [ -f "$X/RUN.bat" ] && say ok "export writes a Windows launcher" || say f "no RUN.bat"
  grep -q 'PORT:-8080' "$X/serve.command" && say f "serve.command defaults to 8080" || say ok "serve.command does not default to 8080"
  grep -q 'taken()' "$X/serve.command" && say ok "serve.command refuses a port already answering" || say f "serve.command skips the port check"
  grep -q 'cat index.html' "$X/serve.command" && say ok "the nc floor serves index.html" || say f "the nc floor serves a file that is not there"
  [ "$(grep -c $'\r' "$X/RUN.bat")" -gt 0 ] && say ok "RUN.bat is written with CRLF" || say f "RUN.bat has bare LF endings"
  [ "$(grep -c '#POWERSHELL#' "$X/RUN.bat")" -eq 1 ] && say ok "RUN.bat carries exactly one #POWERSHELL# marker" \
    || say f "RUN.bat marker is duplicated"
else
  say f "spike-export missing or not executable"
fi

echo "--- the skill names no hosted viewer ---"
SKILL="$(cd "$TOOL/.." && pwd)"
HOSTED="Can""vas"
grep -rIl "$HOSTED" "$SKILL" >/dev/null 2>&1 && say f "a spike file names the hosted viewer: $(grep -rIl "$HOSTED" "$SKILL" | head -1)" \
  || say ok "no file under spike/ names the hosted viewer"

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
