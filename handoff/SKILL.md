---
name: handoff
description: "Check for an existing handoff and offer to resume it, OR write a new handoff at the end of a session. Triggers: 'handoff', 'resume', 'pick up where we left off', 'save context for next time', start-of-session check, end-of-session save. Does NOT trigger on 'wrap up' or 'wrap-up' — those invoke /summarize."
---

# Handoff

Two modes, picked by **user intent first** — start-of-session vs end-of-session:

| Trigger | Mode |
|---|---|
| Session start; user says "resume", "pick up", "continue", or skill runs at SessionStart | Resume |
| User says "handoff", "save context for next time", bare "/handoff", or skill is invoked by `followups` Step 6 | Write |

Bare `/handoff` always routes to Write — overwrite any existing file without asking. File presence does not route to Resume; only explicit resume-intent keywords do.

---

## Contract (load-bearing for sibling skills)

Sibling skills (`followups`, `triage`, `iterate`) depend on the following. Do not change without updating those skills.

- **Path:** `<repo-root>/tmp/claude/handoffs.md` (single-slot; one handoff per repo, `<repo-root>` = `git rev-parse --show-toplevel`)
- **Frontmatter keys:** `created` (format `YYYY-MM-DD HH:MM`), `project`
- **Body field names (verbatim):** `What we were working on`, `Key decisions`, `Discoveries`, `Immediate next step`, plus optional `Suggested next skills`
- **Forward compatibility:** sibling skills must tolerate (or ignore) body fields beyond the four required ones. Don't blow up on unknown fields — they may be additions.
- **Deletion handshake:** delete on resume completion. Interactive callers confirm first; autonomous callers (`iterate`) delete without prompting once the work the handoff points at is fulfilled.
- **Overwrite handshake:** always overwrite without prompting — the user invoked the command, that's confirmation enough.

---

## Resume mode

1. Run `git rev-parse --show-toplevel` to get `<repo-root>`. If not in a git repo, say "No handoff found." and stop.
2. Read `<repo-root>/tmp/claude/handoffs.md`. If missing, say "No handoff found." and stop.
3. If the file is malformed (missing frontmatter or any of the four body fields), surface the parse error, show the raw contents, and ask the user what to do — do not auto-discard.
4. Surface the key points in chat and ask:

   > "Found a handoff from [date]. It says we were working on [1-sentence summary]. Want to pick up where we left off, or start fresh?"

5. Wait for the answer:
   - **Yes / continue** → summarize the "Immediate next step" field, then:
     - Interactive caller: confirm before deleting the file.
     - Autonomous caller (`iterate`): proceed without prompting; delete after the pointed-at work is committed.
   - **No / start fresh** → ask whether to overwrite with a new handoff (proceed to Write mode below) or discard.

---

## Write mode

Capture four required fields and one optional fifth.

**Don't duplicate content already captured in other artifacts** — PRDs, plans, ADRs, issues, commits, diffs. Reference them by path or URL. Capture only the **invisible context** that isn't in the code or those artifacts (e.g. "we ruled out approach A because the JWT lib doesn't expose a refresh hook").

1. **What we were working on** — 1–2 sentences. The specific task or problem, not just the feature name.
2. **Key decisions** — what choices were made and *why*. Especially alternatives ruled out.
3. **Discoveries** — constraints, gotchas, or facts learned mid-session that aren't obvious from reading the code.
4. **Immediate next step** — the exact thing to do first when resuming. Specific enough to act on without re-reading the conversation. Include open blockers/questions here if they shape the next step.
5. **Suggested next skills** *(optional)* — 0–2 skills the next session is likely to invoke, inferred from the Immediate next step. e.g. *"/tdd, /diagnose"*. Omit the field entirely when no clear match.

### File format

```markdown
---
created: YYYY-MM-DD HH:MM
project: <basename of cwd>
---

**What we were working on:** <1–2 sentences>

**Key decisions:** <bullet or prose — include the why>

**Discoveries:** <anything non-obvious that isn't in the code>

**Immediate next step:** <specific enough to act on immediately>

**Suggested next skills:** </tdd, /diagnose>   ← omit this line entirely if no clear match
```

### Write procedure

1. Run `git rev-parse --show-toplevel` to get `<repo-root>`. If not in a git repo, use `pwd`.
2. Ensure `tmp/` is in `<repo-root>/.gitignore` (Read the file; if absent, Edit to add `tmp/` on its own line).
3. Run `mkdir -p <repo-root>/tmp/claude` as a separate Bash call.
4. If `<repo-root>/tmp/claude/handoffs.md` already exists: overwrite it. Do not ask.
5. Synthesize the four fields from the current conversation.
6. Write the file to `<repo-root>/tmp/claude/handoffs.md`.
7. Confirm with one line ending at the path — **no trailing period or other punctuation** after the path, so Ghostty ⌘-click stays clean: `Handoff written to <repo-root>/tmp/claude/handoffs.md`

Do not print the full handoff content to chat — just confirm the path.
