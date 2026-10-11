#!/usr/bin/env bash
# retro's Python suites, where ~/.claude's `admin test` finds them (skills/*/tool/tests/*.test.sh).
# The suites stay beside the scripts they test; this only runs them.
set -euo pipefail
retro=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)
cd "$retro"
python3 -m unittest -q test_contract test_pointer_rate
