# Aspect brief: `audio` (domain cells, read directly)

Axis tag: `audio`. Applicability: the `audio` label is in scope per [`../../_detect.md`](../../_detect.md) — an explicit `improve audio` argument wins outright, then the committed `.claude/domain` marker, and only then classification. Resolved for you in Phase 01; if you are reading this, the label is in scope.

**Read:** [`../../ref/audio/context.md`](../../ref/audio/context.md), then every file its Files map lists, in full. They are knowledge cells rather than skills, so this file is their read-only contract.

## The contract

No file writes, no commits, no questions. Answer from the repo — the slider component, the gain or `volume` call it feeds, the stored setting, the scripting or API surface, the tests — and mark what the artifacts can't answer `Unknown` rather than guessing it.

## What to look at

- **The position-to-gain mapping** (`volume.md`) — is there a curve between the control and the gain, and is position 0 exact silence?
- **What is stored and exposed** (`volume.md` rules 1 and 5) — gain or knob position, and whether a script can read both.
- **A curve setting** (`volume.md` rule 3) — Linear / Perceptual plus steepness, graphed in dB.
- **Interaction with the OS volume** (`volume.md` rule 4) — does the app's range assume the OS volume is near maximum?
- **Anything the `review.md` lens lists**, applied to the code as it stands rather than to a diff.

## Aspect-specific rules

- A finding cites the file and line that carries the mapping or the stored value. "Use a log curve" with no slider and no gain call named is ungrounded.
- Slider appearance, focus and target size are the `gui` aspect's. Tag them `gui` and move on.
- Something already broken in playback (a click, a crash) is `review`'s. Tag it `review-territory`.
