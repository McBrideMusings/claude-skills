---
name: papercut
description: "Log and work small frictions hit while working in a repo — retried tool calls, confusing setup, flaky commands, stale caches, misleading errors, non-obvious gotchas. Three modes: author one now (`/papercut <message>` or 'log a papercut'), mine the whole session for them (`/papercut review` — Haiku subagent reads the transcript), or triage/analyze this repo's log (bare `/papercut`). Writes to <repo>/tmp/claude/papercuts.md (gitignored, per-repo). Distinct from real bugs (issues), from follow-ups, and from what got accomplished. Triggers: 'papercut', '/papercut', 'log a papercut', 'papercut review', 'mine papercuts', 'triage papercuts', 'what papercuts do we have'."
---

Papercuts are small frictions logged **in the moment** — a tool call that missed and needed a retry, a confusing or undocumented setup step, a flaky command, a stale cache, a misleading error, a non-obvious gotcha. One or two sentences: *what you were doing → what got in the way* (a guess at the cause/fix is a bonus). None are blocking; logged together they show where a repo needs sanding down.

**Not** the same as: real bugs / tracked work (GitHub issues — use `followups` or `triage`), the session summary (`summary`), or anything about what got *accomplished*.

## The writer — always route through the CLI

Every write goes through `"$HOME/.claude/tools/papercut"` so entries stay uniformly formatted (`<iso-utc> - <model> - <git-user>` header, blank line, message). Call it by that literal path even from the work profile — the tool lives in the personal profile only (`tools/` isn't symlinked into `~/.claude-work`), and the script resolves the repo root itself via git, so the path is correct regardless of `CLAUDE_CONFIG_DIR`. Never hand-edit or append to the log file directly; it writes to `<repo-root>/tmp/claude/papercuts.md`.

```
papercut -m "MODEL" "message"   # MODEL = the model that hit the friction
papercut --human "message"      # author field = human (the user reported it)
papercut --repo DIR "message"   # log against DIR instead of the current directory
```

Always quote the model id — one carrying a bracket (`claude-opus-4-8[1m]`) is a glob to zsh, and a bare one dies with `no matches found` before the tool runs.

## A fixed papercut is ALWAYS deleted

The log is a list of frictions that are still there. The moment one is fixed — by you, in this session or any other — **delete its entry**, in the same turn as the fix. This is not optional and not a tidy-up to defer: an entry that no longer bites is worse than noise, because the whole point of the log is showing where the repo still needs sanding, and a reader can't tell a live friction from a dead one without re-testing every line. Half a log of already-fixed entries is a log nobody trusts.

Delete only against a fix that actually landed in the code. Documenting a workaround, or fixing one of three things an entry describes, is not fixed — either finish it or edit the entry down to the part that still bites. If an entry is really a lesson rather than a friction ("never do X in this file"), its home is a comment where X lives, not the log; move it and delete it here.

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
3. Drop any item the session went on to fix — a friction that got sanded down two hours later is already dead, and logging it just to delete it on the next triage is busywork. The deletion rule applies on the way in, not only after.
4. For each surviving item, append it via the writer, stamping the model that was actually working the session (the current model id, e.g. `-m "opus-4.8"`), not Haiku:
   ```
   "$HOME/.claude/tools/papercut" -m "<session-model>" "<message>"
   ```
5. Report how many were appended, how many were dropped as already-fixed, and the log path. Don't dump the full list unless asked.

## Mode C — triage / analyze (bare `/papercut`)

Read `<repo-root>/tmp/claude/papercuts.md` and work it, don't just print it:

1. If the file is missing or empty, say so and stop.
2. **Sweep out anything already fixed first.** For each entry, check whether the friction still bites — the fix may have landed in any session since. Delete every entry that no longer does, and say which went and why. Do this before clustering: a dead entry distorts a cluster into looking like a repeat offender when the repo has already moved on. If checking an entry is genuinely more work than the triage itself, keep it and say you couldn't verify it — never guess it away.
3. Cluster the surviving entries by theme (shell/quoting, test cwd, CI/YAML, missing helper, stale cache, etc.). Surface the repeat offenders — the frictions that show up more than once are where sanding pays off.
3. For each cluster, state the concrete objective difference / cause and, where there is one, the fix (a helper task, an allowlist entry, a doc line, a lint step). Do not rank by ROI and do not judge severity subjectively — lay out what each is and what fixing it costs, and let the user decide.
4. Offer — do not auto-do — to promote any cluster into real tracked work: a GitHub issue / follow-up (via `followups`) for genuine bugs, or an `admin` task / doc note for setup friction. Ask in plain chat; never use `AskUserQuestion`.

## Proactive logging (agents, in the moment)

Outside this skill, the `CLAUDE.md` rule tells the agent to log papercuts as they happen with `"$HOME/.claude/tools/papercut" -m "<model>" "…"` — the fast in-the-moment path. This skill is the human-facing surface and the review/triage brain on top of that same CLI.

The deletion rule runs on the same in-the-moment footing, in the other direction: fix a friction that is already in the log — whatever you were actually working on — and delete its entry right then, without being asked and without waiting for a `/papercut` pass. Logging live and deleting live are the same discipline.
