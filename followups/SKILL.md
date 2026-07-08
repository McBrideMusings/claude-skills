---
name: followups
description: "Capture follow-up items — quick 'add a followup' captures and session-end generation (also invoked by /wrap-up) — filing them as GitHub issues, or to a local file when there's no GitHub remote. Browsing, picking, or working an existing follow-up is `triage`, not this skill."
---

Use when the user asks to add a follow-up ("remember to …", "file as a followup") or to generate/surface new follow-ups from the session (also invoked by `/wrap-up`). To **browse, pick, or start** an existing item, that's `triage` — a follow-up is just another tracked item triage reads. This skill only **creates** items.

> ### HARD RULE — never use `AskUserQuestion` / the chip-picker selector
>
> **Scope:** this governs *this skill's own filing prompt* — the standalone "which of these should I file?" question in Step 5, where answers are free-form and filing is the only action. When `wrap-up` invokes this skill it runs **Generate mode only** (Steps 1–4); `wrap-up` Step A then owns the **Fix now / File / Skip** dispositions, which it also collects as a single batched free-text reply over all candidates — *not* `AskUserQuestion` — so the same no-widget rule applies there.
>
> **Every prompt this skill makes is a plain chat question typed into the message body. NEVER call the `AskUserQuestion` tool, and NEVER render a selector / multi-select / chip-picker UI of any kind — not for "which to file", not for anything.** This is not a stylistic preference; the chip-picker is *wrong here* and breaks the skill:
> - Answers are free-form — item **numbers, ranges, "all", "none"** — which the fixed-option chip schema literally cannot express.
> - The numbered candidate list already lives in the chat message above the question, so a picker just duplicates it.
> - A selector turns "which should I file?" into a list of pre-checked actions, which reads as *intent to act* — exactly the misfire that files issues the user never asked for.
>
> If you are about to reach for `AskUserQuestion` anywhere in this skill: stop. Write the list as plain markdown, then ask the question as one plain sentence and wait for a free-form reply.

## Where followups live

`<repo-root>/tmp/claude/followups.md` — one file per repo, inside the project itself (gitignored).

**The path is ABSOLUTE from the repo root — never a cwd-relative `tmp/…`.** The Bash working directory is NOT guaranteed to be the repo root (an earlier `cd` may have left it in a subdirectory), so a bare `tmp/claude/followups.md` would land the file under whatever subdir the shell is in — a different, wrong location a later session won't find. Resolve the root in **one Bash call** — `git rev-parse --show-toplevel` — and capture the absolute result; append `/tmp/claude/followups.md`. If that errors/empty (not a git repo), use the absolute output of `pwd` as the root. Never nest `$(...)`. Every `mkdir`/`Write`/path MUST be the absolute `<root>/tmp/claude/followups.md`; if it doesn't start with `/`, it's the bug.

Before writing: ensure `tmp/` is in the root `.gitignore` (Read it; if `tmp/` is absent, Edit to add `tmp/` on its own line). Then `mkdir -p <root>/tmp/claude` as a separate Bash call.

## File format

```markdown
## <branch-name> — YYYY-MM-DD-HH-MM

- **Title** — One sentence description.
```

Append-only for new items. Existing items are only moved to a `## Resolved` section during explicit Cleanup mode — never edited or deleted in place.

---

## Modes

This skill **captures** follow-ups — it creates tracked items. *Browsing, picking, and starting* a follow-up is `triage`'s job (a follow-up is just another tracked item triage reads across GitHub issues, the local followups file, and the handoff). So this skill has three modes, all about creating or tidying items:

| Invocation | Mode |
|---|---|
| "add a followup: …", "remember to …", "file as a followup" | Add |
| Invoked by `/wrap-up`, or "generate followups from this session" | Generate |
| "clean up resolved", "move resolved followups" | Cleanup (local-file only) |

**"show / list my followups", "what followups do I have", "let's work on a followup", "pick a followup"** → that is **`triage`**, not this skill. Hand off to it; don't list or start items here.

If ambiguous, assume **Add** (capture) — unless the user clearly wants to see or choose something, in which case route to `triage`.

### Add

First resolve the destination with the **same rule as Generate** (see Step 2 under Generate): **a GitHub remote → the item is a GitHub issue; no GitHub remote → the local file.** A quick "remember to …" on a GitHub repo becomes an issue, not a file entry.

- **GitHub repo** → file it as an issue. Dedup first against `gh issue list --repo OWNER/REPO --state all --limit 50` (skip if the core idea already appears), then `gh issue create --repo OWNER/REPO` with the body via HEREDOC (never an inline quoted `--body`), including a provenance line. Same mechanics as Generate's Step 5 GitHub branch.
- **No GitHub remote** → append a new dated section to the followups file with the current branch and timestamp, skipping items whose title or core idea already appears.

### Cleanup (only when explicitly asked; local-file only)

Relevant only when there's no GitHub remote and items live in `followups.md`: move completed items to a `## Resolved` section at the bottom — never delete. On a GitHub repo there's nothing to clean here — follow-ups are issues, and closing them is `/wrap-up`'s job.

---

## Generate — surface new follow-ups from this session

Use this mode when invoked from `/wrap-up` or when the user explicitly asks to generate or surface follow-ups from the session.

**When called from `/wrap-up`: the intent is to define new items from session context** — things that came up, were noticed, or were left unfinished. Don't just record what happened; look for what the user should do next that isn't already tracked.

### Step 1: Build context

Orient yourself:
- `git log --oneline -20` to see recent commits
- Scan the current conversation for what was built, changed, or discussed

### Step 2: Determine destination

**GitHub issues whenever the repo has a GitHub remote — owned or not.** The followups file is only a fallback for when there's no GitHub remote (or it isn't a git repo). That is the *single* reason to use the file.

```
git remote -v
```

Scan for a `github.com[:/]OWNER/REPO` remote:

- **One GitHub remote** → that `OWNER/REPO` is the destination.
- **Several** (e.g. your fork plus a read-only upstream) → prefer the one you own: resolve your login once with `gh api user --jq .login` and pick the remote whose `OWNER` matches; if none match you, use the remote named `origin`.
- **None** → `<repo-root>/tmp/claude/followups.md`.

### Step 3: Compile suggestions

**Zero items is a valid result.** Don't pad — but there's no cap either: no item count is inherently "too many," and a high count is not a reason to trim. The only gate is the quality bar below; every item that clears it ships, however many that is.

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

### Step 5: File

**Default — interactive** (a standalone `/iterate`, a manual `/wrap-up`, or a direct `/followups`): if suggestions exist, ask once — as a plain chat question (see the **HARD RULE** at the top: no `AskUserQuestion`, no chip-picker, ever). The user replies with free-form text (numbers, ranges, "all", "none"), which the chip-picker schema can't express, and the numbered list already lives in the message above:
- **GitHub repo:** "Which of these should I file as GitHub issues? (numbers, ranges, 'all', or 'none')"
- **Followups file:** "Which of these should I add to the followups file? (numbers, ranges, 'all', or 'none')"

**Autonomous — only when the caller explicitly signals continuous / no-ask mode** (a `/iterate-loop` pass, i.e. `/iterate continuous`): do not ask. File every item that clears the bar (Step 3) to the destination, skipping items whose core idea already appears there. Then report what was filed. The user triages in GitHub / the followups file afterward — never pause a continuous loop to ask which to file. If no items clear the bar, report "Nothing worth flagging this session" and stop.

If no suggestions exist, just report "Nothing worth flagging this session" and stop.

**Filing:**
- **GitHub:** Run `gh issue list --repo OWNER/REPO --state all --limit 50` first; skip items whose core idea already appears. File via `gh issue create --repo OWNER/REPO`. Include the provenance line in the body. **Always pass `--body` via HEREDOC** — never inline the body as a quoted string. A newline followed by `#` inside a quoted argument triggers a path-validation security hook. Use: `gh issue create --repo OWNER/REPO --title "..." --body "$(cat <<'EOF'\n## Section\n...\nEOF\n)"`
- **Followups file:** Append in the standard format with provenance: `- **Title** — description. (Saw this because: ...)`

If the user says "none", write nothing. Do not split items across destinations. Do not infer intent from silence.

**Multiple repos:** Present a separate list per repo and ask independently for each.

### Scope: this skill stops at filing

Do not prompt to pin a handoff and do not write `<cwd>/.claude/handoff.local.md`. Handoffs are the caller's responsibility: `iterate` writes one conditionally at the end of an autonomous pass; manual `/wrap-up` writes none. If a user wants a handoff in a manual session, they invoke `/handoff` directly.
