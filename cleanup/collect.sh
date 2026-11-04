#!/usr/bin/env bash
# Survey every local branch, worktree and stash in a repo and emit one JSON document.
# Read-only: this script never writes to the repo, the index, or any ref.
#
#   collect.sh                 survey the whole repo -> JSON on stdout
#   collect.sh diff <branch>   uncommitted diff in that branch's worktree
#   collect.sh commits <branch> combined diff of the branch's unique commits
#   collect.sh stash <n>       full patch for stash@{n}
#
# Env:
#   RC_MAX_FILES=40    cap on per-branch dirty-file lists
#   RC_MAX_COMMITS=20  cap on per-branch unique-commit subjects
#   RC_NO_GH=1         skip the GitHub PR lookup

set -euo pipefail

MAX_FILES="${RC_MAX_FILES:-40}"
MAX_COMMITS="${RC_MAX_COMMITS:-20}"

command -v jq >/dev/null || { echo "collect.sh needs jq" >&2; exit 1; }

# The main checkout, even when invoked from a linked worktree.
GIT_COMMON="$(git rev-parse --path-format=absolute --git-common-dir)"
ROOT="$(dirname "$GIT_COMMON")"
[ "$(basename "$GIT_COMMON")" = ".git" ] || ROOT="$GIT_COMMON"
g() { git -C "$ROOT" "$@"; }

# ---------------------------------------------------------------- default branch
DEFAULT=""
if ref="$(g symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)"; then
  DEFAULT="${ref#origin/}"
fi
if [ -z "$DEFAULT" ]; then
  for cand in main master trunk develop; do
    if g show-ref --verify --quiet "refs/heads/$cand"; then DEFAULT="$cand"; break; fi
  done
fi
[ -n "$DEFAULT" ] || { echo "collect.sh: cannot determine a default branch" >&2; exit 1; }

# Compare against the remote default when it exists — a stale local default makes
# every branch look unmerged.
BASE="$DEFAULT"
g show-ref --verify --quiet "refs/remotes/origin/$DEFAULT" && BASE="origin/$DEFAULT"

# ---------------------------------------------------------------- worktree map
WT_DIR="$(mktemp -d)"
trap 'rm -rf "$WT_DIR"' EXIT
: >"$WT_DIR/map"
wt_path=""
while IFS= read -r line; do
  case "$line" in
    "worktree "*) wt_path="${line#worktree }" ;;
    "branch "*)   printf '%s\t%s\n' "${line#branch refs/heads/}" "$wt_path" >>"$WT_DIR/map" ;;
  esac
done < <(g worktree list --porcelain)

worktree_of() { awk -F'\t' -v b="$1" '$1==b {print $2; exit}' "$WT_DIR/map"; }

MAIN_BRANCH_CHECKED_OUT="$(g rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"

# ---------------------------------------------------------------- subcommands
case "${1:-survey}" in
  diff)
    wt="$(worktree_of "${2:?branch required}")"
    [ -n "$wt" ] || { echo "no worktree for ${2}" >&2; exit 1; }
    git -C "$wt" --no-pager diff HEAD
    echo
    echo "--- untracked ---"
    git -C "$wt" ls-files --others --exclude-standard
    exit 0 ;;
  commits)
    g --no-pager diff "$BASE...${2:?branch required}"
    exit 0 ;;
  stash)
    g --no-pager stash show -p "stash@{${2:?index required}}"
    exit 0 ;;
  survey) ;;
  *) echo "unknown mode: $1" >&2; exit 1 ;;
esac

# ---------------------------------------------------------------- PR lookup (best effort)
PR_JSON="$WT_DIR/prs.json"
echo '[]' >"$PR_JSON"
if [ -z "${RC_NO_GH:-}" ] && command -v gh >/dev/null && g remote get-url origin 2>/dev/null | grep -q github; then
  ( cd "$ROOT" && gh pr list --state all --limit 300 \
      --json headRefName,number,state,mergedAt,title,url ) >"$PR_JSON" 2>/dev/null || echo '[]' >"$PR_JSON"
fi
pr_of() { jq -c --arg b "$1" '[.[] | select(.headRefName == $b)] | sort_by(.number) | last // null' "$PR_JSON"; }

# ---------------------------------------------------------------- per branch
: >"$WT_DIR/branches.ndjson"

while IFS=$'\x1f' read -r name sha upstream track cdate cauthor; do
  case "$upstream" in
    "")            up_state="none" ;;
    *)             case "$track" in *gone*) up_state="gone" ;; *) up_state="tracking" ;; esac ;;
  esac

  merged=false
  g merge-base --is-ancestor "$sha" "$BASE" 2>/dev/null && merged=true

  unique_count="$(g rev-list --count "$BASE..$name" 2>/dev/null || echo 0)"
  subjects="$(g log --format='%h %s' -n "$MAX_COMMITS" "$BASE..$name" 2>/dev/null || true)"
  # Commits whose patch has no equivalent upstream. 0 with unique_count>0 means the
  # work landed via rebase or cherry-pick and the branch is redundant.
  unlanded="$(g cherry "$BASE" "$name" 2>/dev/null | grep -c '^+' || true)"
  commit_stat="$(g diff --shortstat "$BASE...$name" 2>/dev/null || true)"

  wt="$(worktree_of "$name")"
  dirty_files=""; dirty_count=0; dirty_stat=""; untracked_count=0
  if [ -n "$wt" ] && [ -d "$wt" ]; then
    dirty_files="$(git -C "$wt" status --porcelain=v1 2>/dev/null | head -n "$MAX_FILES" || true)"
    dirty_count="$(git -C "$wt" status --porcelain=v1 2>/dev/null | wc -l | tr -d ' ')"
    dirty_stat="$(git -C "$wt" diff HEAD --shortstat 2>/dev/null || true)"
    untracked_count="$(git -C "$wt" ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')"
  fi

  protected=false
  [ "$name" = "$DEFAULT" ] && protected=true
  [ "$name" = "$MAIN_BRANCH_CHECKED_OUT" ] && protected=true

  jq -nc \
    --arg name "$name" --arg sha "$sha" --arg upstream "$upstream" \
    --arg up_state "$up_state" --arg track "$track" \
    --arg cdate "$cdate" --arg cauthor "$cauthor" \
    --argjson merged "$merged" --argjson unique_count "${unique_count:-0}" \
    --arg subjects "$subjects" --argjson unlanded "${unlanded:-0}" \
    --arg commit_stat "$commit_stat" --arg worktree "$wt" \
    --arg dirty_files "$dirty_files" --argjson dirty_count "${dirty_count:-0}" \
    --arg dirty_stat "$dirty_stat" --argjson untracked_count "${untracked_count:-0}" \
    --argjson protected "$protected" --argjson pr "$(pr_of "$name")" \
    '{name:$name, sha:$sha, last_commit:{date:$cdate, author:$cauthor},
      upstream:(if $upstream=="" then null else $upstream end), upstream_state:$up_state, track:$track,
      merged_into_base:$merged, unique_commits:$unique_count,
      unlanded_commits:$unlanded, unique_commit_subjects:($subjects|split("\n")|map(select(length>0))),
      unique_diffstat:$commit_stat,
      worktree:(if $worktree=="" then null else $worktree end),
      dirty:{count:$dirty_count, untracked:$untracked_count, stat:$dirty_stat,
             files:($dirty_files|split("\n")|map(select(length>0)))},
      protected:$protected, pr:$pr}' >>"$WT_DIR/branches.ndjson"
done < <(g for-each-ref --format='%(refname:short)%1f%(objectname:short)%1f%(upstream:short)%1f%(upstream:track)%1f%(committerdate:iso8601)%1f%(authorname)' refs/heads)

# ---------------------------------------------------------------- stashes
: >"$WT_DIR/stashes.ndjson"
while IFS=$'\x1f' read -r ref subject sdate; do
  idx="${ref#stash@\{}"; idx="${idx%\}}"
  stat="$(g stash show --stat "$ref" 2>/dev/null | tail -n 1 || true)"
  files="$(g stash show --name-only "$ref" 2>/dev/null | head -n "$MAX_FILES" || true)"
  jq -nc --arg ref "$ref" --argjson index "${idx:-0}" --arg subject "$subject" \
         --arg date "$sdate" --arg stat "$stat" --arg files "$files" \
    '{ref:$ref, index:$index, subject:$subject, date:$date, stat:$stat,
      files:($files|split("\n")|map(select(length>0)))}' >>"$WT_DIR/stashes.ndjson"
done < <(g stash list --format='%gd%x1f%gs%x1f%aI' 2>/dev/null || true)

# ---------------------------------------------------------------- orphan worktrees
: >"$WT_DIR/orphans.ndjson"
while IFS= read -r line; do
  case "$line" in
    "worktree "*) op="${line#worktree }" ;;
    "detached")   jq -nc --arg path "$op" '{path:$path, reason:"detached HEAD"}' >>"$WT_DIR/orphans.ndjson" ;;
    "prunable"*)  jq -nc --arg path "$op" --arg why "$line" '{path:$path, reason:$why}' >>"$WT_DIR/orphans.ndjson" ;;
  esac
done < <(g worktree list --porcelain)

jq -n \
  --arg root "$ROOT" --arg default "$DEFAULT" --arg base "$BASE" \
  --slurpfile branches "$WT_DIR/branches.ndjson" \
  --slurpfile stashes "$WT_DIR/stashes.ndjson" \
  --slurpfile orphans "$WT_DIR/orphans.ndjson" \
  '{repo:$root, default_branch:$default, compared_against:$base,
    branches:$branches, stashes:$stashes, orphan_worktrees:$orphans}'
