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

## A skills commit is not finished until the parent's pointer commit is pushed

This repo is a submodule of `~/.claude`, and nothing reads a skills commit until the parent
records its sha. Land every skills commit with `~/.claude/tools/land <skills-worktree>`: it
pushes to this repo's `main`, then commits and pushes `chore(skills): bump submodule to <sha>`
in the parent. Never push to this repo by hand, which skips the pointer.

After landing, run `git -C ~/.claude ls-tree origin/main skills` and compare its sha to the one
`land` printed. Report both. Never report the pointer as not committed without running that check.
