# Launch readiness

Read by a [`critique.md`](critique.md) pass as a required step when the surface under review is a whole
site or app about to ship, not a single component in isolation. Complements `states.md` (the
states each component needs) and `slop.md` (the AI-tell catalog) — this cell is the last-mile
checklist those two don't cover.

## The checks

- **One-liner.** The home page states what the product does, in one sentence, above the fold.
  A visitor who has never heard of it can tell in five seconds.
- **One primary CTA per page.** Each page has exactly one action it wants the visitor to take;
  every other link or button is visibly secondary. `slop.md`'s duplicate-CTA-intent tell is the
  same defect stated as a design smell — this is the same check run as a launch gate.
- **Title, meta description, and favicon** are present on every page and specific to it — not the
  framework default (`Vite App`, `create-react-app`), not empty, not copy-pasted across pages that
  differ.
- **No placeholder text remains** — lorem ipsum, `TODO`, `Lorem Company Inc.`, a stock phone
  number, a stand-in email address — anywhere in shipped copy.

## Running this at the scale of a whole site

Fan out one read-only checker subagent per dimension group (design consistency, mobile/responsive,
states, launch readiness) rather than one subagent per individual fix — a checker returns
findings only, and never edits a file. Raise a checker's effort for a group whose defects take
real judgement to spot (motion feel, interaction consistency); leave the rest at the default.

Once every checker has reported, apply every fix yourself, in this session — that's what keeps
two agents from touching the same file. Show the full fix list before changing anything and wait
for confirmation before editing. Close with a screenshot taken before the pass and one taken
after, for every page whose look changed materially — per [../improve/GROUNDING.md](../../improve/GROUNDING.md),
a before/after claim with no image attached caps at 50.
