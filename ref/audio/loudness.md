# Loudness, clipping and normalisation

Read when building a player or an audio pipeline, choosing whether to normalise loudness, or
reviewing code that encodes or re-encodes audio. Source unless stated otherwise:
[Dr. Lex, Loudness Wars](https://www.dr-lex.be/info-stuff/loudness_wars.html), an article from
2008 with updates through 2020. Its artist examples are dated and are left out here.

## Facts

- **16-bit audio has 96 dB of dynamic range.**
- **Two masters can both use the whole 16-bit range and still differ in loudness.** Dynamic
  range compression raises the average level without raising the peak.
- **Dynamic range compression cannot be reliably undone**: going from uncompressed to compressed
  is easy, the reverse is near impossible. It is a different thing from lossy compression
  (MP3, AAC), which is about file size.
- **Digital clipping is instant and hard.** Clipped samples cause audible distortion that
  cannot be repaired.
- **A lossy codec can overshoot the original waveform**, so a master already at full scale can
  clip after encoding.
- **ReplayGain** (and similar loudness normalisation) stores a gain per track so tracks play at
  equal loudness. The author calls it "not a perfect measurement"; a more negative value implies
  less dynamic range in a full-scale track.
- **The louder version wins a quick A/B comparison.** Level-match two versions before judging
  which is better.

## Rules for a player or pipeline

1. **Apply loudness normalisation as a gain at playback**, with the stored gain separate from
   the user's volume (rule 1 in [volume.md](volume.md)). The article's argument is that
   normalisation at playback removes the reason to over-compress. That is its prediction, not a
   measured result.
2. **Do not re-encode to a higher bitrate to improve quality.** Dr. Lex says a low-bitrate
   track cannot gain quality this way
   ([video encoding tips](https://www.dr-lex.be/info-stuff/video-encoding-tips.html)).
3. **Leave headroom before a lossy encode** so overshoot does not clip. This follows from the
   overshoot fact above; the article does not state it as a rule.
4. **Compare at matched levels** when judging codecs, masters or settings.
