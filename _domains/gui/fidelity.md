# UI structural-fidelity audit

Read by `design` critique/audit mode (and the `review`/`verify` engines when the domain is `gui`).
The **structural** half of a surface audit — does the interface honour the decisions made in the layers
below it? — complementary to the **craft** half in `design.md` (motion/type/colour/layout/slop). Adapted
from jamiemill/layers-skills (MIT), the Surface layer.

The surface is where everything decided below becomes something a person encounters. **Surface problems
are often symptoms of deeper ones.** The central discipline: tell apart issues you fix at the surface
from issues whose root is in the conceptual model or interaction flow — route those back to the matching
`../../design/layers/` cell rather than patching the symptom. (This audit judges *fidelity to the decisions
below*; `design.md` judges *craft quality*. Run both in a critique.)

## The decisions this audit checks

- Whether the surface honours the vocabulary and objects from the conceptual model
- Whether every affordance from the breadboard is present — and whether any surface element has no model behind it
- Whether the emotional register fits the jobs users are doing
- How the user knows what happened, what's in progress, and what went wrong
- What's most prominent, and whether it should be
- Whether everything is accessible to the users who need it

## Disciplines — what keeps the surface honest

- **Surface fix vs deeper-layer issue.** The key judgement: is this a copy/layout fix, or a symptom whose
  root is in the conceptual model or interaction flow? Wrong vocabulary may be a rewrite — or a model that
  never settled the term. Route deeper issues to `../../design/layers/conceptual-model.md` or
  `interaction-flow.md` (via `design`), not to a surface patch.
- **Terms match the ubiquitous language.** Flag direct violations (a model term used inconsistently),
  unlisted terms (surface words not in the model — add to model, or remove as noise), and tone
  misalignments.
- **Object consistency.** No shapeshifters (same object in significantly different forms across
  contexts), no masked objects (a form where the user can't recognise the object type). (These are the
  OOUX failure modes from `design`; at the surface they're visible symptoms.)
- **Completeness both ways.** Every breadboard affordance is present; no surface element exists with no
  model or flow behind it (those are interaction decisions that slipped through → `interaction-flow.md`).
- **Errors diagnose, explain, recover.** "Something went wrong" fails all three. Flag every error state
  that doesn't do all three.
- **Prominence reflects importance.** What the flow needs the user to notice is what stands out; nothing
  prominent that shouldn't be. (Decide what's primary here; *how* to signal it — size/weight/space — is
  the layout lens in `design.md`.)
- **Accessibility is decided, not defaulted.**
- **Emotional register matches the emotional and social jobs** from user needs — not the product's
  benefit framed as the user's.

## Techniques

Auditing existing surface against the layers below. Use whichever the concern calls for — not all of them.

| Technique | Use it to |
|---|---|
| **Vocabulary check** | Take the ubiquitous language list; check every label, heading, button, error, notification, help string against it. |
| **Object-consistency check** | For each model object: where does it appear, in how many forms? Catch shapeshifters and masked objects. |
| **Completeness check** | Walk the breadboard against the surface in both directions — missing affordances, and surface with no model behind it. |
| **Emotional-register check** | Return to the emotional and social jobs; find where tone, framing, or emphasis misaligns. |
| **Feedback & error inventory** | For each action and state transition: how does the user know it worked, is in progress, or failed — and what to do next? |
| **Hierarchy review** | Per key place: what must the user notice or act on, and does the surface make that most prominent? Decide what's primary before how to signal it. |
| **Accessibility pass** | Contrast, sizing, touch targets, keyboard, screen-reader labels, focus. (The measured a11y values — 4.5:1, 44×44px — are enforced by the engines via `design.md` / `_domains/`.) |
| **Consistency pass** | Similar things treated similarly, different things differently; medium conventions honoured or deliberately broken. |

## In a critique

When `design` runs a post-code critique/audit, run this fidelity pass **alongside** the `design.md`
craft lenses and the `slop.md` catalog. Tag each finding: **surface-fix** (fix here) or **deeper-layer**
(route to the named `../../design/layers/` cell). A finding is still a verdict-plus-reason — the reason here
is a named discipline above (e.g. "this is a Broken object: the invoice's actions are split across two
screens with no cross-link"), not a measured craft value. Report the cross-layer issues first: they're
the ones a surface patch would only mask.
