---
name: redesign
description: "Solve a goal for a UI, process, feature, architecture or implementation from first principles, treating the existing shape as inherited assumptions. For a UI surface it always generates wildly divergent image comps first, then closer-fit comps and HTML mockups in the real UI's look, then settles on one. Use when the user says redesign, rethink, start over, from scratch or first principles, or when something is hard to use or laid out wrong, even if the same message reports a bug. Not for bugs, polish or small tweaks."
---

# Redesign

Control words (`go`, `next`, `dispatch`, `implement`, `verify` …) are defined in
[`../CONTEXT.md`](../CONTEXT.md).

The existing solution is a set of inherited assumptions, not the baseline. Starting from it, or from a mismatch inside it, yields refinement. So a redesign works from the goal: what the user needs, which constraints are real, several structurally different ways to meet it, and only then how the current system compares and what it costs to get there. Refinement is a valid outcome only when the incumbent beats the new candidates on the stated jobs.

**For a UI surface the candidates are pictures, never prose.** Words and ASCII boxes collapse every candidate into the same panels in a different order; a generated image does not. A UI redesign therefore runs three rungs in order: **wild comps** (far from the current UI), **fit comps and mockups** (the survivors, in the real UI's look), then **one settled design**. Skipping a rung, or showing wireframes in words instead of images, is a failed redesign.

Tools it calls, none rebuilt here: [`../generate/SKILL.md`](../generate/SKILL.md) for every image (`generate/image-api`, gemini by default, `--edit <screenshot>` for edits), [`../spike/COMP.md`](../spike/COMP.md) for the comp procedure and [`../spike/MOCKUP.md`](../spike/MOCKUP.md) for HTML mockups screenshotted per state.

## Steps

Each step ends on a completion criterion. Do not start a step before the previous one is done.

**0. Goal and target.** One sentence from the user stating what they want to achieve, and whether the target is a UI surface, process, feature, architecture or implementation. If the target is a bug, polish or a small tweak, say so in one line and stop. *Done when* the goal sentence and target are written down.

**1. Jobs.** List what the user wants to do, phrased as jobs (situation, motivation, outcome) covering needs, pains and desires. Do not mark them against the current system yet.
*Knowledge base: search it for "user needs jobs". If you have none, skip this line and don't mention it.*
*Done when* every job in scope is written down.

**2. Assumption ledger.** Read the current thing only to extract what it assumes: its objects, vocabulary, ordering, ownership, storage and platform. Mark each assumption *hard* (physics, platform, external contract, stated by the user) or *inherited* (a past choice). For a UI surface the hard list always carries the surface's pixel size and aspect, input kinds (touch, mouse), the rule that a game screen never scrolls as a page, and every number the user said must stay visible. *Done when* every assumption is marked and each *hard* one names its source.

**3. Wild comps (UI surface: always).** Generate at least six image comps of the surface, each from a different lens, none of them seeing the current UI.

- **Lenses.** Draw six without replacement from this list with a shell random roll, never by choice: *analogy* (another domain solved this job), *inversion* (flip who acts or what is shown), *delete it* (do the job without the main component), *different substrate* (another medium, owner or time), *another genre* (how a different kind of game or app does it), *one thumb* (designed only for a thumb at the bottom of a phone), *extreme density*, *extreme emptiness*.
- **Blind briefs.** One sub-agent per lens receives only the goal, the jobs and the *hard* constraints, never a screenshot, the code or the inherited list. It returns one concept sentence and one image prompt that names the regions, hierarchy, real copy and the aspect (portrait device size for a phone surface). Sub-agents that design run on opus with the line `Opus reason: (1) the brief is the hard part (the change's shape is unsettled and must be designed).`
- **Render.** Run each prompt through `generate/image-api` into `/private/tmp/claude/<repo-slug>/spikes/<slug>/wild/<lens>.png`. Look at every PNG: a dropped region or misspelled label means regenerate it.
- **Divergence check.** Any two comps that share the same objects and verbs and differ in layout only count as one: replace one with a new roll, or run `lateral random-stimulus` on the pair.
- **Show them** as one contact sheet in a Wheel artifact (a project artifact, one image per comp, lens and concept sentence beside it), and stop. The user picks one to three to keep, or combines parts of two.

*Done when* at least six comps pairwise differ in an object or verb, the contact sheet is shown and the user has picked.

**4. Incumbent and reality check.** Screenshot the current screen at the real viewport and add it as one more candidate. Mark every candidate's jobs *native*, *by workaround* or *cannot*, with the same rubric. Then check each survivor against the code as built.
*Knowledge base: search it for "system as built check". If you have none, skip this line and don't mention it.*
Each row is (candidate needs | code does | `file:line` | shape of the change) or `Unknown`. Cost is stated, never a reason to drop a candidate. *Done when* every candidate has job marks and as-built rows.

**5. Fit comps and mockups (UI surface: always).** For each survivor, bring it toward the real UI in two steps.

- **Fit comp.** `generate/image-api --edit <current-screenshot.png>` with the instruction "restructure this screen as <survivor concept>; keep the palette, type, chrome and viewport", at the surface's aspect, two variants per survivor that differ on one named axis. The repo's `dsys prompt` block (see COMP.md) goes first when the repo has one.
- **Mockup.** For the survivors the user keeps after the fit comps, build an HTML mockup per [`../spike/MOCKUP.md`](../spike/MOCKUP.md) in the project's real CSS, and screenshot it at the real viewport in every state that matters (default, mid-interaction, empty, can't-afford, error), never one pretty state.
- **Show them** in the same Wheel artifact, each survivor as one row: wild comp, fit comp, mockup states. The current screenshot sits first in the row for comparison.

*Done when* every survivor has fit comps and per-state mockups and the user has seen them.

**6. Decision.** Present the survivors, incumbent included, as an option set per [`../CHAT-FORMAT.md`](../CHAT-FORMAT.md), each with its job marks, its images and its change shape, then wait. A candidate that is a guard (retry, cache, refresh button) is labelled as one. *Done when* the user has picked.

**7. Settle.** For the chosen design: the flow (places, affordances, content and the moves between states) with the final mockup states as the spec, the winner's comp stored per [`../spike/COMP.md`](../spike/COMP.md) § Storing the winner, and the hand-off to `implement`. An existing surface with a `DESIGN.md` is held to that design system from step 5 on. *Done when* the user has seen the flow and agreed.
*Knowledge base: search it for "interaction flow". If you have none, skip this line and don't mention it.*

## Targets that are not a UI surface

A process, feature, architecture or implementation skips the image rungs. Step 3 becomes at least three blind candidates from three rolled lenses written as structured shapes (objects, relations, states, verbs) that pairwise differ in at least one object or relation; steps 4 and 6 run as written; step 5 becomes `spike` on the question of whether the shape holds; step 7 lays out the steps, handoffs or module boundaries.

## What this never does

- Decide for the user. Steps 3 to 6 surface decisions; the user makes them.
- Show a candidate the sub-agents generated after reading the current design.
- Offer only repairs of the current shape.
- Offer a UI candidate as words or ASCII boxes instead of an image.
- Re-ask a decision a step already settled.

## Callers

`improve`'s `gui` and `product` aspects name `redesign <target>` as the fix for a deeper-layer finding and never run it inside a survey. `implement` runs step 3's roll before building a new UI surface in a repo with no `DESIGN.md`. `spike` runs it when a variant set collapses onto one direction.
