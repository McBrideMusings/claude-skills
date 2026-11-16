---
name: probes
description: Interrogate a plan or design with five fixed questions, each answered in located terms — lift the problem one level, strip it to its irreducible constraints and rebuild, name the rewrite a principal architect makes before starting, design the one test that breaks it on day one, and find the abstraction that makes the problem disappear. Use when a plan, design or set of candidate approaches exists and nobody has attacked its premise or its weakest joint. Triggers include "probes", "interrogate this plan", "first principles pass", "what breaks this". Do NOT use for debugging, code review or implementation, and do NOT use before there is a plan or a problem statement to probe.
---

# Probes

## What this technique does

Asks five fixed questions of a plan, a design or a set of candidate approaches. Three of them generate (they look for a different shape), two of them attack (they look for where this shape fails). Each answer is a located finding — a file, a table, a process, a moment, a test input — or the line "nothing", and never a slogan.

The five questions are the canonical text. Quote them exactly; they live only here.

| # | Probe | Kind |
|---|---|---|
| 1 | "Exercise abstract thinking when considering this task." | generate |
| 2 | "Reduce this problem to its irreducible constraints and rebuild it from zero." | generate |
| 3 | "What would a principal architect immediately rewrite before even starting this?" | attack |
| 4 | "Design the single test that breaks this design on day one." | attack |
| 5 | "What higher-level abstraction would make this entire problem disappear?" | generate |

## Workflow

### Step 1: Confirm the target

A valid target is a stated problem with at least one proposed shape: a plan, a spec, a design doc, an interview's settled decisions, or two or three candidate approaches. If there is only a wish with no shape, say so in one line and stop: the host (`grill-me` Shape mode, `redesign` step 0) produces the shape first.

### Step 2: Read the target as built

Read the plan and the code or data it touches. Probes 2, 3 and 5 are answered in the system's own nouns, so an answer written before reading the code is an answer about a generic system.

### Step 3: Run each probe in order

- **1 — Abstract up.** Name the problem one level more general, then name the known class it belongs to (a queue, a cache invalidation, a two-phase commit, a state machine, a ledger) and how a maintained project in that class solves it. The finding is the existing solution and what the plan does differently; an abstraction that names no existing solution is dropped.
- **2 — Irreducible constraints.** List every constraint the plan obeys and mark each *hard* (physics, platform, external contract, stated by the user, with its source) or *inherited* (a past choice). Then write the smallest design that satisfies only the hard ones. The finding is each place the plan differs from that design, and the inherited constraint that causes the difference.
- **3 — The architect's first rewrite.** Name the one thing in the plan a principal architect rewrites before anyone writes code: a boundary in the wrong place, two owners of one fact, a name that means two things, a sequence that needs a lock, a dependency pointing the wrong way. The finding is the rewrite as an edit to the plan: what moves, from where, to where.
- **4 — The day-one breaking test.** Write the single test, as a concrete input and the assertion it fails, that breaks the design the first day it runs against real users or real data: the concurrent pair, the empty case, the retry after a partial write, the 10,000th row, the user who stops halfway. State the result the design would return beside the result it should return. A test the design passes is reported as passed — that is the honest outcome, not a gap.
- **5 — The disappearing abstraction.** Name the abstraction one level up that makes the problem stop existing rather than solved: the problem moved to where it cannot occur, a shared owner that removes the coordination, a derived value that replaces stored state. The finding names the abstraction, where it would live, and which parts of the plan it deletes.

### Step 4: Ground or drop

Every finding names its location — a file path with line, a table and column, a process at a moment, or a test input. A probe whose answer cannot be located is reported as "nothing found" with one line on what was tried. Abstraction is how a probe looks for a different shape; it is never the output.

### Step 5: Hand the findings to the host

Return the findings as a numbered list, one per probe that found something, in the host's output shape:

- `grill-me` takes each finding as one interview question, in probe order, with options and a pick per `../../CHAT-FORMAT.md`.
- `redesign` reuses its step 2 ledger as probe 2, puts probes 3 and 4 in each candidate's row, and adds a probe 5 abstraction as one more candidate.
- `spike` runs probe 4 alone and puts its test in the shared fixture.
- `improve` takes each finding as a candidate for its grounding gate.
- Called with no host, print the list and an option set for what to change.

## Honesty mechanics

Show every probe, including the ones that found nothing: `3 — architect's rewrite: nothing; the one boundary in question (the API worker ↔ the queue consumer) already gives each fact one owner.` A pass where all five probes find something is a tell that the questions were answered by rote; a pass where probe 4's test is one the design obviously handles is a tell that the test was picked to pass.

## What NOT to do

- **Don't skip a probe or add a sixth.** The five are fixed so passes are comparable.
- **Don't deliver a verdict.** "This plan is sound" or "this plan is flawed" is not an output; the findings are.
- **Don't let probe 1 or 5 replace a decision with a word.** A coined term or "think of it as a pipeline" with no existing solution or no location is dropped in Step 4.
- **Don't run it twice on the same plan** without new structure; it relitigates the same answers.
