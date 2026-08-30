#!/usr/bin/env python3
"""Measure how often context pointers are actually followed.

A context pointer is a reference held in context that names out-of-context
material. Two kinds, and they perform very differently:

  COLD -- a line in CLAUDE.md naming a doc. Nothing has fired; the agent is
          expected to reach for it on its own.
  WARM -- a line in a SKILL.md naming a sibling file, counted only in sessions
          where that skill actually fired.

The rates this produces are the evidence behind improve/POINTERS.md. Re-run it
after rewriting a pointer to see whether the rewrite worked.

Usage:
    python3 ~/.claude/skills/audit-session/pointer_rate.py            # both
    python3 ~/.claude/skills/audit-session/pointer_rate.py --cold     # cold only
    python3 ~/.claude/skills/audit-session/pointer_rate.py --warm     # warm only
    python3 ~/.claude/skills/audit-session/pointer_rate.py --target PATH_SUBSTRING
                                                                      # one custom target

Measurement traps this script already avoids -- do not hand-roll around them:

  1. A skill's SKILL.md lands in the transcript when the skill loads, and it
     NAMES its siblings. Matching a bare filename therefore counts the skill's
     own link text as a read. Every warm rate here requires an ABSOLUTE path,
     which only a real Read/cat produces. The naive version reports 100%.
  2. CLAUDE.md and MEMORY.md are injected at request-build time and never
     persisted, so a path appearing in a transcript was genuinely reached for
     rather than merely named in steering.
  3. Config paths (settings.json) appear in transcript metadata independently of
     any read. They are useless as a control; do not add one.
  4. Sessions with fewer than 3 assistant turns are probes and aborts. Counting
     them drags every rate toward zero.
"""
import argparse
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path.home() / ".claude" / "projects"
SKILLS = Path.home() / ".claude" / "skills"
MIN_TURNS = 3
MIN_FIRES = 20          # below this a warm rate is noise
MIN_BYTES = 2000

# Cold targets: what CLAUDE.md's Knowledge map points at.
COLD = {
    "~/.claude/domains-map":     re.compile(r"\.claude/domains-map"),
    "~/.claude/docs/README.md":  re.compile(r"\.claude/docs/README\.md"),
    "~/Systems/":                re.compile(r"/Systems/"),
    "<repo>/docs/":              re.compile(r"/docs/(?!adr)"),
}


def transcripts():
    """Yield (path, text) for every transcript with real work in it."""
    for jf in ROOT.rglob("*.jsonl"):
        try:
            raw = jf.read_text(errors="replace")
        except OSError:
            continue
        if len(raw) < MIN_BYTES:
            continue
        turns = raw.count('"type":"assistant"') + raw.count('"type": "assistant"')
        if turns < MIN_TURNS:
            continue
        yield jf, raw


def warm_targets():
    """skill -> (fired pattern, absolute-sibling-path pattern, sibling count)."""
    out = {}
    for d in sorted(SKILLS.iterdir()):
        if not d.is_dir() or not (d / "SKILL.md").exists():
            continue
        sibs = sorted({str(p.relative_to(d)) for p in d.rglob("*.md")
                       if p.name != "SKILL.md"})
        if not sibs:
            continue
        out[d.name] = (
            re.compile(r'"skill"\s*:\s*"%s"' % re.escape(d.name)),
            # Absolute path only -- see trap 1 in the module docstring.
            re.compile(r'/\.claude/skills/%s/(?:%s)'
                       % (re.escape(d.name), "|".join(re.escape(s) for s in sibs))),
            len(sibs),
        )
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cold", action="store_true", help="cold pointers only")
    ap.add_argument("--warm", action="store_true", help="warm pointers only")
    ap.add_argument("--target", metavar="SUBSTRING",
                    help="measure one custom path substring as a cold target")
    args = ap.parse_args()

    do_cold = args.cold or args.target or not args.warm
    do_warm = args.warm or not (args.cold or args.target)

    cold = dict(COLD)
    if args.target:
        cold = {args.target: re.compile(re.escape(args.target))}

    warm = warm_targets() if do_warm else {}

    sessions = 0
    cold_hits = Counter()
    fired, warm_hits = Counter(), Counter()

    for _, raw in transcripts():
        sessions += 1
        if do_cold:
            for name, pat in cold.items():
                if pat.search(raw):
                    cold_hits[name] += 1
        for name, (fire_pat, sib_pat, _) in warm.items():
            if fire_pat.search(raw):
                fired[name] += 1
                if sib_pat.search(raw):
                    warm_hits[name] += 1

    if not sessions:
        print(f"no transcripts under {ROOT}", file=sys.stderr)
        return 1

    print(f"corpus: {sessions} sessions with >={MIN_TURNS} assistant turns\n")

    if do_cold:
        print("COLD pointers -- a steering line naming a doc")
        print(f"  {'target':30} {'sessions':>9} {'rate':>8}")
        for name in cold:
            n = cold_hits[name]
            print(f"  {name:30} {n:>9} {n / sessions * 100:>7.1f}%")
        print()

    if do_warm:
        rows = [(n, warm[n][2], fired[n], warm_hits[n], warm_hits[n] / fired[n] * 100)
                for n in warm if fired[n] >= MIN_FIRES]
        rows.sort(key=lambda r: -r[4])
        print(f"WARM pointers -- a SKILL.md naming a sibling, in sessions where it fired")
        print(f"  (skills firing < {MIN_FIRES} times omitted as noise)")
        print(f"  {'skill':18} {'sibs':>5} {'fired':>7} {'read':>6} {'rate':>8}")
        for name, nsib, f, w, rate in rows:
            print(f"  {name:18} {nsib:>5} {f:>7} {w:>6} {rate:>7.1f}%")
        if rows:
            tf = sum(r[2] for r in rows)
            tw = sum(r[3] for r in rows)
            print(f"  {'WEIGHTED':18} {'':>5} {tf:>7} {tw:>6} {tw / tf * 100:>7.1f}%")
        print("\n  Read rate falls as the pointing document's own body grows: a skill big")
        print("  enough to act on without opening anything gets acted on without opening")
        print("  anything. Thinness is the forcing function.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
