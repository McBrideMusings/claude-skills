---
name: handoff
description: "Write a handoff document capturing the current session so a fresh agent (or future you) can pick up the work. Write-only — produces a doc, never reads one back. Does NOT cover 'wrap up' — that's /summary write."
---

# Handoff

Write a handoff document that captures the invisible context of the current session so a fresh agent — or you, later — can continue the work without re-reading the whole conversation.

**Write-only.** This skill produces a document; it does not read one back, resume from one, or manage a single canonical slot. Every invocation writes a new timestamped file. To use a handoff, open the file. Nothing auto-fires it, and no other skill depends on it.

If the user passed arguments (e.g. `/handoff working on the auth refactor next`), treat them as a description of what the next session will focus on — tailor the fields (especially **Immediate next step** and **Suggested next skills**) accordingly, and use them for the filename slug.

## What to capture

**Don't duplicate content already in other artifacts** — PRDs, plans, ADRs, issues, commits, diffs. Reference them by path or URL. Capture only the **invisible context** that isn't in the code or those artifacts (e.g. "we ruled out approach A because the JWT lib doesn't expose a refresh hook").

Redact anything sensitive — API keys, passwords, hostnames, personally identifying info. Never write those into the file.

Capture four required fields and one optional fifth:

1. **What we were working on** — 1–2 sentences. The specific task or problem, not just the feature name.
2. **Key decisions** — what choices were made and *why*. Especially alternatives ruled out.
3. **Discoveries** — constraints, gotchas, or facts learned mid-session that aren't obvious from reading the code.
4. **Immediate next step** — the exact thing to do first when resuming. Specific enough to act on without re-reading the conversation. Include open blockers/questions here if they shape the next step.
5. **Suggested next skills** *(optional)* — 0–2 skills the next session is likely to invoke, inferred from the Immediate next step. e.g. *"/tdd, /diagnose"*. Omit the field entirely when no clear match.

## File format

```markdown
---
created: YYYY-MM-DD HH:MM
project: <basename of repo root>
---

**What we were working on:** <1–2 sentences>

**Key decisions:** <bullet or prose — include the why>

**Discoveries:** <anything non-obvious that isn't in the code>

**Immediate next step:** <specific enough to act on immediately>

**Suggested next skills:** </tdd, /diagnose>   ← omit this line entirely if no clear match
```

## Write procedure

1. Run `git rev-parse --show-toplevel` in its own Bash call to get the ABSOLUTE `<repo-root>`. If not in a git repo, use the absolute output of `pwd`. **`<repo-root>` MUST be absolute — never write to a cwd-relative `tmp/…`.** The Bash working directory is NOT guaranteed to be the repo root (an earlier `cd` may have left it in a subdirectory); a bare `/private/tmp/claude/<repo-slug>/handoffs/…` would land the file under whatever subdir the shell is in. Every `mkdir`/`Write`/path below MUST be the absolute `/private/tmp/claude/<repo-slug>/…`; if it doesn't start with `/`, it's the bug.
2. Run `mkdir -p /private/tmp/claude/<repo-slug>/handoffs` as a separate Bash call.
3. Build the filename: `/private/tmp/claude/<repo-slug>/handoffs/YYYY-MM-DD-HHMM.md`. If the user passed arguments, append a short kebab slug derived from them: `YYYY-MM-DD-HHMM-<slug>.md` (e.g. `2026-07-17-1432-auth-refactor.md`). Never overwrite an existing file — every handoff is a new file. In the unlikely case the exact minute-stamped name already exists, append `-2`, `-3`, … until unused.
4. Synthesize the four (or five) fields from the current conversation.
5. Write the file.
6. Confirm with one line ending at the path — **no trailing period or other punctuation** after the path, so Ghostty ⌘-click stays clean: `Handoff written to /private/tmp/claude/<repo-slug>/handoffs/2026-07-17-1432.md`

Do not print the full handoff content to chat — just confirm the path.

## Pruning

`/private/tmp/claude/<repo-slug>/handoffs/` accumulates one file per invocation. Prune nothing yourself: macOS deletes anything under `/private/tmp` untouched for three days. A handoff worth keeping longer than that is one the user should be told to move out.
