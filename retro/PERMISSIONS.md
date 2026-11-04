# The permission question — should this have prompted at all?

The third **fix shape**, alongside [HOOKS.md](HOOKS.md) and [SKILL-SHAPE.md](SKILL-SHAPE.md).

The auto-classifier is good but conservative. Where it is stricter than the user wants, the
cost is a prompt on every run of a command that was always going to be approved — and each
prompt is a stall on a full context window. Where it is *looser* than the user wants, the
cost is far worse than tokens. Both directions are findings.

## What the corpus can and cannot see

**Denials leave a trace.** A rejected tool call produces
`"The user doesn't want to proceed with this tool use."` — `analyze.py` counts these and
attributes them to command prefixes.

**Approved prompts leave no trace at all.** A prompt the user clicked through looks
identical to a command that never prompted. So denial counts *undercount* permission
friction, usually by a lot, and you must never present them as the measure.

**The usable signal is repetition.** `analyze.py` ranks command prefixes by frequency. A
prefix run 40+ times that is not in the allowlist is prompting nearly every time. That is
the allowlist candidate list, and it is inference — say so.

Cross-check against the live rules before proposing anything:

```bash
python3 -c "import json,os;d=json.load(open(os.path.expanduser('~/.claude/settings.json')));print(json.dumps(d.get('permissions'),indent=1))" | head -60
```

The bundled **`fewer-permission-prompts`** skill already does this scan and writes a
prioritized allowlist to a project's `.claude/settings.json`. Reach for it before hand-rolling
the analysis — a `tool-choice` finding waiting to happen. **`update-config`** owns
`settings.json` edits; route the actual change there rather than editing by hand.

## Three fix shapes, in order

### 1. An allowlist rule — when the safe/unsafe split is visible in the command prefix

Cheapest and most common. `Bash(git -C:*)`, `Bash(gh pr view:*)`. Works when reading the
first token or two is enough to know the call is safe.

### 2. A deny rule paired with a broad allow — when a few dangerous verbs are the exception

Deny takes precedence. Allow the family, deny the destructive members by name. Only sound
when the dangerous forms are enumerable and appear in the matched prefix.

### 3. A narrow wrapper tool — when the distinction lives inside an argument string

**This is the important one, and it is the same lesson as the hook precision gate.** When
safety depends on text the matcher cannot parse, no pattern is trustworthy. Build a command
whose *interface* makes the unsafe case unrepresentable, then allowlist that one command.

Prefer this to a clever regex whenever the regex would have to reason about quoted content.

## Worked example — read-only prod D1 on reddit-poker

**The problem.** Verifying a bug against production data is a routine, genuinely read-only
need. It reliably prompts, because the call looks like:

```
wrangler d1 execute <DB> --remote --command "SELECT ... FROM hands WHERE id = ..."
```

**Why rules 1 and 2 both fail here.** The prefix `wrangler d1 execute` is identical for a
`SELECT` and a `DELETE`. Allowlisting it permits writes to production. Denying on the word
`DELETE` is defeated by any query where it appears inside a string literal or a column
value — and by `UPDATE`, `DROP`, `INSERT`, `ALTER`, `PRAGMA`, and `ATTACH`. A pattern that
must parse SQL out of a shell-quoted argument is not a safety mechanism.

**Rule 3 fits.** A wrapper — living in `admin.toml` alongside the project's other tasks —
that accepts a query, refuses anything whose first keyword is not `SELECT`/`EXPLAIN`, and
always passes `--remote` in read mode. Then exactly one allowlist entry:
`Bash(admin db query:*)`. Writes keep prompting because writes never route through it.

The gain is not only fewer prompts: the safe path becomes the *convenient* path, which is
what actually changes behaviour.

**This is an illustration, not a work item.** The user flagged it as an example of the
problem shape. Do not build it unless asked.

## Never widen for convenience

Some prompts are the point, and this shape must not be used to erode them:

- Anything that changes state outside the machine — deploys, production **writes**, toggling
  a live service — is confirmed every time, by standing rule.
- `--force`, history rewrite, and `gh pr merge` stay gated.
- A prompt the user *wants* is not friction. If a denial appears in the corpus and the
  command was genuinely dangerous, the classifier worked. Record it as such.
- Never propose blanket wildcards over a tool family to silence one member.

A finding that recommends widening permissions must name what stays denied, in the same
breath. If you cannot state the deny side, you do not understand the rule well enough to
propose it.

## Writing the finding

> **`<command prefix>` run `<n>`x across `<m>` sessions**, `<in|not in>` the allowlist.
> Denials recorded: `<k>` (approved prompts leave no trace — this is a floor, not a count).
> Safe/unsafe distinction lives in: `<prefix | enumerable verbs | inside an argument>`.
> **Shape:** `<allow rule | deny+allow pair | wrapper tool>` — because `<which of the three above>`.
> **Stays denied:** `<the write path, explicitly>`.
> Route the change through `update-config`; consider `fewer-permission-prompts` for the scan.
