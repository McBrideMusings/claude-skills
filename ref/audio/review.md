# audio — review lens

Added by the `review` engine when `audio` is in scope. The reasoning and sources are in
[volume.md](volume.md). Each item is a finding only when the diff introduces or leaves it.

1. **A volume slider whose position is the gain.** `gain = position` puts 50% at −6 dB and
   crowds every quiet level into the leftmost 5–15%. Look for a slider `value` passed straight
   to a gain, `volume` or `setVolume` call with no curve between them.
2. **A persisted or scripted value that is the knob position.** The stored and API value
   should be the gain. If it is the position, changing the curve changes loudness for every
   existing user and forces a migration.
3. **Position 0 that does not give exact silence.** A true exponential curve never reaches
   zero; it needs a snap or roll-off at the bottom.
4. **No way to read the gain and the position separately.** A script or test that can see only
   one cannot tell a wrong curve from a wrong level.
5. **A curve exposed as a setting with a gain-axis graph.** Plot dB against position; on a
   gain axis every curve is the same bend.
6. **A perceptual curve applied to a value that is not perceptual** (a colour channel, a
   pixel size). Not a finding for loudness.

7. **A loudness-normalisation gain folded into the stored volume.** Keep the per-track gain
   separate from the user's volume ([loudness.md](loudness.md)).
8. **A lossy encode of a full-scale signal with no headroom**, or a re-encode to a higher
   bitrate to "improve quality" ([loudness.md](loudness.md)).
9. **A dB value turned into a linear ratio to judge loudness**, or a gain converted with the
   power formula (10·log10) instead of the amplitude one (20·log10) ([decibel.md](decibel.md)).

Not findings here: the visual design of the slider (focus ring, target size, labels). Those
belong to `gui`.
