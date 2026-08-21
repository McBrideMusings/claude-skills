# The hook question — could this have been enforced instead of asked for?

Not a lens. A **fix shape** every lens must consider before writing its `Fix:` line.

An instruction in `CLAUDE.md` or a `SKILL.md` is re-decided every single turn, by a
stochastic process, against everything else competing for attention in a 250k window. A
hook is the harness executing code. It fires every time or never, and its behaviour does
not degrade as context fills.

So whenever a finding's fix is *"write it down more forcefully"* — a rule already written
once and ignored, a guard tripping repeatedly, a tool that keeps not being reached for —
**state explicitly whether a hook could have enforced it, and why you did or didn't propose
one.** Silence on this question is itself a gap in the finding.

## The precision gate — check this before proposing any hook

**Simulate the hook against the corpus before recommending it.** This is not optional, and
the reason is on the record in this account.

The obvious fix for the `plan-format` finding was a `Stop` hook inspecting the final reply
and complaining when a plan had no structure. Simulated against 13 months of transcripts it
fired **62 times at 10% precision** — 22 of a 30-sample were wrap-up summaries, research
briefs, and agent reports that merely contained the word "approach".

A hook at 10% precision is worse than no hook. It trains the user to ignore it, and it
trains the agent to route around it.

The gate, in order:

1. **Is the trigger mechanically decidable?** A hook sees events, paths, commands, and text
   — never intent. "A `.md` file under `docs/adr/` was written" is decidable. "This reply
   contained a plan" is not.
2. **Simulate it.** Replay the predicate over the corpus with `analyze.py --dump-user-messages`
   or a grep over the transcripts. Count fires.
3. **Sample the fires.** Take 30, classify true/false positive by hand. Report the number.
4. **Precision under ~80% → do not build it.** Say so, and say what the false positives were.

Report a proposed hook as: *fires N times over the corpus, precision P from a 30-sample.*
A hook proposed without those two numbers is a guess.

## Picking the event

Granularity, not habit. The full event list on this machine:
`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `UserPromptSubmit`, `Stop`, `StopFailure`,
`SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop`, `PermissionRequest`,
`Notification`, `CwdChanged`, `TeammateIdle`.

| Problem shape the lenses find | Event | Note |
|---|---|---|
| A command shape that keeps getting written wrong | `PreToolUse` | Block with a message naming the shape that *would* pass. This is how the `cd` and raw-newline guards work. |
| A file was edited and something must follow | `PostToolUse` | Fires **once per matching call** — wrong for "do X once before I test", which then fires N times across N edits in one turn. |
| A build/sync/install that must happen once per turn | `Stop` | Fires once when a response ends. This is the fix for the `PostToolUse` misuse above. |
| Context the agent must have before it starts | `SessionStart` | Cheapest way to make a rule unmissable — but it costs preamble tokens on every turn, so weigh it against the `spend` lens. |
| A rule that depends on what the user just asked | `UserPromptSubmit` | Can inject targeted context instead of paying for it always-on. Often the right answer where `SessionStart` is too blunt. |
| A tool that failed and has a known recovery | `PostToolUseFailure` | Better than documenting the recovery and hoping. |

## When a hook is the wrong answer

- **The trigger needs judgment.** See the precision gate. Route it back to documentation, or
  to a skill that loads at the right moment.
- **A load trigger would fix it instead.** The `plan-format` case: the real fix was pointing
  the skills that already fire at the format doc, not policing the output afterwards. Prefer
  the fix that removes the condition over one that guards it — and **label which one you are
  proposing.**
- **It would fire on a surface the user wants control of.** Some permission prompts are the
  point.
- **The cost is preamble.** A `SessionStart` hook injecting 2k tokens costs real money on
  every turn of every session forever. Price it with the `spend` lens conversion before
  recommending it.

## Writing the finding

Every lens's `Fix:` line gains one clause:

> **Enforceable?** `<hook event + predicate, with fires/precision>` | `<no — trigger needs
> judgment>` | `<no — a load trigger removes the condition instead>`

Configuration goes through the `update-config` skill, which owns `settings.json`. Hook
scripts live in `~/.claude/hooks/` and are tracked; a hook committed there does nothing on
another machine until its `settings.json` entry exists too, so both land together.
