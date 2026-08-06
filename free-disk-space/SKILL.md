---
name: free-disk-space
description: "Reclaim disk space on macOS — audit real free space, clear build artifacts and package-manager caches after one confirmation, retire merged git worktrees, and offload large keepers to an external drive behind a symlink. Use whenever the disk is full, an 'out of space' error appears, or the user asks to clean up, offload, or free up the machine."
user_invocable: true
---

# Free disk space (macOS)

Audit the disk, clear what's regenerable, and confirm before touching anything that isn't.

## Ground rules

- **Delete with `trash`, never `rm -rf`.** Everything accumulates in the Trash and stays recoverable; ask the user to empty it once at the end.
- **Prefer a tool's own cleanup command** over deleting its directories: `go clean -cache`, `brew cleanup --prune=all`, `pnpm store prune`, `npm cache clean --force`, `cargo clean`.
- **Measure with `df -h /System/Volumes/Data`**, not plain `df /` — APFS counts the read-only system volume separately and plain `df /` reports the wrong number.
- **Never clear GUI app data.** `~/Library/Caches/<App>` and `~/Library/Application Support/<App>` hold logins, cookies, and history. Report their sizes and stop. Only touch one when the user names that app and accepts losing its state.
- **Never write a drive name or `/Volumes/…` path into this file or any committed file.** Discover mounted drives at run time with `ls /Volumes` and use what's actually there.

## Workflow

### 1. Assess

`df -h /System/Volumes/Data; ls /Volumes`. Note free space and whether an external drive is mounted.

### 2. Survey

Targeted `du -sh … | sort -hr` — not a full scan of `~`. The usual big ones:

- **Build artifacts** — `target/` (every worktree too), `node_modules/`, Xcode DerivedData
- **Package-manager caches** — go-build, Homebrew, pnpm/npm/pip stores
- **Large media** — CapCut, Screen Studio, `~/Movies`, `~/Downloads`
- **App caches / Application Support** — size only, never a delete candidate

Done when every category above has a number next to it or an explicit "nothing here".

### 3. Confirm the safe tier, then clear it

The safe tier is build artifacts and package-manager caches — things a tool rebuilds on demand. Show the user the survey list with sizes and the total it would reclaim, and take one yes for the whole tier before deleting anything. On a no, skip to step 4.

On a yes, clear it with the tools' own commands. Everything else — app data, media, model weights, toolchains — is never in this tier: summarize sizes and ask, or propose offload in step 5.

### 4. Audit git worktrees

For each worktree: is it dirty, and does it hold commits that aren't pushed anywhere? Clean **and** fully merged → `git worktree remove` and `git branch -d`. Never `-D` — the safe delete refusing is the signal that work would be lost. Keep and report anything dirty or ahead.

### 5. Offload keepers

For large files worth keeping, with a drive mounted: `rsync -a` to the drive → verify the sizes match → trash the original → symlink the old path to the new one. Symlink individual folders, never a whole special directory like `~/Movies`. Warn that the owning app needs the drive mounted or the path breaks.

### 6. Wrap up

Report what was freed immediately, what's sitting in the Trash, and what was left alone and why. Ask the user to empty the Trash, then re-run `df -h /System/Volumes/Data` and show the before/after.
