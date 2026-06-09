# explainer — archetypes

Five shapes. Classify the request, then fill the matching skeleton. Each carries a **signature diagram** so the visuals aren't reinvented per run. All share the `.hero` opener (title · what-this-is · archetype badge · why-you'd-read-it) and, in B-mode, `file:line` `.cite` tags on every concrete code claim.

When a request blends two, pick the dominant one for the spine and borrow a section from the other (e.g. an Architecture doc may end with a small Comparison panel).

---

## 1. Process / Mechanism — "how does X work, step by step"

For things that *happen over time*: request lifecycles, build pipelines, auth handshakes, algorithms.

**Skeleton**
1. Hero + one-sentence "what runs, and when".
2. **Signature diagram: step timeline + sequence diagram.** Left-rail numbered steps down the page; a sequence diagram (lifelines + arrows) for the inter-actor calls. Color arrows `--c-flow`, payloads `--c-data`.
3. `.steps` walkthrough — one numbered step per stage, each with its `file:line` and a one-line "what changes here".
4. Edge cases / failure modes in `.callout--danger` (what happens when it breaks).
5. Recap: the whole flow in 3 bullets.

---

## 2. Architecture / System — "how do the parts fit together"

For *structure*: module maps, service boundaries, how a subsystem is wired.

**Skeleton**
1. Hero + "the parts and who talks to whom".
2. **Signature diagram: module map + data-flow.** Boxes for modules grouped into subtle background bands by layer; arrows for dependencies/data; mark trust/process boundaries in `--c-danger`. Legend required.
3. Per-module cards: name, responsibility (one line), `file:line` entry point, what it depends on.
4. A representative data-flow traced through the map (highlight the path).
5. `.callout--warn` for the non-obvious coupling / the thing that surprises newcomers.

---

## 3. Comparison / Tradeoff — "X vs Y, which and why"

For *choices between alternatives*: libraries, patterns, approaches.

**Skeleton**
1. Hero + "what's being compared and the decision it informs".
2. **Signature diagram: side-by-side panels (`.compare`) + decision table.** Same rows for each option so differences line up; a final table scoring each on the axes that matter.
3. Per-axis breakdown: for each dimension, who wins and the one-line why.
4. "Pick X when… / Pick Y when…" decision guide.
5. `.callout--warn` for the trap (the dimension people over-weight).

---

## 4. Concept — "explain this one idea, deeply"

For a *single idea* that needs to land: a pattern, a theorem, a mental model. The archetype most likely to run in **A-mode** (world knowledge).

**Skeleton**
1. Hero + the one-sentence version.
2. **Signature diagram: analogy anchor.** A single strong visual metaphor rendered as SVG/CSS — the picture the reader will remember.
3. The idea in plain terms, then **layered `.reveal` disclosures** — "go deeper" `<details>` that peel back to the rigorous version for those who want it. Static-first, no JS.
4. Worked example (B-mode: from the actual code with `file:line`; A-mode: a concrete instance).
5. Common misconceptions in `.callout--warn`; "you've got it if you can…" check.

---

## 5. Decision — "why was this choice made" (ADR-shaped)

For *rationale*: why the code is the way it is, the road not taken.

**Skeleton**
1. Hero + the decision in one line.
2. **Signature diagram: forces → options → consequences** as three connected columns.
3. **Forces** — the constraints/pressures that shaped it (`.callout` by type: `--c-danger` for risks, `--c-data` for requirements).
4. **Options considered** — each in a `.compare` cell with its fatal flaw or winning trait.
5. **Consequences** — what this buys and what it costs, including future reversibility. B-mode: `file:line` to where the decision is embodied; surface a matching `docs/adr/` entry if one exists.
