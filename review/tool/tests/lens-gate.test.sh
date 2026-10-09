#!/usr/bin/env bash
# Tests for skills/review/tool/lens-gate: four fixture diffs (docs-only, auth, a one-line colour
# fix, a new screen) each get the expected decision per lens, a failed or unsure Jev call
# offers instead of skipping, repo mode lifts the diff gates, and a malformed lens fails loudly.
# Jev and dsys are stubbed; nothing leaves the machine.
#
#   skills/review/tool/tests/lens-gate.test.sh
set -uo pipefail

TOOL="$(cd "$(dirname "$0")/.." && pwd)"
GATE="$TOOL/lens-gate"
[ -x "$GATE" ] || { echo "cannot find lens-gate at $GATE" >&2; exit 2; }

WORK=$(cd "$(mktemp -d)" && pwd -P)
STUB_PID=
cleanup() { [ -n "$STUB_PID" ] && kill "$STUB_PID" 2>/dev/null; rm -rf "$WORK"; }
trap cleanup EXIT

pass=0; fail=0
say() {
  if [ "$1" = ok ]; then pass=$((pass+1)); printf 'ok    %s\n' "$2"
  else fail=$((fail+1)); printf 'FAIL  %s\n' "$2"; fi
}

# --- stubs: HOME (domains-map, no .env), dsys on PATH, Jev on a local port ---
export HOME="$WORK/home"
mkdir -p "$HOME/.claude" "$WORK/bin"
export TYPESAFE_API_KEY=stub
export LENS_GATE_LOG="$WORK/lens-gate.log"
cat > "$WORK/bin/dsys" <<'EOF'
#!/usr/bin/env bash
cat "$DSYS_STATUS"
EOF
chmod +x "$WORK/bin/dsys"
export PATH="$WORK/bin:$PATH"
export DSYS_STATUS="$WORK/dsys.json"
owned() { printf '{"mode":"owned","designMd":true}\n' > "$DSYS_STATUS"; }
not_owned() { printf '{"mode":"non-owned","designMd":false}\n' > "$DSYS_STATUS"; }

RULES="$WORK/jev.json"
SEC='security-relevant surface'
BP='new pattern or abstraction'
jev_normal() {
  cat > "$RULES" <<EOF
{"rules": [["$SEC", "auth/session.ts", 0.95, 0.9],
           ["$BP", "screens/Lobby.tsx", 0.9, 0.9]],
 "default": [0.05, 0.9]}
EOF
}
jev_fail() { printf '{"fail": true}\n' > "$RULES"; }
jev_unsure() { printf '{"default": [0.4, 0.2]}\n' > "$RULES"; }
jev_normal
python3 "$TOOL/tests/jev-stub.py" "$RULES" "$WORK/port" &
STUB_PID=$!
for _ in 1 2 3 4 5 6 7 8 9 10; do [ -s "$WORK/port" ] && break; sleep 0.2; done
[ -s "$WORK/port" ] || { echo "jev stub did not start" >&2; exit 2; }
export LENS_GATE_JEV_URL="http://127.0.0.1:$(cat "$WORK/port")/"

# --- fixture repo: one base commit, one branch per fixture diff ---
R="$WORK/repo"
g() { git -C "$R" "$@" >/dev/null 2>&1; }
mkdir -p "$R/src/auth" "$R/docs"
git init -q -b main "$R"
g config user.email t@t; g config user.name t
printf '# App\n' > "$R/README.md"
printf 'export const ok = (t) => t.length > 0;\n' > "$R/src/auth/session.ts"
printf ':root { --muted: #888; }\n' > "$R/src/theme.css"
g add -A; g commit -m base
branch() { g checkout -q main; g checkout -q -b "$1"; }

branch docs
printf '# App\n\nHow to run it.\n' > "$R/README.md"
printf '# Guide\n' > "$R/docs/guide.md"
g add -A; g commit -m 'docs: explain how to run the app'

branch auth
printf 'export const ok = (t) => t === process.env.TOKEN;\n' > "$R/src/auth/session.ts"
g add -A; g commit -m 'fix(auth): compare the session token'

branch colour
printf ':root { --muted: #666; }\n' > "$R/src/theme.css"
g add -A; g commit -m 'fix(theme): darken the muted text colour'

branch screen
mkdir -p "$R/src/screens"
printf 'export function Lobby() { return <main className="lobby">Lobby</main>; }\n' > "$R/src/screens/Lobby.tsx"
printf '.lobby { display: grid; }\n' > "$R/src/screens/lobby.css"
g add -A; g commit -m 'feat(lobby): add the lobby screen'

cat > "$HOME/.claude/domains-map" <<EOF
$R:
  src/screens/**: react
  **: web
EOF

# decision <json-file> <lens> -> prints run|skip|offer
decision() { jq -r --arg l "$2" '.[] | select(.lens == $l) | .decision' "$1"; }
expect() { # expect <fixture> <json> <lens> <want>
  local got; got=$(decision "$2" "$3")
  [ "$got" = "$4" ] && say ok "$1: $3 -> $4" || say f "$1: $3 -> $4 (got '${got:-missing}')"
}
gate() { # gate <out> <args...>
  local out=$1; shift
  ( cd "$R" && "$GATE" --json "$@" ) > "$out" 2> "$out.err"
}
ALWAYS="architecture bug contracts history negative-space slop spec standards"
REPO_ONLY="test-debt dependency-debt docs-drift"

for fx in docs auth colour screen; do
  echo "--- fixture: $fx ---"
  g checkout -q "$fx"
  owned; jev_normal
  gate "$WORK/$fx.json" --base main || { say f "$fx: lens-gate exited non-zero: $(cat "$WORK/$fx.json.err")"; continue; }
  for l in $ALWAYS; do expect "$fx" "$WORK/$fx.json" "$l" run; done
  for l in $REPO_ONLY; do expect "$fx" "$WORK/$fx.json" "$l" skip; done
  expect "$fx" "$WORK/$fx.json" web run
  for l in api apple audio game go gui python rust threejs tui; do expect "$fx" "$WORK/$fx.json" "$l" skip; done
  case $fx in
    docs)   sec=skip bp=skip design=skip react=skip ;;
    auth)   sec=run  bp=skip design=skip react=skip ;;
    colour) sec=skip bp=skip design=run  react=skip ;;
    screen) sec=skip bp=run  design=run  react=run  ;;
  esac
  expect "$fx" "$WORK/$fx.json" security "$sec"
  expect "$fx" "$WORK/$fx.json" best-practice "$bp"
  expect "$fx" "$WORK/$fx.json" design "$design"
  expect "$fx" "$WORK/$fx.json" react "$react"
done

echo "--- records carry the evidence ---"
jq -e '.[] | select(.lens == "security") | .jev.p == 0.95 and .jev.confidence == 0.9' "$WORK/auth.json" >/dev/null \
  && say ok "a fired judgment gate records Jev's probability and confidence" \
  || say f "security record lacks jev p/confidence: $(jq -c '.[] | select(.lens == "security")' "$WORK/auth.json")"
jq -e '.[] | select(.lens == "design") | .reason | test("dsys")' "$WORK/colour.json" >/dev/null \
  && say ok "a run record names why it ran" || say f "design reason does not name dsys"
jq -e 'all(.[]; has("lens") and has("decision") and has("reason"))' "$WORK/docs.json" >/dev/null \
  && say ok "every record has lens, decision and reason" || say f "a record lacks lens/decision/reason"
grep -q 'lens=security decision=run' "$LENS_GATE_LOG" \
  && say ok "every decision is logged with its reason" || say f "log at $LENS_GATE_LOG lacks the security run"
grep -q '"state": "diff stat:' "$RULES.log" \
  && say ok "the Jev state opens with the diff stat" || say f "Jev state does not carry the diff stat"

echo "--- design gates as today: owned repo with DESIGN.md only ---"
g checkout -q colour; not_owned; jev_normal
gate "$WORK/colour-no.json" --base main
expect colour-non-owned "$WORK/colour-no.json" design skip

echo "--- a Jev failure offers, never skips ---"
g checkout -q docs; owned; jev_fail
gate "$WORK/fail.json" --base main
expect jev-fail "$WORK/fail.json" security offer
expect jev-fail "$WORK/fail.json" best-practice offer
jq -e '.[] | select(.lens == "security") | .reason == "Jev call failed"' "$WORK/fail.json" >/dev/null \
  && say ok "the offer names the failed call" || say f "security reason does not name the failed call"
LENS_GATE_JEV_URL=http://127.0.0.1:9/ gate "$WORK/down.json" --base main
expect jev-unreachable "$WORK/down.json" security offer
unset_key() { ( unset TYPESAFE_API_KEY; cd "$R" && "$GATE" --json --base main ) > "$WORK/nokey.json" 2>/dev/null; }
unset_key
expect jev-no-key "$WORK/nokey.json" security offer

echo "--- Jev below its confidence floor offers ---"
jev_unsure
gate "$WORK/unsure.json" --base main
expect jev-unsure "$WORK/unsure.json" security offer

echo "--- a lens that fails a deterministic entry never costs a Jev call ---"
g checkout -q docs; owned; jev_normal; : > "$RULES.log"
gate "$WORK/calls.json" --base main
n=$(wc -l < "$RULES.log" | tr -d ' ')
[ "$n" = 2 ] && say ok "two Jev calls for two judgment gates" || say f "expected 2 Jev calls, saw $n"

echo "--- uncommitted: an untracked new file reaches the Jev state ---"
g checkout -q main; owned; jev_normal
mkdir -p "$R/src/auth"
printf 'export const login = (u, p) => db.query(u, p);\n' > "$R/src/auth/session.ts.new"
mv "$R/src/auth/session.ts.new" "$R/src/auth/login.ts"
cat > "$RULES" <<EOF
{"rules": [["$SEC", "auth/login.ts", 0.95, 0.9]], "default": [0.05, 0.9]}
EOF
gate "$WORK/untracked.json" --uncommitted
expect untracked "$WORK/untracked.json" security run
rm -f "$R/src/auth/login.ts"

echo "--- a Jev no on a truncated diff offers ---"
g checkout -q -b big main
awk 'BEGIN { for (i = 0; i < 3000; i++) printf "export const v%d = %d;\n", i, i }' > "$R/src/big.ts"
g add -A; g commit -m 'feat: a large generated module'
jev_normal
gate "$WORK/big.json" --base main
expect truncated "$WORK/big.json" security offer
jq -e '.[] | select(.lens == "security") | .reason | test("cut at")' "$WORK/big.json" >/dev/null \
  && say ok "the offer names the truncation" || say f "truncated offer reason does not name the cut"

echo "--- dsys that cannot answer skips design and says why ---"
g checkout -q colour; rm -f "$DSYS_STATUS"
gate "$WORK/nodsys.json" --base main
expect dsys-down "$WORK/nodsys.json" design skip
jq -e '.[] | select(.lens == "design") | .reason == "dsys status exited 1"' "$WORK/nodsys.json" >/dev/null \
  && say ok "the skip names the dsys failure" || say f "design reason: $(jq -r '.[] | select(.lens == "design") | .reason' "$WORK/nodsys.json")"

echo "--- repo mode lifts the diff gates ---"
g checkout -q main; not_owned; jev_fail
gate "$WORK/repo.json" --repo-mode
for l in security best-practice $REPO_ONLY $ALWAYS web; do expect repo-mode "$WORK/repo.json" "$l" run; done
expect repo-mode "$WORK/repo.json" design skip
expect repo-mode "$WORK/repo.json" react run

echo "--- explicit labels override the map ---"
g checkout -q docs; jev_normal
gate "$WORK/labels.json" --base main --labels go
expect labels "$WORK/labels.json" go run
expect labels "$WORK/labels.json" web skip

echo "--- offered lenses and malformed frontmatter (copied skills tree) ---"
T="$WORK/skills"
mkdir -p "$T/review/tool" "$T/review/axes"
cp "$GATE" "$T/review/tool/"
cat > "$T/review/axes/critique.md" <<'EOF'
---
run: offered
when:
  - paths: ["**/*.tsx"]
---
# A lens offered when a component changes
EOF
( cd "$R" && git checkout -q screen && "$T/review/tool/lens-gate" --json --base main ) > "$WORK/offered.json" 2>/dev/null
expect offered-screen "$WORK/offered.json" critique offer
( cd "$R" && git checkout -q docs && "$T/review/tool/lens-gate" --json --base main ) > "$WORK/offered2.json" 2>/dev/null
expect offered-docs "$WORK/offered2.json" critique skip

echo "--- a path glob's * stays inside one directory; **/ also matches the root ---"
printf -- '---\nrun: gated\nwhen:\n  - paths: ["src/*.css"]\n---\n' > "$T/review/axes/flatcss.md"
printf -- '---\nrun: gated\nwhen:\n  - paths: ["**/README.md"]\n---\n' > "$T/review/axes/readme.md"
printf -- '---\nrun: gated\nwhen:\n  - paths: ["src/**/*.css"]\n---\n' > "$T/review/axes/deepcss.md"
for fx in screen colour docs; do
  ( cd "$R" && git checkout -q "$fx" && "$T/review/tool/lens-gate" --json --base main ) > "$WORK/glob-$fx.json" 2>/dev/null
done
expect "src/*.css vs src/screens/lobby.css" "$WORK/glob-screen.json" flatcss skip
expect "src/*.css vs src/theme.css" "$WORK/glob-colour.json" flatcss run
expect "src/**/*.css vs src/screens/lobby.css" "$WORK/glob-screen.json" deepcss run
expect "src/**/*.css vs src/theme.css" "$WORK/glob-colour.json" deepcss run
expect "**/README.md vs README.md" "$WORK/glob-docs.json" readme run
expect "**/README.md vs no README" "$WORK/glob-screen.json" readme skip
rm -f "$T/review/axes/flatcss.md" "$T/review/axes/readme.md" "$T/review/axes/deepcss.md"
printf '# no frontmatter\n' > "$T/review/axes/bare.md"
( cd "$R" && "$T/review/tool/lens-gate" --json --base main ) > /dev/null 2> "$WORK/bare.err"
rc=$?
[ "$rc" = 2 ] && grep -q 'bare.md: no frontmatter' "$WORK/bare.err" \
  && say ok "a lens with no frontmatter exits 2 and names the file" || say f "bare lens: rc=$rc $(cat "$WORK/bare.err")"
printf -- '---\nrun: always\nwhen:\n  - repo-mode: true\n---\n' > "$T/review/axes/bare.md"
( cd "$R" && "$T/review/tool/lens-gate" --json --base main ) > /dev/null 2> "$WORK/bare.err"
grep -q 'run: always takes no when' "$WORK/bare.err" \
  && say ok "run: always with a when: list is rejected" || say f "always+when accepted: $(cat "$WORK/bare.err")"

echo "--- every lens in this skills tree parses ---"
"$GATE" --repo "$R" --base main --json > /dev/null 2> "$WORK/all.err" \
  && say ok "every shipped lens has valid frontmatter" || say f "shipped lens frontmatter: $(cat "$WORK/all.err")"

echo
echo "pass=$pass fail=$fail"
[ "$fail" -eq 0 ]
