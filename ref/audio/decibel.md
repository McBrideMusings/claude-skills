# Decibel arithmetic

Read when converting between gain and dB, labelling a level meter or slider in dB, or judging a
claim such as "+10 dB is ten times louder". Source for every line:
[Dr. Lex, the decibel scale](https://www.dr-lex.be/info-stuff/decibel.html).

## The formulas

- **Power ratio P:** dB = 10·log10(P).
- **Amplitude ratio R:** dB = 20·log10(R). Sound pressure level and a digital sample's gain are
  amplitude values, so a gain multiplier uses the 20.
- **+3 dB doubles power. +6 dB doubles amplitude.**
- **+10 dB multiplies power by 10.** It does not make the sound ten times as loud, so never
  turn a dB difference into a linear ratio to judge loudness. Read the dB value itself: hearing is
  roughly logarithmic, so dB values approximate how much louder a change seems.

| Gain multiplier | Level |
| --- | --- |
| 1.0 | 0 dB |
| 0.5 | −6 dB |
| 0.25 | −12 dB |
| 0.1 | −20 dB |

## Reference points

- **About 1 dB is the smallest difference people perceive.**
- **Level falls about 6 dB per doubling of distance** from a source, ignoring reflections.
- **dB(A)** is the common absolute scale. It weights frequencies like an average human ear and
  models deep bass and high treble poorly. 0 dB(A) is the hearing threshold. The page puts the
  pain threshold at about 120 dB(A) and says roughly 85 dB(A) is the generally accepted level
  where hours of exposure become a risk, a figure it calls debatable.
- **Compare two readings by subtracting them.** A phone microphone's gain error is a constant
  dB offset, so differences between two readings from the same microphone are meaningful while
  absolute readings need calibration.

## For a volume control

The page says professional equipment shows volume in dB and calls a linear volume control "wrong
and annoying to use". The mapping that follows from this is [volume.md](volume.md).
