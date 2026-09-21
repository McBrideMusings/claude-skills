# backend — file formats, wire formats, and persistence

Adapted from defuse's global CLAUDE.md (<https://gist.github.com/defuse/da01a26ffd94018043799bcd9400ecc1>).

Applies to any format this project defines and other programs read: a save file, a config
schema, a binary protocol, an on-disk cache that outlives one process. The HTTP JSON
contract is [`../ref-api/design.md`](../ref-api/design.md); where the two meet, the rule
below that reconciles them is "the spec says so".

## Strict in what you accept and what you emit

The robustness principle ("be liberal in what you accept") is how parsers drift apart and
how format bugs become security bugs. Whatever a parser tolerates, someone ships, and the
tolerance becomes part of the format.

- **Reject, don't repair.** Malformed input is an error naming what is wrong and where. No
  "probably meant" branch.
- **Nothing is accepted that the spec doesn't mention.** If the parser takes it, the spec
  says so. A spec that says "ignore unknown fields" (as `ref-api`'s additive rule does for
  JSON responses) makes ignoring them correct; a spec that says nothing makes it a bug.
- **One encoding per document.** The writer emits exactly one byte form for a given value.
  If the format promises that, a test re-encodes a decoded document and compares bytes.

## Compatibility is decided per surface

Name which surfaces carry a promise (shipped file formats, wire protocols, public APIs) and
which are internal. Internal ones change freely, with every consumer updated in the same
commit. For a promised surface:

- A breaking change happens only behind a version bump, and the commit message says so.
- **Keep a fixture corpus.** Real files from every supported version live in the repo, and
  loading each one is a permanent test. A fixture is never regenerated or deleted to make a
  test pass while its version is still supported.
- **Round-trip as a property:** `decode(encode(x)) == x` over generated valid inputs, not a
  few hand-picked ones.
- **Format constants in one module under a snapshot test**, so changing a magic number,
  field id or default without a version bump fails the build.
- **Ship test vectors with the spec**, so someone reimplementing it can check their work
  without reading this code.
- **Deterministic output is tested.** Same input, byte-identical output, with no clock reads
  or unseeded randomness on the path.

## Writes survive a crash

- **Write to a temp file in the same directory, flush it, then rename over the target.**
  A rename within one filesystem is atomic, so a reader sees the old file or the new one,
  never half of each. State the `fsync` policy (file, and directory after the rename) where
  the write happens.
- **Readers are tested against damaged input:** a truncated file, a torn write, random
  bytes. Each must come out as a clear rejection at the boundary — not a crash deeper in,
  and not a silently repaired value.
