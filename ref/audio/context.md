# audio — injected context

> Loudness is logarithmic: gain curves, dB and normalisation, never raw linear sliders.

Anything that plays, mixes or controls sound: volume sliders, gain stages, players,
loudness normalisation, tone and test-signal generation. Interface rules for the control
itself are in [`ref/gui`](../gui/context.md); this label owns what the control does to the
signal.

- **Store the gain, derive the knob position.** The curve then changes without migrating data.
- **Position 0 is exact silence.**
- **Level is measured in dB**: dB = 20·log10(gain). +10 dB is not "ten times as loud".

## Files

| Open | When |
| --- | --- |
| [`volume.md`](volume.md) | Building or critiquing a volume slider or any audio gain control. |
| [`decibel.md`](decibel.md) | Converting gain and dB, labelling levels, or judging a claim about decibels. |
| [`loudness.md`](loudness.md) | Building a player or pipeline: normalisation, clipping, lossy re-encoding. |
| [`review.md`](review.md) | Reviewing a diff that touches playback, gain or a volume control. |
