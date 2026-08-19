#!/bin/bash
# Build every specimen. Output goes to tmp/claude/specimens/ in whatever repo you run it
# from — the fragments are the tracked thing, the built HTML is not.
#
#   bash ~/.claude/skills/_artifacts/specimens/build.sh [outdir]
#
# Then look at them. Playwright cannot open file:// (see docs/harness-frictions.md), so
# for a scripted check serve the directory first:
#   cd <outdir> && python3 -m http.server 8731
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"
A="$HOME/.claude/tools/artifact"
OUT="${1:-$HOME/.claude/tmp/claude/specimens}"
mkdir -p "$OUT"

"$A" build --kind explainer --title "How the artifact tool assembles a hermetic file" \
  --fragment "$HERE/spec-explainer.body.html" --out "$OUT/explainer.html"

"$A" build --kind page --title "Artifact store maintenance cost" \
  --fragment "$HERE/spec-page.body.html" --out "$OUT/page.html"

"$A" build --kind deck --title "The artifact store in four slides" \
  --fragment "$HERE/spec-deck.body.html" --out "$OUT/deck.html"

"$A" build --kind wireframe --title "Artifact review surface" \
  --fragment "$HERE/spec-wireframe.body.html" --out "$OUT/wireframe.html"

# The prototype specimen is two rounds, so it is built twice into the same file — which
# is also the only place the round-carry-forward path gets exercised.
"$A" build --kind prototype --picker switch --round 1 \
  --title "Session list" --subtitle "herdr session picker" \
  --devices fit,phone,tablet,desktop,web \
  --fragment "$HERE/spec-prototype.body.html" --out "$OUT/prototype.html"

"$A" build --kind prototype --picker switch --round 2 \
  --title "Session list" --subtitle "herdr session picker" \
  --devices fit,phone,tablet,desktop,web \
  --fragment "$HERE/proto-r2.body.html" --out "$OUT/prototype.html"

echo
echo "specimens in $OUT"
