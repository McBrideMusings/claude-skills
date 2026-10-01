#!/bin/bash
# Build every specimen. Output goes to /private/tmp/claude/<repo-slug>/specimens/ in whatever repo you run it
# from — the fragments are the tracked thing, the built HTML is not.
#
#   bash ~/.claude/skills/spike/specimens/build.sh [outdir]
#
# Then look at them: `spike shot` screenshots the mockup's cells, and the other two open
# in a browser.
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"
S="$HOME/.claude/skills/spike/tool/spike"
OUT="${1:-/private/tmp/claude/dot-claude/specimens}"
mkdir -p "$OUT"

"$S" build --kind wireframe --title "Spike review surface" \
  --fragment "$HERE/spec-wireframe.body.html" --out "$OUT/wireframe.html"

# Two variants x two states: four cells for `spike shot`.
"$S" build --kind mockup --title "Session list" \
  --fragment "$HERE/spec-mockup.body.html" --out "$OUT/mockup/mockup.html"

"$S" build --kind prototype \
  --title "Session list" --subtitle "herdr session picker" \
  --fragment "$HERE/spec-prototype.body.html" --out "$OUT/prototype.html"

echo
echo "specimens in $OUT"
echo "  $S shot mockup --dir $OUT/mockup"
