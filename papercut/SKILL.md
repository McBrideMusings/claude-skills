---
name: papercut
description: "Log and work small frictions hit while working in a repo — retried tool calls, confusing setup, flaky commands, stale caches, misleading errors, non-obvious gotchas. Three modes: author one now (`/papercut <message>` or 'log a papercut'), mine the whole session for them (`/papercut review` — Haiku subagent reads the transcript), or triage/analyze this repo's log (bare `/papercut`). Writes to <repo>/tmp/claude/papercuts.md (gitignored, per-repo). Distinct from real bugs (issues), from follow-ups, and from what got accomplished. Triggers: 'papercut', '/papercut', 'log a papercut', 'papercut review', 'mine papercuts', 'triage papercuts', 'what papercuts do we have'."
---

Papercuts are small frictions logged **in the moment** — a tool call that missed and needed a retry, a confusing or undocumented setup step, a flaky command, a stale cache, a misleading error, a non-obvious gotcha. One or two sentences: *what you were doing → what got in the way* (a guess at the cause/fix is a bonus). None are blocking; logged together they show where a repo needs sanding down.

**Not** the same as: real bugs / tracked work (GitHub issues — use `followups` or `triage`), the session summary (`summary`), or anything about what got *accomplished*.

## The writer — always route through the CLI

Every write goes through `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/tools/papercut` so entries stay uniformly formatted (`<iso-utc> - <model> - <git-user>` header, blank line, message). Never hand-edit or append to the log file directly. The script resolves the repo root itself and writes to `<repo-root>/tmp/claude/papercuts.md`.

```
papercut [-m MODEL] "message"   # MODEL = the model that hit the friction
papercut --human "message"      # author field = human (the user reported it)
```

## Mode A — author one (`/papercut <message>`, "log a papercut …")

The user is reporting a friction they hit. Run the writer with `--human` and their message verbatim (lightly cleaned to the *what you were doing → what got in the way* shape if rambling — don't invent detail):

```
"$HOME/.claude/tools/papercut" --human "<message>"
```

Confirm with the one-line path the script prints. Nothing else — no summary, no offer to do more.

## Mode B — mine the session (`/papercut review`)

User-triggered only — **never run this unprompted.** Reads the current session transcript with a cheap model and appends every friction it finds.

1. Locate the current session transcript: newest `*.jsonl` under `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/` whose directory slug matches the current working directory. (`ls -t` the candidates; take the most recent.)
2. Spawn a **Haiku** subagent (`Agent` with `subagent_type: general-purpose`, `model: haiku`) pointed at that transcript path. Instruct it to extract papercuts only — moments of friction as defined above — and return a JSON array of objects `{message}`, each one to two sentences in the *what you were doing → what got in the way* shape. Tell it to skip real bugs, accomplishments, and anything blocking; return `[]` if none.
3. For each returned item, append it via the writer, stamping the model that was actually working the session (the current model id, e.g. `-m opus-4.8`), not Haiku:
   ```
   "$HOME/.claude/tools/papercut" -m <session-model> "<message>"
   ```
4. Report how many were appended and the log path. Don't dump the full list unless asked.

## Mode C — triage / analyze (bare `/papercut`)

Read `<repo-root>/tmp/claude/papercuts.md` and work it, don't just print it:

1. If the file is missing or empty, say so and stop.
2. Cluster the entries by theme (shell/quoting, test cwd, CI/YAML, missing helper, stale cache, etc.). Surface the repeat offenders — the frictions that show up more than once are where sanding pays off.
3. For each cluster, state the concrete objective difference / cause and, where there is one, the fix (a helper task, an allowlist entry, a doc line, a lint step). Do not rank by ROI and do not judge severity subjectively — lay out what each is and what fixing it costs, and let the user decide.
4. Offer — do not auto-do — to promote any cluster into real tracked work: a GitHub issue / follow-up (via `followups`) for genuine bugs, or an `admin` task / doc note for setup friction. Ask in plain chat; never use `AskUserQuestion`.

## Proactive logging (agents, in the moment)

Outside this skill, the `CLAUDE.md` rule tells the agent to log papercuts as they happen with `"$HOME/.claude/tools/papercut" -m <model> "…"`. This skill is the human-facing surface and the review/triage brain; the bare CLI call is the fast in-the-moment path. Both are the same tool — the skill just adds mining and triage on top.
