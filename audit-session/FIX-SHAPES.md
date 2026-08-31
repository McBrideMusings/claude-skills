# The five fix shapes

Every lens tests its `Fix:` line against all five before writing it. A lens that names none of
them has proposed *"write the instruction more forcefully"*, which is the lazy answer these
exist to beat.

Cheapest and most reversible wins. **Say which shapes you rejected and why**, and prefer the
fix that removes the condition over one that guards it.

**The prevention gate runs before the five shapes.** A proposed edit to a skill or
`CLAUDE.md` must name the missing or wrong instruction that *would have prevented the
specific failure the lens cited* — an edit that merely relates to the failure dies here. An
instruction that was correct and simply ignored is never reworded: that is model variance,
and its fix shape is enforcement (`HOOKS.md`) or rehousing (`CONTEXT-PRESSURE.md`), not
stronger prose. When an edit does survive, prefer replacing existing text over appending —
appended text is how a rule grows two competing statements.

| Shape | Asks | Answer names |
| --- | --- | --- |
| [CONTEXT-PRESSURE.md](CONTEXT-PRESSURE.md) | **Whose window pays for this rule?** | `review/axes/<axis>.md` and the three tests it passed, with the ~1.5% review rate stated — or which test it failed and why it stays always-on. |
| [HOOKS.md](HOOKS.md) | **Could this have been enforced, and by what?** | The rung — harness hook (watches the action), project check (watches the output: lint, type, test), filesystem validator (watches the tree) — plus its predicate and simulated fires/precision. Or why judgment is required. |
| [SKILL-SHAPE.md](SKILL-SHAPE.md) | **Is the skill the right shape, or the right thing at all?** | The rung on the ladder: delete → hide/relocate → reword the description → combine/embed → split/disclose → add a load trigger. The last rung is the one most often skipped. |
| [INFORMATION-ACCESS.md](INFORMATION-ACCESS.md) | **Could it have known?** | The surface — what it reads, what it prints, where it lives — plus the specific fact that was missing. Or why the fact was written down and this is really `navigation`. |
| [PERMISSIONS.md](PERMISSIONS.md) | **Should this have prompted at all?** | The shape — allow rule, deny+allow pair, or a wrapper tool — and what stays denied in the same breath. |

**Order matters once.** `CONTEXT-PRESSURE` is the only shape that *removes* always-on tokens
rather than adding machinery, and `INFORMATION-ACCESS` is the only one that adds capability
rather than constraining behaviour. Both get skipped by default because every neighbour is a
constraint. Test them explicitly.
