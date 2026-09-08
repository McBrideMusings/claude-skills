#!/usr/bin/env bash
# vocab-lint.sh — check the control vocabulary in CONTEXT.md is honored repo-wide.
#
# Two checks, both derived from CONTEXT.md itself rather than hardcoded here:
#
#   A) A retired word (an `_Avoid_:` entry) must never appear backtick-quoted anywhere in
#      the tree, except inside CONTEXT.md's own `_Avoid_:` lines and this script.
#   B) A SKILL.md that uses one of the five acceptance-checked reserved words
#      (go, park, dispatch, implement, verify) backtick-quoted must carry a pointer line
#      naming CONTEXT.md. The full glossary in CONTEXT.md is broader than these five, but
#      most of the rest (test, file, run, split, window, …) are common English words used
#      backtick-quoted throughout the repo in unrelated senses — checking the whole
#      glossary here would flag files far outside this ticket's scope. The five below are
#      the ones the ticket's own acceptance criterion names, and they are the words rare
#      enough outside their control sense that a backtick-quoted hit reliably means the
#      control sense.
#
# Exit non-zero on any failure, printing file:line for each.

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTEXT_FILE="$ROOT/CONTEXT.md"
FAIL=0

if [[ ! -f "$CONTEXT_FILE" ]]; then
  echo "vocab-lint: $CONTEXT_FILE not found" >&2
  exit 1
fi

# --- Build the retired-word list from CONTEXT.md's own _Avoid_ lines ---
RETIRED_FILE="$(mktemp -t vocab-lint-retired.XXXXXX)"
grep -oE '_Avoid_: .*' "$CONTEXT_FILE" \
  | sed -E 's/^_Avoid_: //' \
  | tr ',' '\n' \
  | sed -E 's/^ +//; s/ +$//' \
  | sed '/^$/d' \
  > "$RETIRED_FILE"

# --- The core reserved set the pointer-line check applies to (see header note) ---
CORE_RESERVED=(go park dispatch implement verify)

# --- Check A: a retired word appearing backtick-quoted anywhere outside CONTEXT.md ---
while IFS= read -r word; do
  [[ -z "$word" ]] && continue
  matches="$(grep -rn --include='*.md' -i -F "\`${word}\`" "$ROOT" 2>/dev/null | grep -v -F "$CONTEXT_FILE")"
  if [[ -n "$matches" ]]; then
    echo "$matches" | while IFS= read -r line; do
      echo "RETIRED WORD backtick-quoted: $line"
    done
    FAIL=1
  fi
done < "$RETIRED_FILE"
rm -f "$RETIRED_FILE"

# --- Check B: a SKILL.md using a core reserved word must point at CONTEXT.md ---
while IFS= read -r skillfile; do
  [[ -z "$skillfile" ]] && continue
  uses_reserved=0
  for w in "${CORE_RESERVED[@]}"; do
    if grep -qE "\`${w}\`" "$skillfile"; then
      uses_reserved=1
      break
    fi
  done
  if [[ "$uses_reserved" -eq 1 ]]; then
    if ! grep -q 'CONTEXT.md' "$skillfile"; then
      echo "MISSING POINTER LINE: $skillfile:1 uses a reserved word but never mentions CONTEXT.md"
      FAIL=1
    fi
  fi
done < <(find "$ROOT" -name 'SKILL.md' -not -path '*/node_modules/*')

if [[ "$FAIL" -ne 0 ]]; then
  echo "vocab-lint: FAILED" >&2
  exit 1
fi

echo "vocab-lint: OK"
exit 0
