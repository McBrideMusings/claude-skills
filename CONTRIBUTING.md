# Contributing

## Issues are not tracked on GitHub

This repo does not use GitHub Issues or milestones. It is a submodule of a private
configuration repo, and every issue for these skills lives in that parent repo's beads
database.

- File, read and close skills issues with `bd` against the parent repo's database. The
  primary skills checkout carries a local, untracked `.beads/redirect` that points `bd`
  there, so `bd` run from this directory reaches the same database.
- Never create a GitHub issue or milestone on this repo, even though it has a GitHub
  remote. The `gh` CLI working here says nothing about where issues belong.
- A linked worktree of this repo does not carry the redirect. Run `bd` from the parent
  repo's root there.
