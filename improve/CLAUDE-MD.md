# Aspect: `claude-md` (native)

CLAUDE.md content quality — whether the file's *structure* helps or fights the model's own relevance filtering. Distinct from `layout` (owned by `bootstrap`): layout asks whether `CLAUDE.md`/`CLAUDE.local.md` exist and sit in the standard location; this lens asks whether an *existing* file is actually going to be read.

## Grounding rule

Same as [ARCHITECTURE.md](ARCHITECTURE.md): every finding quotes this repo's actual `CLAUDE.md`, not a generic complaint. Read the file in full before judging it.

## The core problem

Claude Code injects a system reminder with every CLAUDE.md: *"this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task."* A long, flat CLAUDE.md gets partially ignored under that framing — the model can't tell which parts apply to the task at hand, so it discounts all of it, including the parts that matter.

## Areas

- **Relevance signal** — does the file use `<important if="condition">` blocks to mark domain-specific sections (testing, API conventions, state management), or is it one flat wall of rules with no way for the model to tell what applies to the current task? Foundational context (identity, project map, tech stack) should stay bare; everything else that's relevant to a specific kind of work is a candidate for wrapping.
- **Condition specificity** — where `<important if>` blocks already exist, are the conditions narrow and targeted (`you are adding or modifying API routes`) or broad enough to match everything (`you are writing or modifying any code`)? A broad condition is functionally unwrapped.
- **Linter territory** — style/formatting rules a linter, formatter, or pre-commit hook already enforces (camelCase, `const` over `let`, import order). These cost attention for zero benefit; the fix is a hook, not a CLAUDE.md line.
- **Staleness risk** — inline code snippets that will drift from the real implementation. Prefer a file path reference the model can go read.
- **Vague instructions** — "follow best practices," "leverage the X agent," anything not concrete and actionable enough to change behavior.
- **Missing commands** — a commands table that's incomplete relative to what the project actually exposes (`package.json` scripts, `admin.toml` tasks, Makefile targets).

## Findings

Each finding: the **gap** (what's flat, broad, stale, or vague), **evidence** (the actual line/section quoted), **fix** (the concrete rewrite — narrowed condition, hook to add, path reference to substitute), **strength** (`Strong` / `Worth exploring` / `Speculative`). Card fields per [HTML-REPORT.md](HTML-REPORT.md).

## Interactive follow-up

Same grilling loop as architecture (see [ARCHITECTURE.md](ARCHITECTURE.md)). For the actual rewrite mechanics — the `<important if>` structure, what stays bare, what gets deleted — hand off to `bootstrap`'s CLAUDE.md phase rather than reimplementing them here; this lens finds the gaps, bootstrap applies the rewrite.
