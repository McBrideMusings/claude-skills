#!/bin/bash
# Build every specimen. Output goes to /private/tmp/claude/<repo-slug>/specimens/ in whatever repo you run it
# from — the fragments are the tracked thing, the built HTML is not.
#
#   bash ~/.claude/skills/spike/specimens/build.sh [outdir]
#
# Then look at them. Playwright cannot open file:// (see docs/harness-frictions.md), so
# for a scripted check serve the directory first:
#   cd <outdir> && python3 -m http.server 8731
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"
S="$HOME/.claude/skills/spike/tool/spike"
OUT="${1:-/private/tmp/claude/dot-claude/specimens}"
mkdir -p "$OUT"

"$S" build --kind wireframe --title "Spike review surface" \
  --fragment "$HERE/spec-wireframe.body.html" --out "$OUT/wireframe.html"

"$S" build --kind prototype --picker switch \
  --title "Session list" --subtitle "herdr session picker" \
  --device phone \
  --fragment "$HERE/spec-prototype.body.html" --out "$OUT/prototype.html"

# A second, independent prototype demonstrating the desktop frame with window chrome.
"$S" build --kind prototype --picker switch \
  --title "Session list" --subtitle "herdr session picker, desktop" \
  --device desktop --window bar,lights \
  --fragment "$HERE/proto-r2.body.html" --out "$OUT/prototype-desktop.html"

# The unframed device: the same fragment as the phone build, with no frame at all. Kept as a
# specimen because `fill` is the one device where the harness draws nothing and the panel is
# the only chrome on screen.
"$S" build --kind prototype --picker switch \
  --title "Session list" --subtitle "herdr session picker, unframed" \
  --device fill \
  --fragment "$HERE/spec-prototype.body.html" --out "$OUT/prototype-fill.html"

# The check fixture: one of each detectable defect planted, plus a clean twin. This is
# how you tell a check that works from a check that always says pass.
"$S" build --kind prototype --picker switch \
  --title "Check harness" --subtitle "one of each defect, on purpose" \
  --device phone \
  --fragment "$HERE/spec-checks.body.html" --out "$OUT/checks.html"

echo
echo "specimens in $OUT"
