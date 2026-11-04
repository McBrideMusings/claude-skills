# The five fix shapes

Every lens tests its `Fix:` line against all five before writing it. A lens that names none of
them has proposed *"write the instruction more forcefully"*, which is the lazy answer these
exist to beat.

Cheapest and most reversible wins. **Say which shapes you rejected and why**, and prefer the
fix that removes the condition over one that guards it. Two gates run first: the prevention
gate for any skill or `CLAUDE.md` edit, and the concurrency gate for any proposal to run work
in parallel.

**The prevention gate runs before the five shapes.** A proposed edit to a skill or
`CLAUDE.md` must name the missing or wrong instruction that *would have prevented the
specific failure the lens cited* — an edit that merely relates to the failure dies here. An
instruction that was correct and simply ignored is never reworded: that is model variance,
and its fix shape is enforcement (`HOOKS.md`) or rehousing (`CONTEXT-PRESSURE.md`), not
stronger prose. When an edit does survive, prefer replacing existing text over appending —
appended text is how a rule grows two competing statements.

**A proposal to run two units of work concurrently clears four checks before it is written
down.** "Neither reads the other's output" is the first check, not the finding:

1. **Data** — neither unit consumes what the other returns.
2. **Control** — neither unit halts, short-circuits or returns early in a way that skips the
   other. Concurrency runs a unit the serial order would never have reached.
3. **Shared state** — neither unit writes what the other reads or writes: the working tree,
   the index, a file, a lock. Name any path where one reverts, applies or rewrites state
   mid-run.
4. **Tests** — grep the test suite for the second unit's name. Name any test asserting call
   order, invocation count or which units ran; concurrency cannot satisfy it, so the proposal
   must change that test, and say whether the pass can reach the repo it lives in.

A check that fails does not kill the proposal. It becomes the tradeoff in the option set —
serialize on that path, or run concurrently anyway, stating how often the conflicting path
runs (from the corpus, e.g. halts per run).

| Shape | Asks | Answer names |
| --- | --- | --- |
| [CONTEXT-PRESSURE.md](CONTEXT-PRESSURE.md) | **Whose window pays for this rule?** | `review/axes/<axis>.md` and the three tests it passed, with the current review rate stated (CONTEXT-PRESSURE.md has the number) — or which test it failed and why it stays always-on. A violation a program could decide fails test 0 and leaves for `HOOKS.md` instead. |
| [HOOKS.md](HOOKS.md) | **Could this have been enforced, and by what?** | The rung — harness hook (watches the action), project check (watches the output: lint, type, test), filesystem validator (watches the tree) — plus its predicate and simulated fires/precision. Or why judgment is required. |
| [SKILL-SHAPE.md](SKILL-SHAPE.md) | **Is the skill the right shape, or the right thing at all?** | The rung on the ladder: delete → hide/relocate → reword the description → combine/embed → split/disclose → add a load trigger. The last rung is the one most often skipped. |
| [INFORMATION-ACCESS.md](INFORMATION-ACCESS.md) | **Could it have known?** | The surface — what it reads, what it prints, where it lives — plus the specific fact that was missing. Or why the fact was written down and this is really `navigation`. |
| [PERMISSIONS.md](PERMISSIONS.md) | **Should this have prompted at all?** | The shape — allow rule, deny+allow pair, or a wrapper tool — and what stays denied in the same breath. |

**Order matters once, and only for judgement calls.** `CONTEXT-PRESSURE` is the only shape
that *removes* always-on tokens rather than adding machinery, and `INFORMATION-ACCESS` is the
only one that adds capability rather than constraining behaviour. Both get skipped by default
because every neighbour is a constraint. Test them explicitly. The exception is a mechanical
violation — a fixed syntactic pattern, a banned API, an import shape, a file in the wrong
place: `CONTEXT-PRESSURE`'s test 0 sends it straight to `HOOKS.md`, because a lint rule is
checked on every run and `review/axes/` is checked far less often (CONTEXT-PRESSURE.md has
the current rate).
