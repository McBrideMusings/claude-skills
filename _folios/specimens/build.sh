#!/bin/bash
# Build every specimen. Output goes to tmp/claude/specimens/ in whatever repo you run it
# from — the fragments are the tracked thing, the built HTML is not.
#
#   bash ~/.claude/skills/_folios/specimens/build.sh [outdir]
#
# Then look at them. Playwright cannot open file:// (see docs/harness-frictions.md), so
# for a scripted check serve the directory first:
#   cd <outdir> && python3 -m http.server 8731
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"
A="$HOME/.claude/tools/folio"
OUT="${1:-$HOME/.claude/tmp/claude/specimens}"
mkdir -p "$OUT"

"$A" build --kind explainer --title "How the folio tool assembles a hermetic file" \
  --fragment "$HERE/spec-explainer.body.html" --out "$OUT/explainer.html"

"$A" build --kind page --title "Folio store maintenance cost" \
  --fragment "$HERE/spec-page.body.html" --out "$OUT/page.html"

"$A" build --kind deck --title "The folio store in four slides" \
  --fragment "$HERE/spec-deck.body.html" --out "$OUT/deck.html"

"$A" build --kind wireframe --title "Folio review surface" \
  --fragment "$HERE/spec-wireframe.body.html" --out "$OUT/wireframe.html"

# The prototype specimen is two rounds, so it is built twice into the same file — which
# is also the only place the round-carry-forward path gets exercised.
"$A" build --kind prototype --picker switch --round 1 \
  --title "Session list" --subtitle "herdr session picker" \
  --devices fit,phone,tablet,desktop,web \
  --fragment "$HERE/spec-prototype.body.html" --out "$OUT/prototype.html"

"$A" build --kind prototype --picker switch --round 2 \
  --title "Session list" --subtitle "herdr session picker" \
  --devices fit,phone,tablet,desktop,web --window bar,lights \
  --fragment "$HERE/proto-r2.body.html" --out "$OUT/prototype.html"

# Eight rounds, so the stepper is exercised at the size it actually reaches: a two-round
# file cannot tell a clamped stepper from a wrapping one, which is how a wrapping one
# shipped. Each round also carries its own axes, which is the round-scoping path.
NAMES=(Cards Rows Table Grouped Timeline Split Compact Board)
for i in 1 2 3 4 5 6 7 8; do
  n="${NAMES[$((i-1))]}"
  sed -e "s/__ROUND__/$i/g" -e "s/__NAME__/$n/g" "$HERE/spec-round.tmpl.html" > "$OUT/.round-$i.html"
  "$A" build --kind prototype --picker switch --round "$i" \
    --title "Session list" --subtitle "eight rounds, to size up the round control" \
    --devices fit,phone,desktop \
    --fragment "$OUT/.round-$i.html" --out "$OUT/many-rounds.html" >/dev/null
  rm -f "$OUT/.round-$i.html"
done
echo "$OUT/many-rounds.html  (kind=prototype, rounds=v1..v8)"

# The check fixture: one of each detectable defect planted, plus a clean twin. This is
# how you tell a check that works from a check that always says pass.
"$A" build --kind prototype --picker switch \
  --title "Check harness" --subtitle "one of each defect, on purpose" \
  --devices fit,phone \
  --fragment "$HERE/spec-checks.body.html" --out "$OUT/checks.html"

echo
echo "specimens in $OUT"
