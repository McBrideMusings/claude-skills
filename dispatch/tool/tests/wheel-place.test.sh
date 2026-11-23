#!/usr/bin/env bash
# wheel-agent place: a worker goes to its project's Wheel space, found by the project's main checkout.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd -P)"
A="$here/../../wheel-agent"
T="$(cd "$(mktemp -d)" && pwd -P)"
mkdir -p "$T/bin" "$T/home/.claude/tools"
# `wheel status` prints $T/status.json; wheel-space prints $T/caller.
printf '#!/bin/bash\n[ "$1" = status ] && cat %q/status.json\n' "$T" > "$T/bin/wheel"
printf '#!/bin/bash\ncat %q/caller\n' "$T" > "$T/home/.claude/tools/wheel-space"
chmod +x "$T/bin/wheel" "$T/home/.claude/tools/wheel-space"
fail=0
ok()  { echo "ok    $1"; }
bad() { echo "FAIL  $1"; fail=1; }
g() { git -c user.email=t@t -c user.name=t "$@" >/dev/null 2>&1; }

# app: a repo with a linked worktree; parent/sub: a submodule checked out inside a parent repo.
g init "$T/app"; g -C "$T/app" commit --allow-empty -m init
g -C "$T/app" worktree add -b w "$T/wt"
g init "$T/parent"; g init "$T/subsrc"; g -C "$T/subsrc" commit --allow-empty -m init
g -C "$T/parent" -c protocol.file.allow=always submodule add "$T/subsrc" sub
g -C "$T/parent/sub" worktree add -b w2 "$T/subwt"

place() { (cd "$1" && PATH="$T/bin:$PATH" HOME="$T/home" WHEEL_ENV=1 WHEEL_PANE=p1 \
  env -u WHEEL_AGENT_SPACE -u WHEEL_AGENT_WORKDIR "$A" place 2>&1); }
spaces() { printf '{"spaces":[%s]}' "$1" > "$T/status.json"; }

spaces "{\"id\":\"s1\",\"name\":\"app\",\"cwd\":\"$T/app\"}"; echo s1 > "$T/caller"
[ "$(place "$T/wt")" = caller ] && ok "caller's space is the project's: pane split off the caller" || bad "caller case: $(place "$T/wt")"

echo s9 > "$T/caller"
[ "$(place "$T/wt")" = "space app ($T/app)" ] && ok "a worktree goes to the space of its main checkout" || bad "match: $(place "$T/wt")"

spaces "{\"id\":\"s2\",\"name\":\"other\",\"cwd\":\"/elsewhere\"}"
[ "$(place "$T/wt")" = "space app ($T/app)" ] && ok "no space for the project: a new one named for it" || bad "none: $(place "$T/wt")"

spaces "{\"id\":\"s2\",\"name\":\"app\",\"cwd\":\"/elsewhere\"}"
out="$(place "$T/wt")"
[ "$out" = "space $(basename "$T")-app ($T/app)" ] && ok "a taken name gets the parent folder's prefix" || bad "name clash: $out"

spaces "{\"id\":\"s3\",\"name\":\"a\",\"cwd\":\"$T/app\"},{\"id\":\"s4\",\"name\":\"b\",\"cwd\":\"$T/app\"}"
rc=0; out="$(place "$T/wt")" || rc=$?
[ "$rc" = 5 ] && printf '%s' "$out" | grep -q "a (s3), b (s4)" && ok "two spaces share the cwd: exit 5 naming both" || bad "two: rc=$rc $out"

spaces "{\"id\":\"s5\",\"name\":\"sub\",\"cwd\":\"$T/parent/sub\"}"
[ "$(place "$T/subwt")" = "space sub ($T/parent/sub)" ] && ok "a submodule's worktree goes to the submodule checkout's space" || bad "submodule: $(place "$T/subwt")"

# run in the caller's own space: a --handoff worker splits into the grid, a report-back one backgrounded.
# `pane start` fails on purpose so run stops right after the split, which the stub logs.
printf '#!/bin/bash\ncase "$1 $2" in\n  "status "*) cat %q/status.json ;;\n  "pane ls") echo "[]" ;;\n  "pane split") echo "$*" >> %q/split.log; echo p9 ;;\n  *) exit 1 ;;\nesac\n' "$T" "$T" > "$T/bin/wheel"
spaces "{\"id\":\"wheel-place-test-$$\",\"name\":\"app\",\"cwd\":\"$T/app\"}"; echo "wheel-place-test-$$" > "$T/caller"
echo brief > "$T/brief.md"
split() { : > "$T/split.log"; (cd "$T/wt" && PATH="$T/bin:$PATH" HOME="$T/home" WHEEL_ENV=1 WHEEL_PANE=p1 \
  env -u WHEEL_AGENT_SPACE -u WHEEL_AGENT_WORKDIR "$A" run "$@" >/dev/null 2>&1) || true; cat "$T/split.log"; }
[ "$(split --handoff "$T/brief.md")" = "pane split p1 right" ] && ok "a hand-off worker in the caller's space joins the grid" || bad "handoff split: $(split --handoff "$T/brief.md")"
[ "$(split "$T/brief.md" "$T/out")" = "pane split p1 --background" ] && ok "a report-back worker in the caller's space runs backgrounded" || bad "report-back split: $(split "$T/brief.md" "$T/out")"
rm -f "/private/tmp/claude/wheel-agent/wheel-place-test-$$.panes" "/private/tmp/claude/wheel-agent/wheel-place-test-$$.panes.lock"

rm -rf "$T"
exit "$fail"
