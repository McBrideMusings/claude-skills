---
name: papercut
description: "Log and work small frictions hit while working in a repo — retried tool calls, confusing setup, flaky commands, misleading errors. Three modes: author one now (/papercut <message>), mine the session (/papercut review), or triage this repo's log (bare /papercut). Writes to <repo>/.claude/papercuts.md; distinct from real bugs (issues) and follow-ups."
---

Papercuts are small frictions logged **in the moment** — a tool call that missed and needed a retry, a confusing or undocumented setup step, a flaky command, a stale cache, a misleading error, a non-obvious gotcha. One or two sentences: *what you were doing → what got in the way* (a guess at the cause/fix is a bonus). None are blocking; logged together they show where a repo needs sanding down.

**Not** the same as: real bugs / tracked work (issues on the repo's tracker — use `followups` or `triage`), the session summary (`summary`), or anything about what got *accomplished*.

## The writer — always route through the CLI

Every write goes through `"$HOME/.claude/tools/papercut"` so entries stay uniformly formatted (`<iso-utc> - <model> - <git-user>` header, blank line, message). Call it by that literal path even from the work profile — the tool lives in the personal profile only (`tools/` isn't symlinked into `~/.claude-work`), and the script resolves the repo root itself via git, so the path is correct regardless of `CLAUDE_CONFIG_DIR`. Never hand-edit or append to the log file directly; it writes to `<repo-root>/.claude/papercuts.md`. **Not under `tmp/`** — a temp root means "safe to delete after three days" and this log is the one file that must outlive that.

```
papercut -m "MODEL" "message"   # MODEL = the model that hit the friction
papercut --human "message"      # author field = human (the user reported it)
papercut --repo DIR "message"   # log against DIR instead of the current directory
papercut --path                 # print the resolved log path; writes nothing
```

Always quote the model id — one carrying a bracket (`claude-opus-4-8[1m]`) is a glob to zsh, and a bare one dies with `no matches found` before the tool runs.

## A fixed or filed papercut is ALWAYS deleted

The log is the list of frictions that are **untracked**. An entry leaves it the moment it stops being untracked — either because it got fixed, or because it became tracked work somewhere else. Both deletions happen in the same turn as the event, without being asked. This is not optional and not a tidy-up to defer: an entry that no longer bites, or that already has an issue, is worse than noise, because a reader can't tell it from a live untracked friction without re-testing every line and re-searching the issue tracker. Half a log of dead entries is a log nobody trusts.

**Fixed — the fix landed in the code.** Documenting a workaround, or fixing one of three things an entry describes, is not fixed — either finish it or edit the entry down to the part that still bites. If an entry is really a lesson rather than a friction ("never do X in this file"), its home is a comment where X lives, not the log; move it and delete it here.

**Filed — the entry became a tracked issue or a follow-up.** File it, then delete the entry, and give the issue URL in the same breath so the trail is visible. The friction is still real and still unfixed — that's exactly what the issue now records, in the place work actually gets picked up from. Keeping a copy in the log buys nothing and costs a duplicate that will drift out of sync with the issue. One friction, one home. Partial promotion follows the same rule as a partial fix: if the issue covers only part of an entry, edit the entry down to the part that isn't filed rather than deleting it whole.

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

Get the log path from the tool — `"$HOME/.claude/tools/papercut" --path` — and read exactly what it prints. Never assemble the path yourself and never go looking for the file.

The log always belongs to the MAIN checkout, so from inside a linked worktree it lives **outside the tree you are working in**. Two consequences, both of which have already bitten:

- A relative `.claude/papercuts.md` resolves to the worktree, where the file does not exist.
- Hunting for it (`find`, `ls`, a speculative `cd`) drags the shell's working directory into the main checkout, and every later edit in the session silently lands on the wrong branch.

So: read it at the absolute path `--path` printed, and do not `cd` anywhere to do it. `--path` exits 4 when there is no log yet.

Work the log, don't just print it:

1. If `--path` exits non-zero, or the file is empty, say so and stop.
2. **Sweep out anything already fixed first.** For each entry, check whether the friction still bites — the fix may have landed in any session since. Delete every entry that no longer does, and say which went and why. Do this before clustering: a dead entry distorts a cluster into looking like a repeat offender when the repo has already moved on. If checking an entry is genuinely more work than the triage itself, keep it and say you couldn't verify it — never guess it away.
3. Cluster the surviving entries by theme (shell/quoting, test cwd, CI/YAML, missing helper, stale cache, etc.). Surface the repeat offenders — the frictions that show up more than once are where sanding pays off.
4. For each cluster, state the concrete objective difference / cause and, where there is one, the fix (a helper task, an allowlist entry, a doc line, a lint step). Do not rank by ROI and do not judge severity subjectively — lay out what each is and what fixing it costs, and let the user decide.
5. Offer — do not auto-do — to promote any cluster into real tracked work: a tracked issue / follow-up (via `followups`) for genuine bugs, or an `admin` task / doc note for setup friction. Ask in plain chat; never use `AskUserQuestion`.
6. When the user takes that offer, **delete every entry you filed, in the same turn you file it** — see the deletion rule above. The issue is the entry's new home; leaving it in both places creates a duplicate that drifts. Report each deletion next to the issue URL that replaced it.

## Proactive logging (agents, in the moment)

Outside this skill, the `CLAUDE.md` rule tells the agent to log papercuts as they happen with `"$HOME/.claude/tools/papercut" -m "<model>" "…"` — the fast in-the-moment path. This skill is the human-facing surface and the review/triage brain on top of that same CLI.

The deletion rule runs on the same in-the-moment footing, in the other direction: fix a friction that is already in the log — whatever you were actually working on — and delete its entry right then, without being asked and without waiting for a `/papercut` pass. Same for filing: open an issue or follow-up that covers a logged entry, in any session and for any reason, and the entry goes in that turn. Logging live and deleting live are the same discipline.
