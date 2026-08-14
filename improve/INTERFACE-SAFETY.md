# Interface Safety

Make the obvious call the correct call. Named for Rico Mariani's "pit of success" — the API should be shaped so that falling in the normal direction lands on correct behavior, and the wrong thing takes effort.

Uses the vocabulary in [ARCHITECTURE.md](ARCHITECTURE.md) — **module**, **interface**, **seam**, **adapter**, **leverage**. Adapted from jnsahaj/skills `pit-of-success`.

## The defect this finds

There is no error and no failing test. The code looks right.

A selection is supposed to clear three things — the selection itself, the detail panel, and the URL. Someone wrote `clearSelection()` that does all three. But the raw setter `setSelection(null)` is still exported and still callable. A new maintainer reads the type, sees a setter that takes `null`, writes the obvious call, and gets a half-cleared state: selection gone, panel still open, URL still pointing at the old item. Nothing complains.

Two more shapes of the same thing: a schema that accepts states the UI never wants, so the bad state is merely discouraged rather than impossible; and a prop that only works when a sibling prop is set the right way, so it can be wired up half-right.

The common structure: the correct behavior lives in a convention the caller has to *know*, not in the seam the caller *touches*.

## When to run this

- Proactively, on a seam with many callers or many future callers — a shared hook, an exported client, a schema, a command surface.
- After a `review` `contracts`-axis finding flags a footgun on a diff. That axis runs the test read-only and diff-scoped; this is the refactor that follows.
- When a bug turns out to be "someone called it the natural way." That's the architecture permitting a class of bugs, not one wrong call site.

## Process

### 1. Find the seam and every caller

Name the public seam: the exported function, the hook's return value, the setter, the component prop, the route body, the schema, the command. Then grep every caller — not a sample, all of them.

You are done with this step when you can state, in one sentence, **what a maintainer who has read nothing would naturally type.**

### 2. Run the footgun test

> If someone does the obvious thing without knowing the hidden helper or convention, does behavior break?

If yes, you have a finding. Write down both halves concretely: the natural call, and what it produces versus what it should produce. Real values, not "an incorrect state."

### 3. Move the invariant into the seam

Take the highest rung that works, not the easiest:

1. **Make the existing API do the safe thing.** `setSelection(null)` performs the full clear. Nothing to remember.
2. **Narrow the type or schema so the bad state cannot be represented.** The compiler or the validator refuses it — no discipline required from anyone, ever.
3. **Rename or split so the dangerous path is explicit.** `setSelectionRaw` next to `setSelection`; the trap now announces itself at the call site.
4. **Only then add a helper** — and only if every natural caller would use it. A helper alongside a still-callable raw API is the situation you started in.

"Add a comment warning about it" is not a rung. A comment is what you write when the seam won the argument.

### 4. Delete the bypasses

The local wrappers, the parallel helper names, the second way of doing it, the comment explaining the trap. One invariant, one owner. If two paths remain, the wrong one will get called.

### 5. Prove the pit

Two artifacts, both required:

- A focused test or type/schema assertion showing the **obvious call** now preserves the behavior.
- A grep showing **no caller still uses the old footgun**. Paste the empty result.

## Rules

- **Do not fix only the named call site.** If the seam is wrong, the seam is the change.
- **Do not rely on "remember to call this helper first"** while callers can still reach the raw API.
- **Keep the diff boring** — one invariant, one owner, no speculative abstraction. This is not the moment to redesign the module (that's [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md)).
- **If compatibility genuinely prevents changing the seam**, take rung 3: rename the dangerous API to say what it is, and expose the safe default beside it. Say in the writeup which rung you took and why the higher ones were blocked.

## Findings-only invocation

When called from `improve`'s survey mode: read-only, no writes, no questions. For each seam examined, return the natural call, what it produces versus what it should, the rung the fix would take, and the caller count. Mark a seam Unknown rather than guessing when the callers can't be enumerated.
