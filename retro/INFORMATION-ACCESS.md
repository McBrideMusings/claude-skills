# The access question — could it have known?

Not a lens. A **fix shape** every lens tests its `Fix:` line against.

The other four shapes all constrain behaviour: enforce it, reshape the skill, stop prompting,
move it to a cheaper context. This one is the only shape that **adds capability**. When a
session went wrong because a fact was simply unreachable, the answer is a new surface, not a
better instruction — and because every neighbouring shape is a constraint, this is the one
that gets skipped by default.

`CLAUDE.md` already requires it: *"build the agentic control surface as you go, without being
told: every feature is programmatically detectable or manipulable, so a program can drive the
project and read back its state."* Nothing checks that rule. This shape is the check.

## The bar — a finding without both halves is a wishlist

1. **The specific fact that was missing**, in a specific session, with the moment it was
   needed. Not "more visibility into the build".
2. **The specific command, file, or endpoint that would have answered it**, that did not
   exist or was not reachable at the time.

"Give the agent more access" is not a finding. *"On `<session>:<timestamp>` the agent guessed
at the pointer read rate because nothing could query the transcript corpus; a 40-line script
over `~/.claude/projects/**/*.jsonl` answers it in 90 seconds"* is one.

## Shapes worth reaching for, cheapest first

| Shape | Looks like |
| --- | --- |
| **A read command** | A script or `admin` task that answers the question on demand. Cheapest and most reusable; prefer it. |
| **A tee** | Logs the agent cannot see, written somewhere it can — a dev server's output, a build log, a device console. |
| **A state dump** | The running app printing what it currently believes, so a program can read it back rather than a human describing it. |
| **Read-only credentials** | A third-party service the agent must observe but never mutate. Route through `~/.claude/.env`; never a web console. |
| **A fixture** | The fact is knowable but expensive to re-derive. Capture it once, check it in, and point at it. |

Prefer the surface that answers a **class** of question over one that answers this one. A
script that reports read rate for any pointer beats one that reports it for the pointer that
happened to come up.

## When this is the wrong answer

- **The fact was written down and not found.** That is `navigation` — a pointer problem, not
  an access problem. Route it there.
- **The fact was in context and re-derived.** That is `friction`, self-inflicted.
- **The surface would mutate something.** An access shape is read-only by default. Anything
  that writes is a separate proposal and needs the permission gate, not this one.
- **Nobody would run it twice.** A one-off query answered in the session and never needed
  again is not a surface; it is a command that already ran.

## Writing the finding

Every lens's `Fix:` line gains one clause:

> **Could it have known?** `<the surface — what it reads, what it prints, where it lives>` |
> `<no — the fact was written down; routing to navigation>` | `<no — one-off, not a surface>`
