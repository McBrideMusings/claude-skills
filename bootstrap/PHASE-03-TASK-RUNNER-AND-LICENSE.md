# Phase 03 — Task Runner and License

Two pieces, each answered from what the repo already has.

## Task runner

A project with a build or test step has one task runner: whichever it already uses — a `Makefile`, a `justfile`, `package.json` scripts, or `admin.toml` (interpreted at runtime by the `admin` tool on PATH; nothing is generated beside it).

- **Standard** — any one of those exists and holds the build and test commands. No-op. Never propose replacing one runner with another.
- **Missing, with a build or test step** — which runner to add is a decision, so it goes to chat as options under `../CHAT-FORMAT.md` §Option set, never created silently. Pick the one the stack already ships: `package.json` scripts for a JavaScript repo, a `justfile` or `Makefile` elsewhere, `admin.toml` when the repo wants the `admin` dashboard. On an `admin.toml` answer, hand off to the `admin` skill (`admin new`, then `admin check`); don't reimplement it here.
- **Missing, with no build or test step** — `n/a`.

## License

- **Owned repo** (`~/.claude/tools/repo-tier` prints `owned`) **with no `LICENSE`, `LICENSE.md` or `COPYING` at the root** — ask once which license, as a plain-chat option set: MIT, Apache-2.0, a proprietary "All rights reserved" notice, or none. Write the answer's file; on "none", record nothing and don't ask again in this run.
- **A license file exists** — no-op, whatever it says.
- **Not owned** — skip. Licensing is never raised on someone else's repo.

Then proceed to [PHASE-04-VITEPRESS-DOCS.md](PHASE-04-VITEPRESS-DOCS.md).
