# Tool-choice lens — hand-rolled work that a tool already did

Distinct from `skill-miss`: that lens is about *skills*, this one is about **binaries,
subagents, MCP tools, and harness features** that already existed and went unused.

## Method

Walk the Bash histogram and the tool table from `analyze.py`. For each cluster of hand-rolled
work, ask whether something already installed does it.

Checks worth running every time:

- **Is there a binary for this?** `which <name>`, `ls ~/go/bin ~/.local/bin`, the project's
  `admin.toml`. A skill that reimplements an installed CLI by hand is a real and repeated
  failure — one skill in this account narrated doing by hand exactly what `~/go/bin/meat`
  does mechanically.
- **Is there an `admin` task?** If the project has `admin.toml`, hand-rolled build/test/deploy
  invocations are the finding.
- **Does the harness already report this?** `claude plugin details <name>` prints per-plugin
  token cost; several rounds of custom probing have been spent rediscovering it.
- **Should this have been a sub-agent?** Large raw output landing in the main context —
  builds, test runs, greps over many files, screenshots — has dedicated agents
  (`build-runner`, `Explore`, `screenshot-checker`) whose entire purpose is to keep it out.
  Long `Bash` waits in `analyze.py`'s slow-tool table are the tell.
- **Was a bespoke script written where a flag existed?**

## Rank by recurrence, then by cost

A one-off hand-roll is noise. The same hand-roll in twelve sessions is a missing pointer in
the steering docs, and *that* is the finding — the fix is a line in `CLAUDE.md` or the
owning skill, not a scolding.

## Special case — the wrong instrument

Worse than hand-rolling is measuring with a tool that cannot see the thing being measured.
It produces confident, published, wrong numbers. When the corpus contains a measurement,
check that its instrument was validated against a second method before its output was
believed. See `CORPUS.md` § Measurement traps.

Findings of this kind outrank everything else in this lens, because their cost is not tokens
— it is a wrong decision made downstream.

## What is not a finding

- A hand-rolled path chosen deliberately and explained.
- A tool that exists but doesn't quite fit; say what doesn't fit instead.
- Exploratory scripting during genuine investigation. Reaching for Python to answer a novel
  question is correct; reaching for it to redo what a flag prints is not.

## Finding format

> **`<hand-rolled work>` done `<n>`x; `<tool>` already does it.**
> `<session>:<timestamp>` — `<what was run>`.
> Cost: `<turns>` turns, `$<x>`.
> **Why it wasn't reached for:** `<not documented / not on PATH / undiscoverable>`.
> **Fix:** `<add the pointer, and where>`.

Axis tag: `tool-choice`.

**Before writing the `Fix:` line, test it against both fix shapes.**
**Enforceable?** — [../HOOKS.md](../HOOKS.md). Name the event and predicate plus simulated fires/precision if a hook could enforce this; if not, say why.
**Right shape?** — [../SKILL-SHAPE.md](../SKILL-SHAPE.md). If the finding is about a skill, walk the ladder (delete → hide/relocate → reword → combine/embed → split/disclose → load trigger) and name the rung.
**Should it have prompted?** — [../PERMISSIONS.md](../PERMISSIONS.md). If the finding involves a permission prompt or denial, pick the shape (allow rule / deny+allow pair / wrapper tool) and name what stays denied.
Say which shape you rejected and why. Prefer the fix that removes the condition over one that guards it.
