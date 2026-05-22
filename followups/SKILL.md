---
name: followups
description: "View, add, generate, or act on follow-up items for the current project."
---

Use when the user mentions "follow-ups" / "followups", asks to generate or surface new follow-ups from the session, or wants to view or act on existing items.

## Where followups live

`<repo-root>/tmp/claude/followups.md` — one file per repo, inside the project itself (gitignored).

Resolve the path in **one Bash call** — `git rev-parse --show-toplevel 2>/dev/null` — then append `/tmp/claude/followups.md`. If that returns empty (not in a git repo), fall back to `pwd` — the file lands at `./tmp/claude/followups.md` relative to the current directory. Never nest `$(...)`.

Before writing: ensure `tmp/` is in the root `.gitignore` (Read it; if `tmp/` is absent, Edit to add `tmp/` on its own line). Then `mkdir -p <root>/tmp/claude` as a separate Bash call.

## File format

```markdown
## <branch-name> — YYYY-MM-DD-HH-MM

- **Title** — One sentence description.
```

Append-only for new items. Existing items are only moved to a `## Resolved` section during explicit Cleanup mode — never edited or deleted in place.

---

## Modes

Pick the mode from the invocation:

| Invocation | Mode |
|---|---|
| "show / list / view my followups", "what followups do I have" | View |
| "add a followup: …", "remember to …", "file as a followup" | Add |
| "let's work on a followup", "pick a followup", "act on followups" | Act |
| Invoked by `/wrap-up`, or "generate followups from this session" | Generate |
| "clean up resolved", "move resolved followups" | Cleanup |

If ambiguous, default to View.

### View

Read the file and display or summarize its contents. If it doesn't exist, say so.

### Add

Append a new dated section with the current branch and timestamp. Read the file first and skip items whose title or core idea already appears — no duplicates.

### Act

Present the list of existing items and help the user prioritize or start on whichever they choose.

### Cleanup (only when explicitly asked)

Move completed items to a `## Resolved` section at the bottom — never delete.

---

## Generate — surface new follow-ups from this session

Use this mode when invoked from `/wrap-up` or when the user explicitly asks to generate or surface follow-ups from the session.

**When called from `/wrap-up`: the intent is to define new items from session context** — things that came up, were noticed, or were left unfinished. Don't just record what happened; look for what the user should do next that isn't already tracked.

### Step 1: Build context

Orient yourself:
- `git log --oneline -20` to see recent commits
- Scan the current conversation for what was built, changed, or discussed

### Step 2: Determine destination

Decide where items will be filed — GitHub issues or this followups file.

GitHub issues are only used when a remote is owned by `McBrideMusings` (case-insensitive). Otherwise the followups file is the destination.

Check local remotes only:

```
git remote -v
```

Scan output for `github.com[:/]McBrideMusings/` (case-insensitive). If a match exists, that remote's `OWNER/REPO` is the destination. If multiple match, prefer the remote named `mine` (convention: forks of others' repos use `origin` for upstream and `mine` for the personal fork). No `gh` API calls needed for the check.

If no remote matches, destination is `<repo-root>/tmp/claude/followups.md`.

### Step 3: Compile suggestions

**Zero items is a valid result.** Don't pad. Most sessions produce 0–2 items. More than 3 should make you suspicious.

Surface things the user **wouldn't catch from glancing at the diff** — that's the entire value here.

#### Bar each item must clear

Every item must clear **all** of:

1. **Concrete and actionable** — a specific thing to do, not "consider improving X."
2. **Provenance** — cite the specific observation that surfaced it, with file:line where possible. If you can't write a real provenance line, the item doesn't ship.
3. **Non-trivial** — non-obvious from the diff, OR surfaced organically while working.

#### Categories

Group under these headings. Omit empty ones. Order by impact within each.

- **Bugs** — broken behavior
- **Risks** — working-but-costly (perf, structural fragility, fragile coupling)
- **Features** — new capability. Items anchored to friction observed this session get `[friction]` and are listed first within Features

#### Headline pattern

Lead with the single most valuable item as a headline. If nothing is worth flagging:

> Nothing worth flagging this session.

That is a complete, valid output.

#### Item format

```
1. **Title** — One sentence: what to do and why it matters.
   Saw this because: <specific observation, file:line if possible>.
```

Friction items:
```
1. [friction] **Title** — Description.
   Saw this because: <the friction moment>.
```

Number items with a single sequence across all sections.

### Step 4: Anti-pattern guard

**Never propose closing, reversing, or superseding an existing issue.** If session work obsoleted a GitHub issue, surface it as an inline note before the suggestions list:

> FYI: issue #N ("<title>") appears obsoleted by this session's work — `/wrap-up` Phase 2 will catch it, or close it manually.

Same applies to stale items in this followups file — flag them inline, don't write new "remove old item" entries.

### Step 5: Ask and file

If suggestions exist, ask once:
- **McBrideMusings repo:** "Which of these should I file as GitHub issues? (numbers, ranges, 'all', or 'none')"
- **Followups file:** "Which of these should I add to the followups file? (numbers, ranges, 'all', or 'none')"

If no suggestions exist, just report "Nothing worth flagging this session" and stop.

**Filing:**
- **GitHub:** Run `gh issue list --repo OWNER/REPO --state all --limit 50` first; skip items whose core idea already appears. File via `gh issue create --repo OWNER/REPO`. Include the provenance line in the body.
- **Followups file:** Append in the standard format with provenance: `- **Title** — description. (Saw this because: ...)`

If the user says "none", write nothing. Do not split items across destinations. Do not infer intent from silence.

**Multiple repos:** Present a separate list per repo and ask independently for each.

### Scope: this skill stops at filing

Do not prompt to pin a handoff and do not write `<cwd>/.claude/handoff.local.md`. Handoffs are the caller's responsibility: `iterate` writes one conditionally at the end of an autonomous pass; manual `/wrap-up` writes none. If a user wants a handoff in a manual session, they invoke `/handoff` directly.
