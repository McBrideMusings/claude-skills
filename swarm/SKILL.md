---
name: swarm
description: "Run several coding agents at once, each in its own herdr space (Terminal.app window outside herdr), wait for all of them, and report one combined summary. Workers can mix vendors and models — claude:sonnet beside codex. Use for 'open N panes and do X, Y, Z, then report back', 'have one agent review while another writes a status update', 'run these in parallel and summarize'."
---

# Swarm

`swarm` fans one request out to several workers and folds their answers into one reply in
this pane. Each worker is a plain `dispatch exec` — the [`dispatch`](../dispatch/SKILL.md)
skill owns the surface, the outfile contract and the waiting. `swarm` owns only three
things: the manifest, starting the workers together, and the combined summary.

A swarm is always **report-back** ([TARGETS.md](../dispatch/TARGETS.md) § Who feeds the
result back): the user asked for the combined answer, so this session waits, reads every
outfile, and reports. Name that mode, the worker count and the surfaces in the first status
line.

## When a swarm is the right call

- Two or more briefs that do not depend on each other's results.
- At least one reason from TARGETS.md § The order applies: a non-Claude model, a run the
  user wants to watch or steer, or work that must outlive this session. Parallel Claude-only
  work that needs none of those is the in-session `Agent` tool, several calls in one message.
- Briefs that depend on each other are a sequence, not a swarm. Run them one after another.

## Steps

**1. Write one brief per worker** to `<scratch>/swarm/<label>.md`, where `<scratch>` is
`~/.claude/tools/repo-slug --path`. Each brief stands alone: the worker has none of this
conversation. Name the repo, the files, the question, and the shape of the answer you want
back. Rules from dispatch carry over:

- Never write `/<skill>` — the worker receives plain text. Write "call `Skill(<name>)`
  first, then …".
- A read-only worker (status, review, research) can share the checkout. **A worker that
  edits files gets its own linked worktree**, named in the manifest's `dir` column. Two
  workers editing one checkout corrupt each other's work. Worktree and `SELF-LAND` rules are
  in TARGETS.md.
- Say "Mode: report-back" in each brief, so the worker ends at its answer (and, for an
  implementing worker, at a commit), not at a line for a human reader.

**2. Write the manifest** to `<scratch>/swarm/manifest`, one worker per line:

```
# label     agent[:model]   brief-file                         [dir]
status      claude:sonnet   /private/tmp/claude/x/swarm/status.md
review      codex           /private/tmp/claude/x/swarm/review.md
```

`agent` is one of dispatch's vendors: `claude`, `codex`, `reasonix`. `:model` is
claude-only. `reasonix` is not in herdr's `--kind` list, so it always opens a Terminal.app
window, even inside herdr. Pick the model per the global Sonnet/Opus/Haiku rule and state
it per worker in the status line.

**3. Gate it.** `swarm check <manifest>` runs `dispatch check` once per distinct vendor and
prints one row per worker: label, agent, the surface `dispatch` will use, the directory. Any
non-zero exit stops the swarm. Report the failing check, don't route around it.

**4. Run it in the background:**

```bash
"$HOME/.claude/skills/swarm/swarm" run <manifest>     # Bash run_in_background: true
```

It prints the run directory first on stderr, then starts every worker at once. Each
worker's log is `<run>/<label>.log`: the space and pane it opened, and a line every time it
stops on a permission prompt. When it exits, the harness notifies you. Never poll it with
`ScheduleWakeup`. A worker stuck on a prompt waits for a person; if the user asks how it is
going, read the logs and name any blocked worker and its pane.

Each worker has dispatch's 40-minute ceiling, so the run ends within 40 minutes of its last
start.

**5. Read every answer and report.** stdout ends with `index.tsv`: label, agent, exit code,
outfile, log. Read every outfile — a non-zero exit or an empty answer is a finding, not
something to skip. Then reply in this pane:

- One section per worker, headed `label — agent:model`, with what it found in your own
  words and the numbers and paths it gave.
- A closing section with what the answers say together: where they agree, where they
  conflict, and what follows from both.
- Any worker that failed, timed out or wrote nothing, with the last lines of its log.

Verify what you can before repeating it. A worker's claim about a file or a test result
is checked against the file or test, the same as any report-back result.

**6. Clean up.** The workers' spaces stay open so the user can take one over. After the
summary, list them (from the logs) and close each with `herdr workspace close <id>` unless
the user wants one kept. Implementing workers' worktrees land or are removed per TARGETS.md.
