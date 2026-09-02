# The lateral lens

Forwarded to every aspect sub-agent in Phase 03, and read in full on an interactive single-aspect run.

## Why improve has this and `review` does not

`review` asserts defects that exist. A technique that manufactures novel framings there is a false-positive engine, and `lateral/SKILL.md` refuses code review outright for that reason.

Improve is the opposite job — RULE 2: *an opportunity is not a defect*. Nothing is broken, so there is no failing input to follow. What an aspect agent does instead is walk the code and notice friction, and noticing is exactly where a survey goes predictable: the same five findings a competent agent would return for any repo in this language. The generators exist to make the walk produce candidates the agent would not have reached by reading alone.

**The lens generates candidates. It never lowers the bar for keeping one.** The grounding rule, the shape rule, and the Phase 05 citation gate apply unchanged. A candidate that cannot name the files and the friction is dropped, whatever produced it — a provocation that leads nowhere is a technique working correctly, not a finding.

## One technique per aspect

Invoke `lateral <technique>` with the technique named in the table below, and run its workflow against your aspect's surface. Naming it skips `lateral`'s diagnosis step — this table has already decided. Run exactly one; do not reach for a second.

| Aspect | Technique | The question it forces |
|---|---|---|
| `architecture` | `provocation` | Which structural constraint is treated as fixed? Suspend it and see what the code would look like. |
| `interface-safety` | `worst-idea` | Design the most dangerous version of this interface, then find which of its footguns the real one already has. |
| `agent-ergonomics` | `driver-seat` | Sit in the driver's seat: which level of the tower has no handle? |
| `security` | `worst-idea` | Same move, aimed at trust: the maximally exploitable design, then the overlap with today's. |
| `tests` | `worst-idea` | The suite that passes while everything is broken — then which of its properties this suite shares. |
| `gui` | `random-stimulus` | Force-fit an unrelated object onto the interface to break the default arrangement. |
| `product` | `analogy` | Which other domain solved this job, and what did it do that we didn't? |
| `behavior` | `provocation` | *"po: the user always stops halfway."* Which mid-interaction states has nobody described, and what does the product do there? |
| `performance` | `provocation` | Suspend the work itself — *"po: this never runs"* — and ask what makes it necessary. |
| `docs` | `analogy` | A domain whose explanations land, borrowed structurally. |
| `claude-md` | `scamper` | Systematic variation over rules that exist: substitute, combine, eliminate. |
| `layout` | `scamper` | Same, over where files sit. |
| `game` | `random-stimulus` | Force-fit against the mechanic set. |

## Rules

- **Run the technique before writing findings, not after.** Applying it to a finished list produces rewordings of the list.
- **Do not report the technique's own scratch output.** The intermediate provocations, stimulus words, and abandoned branches are working material; the report gets findings in the Phase 03 finding shape and nothing else.
- **The technique may produce zero findings.** Say so. An aspect that returns three grounded findings and one line saying the provocation went nowhere is a correct result; padding the list with the scratch output is the failure this rule stops.
- **`review-territory` still applies.** A generator that surfaces something actually broken hands it off in one line, same as any other route.
- **Never run two techniques.** One aspect, one technique, per the table.
