---
name: free-disk-space
description: "Reclaim disk space on macOS — clear build artifacts and caches, retire merged worktrees, offload large keepers to an external drive behind a symlink. Use when the disk is full, 'out of space' appears, or the user asks to clean up or free up the machine."
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
- **A big folder is not a delete candidate until you have looked inside it.** `du` gives a number, not an identity. Open the top entries and name what they are before the folder appears in any list you show the user.

### Never offer these, however big

- **`~/Pictures/Photos Library.photoslibrary` — the Photos app's entire database.** Every photo and video the user owns lives inside that one bundle, and `~/Pictures` reads as an ordinary folder in `du` output. A blanket "dump Pictures" destroys their photo library. Same for `~/Pictures/Photo Booth Library` and `~/Movies/iMovie Library.imovielibrary`: a `.photoslibrary`, `.photolibrary`, `.imovielibrary`, or `.theater` suffix means original media, not cache. Report the size and move on.

### Orphaned app data is safe to delete

Before reporting any large `~/Library/Application Support/<App>`, `~/Library/Containers/<bundle-id>`, or `~/Library/Caches/<App>` as untouchable, check whether the app still exists — `ls /Applications ~/Applications | grep -i <name>`. If it's gone, the data is a leftover with nothing to open it: say so plainly and put it in the delete list rather than the "ask first" list. Watch for near-miss names — `Steam Link.app` is not Steam, so `Application Support/Steam` is still orphaned.

### Derived copies come back unless you kill the source

A cache that regenerates isn't worth deleting on its own — find what regenerates it. Before proposing a large derived store, identify the setting or source folder that produces it and offer to change that too, otherwise the space returns within days.

## Workflow

### 1. Assess

`df -h /System/Volumes/Data; ls /Volumes`. Note free space and whether an external drive is mounted.

### 2. Survey

Targeted `du -sh … | sort -hr` — not a full scan of `~`. The usual big ones:

- **Build artifacts** — `target/` (every worktree too), `node_modules/`, Xcode DerivedData
  - For DerivedData, `~/.claude/tools/prune-derived-data` first. Xcode keys each tree by the project's absolute path, so every git worktree leaves one behind and worktree teardown never removes it. The tool reads each tree's `info.plist` `WorkspacePath` and names the ones whose checkout is gone — exact, not a heuristic. Add `--delete` once the user has said yes to the tier.
- **Package-manager caches** — go-build, Homebrew, pnpm/npm/pip stores
- **Large media** — CapCut, Screen Studio, `~/Movies`, `~/Downloads`
- **App caches / Application Support** — size only, never a delete candidate

Done when every category above has a number next to it or an explicit "nothing here".

### 3. Confirm the safe tier, then clear it

The safe tier is build artifacts and package-manager caches — things a tool rebuilds on demand. Show the user the survey list with sizes and the total it would reclaim, and take one yes for the whole tier before deleting anything. On a no, skip to step 4.

On a yes, clear it with the tools' own commands. Everything else — app data, media, model weights, toolchains — is never in this tier: summarize sizes and ask, or propose offload in step 5.

### 4. Audit git worktrees

For each worktree: is it dirty, and does it hold commits that aren't pushed anywhere? List the clean-and-merged ones with their sizes and take one yes for the batch — same shape as step 3's tier confirm — before removing anything. On a yes: `git worktree remove` and `git branch -d` per worktree. In a repo with submodules the plain remove refuses (`fatal: working trees containing submodules cannot be moved or removed`) and takes `branch -d` down with it — `git worktree remove --force` gets past that, and the dirty/ahead check above is what makes forcing safe here. Never `branch -D` — the safe delete refusing is the signal that work would be lost. Keep and report anything dirty or ahead.

**Clean and merged is not the whole test — ask what is standing in the directory too.** `pgrep -f "<worktree>" | xargs -r ps -o pid=,comm=` must come back empty before the remove; `lsof +D <worktree>` answers for certain when you still suspect a hold. A process can still hold a path after removal even when git's dirty/merged checks pass — check `pgrep`/`lsof` before removing. Keep and report a held worktree, naming the pid, exactly as for a dirty one. Never `pgrep -fl` — one npm-exec match is ~10,000 characters of inherited environment.

### 5. Offload keepers

For large files worth keeping, with a drive mounted: `rsync -a` to the drive → verify the sizes match → trash the original → symlink the old path to the new one. Symlink individual folders, never a whole special directory like `~/Movies`. Warn that the owning app needs the drive mounted or the path breaks.

### 6. Wrap up

Report what was freed immediately, what's sitting in the Trash, and what was left alone and why. Ask the user to empty the Trash, then re-run `df -h /System/Volumes/Data` and show the before/after.
