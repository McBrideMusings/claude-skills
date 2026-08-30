# The pressure question — whose window pays for this rule?

Not a lens. A **fix shape** every lens tests its `Fix:` line against.

Work runs through stages with very different context budgets. The **implementing** stage
carries the most pressure: it explores, writes, and debugs, and it re-decides every
always-loaded rule on every turn while doing so. The **reviewing** stage carries the least: it
receives a diff, does no exploration, usually writes no code and debugs nothing.

So a rule's home should be decided by which window pays for it. A code-quality standard
sitting in `CLAUDE.md` is charged to every turn of every session, including the thousands
that touch no code at all. The same rule in `review/axes/` is charged once, to the stage with
room for it.

This is the only fix shape that **removes** always-on tokens rather than adding enforcement.
Reach for it before `HOOKS.md`.

## The test

A rule belongs at review time when all three hold:

1. **It is checkable against a diff.** No session history needed, no knowledge of intent —
   just the changed lines. "Delete obsolete paths rather than adding fallbacks" qualifies;
   "ask before assuming" does not.
2. **Catching it after the fact is acceptable.** The cost of the violation is a fix, not a
   loss. A truth rule ("only claim what you verified") fails this: by review time the false
   claim has already been said.
3. **It does not steer the work itself.** A rule that changes *what gets built* has to be
   present while building. A rule that changes *how the result reads* does not.

Fail any one and the rule stays where it is. Say which one it failed.

## The destination

`review/axes/<axis>.md`, in the axis whose lens already asks that question. A rule that
matches no existing axis is a request for a new one, and that is a bigger proposal than a
relocation — name it as such rather than smuggling a new axis in as a move.

## The honesty clause

**`review` fires in about 1.5% of sessions on this machine.** So relocating a rule there
enforces it rarely, and a rule moved without acknowledging that has been quietly downgraded,
not rehoused. Every proposal under this shape states the review rate and confirms the rule
passes test 2 above. If the honest answer is "this needs to hold while building", the shape
does not apply.

## The reviewer needs a clean window for this to be true

The economics hold regardless — always-on tokens are saved whether or not review runs in its
own context. But the *quality* argument only holds when the reviewer did not write the code:
an agent reviewing its own work holds every justification it just built, and grades
accordingly. `wrap-up` Phase 4 dispatches the review engine to a sub-agent that receives the
diff and not the session, which is what makes a relocated rule land somewhere it can be
judged fairly.

## Writing the finding

Every lens's `Fix:` line gains one clause:

> **Whose window?** `<review/axes/<axis>.md — passes all three tests, review rate 1.5%>` |
> `<stays always-on — fails test <n>: <why>>`
