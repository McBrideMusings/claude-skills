# Usability heuristics and severity

Jakob Nielsen's ten usability heuristics (1994, revised 2020), used as a checklist pass over a
running interface, and his 0–4 scale for rating how bad each problem is. Sources:
[myuxacademy.com — Nielsen's 10 usability heuristics](https://myuxacademy.com/blog/nielsens-10-usability-heuristics/),
[nngroup.com — Severity ratings for usability problems](https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/).

The heuristics find problems; they do not say what to build. Each one below names what a violation
looks like on a screenshot, the `gui` file that holds the detailed rules, and the design layer the
problem usually starts in. A violation that starts below the surface is tagged **deeper-layer**
([`critique.md`](critique.md) § Output). Patching it at the surface only hides the symptom
([`working-layers.md`](working-layers.md) § Failure-mode signals).

## How to run the pass

Walk the surface's main tasks start to finish, against screenshots of each step. At every screen, ask
which heuristics it breaks. Record each problem as: heuristic number, where it occurs (screen and
element), what the user sees, and a proposed fix. Rate severity **after** the walk, never during it
(§ Rating severity).

## The ten heuristics

| # | Heuristic | What a violation looks like | Detail lives in | Usual root |
| --- | --- | --- | --- | --- |
| 1 | **Visibility of system status** — the interface tells the user what is happening, promptly. | A click with no visible response; an upload or save with no progress and no confirmation; a stale value with no "updating" mark. | [`states.md`](states.md) (loading, partial), [`design/motion.md`](design/motion.md) (feedback purpose) | surface |
| 2 | **Match between system and the real world** — the user's words and concepts, in the order they expect. | Internal names, database field names or error codes in labels; steps in implementation order rather than task order. | [`copy.md`](copy.md), [`layers/domain.md`](layers/domain.md) | conceptual model |
| 3 | **User control and freedom** — a clearly marked way out of a state entered by mistake. | No undo after a destructive action; a modal or wizard with no cancel; a back button that loses entered work. | [`layers/interaction-flow.md`](layers/interaction-flow.md) | interaction flow |
| 4 | **Consistency and standards** — one word, look and behaviour per thing; follow the platform. | "Delete" here and "Remove" there for the same action; two buttons that look alike but do different kinds of thing; a hand-built control where the platform ships one. | [`copy.md`](copy.md), [`native-first.md`](native-first.md), OOUX Shapeshifter and Masked in [`working-layers.md`](working-layers.md) | conceptual model when the same object takes different forms, else surface |
| 5 | **Error prevention** — design the mistake out before it can happen. | A past date that can be picked for a booking; free text where a list of valid choices exists; an irreversible action one stray click away. | [`forms.md`](forms.md) | interaction flow |
| 6 | **Recognition rather than recall** — show the options; never make the user carry information between screens. | Asking for an order number the app already knows; options hidden until the user types the exact name; a later step that needs a value shown only on an earlier one. | [`forms.md`](forms.md) (defaults, autofill), [`layers/interaction-flow.md`](layers/interaction-flow.md) | interaction flow |
| 7 | **Flexibility and efficiency of use** — shortcuts for frequent users that newcomers never need to learn. | A frequent task with no keyboard shortcut, bulk action or saved default; a shortcut that is the only route to a feature. | [`layers/interaction-flow.md`](layers/interaction-flow.md), [`a11y.md`](a11y.md) (keyboard reach) | interaction flow |
| 8 | **Aesthetic and minimalist design** — every element on screen competes with the rest, so each one must help the current decision. | A card carrying every field the record has; rarely needed settings beside the main action; decoration that outranks the content. | [`design/layout.md`](design/layout.md), [`slop.md`](slop.md), [`amplitude.md`](amplitude.md) | surface, or product strategy when nobody decided what the screen is for |
| 9 | **Help users recognise, diagnose and recover from errors** — plain words, the exact problem, and the fix. | "Something went wrong"; a raw error code; an error message far from the field that caused it; an error that clears the user's input. | [`copy.md`](copy.md), [`forms.md`](forms.md), [`states.md`](states.md) (error) | surface |
| 10 | **Help and documentation** — when help is needed, it is searchable, task-shaped and short. | Help organised by feature ("About sharing") instead of by task ("Share a page"); no help at the point where people get stuck. | [`copy.md`](copy.md) | surface |

## Rating severity

Nielsen combines four things into one rating:

- **Frequency** — how many users hit it, how often.
- **Impact** — how hard it is to get past once hit.
- **Persistence** — whether users learn their way around it once, or it costs them every time.
- **Market impact** — some problems damage the product's reputation far beyond their objective cost.

His 0–4 scale maps onto the `P0`–`P3` scale that `review` and `improve` use
([`../../review/REVIEW-CORE.md`](../../review/REVIEW-CORE.md) § Axis tags). The mapping is ours, not his:

| Nielsen | His wording, summarised | P-level |
| --- | --- | --- |
| 4 | Usability catastrophe — must be fixed before release | `P0` |
| 3 | Major problem — important, high priority | `P1` |
| 2 | Minor problem — low priority | `P2` |
| 1 | Cosmetic — fix only if time allows | `P3` |
| 0 | Not a usability problem | drop the finding |

Every heuristic finding states its frequency, impact and persistence in one line each, so the rating
can be checked rather than taken on trust.

**Rate after the list is complete.** Nielsen found that evaluators give poor severity estimates while
they are still hunting for problems, so rating is a separate step over the finished list.

**One rater is not enough when the rating decides a release.** Nielsen says one evaluator's ratings
are "too unreliable to be trusted", and the mean of three is good enough for most practical purposes.
For a [`launch-readiness.md`](launch-readiness.md) audit, three raters each rate the full problem list
independently, from its written descriptions and screenshots, without seeing the others' ratings. The
finding takes the mean, rounded to the nearest level, with halves rounding toward the more severe level.
A one-component critique rates once and says the rating comes from a single rater.

**Release reading.** Any surviving 4 (`P0`) means the surface is not ready to ship. A surface whose
remaining problems are all 1s can ship.
