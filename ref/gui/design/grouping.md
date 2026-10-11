# Grouping and misbinding — the Gestalt principles

Read by a [`critique.md`](../critique.md) pass and by the engines (`review`, `verify`) when the domain is `gui`.
This is the lens that judges *what the eye binds to what*, before any question of whether the
spacing scale or the palette is right. Source: Jakob Nielsen, UX Tigers —
https://www.uxtigers.com/post/gestalt-principles.

## The frame

A screen gets scanned twice. The first pass runs before any conscious reading starts, lasts a
fraction of a second, and sorts the layout into clusters — it decides what belongs with what purely
from shape and position. Labels, prices and button copy only get processed on the second pass, after
the clustering is already locked in. When the visual grouping points one way and the content points
another, the first pass wins and the second pass can't undo it: the user has already paired the price
with the wrong item before reading either one. Name that failure **misbinding**: a piece of text — a
label, a price, a warning, a status flag, a source, an action — gets pinned to the wrong object on
screen. When usability testing turns up a misbinding, the fix is in the layout, never in the copy.

The nine principles that decide the first pass — proximity, similarity, common region,
connectedness, continuation, common fate, closure, figure-ground, Prägnanz — are
[`gestalt.md`](gestalt.md). Read it before answering the audit questions below.

## Cue congruence — the operational rule

Elements that belong together must AGREE across spacing, appearance, enclosure, alignment and
behaviour; elements that serve different functions must DIVERGE on the cues users notice first.
None of the nine principles is an on/off switch — they compete, and whichever set of cues lines up
and reinforces each other wins the reading. If spacing implies two groups while colour implies one,
the screen is showing two conflicting structures at once and forces the user to guess which cue to
trust. Piling on a redundant cue is worth it where the grouping genuinely matters; piling on every
cue regardless just adds noise. Spend the strongest cues — border, then spacing — on the
relationships that matter most.

## The six audit questions

These become the review checklist and the critique gate:

1. Is the gap inside each group unmistakably smaller than the gap between groups?
2. Do the strongest cues — spacing, border, colour, alignment, motion — all describe the same
   structure?
3. Does each perceived object match its behaviour: one apparent action means one coherent hit area;
   several actions mean visibly separate controls?
4. Does the hierarchy survive mobile reflow, text enlargement, localization, loading, validation,
   expansion and disabled states?
5. Do visual structure, DOM/source order, accessible names and keyboard sequence tell the same
   story?
6. In a one-second first-read test, does a viewer identify the intended groups, the primary action
   and the label-to-object bindings before reading any copy?

## How to run question 6 without a user

`layout.md` (Lens 7) already runs a squint test for hierarchy; use the same move here without a real
user in the room: blur or squint at a screenshot and name the groups out loud before reading any
copy. Write down what you bound to what, then check that against what the code actually associates.
Every mismatch is a finding.
