# DerivedData across parallel workers

Part of [`orchestrate.md`](../orchestrate.md) — the per-worker simulator and UDID pinning rules are there.

Each worker's git worktree is a different absolute path, so Xcode builds it a DerivedData tree of
its own — 6.2–6.9 GB on iptv-mac. Worktree teardown removes the worktree; nothing removes the tree.
Thirteen of them took a 926 GB disk to 6.1 GiB free on 2026-08-20 and killed a round with `ENOSPC`.
So, after retiring the worktrees:

```bash
~/.claude/tools/prune-derived-data --delete --root ~/.worktrees/<repo>
```

It deletes only trees whose `info.plist` `WorkspacePath` no longer exists, so a live worker's tree
is never a candidate. `--root` matters whenever a worker passed an explicit `-derivedDataPath`
beside its worktree: those trees carry the same plist and leak the same way, but they are nowhere
near `~/Library/Developer/Xcode/DerivedData` and nothing else would ever find them. Two such trees,
8.1 GB, sat under `~/.worktrees/iptv-mac/` for two days after their worktrees were gone.

A worker that builds through `admin` needs nothing extra: `hooks/worktree-link-locals.sh` symlinks
`admin.toml` back to the main checkout (its patterns live in `~/.config/wtree/config.toml`), so the
worktree runs the same manifest and gets the shared clone directory for free. Verified 2026-08-20 on
a fresh iptv-mac worktree.

A worker that calls `xcodebuild` directly bypasses all of that and has to pass the flag itself:

```bash
xcodebuild … -clonedSourcePackagesDirPath ~/Library/Developer/Xcode/SharedSourcePackages/<repo>
```

**Do not "fix" this by pointing every worker at one `-derivedDataPath`.** Measured 2026-08-20, two
worktrees building the same scheme at once into one tree: the loser dies with `unable to attach DB:
… build.db: database is locked`, rc 65 — xcodebuild fails outright rather than waiting its turn the
way cargo does. And both write the same `Build/Products/<Config>/<app>`, so the winner's binary
silently replaces the loser's while the loser prints `BUILD SUCCEEDED`. It is racy, so a swarm sees
it intermittently.

What *is* safe to share is the SwiftPM clone directory: same test, per-worktree DerivedData plus one
`-clonedSourcePackagesDirPath`, both workers rc 0 with their own products, 2.1 GB held once instead
of per worktree and the second worker's cold build 55s → 19s. `admin` does this automatically for
every Apple project — see `shared_spm_clone_dir()` in `admin_lib/apple.py`.
