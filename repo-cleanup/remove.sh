#!/usr/bin/env bash
# Delete local branches, worktrees and stashes that a repo-cleanup pass approved.
# Local only: it never pushes, never deletes a remote ref, never touches the default
# branch or the branch checked out in the main worktree.
#
#   remove.sh branch <name> [<name>...]
#   remove.sh stash <n> [<n>...]        indices are resolved before any drop
#   remove.sh prune-worktrees           git worktree prune only
#
# Before anything is deleted, uncommitted work in the branch's worktree is written to
#   /private/tmp/claude/<repo-slug>/repo-cleanup-<date>/<branch>.patch
# That is a three-day undo, not an archive — /private/tmp is swept daily.

set -euo pipefail

GIT_COMMON="$(git rev-parse --path-format=absolute --git-common-dir)"
ROOT="$(dirname "$GIT_COMMON")"
[ "$(basename "$GIT_COMMON")" = ".git" ] || ROOT="$GIT_COMMON"
g() { git -C "$ROOT" "$@"; }

if [ -x "$HOME/.claude/tools/repo-slug" ]; then
  UNDO_BASE="$("$HOME/.claude/tools/repo-slug" --path)"
else
  UNDO_BASE="/private/tmp/claude/$(basename "$ROOT")"
fi
UNDO="$UNDO_BASE/repo-cleanup-$(date +%Y%m%d)"
mkdir -p "$UNDO"

DEFAULT=""
if ref="$(g symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)"; then DEFAULT="${ref#origin/}"; fi
[ -n "$DEFAULT" ] || DEFAULT="$(g rev-parse --abbrev-ref HEAD)"
MAIN_CHECKED_OUT="$(g rev-parse --abbrev-ref HEAD)"

worktree_of() {
  local target="$1" wt=""
  while IFS= read -r line; do
    case "$line" in
      "worktree "*) wt="${line#worktree }" ;;
      "branch refs/heads/$target") printf '%s\n' "$wt"; return 0 ;;
    esac
  done < <(g worktree list --porcelain)
  return 0
}

remove_branch() {
  local b="$1"
  if [ "$b" = "$DEFAULT" ] || [ "$b" = "$MAIN_CHECKED_OUT" ]; then
    echo "SKIP  $b (default or checked out in the main worktree)"; return 0
  fi
  if ! g show-ref --verify --quiet "refs/heads/$b"; then
    echo "SKIP  $b (no such local branch)"; return 0
  fi

  local wt; wt="$(worktree_of "$b")"
  if [ -n "$wt" ] && [ -d "$wt" ]; then
    if [ -n "$(git -C "$wt" status --porcelain=v1)" ]; then
      local safe="${b//\//-}"
      git -C "$wt" diff HEAD >"$UNDO/$safe.patch" 2>/dev/null || true
      git -C "$wt" ls-files --others --exclude-standard >"$UNDO/$safe.untracked.txt" 2>/dev/null || true
      echo "      saved uncommitted work -> $UNDO/$safe.patch"
    fi
    g worktree remove --force "$wt"
    echo "      removed worktree $wt"
  fi

  local sha; sha="$(g rev-parse --short "refs/heads/$b")"
  g branch -D "$b" >/dev/null
  echo "GONE  $b ($sha)"
}

case "${1:?usage: remove.sh branch|stash|prune-worktrees ...}" in
  branch)
    shift
    for b in "$@"; do remove_branch "$b"; done
    g worktree prune
    ;;
  stash)
    shift
    # Resolve every index to its commit first: dropping stash@{1} renumbers the rest.
    shas=()
    for n in "$@"; do shas+=("$(g rev-parse "stash@{$n}")"); done
    for sha in "${shas[@]}"; do
      g stash show -p "$sha" >"$UNDO/stash-$sha.patch" 2>/dev/null || true
      idx="$(g stash list --format='%gd %H' | awk -v s="$sha" '$2==s {print $1; exit}')"
      if [ -z "$idx" ]; then echo "SKIP  stash $sha (not found)"; continue; fi
      g stash drop "$idx" >/dev/null
      echo "GONE  $idx ($sha) -> patch at $UNDO/stash-$sha.patch"
    done
    ;;
  prune-worktrees)
    g worktree prune -v
    ;;
  *) echo "unknown mode: $1" >&2; exit 1 ;;
esac

echo
echo "undo directory: $UNDO"
