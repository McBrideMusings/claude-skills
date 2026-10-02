# Volume and gain controls

Read when building or critiquing a volume slider or any other audio gain control. The generic
slider, focus and state rules are in [`context.md`](context.md); this cell owns the mapping from
slider position to loudness.

## A linear slider is the defect

Loudness is perceived roughly logarithmically, so level is measured in dB: dB = 20·log10(gain).
On a linear slider (gain = position) the dB level at each position is:

| Slider position | Gain | Level |
| --- | --- | --- |
| 100% | 1.0 | 0 dB |
| 50% | 0.5 | −6 dB |
| 25% | 0.25 | −12 dB |
| 12% | 0.12 | −18 dB |
| 5% | 0.05 | −26 dB |

The whole right half of the track covers 6 dB, and every quiet background level sits in the
leftmost 5–15%. The symptom users report: the knob always sits at the far left, and one pixel is
a big jump. Mozilla's bug on this measured a real video: 1% → 10% raised the level 22 dB, while
50% → 100% raised it 6 dB ([Bugzilla 1634712](https://bugzilla.mozilla.org/show_bug.cgi?id=1634712)).
A Sonixd user reports the same: 100% and 50% barely differ, while a comfortable level is 1–3%
([Sonixd #275](https://github.com/jeffvli/sonixd/issues/275)).

## The fix: a power curve from position to gain

gain = position^n, and position = gain^(1/n) when reading a stored gain back.

| Usable range | Approximation |
| --- | --- |
| 50 dB | x³ |
| 60 dB | x⁴ |
| 70 dB | x⁵ |
| 80 dB | x⁶ |

The table is [Dr. Lex's](https://www.dr-lex.be/info-stuff/volumecontrols.html), which recommends
a 60 dB range (x⁴) as the default guess for consumer equipment.

- **Position 0 must give exact silence.** A pure power curve already does. A true a·e^(bx)
  curve never reaches zero, so Dr. Lex adds a linear roll-off near zero, or shifts the curve down
  so it passes through {0, 0}.
- **The power curve is computationally cheap and invertible**, which matters for rule 1 below:
  the exponential's inverse is awkward to solve once a roll-off is added.

## What other players do

- **`HTMLMediaElement.volume`** is linear in practice. The HTML spec says the range "need not be
  linear" and leaves the scale unspecified ([WHATWG HTML #5501](https://github.com/whatwg/html/issues/5501)).
- **YouTube** moved from a logarithmic response in its Flash player to a linear one, to match
  browsers (same issue). **YouTube Music**'s slider is linear
  ([esveo](https://www.esveo.com/en/blog/youtube-music-and-its-broken-volume-slider/)).
- **Spotify desktop** had a linear slider; the extension that remapped it with position² was
  archived with the note that Spotify "appears to have changed this behavior"
  ([spicetify-logarithmic-volume](https://github.com/saltacc/spicetify-logarithmic-volume)).
- **AVPlayer `volume`** is a 0–1 multiplier relative to the system volume. Treat it as linear
  gain.

## Design rules

1. **Store the gain**, the quantity the user hears, as the persisted value and as the
   scripting/API value. Derive the knob position from the curve. Changing the curve then keeps
   loudness constant and only moves the knob, and no stored value needs migrating.
2. **A curve that is too steep fails too**: the top of the slider does all the work. Default
   around n=3 and tune by listening. This is a design judgment, not a sourced figure.
3. **If the curve is a setting**, offer Linear / Perceptual plus a steepness control. Plot any
   graph in **dB** against position, since on a gain axis every curve looks like the same bend.
   Mark the current volume on the graph. Disable steepness under Linear.
4. **An app's gain multiplies the OS volume.** A user whose OS volume is near maximum does all
   their turning down in the app, which makes a linear slider's crowding worse.
5. **Expose the knob position and the gain separately** to scripts and tests, so a check can
   tell the curve from the level.

## Scope

Use a perceptual curve only for perceptual magnitudes such as loudness. A slider whose value is
a plain quantity (a colour channel, a pixel size) stays linear.
