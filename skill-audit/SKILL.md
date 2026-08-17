---
name: skill-audit
description: "Explicit-only meta-audit of Claude Code skills. Bare invocation scans a conversation transcript for which skills fired and proactively looks for improvements — papercuts, non-standardized output formatting, drift from the org's output-style guide. `skill-audit fix <what>` skips the scan and fixes one named problem in the relevant skill file immediately. Never auto-triggers — only runs when explicitly invoked."
---

# skill-audit

Meta-audit for skills themselves (files under `~/.claude/skills/` or `~/.claude-work/skills/`), not for project code — that's `improve`/`review`. Two modes, picked by whether the invocation names a specific problem.

**Never triggers itself.** Only runs on explicit invocation (`/skill-audit`, "audit skills", "audit this session's skills").

## Mode A — Survey (bare `skill-audit`, or `skill-audit <session-file-or-dir>`)

Scans a transcript for which skills fired, then proactively looks for problems in each — this is the default, proactive mode. Never edits anything; ends by filing findings.

1. **Resolve the target transcript(s).** Default: the current session's own `.jsonl` under `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`. If the user names a path, a directory, or "last session", resolve that instead. If genuinely ambiguous, ask in plain chat text — no `AskUserQuestion`, consistent with `improve`/`followups`.
2. **Extract fired skills.** Grep the transcript(s) for `"name":"Skill"` tool_use entries; pull `input.skill` (and `input.args` for context) from each. Tally distinct skills and how many times each fired.
3. **Per fired skill, look for:**
   - **Output-format drift** — compare the assistant messages that followed the skill call against `~/.claude/tmp/claude/skill-output-style-audit.md` if it exists (the standing style-guide doc); otherwise judge by eye against this skill's own documented output contract (e.g. does it end in Files changed/Unchanged/Follow-up when the global CLAUDE.md requires that; does a workflow-shaped skill vary its section headers run to run).
   - **Papercuts** — grep `<repo-root>/tmp/claude/papercuts.md` for lines mentioning the skill's name.
   - **Structural smells** worth a finding: stale routing (mentions a skill/file that no longer exists), a skill's own doc claiming a contract its output doesn't honor, missing "Findings-only invocation" contracts for skills `improve` depends on.
4. **Report** the fired-skill list and findings in chat as plain markdown (bolded numbered findings, file:line where applicable) — no HTML report, no workflow, this is a single-pass read.
5. **File survivors** by invoking `followups` (Add mode) once per finding, not `to-tickets` — these are single skill-quality items, not a project ticket slate. Skip filing if nothing was found; say so.

## Mode B — Direct fix (`skill-audit fix <what>`, "fix the X skill's Y problem")

User already knows the specific problem. No scan, no ticket — fix it now, same turn.

1. Locate the target skill file(s): grep `~/.claude/skills/*/SKILL.md` (and sub-files) for the named skill or symptom.
2. **Before editing anything under `~/.claude/`, read `~/.claude/CONTRIBUTING.md`** — `skills/` is a submodule, commits there are separate from the parent repo.
3. Read the full skill file(s) touched, make the edit.
4. Close per the global CLAUDE.md convention: **Files changed / Unchanged / Follow-up needed**, plus manual verification steps (what to run, what a pass looks like — usually re-running the skill once).
5. Commit per CONTRIBUTING.md: commit+push inside `skills/` first, then bump the submodule pointer in the parent repo. Auto-commit rule applies (`~/.claude/` tracked files commit without asking).

## Scope boundary

This skill only touches *skill files* — `SKILL.md` and their reference docs. If Mode A turns up a project-code defect (not a skill-doc problem), that's `review`'s territory — say so as a pointer, don't file it here.
