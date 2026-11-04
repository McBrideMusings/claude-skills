# Aspect brief: `audio` (domain cells, read directly)

Axis tag: `audio`. Applicability: the `audio` label is in scope per [`../../_detect.md`](../../_detect.md) — an explicit `improve audio` argument wins outright, then the committed `.claude/domain` marker, and only then classification. Resolved for you in Phase 01; if you are reading this, the label is in scope.

**Read:** the rules this aspect checks, stated here:

- Store the gain and derive the knob position, so the curve can change without migrating stored data.
- Position 0 is exact silence.
- Level is measured in dB: dB = 20·log10(gain). A linear slider (gain = position) puts 50% at −6 dB and crowds the quiet levels into the leftmost 5–15%; the fix is a power curve, gain = position^n.
- A loudness-normalisation gain stays separate from the user's volume.
- A lossy encode of a full-scale signal needs headroom, and a re-encode to a higher bitrate does not improve quality.

*Knowledge base: search it for "audio volume and gain", "decibel", "loudness normalisation". If you have none, skip this line and don't mention it.*

This file is the read-only contract for that audio knowledge.

## The contract

No file writes, no commits, no questions. Answer from the repo — the slider component, the gain or `volume` call it feeds, the stored setting, the scripting or API surface, the tests — and mark what the artifacts can't answer `Unknown` rather than guessing it.

## What to look at

- **The position-to-gain mapping** — is there a curve between the control and the gain, and is position 0 exact silence?
- **What is stored and exposed** (the store-the-gain rule) — gain or knob position, and whether a script can read both.
- **A curve setting** (a curve choice) — Linear / Perceptual plus steepness, graphed in dB.
- **Interaction with the OS volume** (the OS volume) — does the app's range assume the OS volume is near maximum?
- **Anything the rules above list**, applied to the code as it stands rather than to a diff.

## Aspect-specific rules

- A finding cites the file and line that carries the mapping or the stored value. "Use a log curve" with no slider and no gain call named is ungrounded.
- Slider appearance, focus and target size are the `gui` aspect's. Tag them `gui` and move on.
- Something already broken in playback (a click, a crash) is `review`'s. Tag it `review-territory`.
