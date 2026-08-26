# explain — archetypes

Two shapes. Classify the request, then fill the matching skeleton.

Comparison and Decision are **not** shapes to classify into — they died as archetypes on
purpose. A comparison is a `.compare-table` you drop into a Walk; a decision (forces →
options → consequences) is the same table with different column headings, or three short
panels. If you find yourself asking "is this a Comparison or a Process", it's a Process
(a Walk) with a table in the middle. Don't reintroduce a third shape to catch it.

---

## 1. The Walk (default) — "how does X work, step by step" / "explain this idea"

The comic strip. Absorbs the old Process and Concept archetypes — a mechanism that runs
over time and a single idea that needs to land are the same shape: a sequence of panels,
each one plain sentence, each one action.

**Skeleton**

1. `.hero` — title as a question, `.lede` stating the calibration assumption in one line.
2. `.core` — the one-sentence short version, right under the hero.
3. **One `.panel` per step or per facet of the idea.** `.eyebrow` ("Step 1"), then an
   `<h2>` that is a complete subject-verb-object sentence — **the titles ARE the
   explanation.** Read every `<h2>` top to bottom with nothing else and the whole story
   must hold together. One action per panel; two actions means two panels.
4. Each panel's `.scene` diagram draws that one action with the symbol cast — a person,
   terminal, laptop, browser, folder, repo, server, database, file, notebook, robot,
   clock, stop, or trash, connected by `.arrow` / `.arrow.hot` / `.arrow.no`.
5. Each panel's `.cap` adds the "why it matters" aside — never restates the `<h2>`.
6. B-mode: `.cite` under the `<h2>`, and an optional `details.deeper` "the code" reveal
   with the real snippet, the claim line highlighted.
7. Optional mid-walk `.compare-table` when the request is genuinely "X vs Y" or a
   decision with named options — one table, not a shape swap.
8. `.gotcha` for the failure mode or the part that surprises people — usually one, near
   the end, dashed border, no second colour.
9. `.close` — one closing truth, Georgia, after the last panel.

Use for: request lifecycles, build pipelines, auth handshakes, algorithms, a pattern, a
theorem, a mental model, "explain X" with no structural comparison or spatial layout in
it. When unsure, default here.

---

## 2. The Map — "how do the parts fit together, who talks to whom"

For *structure in space* — module maps, service boundaries, "who calls whom" — the one
thing a sequence of panels cannot show, because there is no single order to walk it in.

**Skeleton**

1. `.hero` + `.lede` as above.
2. `.core` — one sentence: what the parts are and the one relationship that matters most.
3. **One `.panel` (or bare `.diagram`) with one larger `<svg>`** holding every module as
   a `.mapnode` (or `.mapnode--hot` for the one under discussion), connected by
   `.mapedge` / `.mapedge--hot` / `.mapedge--dashed`. A `.legend` if the diagram uses
   both ink and red for more than one reason.
4. **One `.card` per module** underneath the diagram: name, one-line responsibility,
   `.cite` entry point (B-mode), what it depends on.
5. A representative flow traced through the same diagram — highlight that path's edges
   `--hot` rather than drawing a second diagram.
6. `.gotcha` for the non-obvious coupling or the thing that surprises newcomers.
7. `.close` — one closing truth.

Use for: "how does X fit together", "what talks to what", a system/service boundary
question, an ADR-shaped "why is it wired this way" (forces/options/consequences becomes
three `.card`s or a `.compare-table`, not a third archetype).

---

When a request blends both — a system whose *setup* is a sequence but whose *shape* is
spatial — pick the dominant one for the spine and borrow the other's device for one
section (a Map with a short numbered onboarding sequence at the top; a Walk that ends in
one small map panel instead of a ninth step).
