# Aspect: `behavior` (native)

Check that the product actually behaves the way its code, tests and docs say it does — by describing features on one fixed skeleton, drafted from the code, then driving the running product and recording what it really did. The skeleton exists so gaps show up by comparison: the same questions asked of every feature, every cell filled.

Method adapted from steveruizok's product-description skill (https://gist.github.com/steveruizok/83ae5c53f2784ebf8f5fe0a3fb94480f), reshaped for this account: the deliverable is findings and repo docs, never a standing description repo. Intermediates go under `/private/tmp/claude/<repo-slug>/` and die there.

## The stance — four decisions, once per product

Decide these before describing any feature, and hold them constant across every feature walked:

1. **The unit of interaction and its five phases.** The smallest thing the user does with a beginning, a possibly long middle, and an end: *starting → ending at once → becoming extended → while extended → finishing*.
2. **The variant axis.** What the user can hold, pass, or have set that changes the outcome of the same interaction. Two columns always: set at the start, changed while extended.
3. **The interrupt list**, built from five families: the user's explicit abort; the user doing something else mid-way; the environment failing (focus, network, session, process); something else changing the target; the input channel changing. Same rows, same order, for every feature.
4. **The cross-cutting concerns, in a fixed order** — permissions, history, offline, collaboration, whatever the product has.

## Phase names per product kind

| Kind | The five phases become |
| --- | --- |
| Pointer-driven editor (canvas, native app) | pointer down → up without dragging → becoming a drag → during the drag → up after dragging. Variants: modifier keys. Add OS lifecycle interrupts on mobile. |
| Form-and-page web app | arrive → leave untouched → begin editing → while editing → submit. Variants: role, record state, flags. |
| Command-line tool | invoke → exits immediately → begins running → while running → finishes. Variants: flags, env, TTY-ness. Most checks scriptable: expected result is output + exit code. |
| Chat / agent / messaging | compose → answered immediately → response begins → while streaming → completes. Variants: model, attachments, conversation state. Check structure and state, never wording. |

A real product is mostly one kind with pieces of another; take the nearest row and adjust.

## The feature walk

Pick the features to walk — the interaction-heavy ones, plus any surface the user names. For each, from the code and tests:

- **The simple case** — the common path in prose, and where the user lands afterwards.
- **Event by event** — the five phases: what begins it, what the short path commits (say so when nothing is), what crossing into extended fixes, what updates live, what finishing commits and in how many undo steps or records.
- **Variants table** — every cell filled; "No effect." is a claim, and a checkable one.
- **Interrupt table** — the fixed rows, split before/while extended; then what state the user is left in.
- **Cross-cutting** — the fixed list, in order; "no interaction" still gets its line.
- **Edge cases** — limits, repeated invocation, empty states, started one way and finished another.

Describe the experience, not the code: "the form stays disabled until the server answers", not "the mutation sets isPending". Numbers, thresholds and term definitions get stated once with a `file:line` cite; surprising behavior is stated plainly, with the reason if the code gives one.

## Verification discipline

Drafting reads the code; verification watches the product. Both halves are the aspect — a walk that never drives the running product is half done.

- **Interleave.** Verify each feature (or small cluster) before drafting the next. A wrong claim drafted early propagates into every later description that links to it.
- **The evidence rule.** A claim is `verified` only when the exact command (or manual step) and its recorded output sit beside it. No recorded evidence means the claim stays `drafted`, whatever you remember running.
- A failed check is not automatically a product defect — sometimes the description is wrong. Say which, with the evidence.
- What cannot be driven programmatically (what was shown on screen, how long it felt) is listed as unchecked, not silently marked.
- **Dedupe against the tracker before filing.** An existing issue that contradicts a description is a check to run, not a duplicate to skip.

## Findings

Two kinds, both grounded in a `file:line` and — for anything verified — the recorded evidence:

- **Opportunities** — behavior that works but is undocumented, undiscoverable, inconsistent between features (the interrupt tables disagree), or unreachable from the product's automation surface. Normal improve cards.
- **Defects.** **Override of RULE 2, stated here on purpose:** a defect this lens *verifies against the running product* is reported as a full finding with its evidence and a severity (high: loses work or traps the user; medium: wrong but recoverable; low: cosmetic) — there is no diff for `review` to run on, so a one-line pointer would drop the reproduction this pass already paid for. A *suspected* defect the pass did not verify remains a `review-territory` line.

## Where the output lands

- Findings → Phase 08 tickets, like every aspect.
- Durable prose earned by the pass — the vocabulary and load-bearing numbers → `docs/CONTEXT.md`; a per-surface behavior doc (an automation dictionary, a lifecycle account) → `<repo>/docs/`; verification rows worth keeping → the project's `verify-project` surface or tracked `docs/`.
- Everything else is scratch under `/private/tmp/claude/<repo-slug>/`. No sibling repo, no coverage table, no standing description artifact.

## Grilling loop (interactive follow-up)

For an interactive `improve behavior` run, after the findings land: walk them with the user one decision at a time — which features deserve a deeper walk, which defects to file, which prose to keep in `docs/`. Every question is plain chat text with a typed keyword (RULE 0); `go` accepts the slate whole.
