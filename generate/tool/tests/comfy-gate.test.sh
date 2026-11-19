#!/usr/bin/env bash
# Tests for skills/generate/comfy-gate against a stub HTTP server: the held-GPU verdict, the
# plain-ComfyUI fallback, and that a broker URL is judged from /api/tenants and /running alone,
# never by a request that would make llama-broker start the container.
#
#   skills/generate/tool/tests/comfy-gate.test.sh
set -uo pipefail

GATE="$(cd "$(dirname "$0")/../.." && pwd)/comfy-gate"
[ -x "$GATE" ] || { echo "cannot find comfy-gate at $GATE" >&2; exit 2; }

WORK=$(mktemp -d)
STUB_PID=""
trap '[ -n "$STUB_PID" ] && kill "$STUB_PID" 2>/dev/null; rm -rf "$WORK"' EXIT

pass=0; fail=0
say() {
  if [ "$1" = ok ]; then pass=$((pass+1)); printf 'ok    %s\n' "$2"
  else fail=$((fail+1)); printf 'FAIL  %s\n' "$2"; fi
}

# Serves $WORK/fx/<path with / as _>.json, 404 otherwise; logs every path to $WORK/requests.
cat > "$WORK/stub.py" <<'EOF'
import http.server, os, sys
root = sys.argv[1]
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        with open(os.path.join(root, "requests"), "a") as f:
            f.write(self.path + "\n")
        p = os.path.join(root, "fx", self.path.strip("/").replace("/", "_") + ".json")
        body = open(p, "rb").read() if os.path.exists(p) else None
        self.send_response(200 if body is not None else 404)
        self.end_headers()
        self.wfile.write(body or b"")
    def log_message(self, *a):
        pass
s = http.server.HTTPServer(("127.0.0.1", 0), H)
open(os.path.join(root, "port"), "w").write(str(s.server_port))
s.serve_forever()
EOF
mkdir -p "$WORK/fx"
python3 "$WORK/stub.py" "$WORK" &
STUB_PID=$!
for _ in 1 2 3 4 5 6 7 8 9 10; do [ -s "$WORK/port" ] && break; sleep 0.2; done
PORT=$(cat "$WORK/port")
BASE="http://127.0.0.1:$PORT"

fixture() { printf '%s' "$2" > "$WORK/fx/$1.json"; }
reset() { rm -f "$WORK/fx/"*.json "$WORK/requests"; }
run() { OUT=$("$GATE" "$1" 2>&1); CODE=$?; }
tenants() { fixture api_tenants "{\"tenants\":[$1]}"; }
COMFY='{"name":"comfy","priority":10,"models":["comfyui_auto"],"wantsGPU":false}'
CHAT='{"name":"chat","priority":1,"models":["qwen"],"wantsGPU":false}'
RUNNING_NONE='{"running":[{"model":"qwen"}]}'
CUDA='{"devices":[{"name":"cuda:0 NVIDIA GeForce RTX 3090","type":"cuda"}]}'

echo "--- broker URL ---"
reset; tenants "$COMFY,$CHAT"; fixture running "$RUNNING_NONE"
run "$BASE/comfyui"
[ $CODE -eq 0 ] && grep -q "comfyui_auto stopped" <<<"$OUT" && say ok "stopped comfy passes and names the cold start" || say f "stopped comfy: $CODE $OUT"
grep -Evq '^/(api/tenants|running)$' "$WORK/requests" && say f "stopped comfy sent $(tr '\n' ' ' < "$WORK/requests")" || say ok "stopped comfy: only /api/tenants and /running requested"

reset; tenants "$COMFY"; fixture running '{"running":[{"model":"comfyui_auto"}]}'
run "$BASE/comfyui/"
[ $CODE -eq 0 ] && grep -q "comfyui_auto loaded" <<<"$OUT" && say ok "loaded comfy passes" || say f "loaded comfy: $CODE $OUT"

reset; tenants "{\"name\":\"wow\",\"priority\":100,\"models\":[\"gemma\"],\"wantsGPU\":true},$COMFY"; fixture running "$RUNNING_NONE"
run "$BASE/comfyui"
[ $CODE -eq 2 ] && grep -q "GPU held by wow (priority 100 > comfy 10)" <<<"$OUT" && say ok "higher tenant wanting the GPU fails the gate, named" || say f "held: $CODE $OUT"

reset; tenants "{\"name\":\"wow\",\"priority\":100,\"models\":[\"gemma\"],\"wantsGPU\":false},$COMFY"; fixture running "$RUNNING_NONE"
run "$BASE/comfyui"
[ $CODE -eq 0 ] && say ok "higher tenant not wanting the GPU passes" || say f "idle higher tenant: $CODE $OUT"

for t in '{"name":"low","priority":1,"models":["x"],"wantsGPU":true}' '{"name":"peer","priority":10,"models":["x"],"wantsGPU":true}'; do
  reset; tenants "$t,$COMFY"; fixture running "$RUNNING_NONE"
  run "$BASE/comfyui"
  [ $CODE -eq 0 ] && say ok "lower or equal tenant wanting the GPU passes ($t)" || say f "lower/equal: $CODE $OUT"
done

reset; tenants '{"name":"comfy-audio","priority":10,"models":["comfyui-audio"],"wantsGPU":false}'; fixture running "$RUNNING_NONE"
run "$BASE/upstream/comfyui-audio"
[ $CODE -eq 0 ] && grep -q "comfyui-audio stopped" <<<"$OUT" && say ok "/upstream/<id> gates that model" || say f "upstream: $CODE $OUT"

reset; tenants "$COMFY"
run "$BASE/comfyui"
[ $CODE -eq 0 ] && grep -q "/running failed" <<<"$OUT" && say ok "/running failing after /api/tenants still passes, said so" || say f "running fails: $CODE $OUT"

echo "--- broker cannot say: plain fallback ---"
reset; tenants "$CHAT"; fixture comfyui_system_stats "$CUDA"
run "$BASE/comfyui"
[ $CODE -eq 0 ] && grep -q "has no tenant for comfyui_auto" <<<"$OUT" && say ok "no comfy tenant falls back to the plain check" || say f "no tenant: $CODE $OUT"

reset; fixture api_tenants 'not json'; fixture comfyui_system_stats "$CUDA"
run "$BASE/comfyui"
[ $CODE -eq 0 ] && grep -q "did not answer /api/tenants" <<<"$OUT" && say ok "malformed /api/tenants falls back to the plain check" || say f "malformed: $CODE $OUT"

echo "--- plain ComfyUI ---"
reset; fixture system_stats "$CUDA"
run "$BASE"
[ $CODE -eq 0 ] && grep -q "RTX 3090" <<<"$OUT" && say ok "plain ComfyUI with a GPU passes" || say f "plain: $CODE $OUT"
grep -q '^/api/tenants$' "$WORK/requests" && say f "plain URL asked the broker" || say ok "plain URL never asks the broker"

reset; fixture system_stats '{"devices":[{"name":"cpu","type":"cpu"}]}'
run "$BASE"
[ $CODE -eq 2 ] && grep -q "reports no GPU" <<<"$OUT" && say ok "plain ComfyUI without a GPU is dormant" || say f "cpu: $CODE $OUT"

reset
run "$BASE"
[ $CODE -eq 2 ] && grep -q "comfy: dormant" <<<"$OUT" && say ok "nothing answering is dormant" || say f "404: $CODE $OUT"

OUT=$(COMFYUI_URL= "$GATE" 2>&1); CODE=$?
[ $CODE -eq 2 ] && grep -q "COMFYUI_URL is not set" <<<"$OUT" && say ok "unset COMFYUI_URL is dormant" || say f "unset: $CODE $OUT"

echo
echo "pass=$pass fail=$fail"
[ "$fail" -eq 0 ]
