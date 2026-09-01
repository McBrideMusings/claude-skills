#!/usr/bin/env bash
# Generate a per-pass copy of implement.js whose `meta` literal already names
# the item it is working.
#
# WHY THIS EXISTS. Every /implement pass calls Workflow with the same
# scriptPath, so every row in the workflow list renders from the same
# meta.name / meta.description literal — two concurrent passes are
# indistinguishable. `meta` must stay a pure literal (no interpolation, no
# `args`), and the Workflow tool's own title/description inputs are ignored
# at call time, so the only lever left is a copy of the file with the
# literal already rewritten.
#
# Usage: name-pass.sh <item-id> <item-title> [out-dir]
#
# Prints the absolute path of the generated file on stdout, nothing else.
# Every diagnostic goes to stderr.
set -euo pipefail

item_id="${1:-}"
item_title="${2:-}"
out_dir="${3:-}"

if [ -z "$item_id" ] || [ -z "$item_title" ]; then
  printf 'usage: name-pass.sh <item-id> <item-title> [out-dir]\n' >&2
  exit 2
fi

script_dir=$(cd "$(dirname "$0")" && pwd -P)
src="$script_dir/implement.js"
[ -f "$src" ] || { printf 'name-pass.sh: no such file: %s\n' "$src" >&2; exit 1; }

if [ -z "$out_dir" ]; then
  repo_root=$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null || true)
  [ -n "$repo_root" ] || repo_root="$script_dir"
  out_dir=$("$HOME/.claude/tools/repo-slug" --path "$repo_root")
fi
mkdir -p "$out_dir"

# Sanitize the title for a JS single-quoted string: collapse CR/LF/tab to a
# single space, escape backslashes before quotes (escaping the other order
# would double-escape the backslashes it just inserted), truncate to 80
# characters. The raw title is passed through the environment rather than
# `awk -v`, because `-v` re-processes backslash escapes in its argument and
# would corrupt an already-escaped title.
sanitized_title=$(TITLE="$item_title" awk '
  BEGIN {
    t = ENVIRON["TITLE"]
    gsub(/[\r\n\t]/, " ", t)
    gsub(/\\/, "\\\\", t)
    gsub(/\x27/, "\\\x27", t)
    if (length(t) > 80) t = substr(t, 1, 80)
    print t
  }
')

# The meta literal is the file's first 16 lines (name: line 2, description:
# line 3, closing `}` line 15). If it ever grows past that, these guards
# fail loudly rather than silently rewriting the wrong line — keep this
# window in sync with implement.js if that literal grows.
name_hits=$(head -16 "$src" | grep -c '^ *name:' || true)
desc_hits=$(head -16 "$src" | grep -c '^ *description:' || true)
if [ "$name_hits" -ne 1 ]; then
  printf 'name-pass.sh: expected exactly one `name:` line in the first 16 lines of %s, found %s\n' \
    "$src" "$name_hits" >&2
  exit 1
fi
if [ "$desc_hits" -ne 1 ]; then
  printf 'name-pass.sh: expected exactly one `description:` line in the first 16 lines of %s, found %s\n' \
    "$src" "$desc_hits" >&2
  exit 1
fi

out_file="$out_dir/implement-$item_id.js"

ITEM_ID="$item_id" SANITIZED_TITLE="$sanitized_title" awk '
  NR <= 16 && /^ *name:/ {
    print "  name: \x27implement " ENVIRON["ITEM_ID"] "\x27,"
    next
  }
  NR <= 16 && /^ *description:/ {
    print "  description: \x27" ENVIRON["SANITIZED_TITLE"] "\x27,"
    next
  }
  { print }
' "$src" > "$out_file"

printf '%s\n' "$out_file"
