# beads:stealth — injected context

> Beads runs here, nothing about it is committed; `bd github sync` refused.

- `.beads/` sits in the working directory and is invisible to `git status`. Anyone with
  filesystem access to the checkout can still read it. Say that limit out loud once.
- **`bd github sync` is refused, not defaulted off.** One sync pushes a private graph into
  someone else's GitHub organisation. Mirror mode and stealth are mutually exclusive.
- The repo belongs to someone else, so nothing about beads reaches a commit or a PR —
  including `AGENTS.md`, git hooks, and any note explaining why they are absent.

Depth: [_detect.md](_detect.md) § Stealth for how the posture is decided, [beads.md](beads.md)
for the command surface and what each `--stealth` flag suppresses.
