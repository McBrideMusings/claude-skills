# Aspect brief: `agent-ergonomics` (native)

Axis tag: `agent-ergonomics`. Applicability: always — every repo has a tower of abstractions an agent has to navigate.

**Read first, in full:** [../AGENT-ERGONOMICS.md](../AGENT-ERGONOMICS.md). Its "Findings-only invocation" section at the end is the contract you run under. Your lateral technique, per [LATERAL-LENS.md](../LATERAL-LENS.md), is `driver-seat` — invoke `lateral driver-seat` before writing findings.

Ask the one question no other aspect asks: **which level of the tower has no programmatic handle, or a name that differs between surfaces?**

## What to do

1. **Build the tower over the existing system** — the actual levels top to bottom (mission/epic/ticket/module/function or plan/phase/component/seam, whichever this repo's shape is), one line each.
2. **Mark every level with no programmatic handle** — nothing an agent can drive or read back via CLI, API, admin task, or fixture, without a human running it and reporting the result by hand.
3. **Check name identity across surfaces** at each level — code, `docs/`, `admin.toml`, CLI/API entry points, CLAUDE.md — and flag any level where the name for the same concept diverges.
4. **Name the surface the fix adds** for every flagged level — a CLI subcommand, an `admin.toml` task, a fixture, a renamed section — and which surfaces it makes consistent.

## Aspect-specific rules

- **The level is the finding, never the file.** A finding names a level of the tower and the missing or inconsistent surface at it, not a single call site.
- **A rename finding lists every surface the divergent name appears on**, not just the first two you noticed.
- **A level with a handle and a consistent name produces no finding.** Silence there is correct; do not manufacture a finding to fill a quota.
- This is the planning-time half of what `interface-safety` catches at runtime: `interface-safety` asks whether the obvious call breaks behavior; this aspect asks whether the obvious call exists at all, and whether it's named the same thing everywhere an agent would look for it.
