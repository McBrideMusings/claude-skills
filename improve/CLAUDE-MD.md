# Aspect: `claude-md` (native)

Whether a `CLAUDE.md` is actually going to be read and obeyed. Distinct from `layout` (owned by `bootstrap`), which only asks whether the file exists in the right place.

Two modes:

- **Rebuild** — the default for an interactive run. Empty the file and put every rule back only if it earns its place, with git history as the safety net. Below.
- **Audit** — findings-only, for `improve`'s survey fan-out. No writes, no questions. [Jump to it](#audit-mode).

## Why rebuild instead of edit

Boris Cherny, on stage at Y Combinator, on cutting 80% of Claude Code's own system prompt: *"For people using Claude Code, every 6 months delete your CLAUDE.md. Delete your skills. Delete your hooks. See what the model does and it might surprise you."* Anthropic's own ceiling: *"target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence."*

Editing preserves the sunk cost. Rebuilding forces every rule to re-argue for itself. Three things a bloated file costs at once: **tokens** (paid every session, relevant or not), **accuracy** (contradicting rules resolve arbitrarily and you never see which won), **attention** (the file goes in first, so every line pushes the real request further from the edge the model reads carefully — *Lost in the Middle*).

Git history is what makes the deletion safe. Never run this on a file git can't recover.

## Two files, two jobs

Which one you're rebuilding changes what belongs in it. Establish this before Phase 1.

| | **Global** (`~/.claude/CLAUDE.md`) | **Project** (`<repo>/CLAUDE.md`) |
| --- | --- | --- |
| Holds | Voice, judgment, permission gates, git policy, how to dispatch work, environment, a knowledge map | What the project is in two lines, the commands table, where things live, project-specific conventions, domain vocabulary, gotchas that have actually bitten |
| Never holds | Anything about one project | **Anything the global file already says** |
| Size threshold | ~3,000 words | ~1,200 words |
| Audience | Just the user | On a collaborative repo, teammates and their agents too — so no personal preferences |
| Structure owner | This file | `bootstrap` — defer to its layout rather than inventing a competing one |

**The hard rule for a project rebuild: read the global `CLAUDE.md` first, then delete everything the project file restates.** A project file repeating "commit straight to main" or "write short sentences" is pure duplication, and duplication *across* two files is worse than within one — you can't see both at once to notice they've drifted apart.

## Phase 1 — Commit the current file, don't copy it

A tracked `CLAUDE.md` is already archived: every version is in `git log`, with a commit message explaining why each rule arrived. Copying it to `docs/archive/` stores a second copy of something git holds better. Don't.

So Phase 1 is only: **make sure the working tree is clean and the current file is committed** before editing. That's the whole safety requirement.

`CLAUDE.md` is always supposed to be tracked. If it isn't, that's the bug — `git add` it and commit before starting, and say you did. Don't design around an untracked file and don't make a backup copy instead.

## Phase 2 — Measure

Report words and estimated tokens **per section**, not line count. Line count lies: a file can sit under the 200-line ceiling while carrying 6,000 words in enormous bullets.

```python
import re
t = open(path).read()
for p in re.split(r'\n(?=## )', t):
    w = len(p.split())
    print(f"{w:5d}  {int(w*1.35):6d}tok  {p.split(chr(10))[0][:60]}")
```

The biggest section is almost always the one nobody defends. Lead the conversation with the table.

**Thresholds.** Past ~3,000 words (~4,000 tokens) a file is due for a prune; past ~4,500, recommend a full rebuild rather than a trim. Claude offers this unprompted rather than waiting to be asked — that standing instruction belongs in the rebuilt `CLAUDE.md` itself, not only here, or it only fires when someone already suspected the problem.

## Phase 3 — Inventory what already enforces behavior

Before judging a single rule, count what fires with an **empty** CLAUDE.md. Any rule already covered here is a delete, not a keep — a second copy is the contradiction problem, not a safety net.

- **Hooks** — `jq '.hooks' settings.json settings.local.json`
- **Skills** — descriptions auto-load; a rule restating a skill's own description is dead weight
- **`MEMORY.md`** — auto-memory entries are already in context every session
- **The session's own system prompt** — read it. It may already carry the rule (in this repo it already capped subagent spawning and workflow use)
- **`docs/`** — and check whether anything actually routes to it

## Phase 4 — Ask what breaks when the file is empty

**One question, before showing the user any old text:** *with nothing in CLAUDE.md, what are the three things I'd get wrong that would cost you a session?* From memory — not from the file.

Attach your own prediction so they can disagree instead of starting cold. Their answer becomes the priority order, and whatever they can't name from memory is a deletion candidate: they wrote it, they live with it, and if it isn't in their head it probably wasn't paying rent.

## Phase 5 — Read the file's own history

```
git log --follow --format='%h|%ad|%s' --date=short -- CLAUDE.md
git log --follow -p -- CLAUDE.md          # when you need the actual wording back
git show <sha>:CLAUDE.md                  # any past version, whole
```

The log beats a folder of snapshots because each commit message carries **why** the rule arrived. A line like `Ask a decision once, then only name it as open rather than restating it` tells you what the author was trying to fix — a snapshot only tells you the text existed.

Carry-over across versions is the strongest evidence available and costs one command:

- **Survived every rewrite** → load-bearing. Keep without re-litigating.
- **Removed once, added back later** → the removal was wrong. Mark it permanent, say so out loud, and don't put it up for a vote again.
- **Added once, gone since, never returned** → safe to leave out.
- **Only in the most recent commits** → new and untested. Fair game.

A file with three commits yields little. Say that plainly rather than dressing up a two-version diff as a trend.

## Phase 6 — Triage, section by section, as tables

One table per section. One verdict per rule, from exactly five:

| Verdict | When |
| --- | --- |
| **Keep** | Changes behavior, nothing else enforces it, can't be mechanized |
| **Compress** | Right rule, three times the words it needs. Cut the worked examples and the rant |
| **→ hook** | Guard-shaped: a check on a command string, a path, an argument. Deterministic |
| **→ doc / skill** | Domain knowledge that only matters for one kind of task. Replace with one routing line |
| **Delete** | Already enforced elsewhere, model-default behavior, role padding, or vague enough to change nothing |

Present the whole section's table at once and let the user answer by exception. That is far faster than one question at a time, and it's how this method was actually validated.

**Specific things to hunt:**

- **Guard-shaped rules → hooks.** Anything phrased as "never type X" is a string test. This is the single largest reduction available; one repo's shell-ban section was 900 words that a hook replaces entirely.
- **Role padding** — "you are an expert with 20 years of experience". Optional now. Delete unless it demonstrably changes output.
- **Verify-twice rules** — "always double-check your work". The model self-corrects; this pays for the work twice.
- **"Only flag the big issues"** — taken literally, you get told less than you wanted. Invert: report everything, the user filters.
- **"Don't overthink"** — rules against thinking make internal tags leak into the answer. Cut.
- **Linter territory** — formatting a formatter already enforces.
- **Inline code snippets** that will drift from the real implementation. Substitute a path the model can go read.
- **Vague instructions** — "follow best practices", "leverage the X agent". Not concrete enough to change behavior.

### Is it hookable?

Run this on every rule before assigning any other verdict — routing to a hook is the largest reduction available and the only verdict that makes a rule *more* enforced rather than less.

Hookable when **all** of these hold:

1. **Decidable from the tool call alone** — the command string, file path, or arguments settle it. No reading of intent required.
2. **Names a literal pattern** to require or avoid: an unquoted `*`, a `cd` outside a subshell, a `{...}` refspec, a `Co-Authored-By` trailer, a specific tool.
3. **A matcher exists** — `PreToolUse` on `Bash`, `Read`, `Write`, `Artifact`, or an MCP tool name.

Not hookable when the rule turns on judgment: *significantly altering*, *unrelated code*, *worth doing*, *the simplest thing*. No string test decides those; they stay prose.

**The strongest signal is escalation in the prose itself.** A rule wearing ⛔, HARD BAN, ALWAYS, NEVER, or a paragraph explaining how badly it went last time is a rule that prose has already failed to enforce — the author kept adding emphasis because repetition wasn't working. In this repo every single ⛔/HARD BAN item was guard-shaped and hookable. Sort the file by emphasis and you have your hook backlog.

Then apply the false-positive test from Phase 7 before promising the conversion. A rule that can't be pattern-matched without blocking legitimate work stays prose, and you say why.

**Never cut a truth rule.** "Only claim what you verified", "flag uncertainty", "never cite a source you haven't read" — those stop invented facts, they aren't severity filters. They stay whatever else goes.

## Phase 7 — Build every hook before deleting its prose

**Hard gate. A rule routed to a hook stays in the file until its hook is written, tested, and registered.** Delete first and you get the worst of both: no words, no enforcement, and nobody notices for weeks. This has already happened once in this repo.

For each hook:

1. Write it to `hooks/<name>.sh`. Match the existing convention: read stdin, `jq -r '.tool_input.command'`, emit a `permissionDecision: "deny"` with a reason that teaches the fix.
2. **Design against false positives, and say what legitimate work it could block.** A hook banning the word "Claude" in commit messages breaks a repo whose subject *is* Claude. Match the boilerplate, never the topic.
3. Test a matrix of should-allow and should-block cases, including the user's real historical commands. Show the results.
4. Register in `settings.json`, and commit that alongside the hook file — in `~/.claude` both are tracked, so a hook committed without its registration is inert on every other machine.

## Phase 8 — Author what was never written down

Emptying the file exposes gaps the old one never covered. Ask directly, near the end, while the user is already thinking in rules:

- What do you correct me on repeatedly that isn't in here?
- What did you assume I knew?
- Anything you've told me three times in a session? *(Worth a standing rule: if I ask for the same thing three times, say so and propose a hook.)*

In this repo that phase produced five rules that had never existed: the project-local `verify` skill requirement, model tiering by task complexity, orchestration-by-default in a multi-pane environment, proactive doc upkeep, and history-awareness itself.

## Phase 9 — Order for attention, then write

The model reads the beginning and end carefully and skims the middle. Put what fires on every single turn — voice, how to talk to the user — at the top. Put conditional and rarely-triggered material at the bottom.

Wrap domain-specific sections in `<important if="...">` so the model can tell what applies:

```
<important if="you are running inside herdr (HERDR_ENV=1)">
```

Conditions must be **narrow**. `you are writing or modifying any code` matches everything and is functionally unwrapped. If you have not seen a given condition fire, say so — it's the documented mechanism, not a verified one.

End the file with a **knowledge map**: a table of where domain knowledge lives and when to read it. This is what lets the file stay short without losing anything — one line replaces a section.

Carry the history-awareness section forward into every rebuild, or the next rebuild deletes the mechanism that makes rebuilds safe.

## Phase 10 — Report honestly

- Before and after: words, tokens, percent cut.
- The honest count: *"6,076 words in. 12 deletes, 9 compressions, 7 routed, 1 hook built."*
- **What you could not check, marked NOT RUN.** Never a clean bill you didn't earn. In this repo that included: whether the `herdr` and `admin` skills actually contain the rules deleted on the assumption they did, and whether `<important if>` fires.
- Duplicates now sitting in both `MEMORY.md` and `CLAUDE.md`.
- Every hook approved but not yet built, named individually.

If most of the file should go, say so plainly. The scaffolding the user is proudest of is the likeliest casualty.

---

## Audit mode

For `improve`'s survey fan-out: no writes, no commits, no questions. Run phases 2, 3, 5, and 6 read-only and return findings.

Each finding: the **gap** (what's flat, duplicated, guard-shaped, stale, or vague), **evidence** (the actual line quoted — never a generic complaint), **fix** (the concrete rewrite: narrowed condition, the hook to write, the path to substitute), **strength** (`Strong` / `Worth exploring` / `Speculative`). Card fields per [HTML-REPORT.md](HTML-REPORT.md).

Read the file in full before judging it. A finding that doesn't quote the repo's own `CLAUDE.md` isn't a finding.
