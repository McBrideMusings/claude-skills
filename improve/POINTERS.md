# Writing a context pointer

> The single source of truth for pointer wording. Read by
> [WRITING-SKILLS.md](WRITING-SKILLS.md) (a skill's `description`, and a `SKILL.md` naming a
> sibling file) and [CLAUDE-MD.md](CLAUDE-MD.md) (a steering line naming a doc).

A **context pointer** is a reference held in the agent's context that names out-of-context
material and encodes the condition for reaching it. A skill's `description` is one. A
`CLAUDE.md` line naming a doc is the same object. A file-map skill's body is nothing but
pointers.

**The pointer's wording, not its target, decides whether the material is reached.** A
must-have target behind a weakly worded pointer is a variance bug. **Sharpen the wording
first; inline the material only if sharpening fails.** Inlining is the expensive answer and
it is the one reached for by default.

## The three rules

A pointer does two jobs: say what the material is, and name the **branches** that should
trigger reaching it. A branch is a distinct case the target handles, so different runs take
different paths through it. Every word of an always-loaded pointer costs on every turn, so a
pointer earns harder pruning than the body it points at.

1. **Front-load the leading word.** The pointer is where it does its triggering work.
2. **One trigger per branch.** Synonyms renaming a single branch are one branch written
   twice — "build features using TDD … asks for test-first development". Collapse them; keep
   only genuinely distinct branches.
3. **Cut identity the body already carries.** Keep the pointer to triggers, plus any "when
   another skill needs…" reach clause.

## What a weak pointer looks like

An **index entry** is the commonest failure: a row naming a file and describing its contents
with no condition attached. It states what the material *is* and never when to open it.

```diff
- | `~/.claude/docs/README.md` | Index of every reference doc |
+ | `~/.claude/docs/README.md` | Open before asking where a service lives, what a host is
+   called, or which doc covers a subject |
```

The generic umbrella — "read the relevant file when a task touches its subject" — is not a
trigger either. "Touches its subject" is not decidable, so it fires on nothing.

## Measuring it

Pointer wording is one of the few writing rules with a real success metric. Read rate per
pointer target is measurable from the transcript corpus:

```
python3 ~/.claude/skills/audit-session/pointer_rate.py
```

Baselines on this machine, measured over 9,363 sessions with three or more assistant turns:

| pointer kind | read rate |
| --- | --- |
| **cold** — a `CLAUDE.md` line naming a doc | 0.8% – 3.1% |
| **warm** — a `SKILL.md` naming a sibling, in sessions where that skill fired | 7.4% weighted |
| warm, best case (a 3-sibling skill) | 68.2% |
| warm, worst case (`herdr`, 40 siblings) | 0.0% |

Two things follow, and both are load-bearing:

- **Warm beats cold by 2–9×.** A pointer inside a running skill fires better than the same
  pointer sitting in always-loaded steering. Put must-reach material behind a skill that
  fires, not behind a `CLAUDE.md` line.
- **The 0–68% spread is wording and structure, not mechanism.** Read rate falls as the
  pointing document's own body grows: a 3-sibling skill 68%, a 2-sibling skill 51%
  (measured on a skill since folded into `backlog`, whose own sibling count has changed and
  is not re-measured here), `review` (15) 27%, `herdr` (40) 0%. A document big enough to act
  on without opening anything gets acted on without opening anything. **Thinness is the
  forcing function** — it is why a knowledge skill's body is a file map and nothing else.
