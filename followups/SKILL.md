---
name: followups
description: "Capture follow-up items — quick 'add a followup' captures and session-end generation (also invoked by /wrap-up) — filing them as issues on the repo's tracker (beads or GitHub); a repo with neither halts and is offered `bd init`. Browsing, picking, or working an existing follow-up is `triage`, not this skill."
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

**On the repo's issue tracker, always.** A follow-up is an issue: `bd create` on beads, `gh issue create` on GitHub. There is no file.

A repo with neither backend **halts** — see [`../ref-tracker/_detect.md`](../ref-tracker/_detect.md) step 6. Say the repo has no tracker, offer `bd init`, and file nothing. Never write the items to a markdown list instead: a list nobody maintains is where follow-ups go to be forgotten, and it puts a file that must survive inside a tree that gets deleted.

---

## Modes

This skill **captures** follow-ups — it creates tracked items. *Browsing, picking, and starting* a follow-up is `triage`'s job (a follow-up is just another tracked item on the repo's tracker). So this skill has three modes, all about creating or tidying items:

| Invocation | Mode |
|---|---|
| "add a followup: …", "remember to …", "file as a followup" | Add |
| Invoked by `/wrap-up`, or "generate followups from this session" | Generate |
| "clean up resolved", "move resolved followups" | Cleanup |

**"show / list my followups", "what followups do I have", "let's work on a followup", "pick a followup"** → that is **`triage`**, not this skill. Hand off to it; don't list or start items here.

If ambiguous, assume **Add** (capture) — unless the user clearly wants to see or choose something, in which case route to `triage`.

### Add

First resolve the destination with the **same rule as Generate** (see Step 2 under Generate): **a tracker exists → the item is an issue in it; no tracker → halt and offer `bd init`.** A quick "remember to …" on a tracked repo becomes an issue.

- **`beads`** → dedup first against `bd list --all --json` (skip if the core idea already appears), then `bd create "<title>" -t task -d "<body>" --silent` with a provenance line in the body. If the item was discovered while working another issue, wire that provenance as a real edge: `--deps discovered-from:<id>`.
- **`github`** → file it as an issue. Dedup first against `gh issue list --repo OWNER/REPO --state all --limit 50` (skip if the core idea already appears), then `gh issue create --repo OWNER/REPO` with the body via HEREDOC (never an inline quoted `--body`), including a provenance line. Same mechanics as Generate's Step 5 GitHub branch.

### Cleanup (only when explicitly asked)

There is nothing to clean — follow-ups are issues, and closing them is `/wrap-up`'s job. Say so and route there.

---

## Generate — surface new follow-ups from this session

Use this mode when invoked from `/wrap-up` or when the user explicitly asks to generate or surface follow-ups from the session.

**When called from `/wrap-up`: the intent is to define new items from session context** — things that came up, were noticed, or were left unfinished. Don't just record what happened; look for what the user should do next that isn't already tracked.

### Step 1: Build context

Orient yourself:
- `git log --oneline -20` to see recent commits
- Scan the current conversation for what was built, changed, or discussed

### Step 2: Determine destination

**A real tracker whenever the repo has one — owned or not.** A repo with neither beads nor a GitHub remote has no destination: halt and offer `bd init`.

Run the resolution in [`../ref-tracker/_detect.md`](../ref-tracker/_detect.md):

- **`beads`** → the destination is the beads database. No repo argument needed; `bd` finds it.
- **`github`** → the destination is a `github.com[:/]OWNER/REPO` remote from `git remote -v`.
  - **One GitHub remote** → that `OWNER/REPO`.
  - **Several** (e.g. your fork plus a read-only upstream) → prefer the one you own: resolve your login once with `gh api user --jq .login` and pick the remote whose `OWNER` matches; if none match you, use the remote named `origin`.

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

**Never propose closing, reversing, or superseding an existing issue.** If session work obsoleted a tracked issue, surface it as an inline note before the suggestions list:

> FYI: issue #N ("<title>") appears obsoleted by this session's work — `/wrap-up` Phase 2 will catch it, or close it manually.

Same applies to stale items in this followups file — flag them inline, don't write new "remove old item" entries.

### Step 5: File

**Default — interactive** (a standalone `/implement`, a manual `/wrap-up`, or a direct `/followups`): if suggestions exist, ask once — as a plain chat question (see the **HARD RULE** at the top: no `AskUserQuestion`, no chip-picker, ever). The user replies with free-form text (numbers, ranges, "all", "none"), which the chip-picker schema can't express, and the numbered list already lives in the message above:
- **beads repo:** "Which of these should I file as beads issues? (numbers, ranges, 'all', or 'none')"
- **GitHub repo:** "Which of these should I file as GitHub issues? (numbers, ranges, 'all', or 'none')"
- **Followups file:** "Which of these should I add to the followups file? (numbers, ranges, 'all', or 'none')"

**Autonomous — only when the caller explicitly signals continuous / no-ask mode** (a `/iterate` pass, i.e. `/implement continuous`): do not ask. File every item that clears the bar (Step 3) to the destination, skipping items whose core idea already appears there. Then report what was filed. The user triages in the tracker / the followups file afterward — never pause a continuous loop to ask which to file. If no items clear the bar, report "Nothing worth flagging this session" and stop.

If no suggestions exist, just report "Nothing worth flagging this session" and stop.

**Filing:**
- **beads:** Run `bd list --all --json` first; skip items whose core idea already appears. File via `bd create "<title>" -t <task|bug|feature> --body-file <path> --silent`. Include the provenance line in the body, and add `--deps discovered-from:<id>` when the item surfaced while working a known issue. Write multi-line bodies to a file under `/private/tmp/claude/<repo-slug>/` and pass `--body-file` rather than inlining them.
- **GitHub:** Run `gh issue list --repo OWNER/REPO --state all --limit 50` first; skip items whose core idea already appears. File via `gh issue create --repo OWNER/REPO`. Include the provenance line in the body. **Always pass `--body` via HEREDOC** — never inline the body as a quoted string. A newline followed by `#` inside a quoted argument triggers a path-validation security hook. Use: `gh issue create --repo OWNER/REPO --title "..." --body "$(cat <<'EOF'\n## Section\n...\nEOF\n)"`
- **Followups file:** Append in the standard format with provenance: `- **Title** — description. (Saw this because: ...)`

If the user says "none", write nothing. Do not split items across destinations. Do not infer intent from silence.

**Multiple repos:** Present a separate list per repo and ask independently for each.

### Scope: this skill stops at filing

Do not write a handoff. Handoffs are a separate, user-invoked concern: if a user wants one, they invoke `/handoff` directly. No skill writes handoffs on the user's behalf.
