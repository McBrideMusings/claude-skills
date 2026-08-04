# Papercuts

Small frictions hit while working in this repo — retried tool calls, confusing setup, flaky commands, stale caches, misleading errors, non-obvious gotchas. Logged in the moment. Distinct from real bugs (issues) and from what got accomplished.

2026-08-04T15:14:13Z - claude-opus-5[1m] - pierce

Looking for the built-in simplify skill's SKILL.md -> ran find / -maxdepth 8, hung past the 120s timeout. Built-in skills (simplify, run, init, security-review, dataviz) aren't on disk under ~/.claude, so there is no way to read their source; a doc listing where bundled skills live (or that they're unreadable) would have saved the search.

