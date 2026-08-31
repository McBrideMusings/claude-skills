# Phase 06 — Docs Artifacts

Two artifacts under `docs/`: the glossary and the ADR directory. Each has its own
create/migrate logic.

## The rule that decides what belongs here

**A doc bootstrap creates must record something that already exists.** Never something that
is going to exist.

A glossary records vocabulary that has been used and resolved. An ADR records a decision that
was actually made against alternatives that were actually considered. Both are true the moment
they are written and stay true until the thing they describe changes.

A PRD and a roadmap are the other kind: at bootstrap time there is no product and no plan, so
the file can only hold a prediction. Measured across 78 repos, that difference shows up in how
fast each artifact rots — `docs/CONTEXT.md` had zero instances diverging more than 90 days
from its repo's last commit, against a 37-day median divergence for roadmaps. So neither a PRD
nor a roadmap is created here, and adding one back needs an argument that beats those numbers.

Their owners already handle the missing-file case:

- **A PRD is `to-tickets`' output**, and that skill declares itself the single owner of spec
  and PRD generation. It writes one when a spec has been synthesized and the user asks for it
  committed — from real conversation, not from a template. Creating an empty `docs/PRD.md`
  here does nothing but trigger that skill's offer to fill it, which it makes anyway.
- **A roadmap is the issue tracker's job.** Phase 05 runs before this one precisely so that
  when a tracker exists, the ladder lives there as epics and dependency edges — queryable,
  ordered, and closed as work lands. `bd ready` cannot go stale; a markdown list of intentions
  always does.

**If the repo finished Phase 05 with no tracker at all**, say so in the Phase 07 summary and
name `bd init` as the fix. Do not write a roadmap as a consolation prize — that is how the
divergence above happens.

## An artifact the user declined, with a source document in hand

The user may decline an artifact — "no PRD", "skip the roadmap" — while handing over a
document that motivated the project: a spec, a research write-up, a brief, notes.

**Put it in `docs/research/`, under its own name.** It is source material, and source material
is the record-what-exists kind: it says what the user actually wrote before any code existed.

**Never route it to the declined artifact's path under a different name.** Writing a handed-over
spec to `docs/spec.md` after the user said "no PRD" recreates the rejected artifact with the
serial numbers filed off — and `docs/spec.md` is one of the exact non-standard PRD paths this
skill's own detection table migrates *into* `docs/PRD.md`, so the next run moves it there. Say
in one line where the document went and that it is being kept as source, not as a spec.

## docs/CONTEXT.md (project glossary)

- **Missing** → create from the empty-glossary template below.
- **Standard** → no-op.
- **Non-standard at root `CONTEXT.md`** (Matt Pocock's older convention):
  1. `git mv CONTEXT.md docs/CONTEXT.md` (or `mv` if untracked).
  2. Grep for references to the old path and update them: `grep -r 'CONTEXT.md' --include='*.md' --include='*.toml' --include='CLAUDE.md'`.
- **Non-standard at `GLOSSARY.md` / `docs/glossary.md` / `docs/terms.md`**:
  1. Confirm: *"Found `GLOSSARY.md` — looks like project vocabulary. Rename + move to `docs/CONTEXT.md`?"* (Default: yes.)
  2. Move and update internal references.
  3. If the file's format doesn't match `~/.claude/skills/grill-me/CONTEXT-FORMAT.md` (no `## Language`, `## Relationships`, etc.), leave the content but add standard headings around it. Don't reformat the user's existing entries.
- **Per-context files at `src/*/CONTEXT.md` without a CONTEXT-MAP.md**: multi-context bounded-context pattern. Don't migrate — offer to create `docs/CONTEXT-MAP.md` listing them.

### Empty-glossary template

```md
# {Project Name}

{One-sentence description of what this project is.}

## Language

### Domain

{Project-specific terms get added here as they resolve, by `grill-me` and `improve`.}

### Architecture

{Seeded on first run of `improve`. Don't seed up front.}

## Relationships

{Filled in as the model matures.}

## Flagged ambiguities

{When terms get used ambiguously and resolved, capture here.}
```

## docs/adr/

- **Missing** → `mkdir -p docs/adr && touch docs/adr/.gitkeep`. No seed ADRs — `grill-me` and `improve` create them lazily when their three-conditions test passes.
- **Standard** → no-op.
- **Non-standard at `adr/` / `decisions/` / `docs/decisions/` / `docs/adrs/` / `architecture/decisions/`:**
  1. Confirm the directory holds ADR-shaped files (markdown with date / number / title pattern).
  2. `git mv <old-dir>/* docs/adr/` (or `mv` if untracked), preserving numbering.
  3. Check filenames against the `NNNN-slug.md` convention. If a file is `001-foo.md`, propose renaming to `0001-foo.md` to match four-digit standard. Don't force; offer.
  4. Update internal cross-references (`docs/adr/0001-foo.md` mentions in CLAUDE.md, READMEs, other ADRs).

The empty directory is the whole deliverable. An ADR written before the decision has been
tested is a prediction wearing a record's clothes — the same failure the rule at the top of
this file describes.

### `docs-refs` reverse map (offer)

ADRs (frontmatter `applies-to`) and vocab terms (`_applies-to_` marker in `docs/CONTEXT.md`) can declare the paths they scope, so a source path maps back to the decisions and terms that govern it (formats: `~/.claude/skills/grill-me/ADR-FORMAT.md`, `~/.claude/skills/grill-me/CONTEXT-FORMAT.md`). The lookup is the shared script `~/.claude/tools/docs-refs.py` — no index, scans `docs/adr/*.md` and every `CONTEXT.md` live.

If the project has an `admin.toml`, offer to wire the two shell convenience commands (agents can call the script directly regardless):

```toml
[commands.docs-refs]
desc = "ADRs + terms governing a source path"
steps = ["docs-refs"]
group = 2

[actions.docs-refs]
kind = "shell-passthrough"
run = "python3 ~/.claude/tools/docs-refs.py"

[commands.docs-validate]
desc = "Flag applies-to globs matching no tracked files"
steps = ["docs-validate"]
group = 2

[actions.docs-validate]
kind = "shell"
run = "python3 ~/.claude/tools/docs-refs.py --validate"
```

Then `admin check`. `admin docs-refs src/checkout/` lists governing refs; `admin docs-refs` dumps the full map; `admin docs-validate` exits non-zero when any `applies-to` glob points at a deleted/moved path. Don't add `applies-to`/`_applies-to_` proactively — it's opt-in per ADR or term when one is genuinely path-scoped.

Then proceed to [PHASE-07-SUMMARY-AND-BACKFILL.md](PHASE-07-SUMMARY-AND-BACKFILL.md).
