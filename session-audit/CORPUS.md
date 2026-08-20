# Resolving and extracting the corpus

## Where transcripts live

`~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`

The directory name is the working directory with `/` replaced by `-`, e.g.
`/Users/pierce/Projects/term` → `-Users-pierce-Projects-term`.

`~/.claude-work/projects` is a **symlink** to the same directory — both profiles share one
history. Never audit both paths; you would double every number.

Sub-agent transcripts are **not** beside the parent file. They are at
`<session-id>/subagents/**.jsonl`. `analyze.py` collects them; hand-rolled greps usually
don't, which is how sub-agent cost reads as zero.

## Scope resolution, in precedence order

1. **An explicit path argument** wins over everything.
2. **The current session already has conversation in it** → audit just this session:
   `~/.claude/projects/<encoded-cwd>/<current-session-id>.jsonl`. A user who has been
   talking to you for twenty turns and then types `session-audit` means *this*, not their
   entire history.
3. **cwd is `~/.claude`** → `ALL`. This is the profile repo; auditing it means auditing
   everything.
4. **cwd is any other project** → that project's directory, plus its worktree directories.
   Worktrees encode as `-Users-pierce--worktrees-<repo>-<branch>`; a project audit that
   ignores them misses most swarm work.
5. Otherwise ask, in plain chat text.

Always print the resolved corpus and its size before starting:
> Auditing `Projects/term` — 94 sessions, 324 sub-agent transcripts, since 2026-07-01.

## Running the extractor

```bash
python3 ~/.claude/skills/session-audit/analyze.py <corpus> [--since YYYY-MM-DD]
python3 ~/.claude/skills/session-audit/analyze.py <corpus> --json
python3 ~/.claude/skills/session-audit/analyze.py <corpus> --dump-user-messages
```

`<corpus>` is a `.jsonl`, a project dir, or the literal `ALL`.

`--dump-user-messages` is the steering corpus: what the user actually asked for, in order.
`negative-space`, `restatement`, and `decision-quality` all read it. It is the only lens
input that is raw text, and it is still far smaller than the transcript.

## Measurement traps

These have each produced a wrong published number. Check them before trusting one.

**Forked sessions duplicate history.** A fork copies prior records into a new file with the
same message uuids. Dedupe by uuid or a fork double-counts — one project carried 2,422
duplicate turns worth $1,372. `analyze.py` dedupes and reports the count it skipped.

**Headless `claude -p` lists skill NAMES ONLY.** Asked to quote a skill's description, a
headless session replies `NAME-ONLY`. The interactive TUI carries full descriptions. So
`claude -p --output-format json` **cannot measure** anything to do with skill descriptions
or catalog size. Removing 12 skills from the catalog moved a headless probe 8 tokens while
the real interactive preamble was 56k–70k. Measure preamble from the **first-turn context
of real interactive sessions** — `analyze.py` reports the median.

**`claude plugin details <name>`** prints a real per-component always-on token cost. Use it
instead of building probes for anything plugin-shaped.

**Session medians are easy to poison.** One automated harness running hundreds of low-config
sessions will drag a global median far below what the user experiences in their real
projects. Always break down per project before quoting a median.

**Wall-clock is not work.** Gaps between turns are mostly the user being away. `analyze.py`
splits waiting-on-tools from waiting-on-the-human; only the former is the harness's fault.

## Cost model

`analyze.py` prices at Anthropic list rates. On a subscription these are **not** a bill —
they are a comparable unit for ranking where effort went. Always say so when quoting one.

The number that matters is almost always **cache-read**: context re-sent every turn. It runs
80%+ of spend. Its lever is *what sits in the window*, not how much the model writes.

Useful conversion for anything that lives in the preamble: at N assistant turns per month,
1,000 preamble tokens costs `N × 1000 × 1.50 / 1e6` dollars per month. Compute N from the
corpus rather than assuming it.
