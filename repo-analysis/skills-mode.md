# Skills mode

Overrides to the code-mode workflow in `SKILL.md` — load alongside it.

When the reference is a skills repo, the harvest unit is a whole **skill**, not a technique. Same spine — acquire, sub-agent-per-reference, report, grill-me — with four phase overrides.

**Detect it:** the reference's payload is `SKILL.md`-structured skills (Anthropic's skill layout — a `skills/` tree of folders each holding a `SKILL.md` with `name`/`description` frontmatter), little or no application code. Auto-switch to skills mode, or take the user's explicit "harvest their skills".

**Phase 01 scope — whole-catalog is fine here.** Code mode refuses whole-repo comparisons because diffing two codebases file-by-file is noise. Skills are the opposite: each is a coarse, self-describing unit with a `name` and `description`, so cataloguing all of theirs is cheap and high-signal. Scan the whole skills catalog. Narrow to a domain only when the repo is large (dozens of skills) and the user named an area. Still restate the locked scope in one sentence.

**Phase 03 mapping — their skill → mine-or-gap.** For each of their skills, find your analog by capability, not name (their `to-prd` ↔ your `to-spec`). Each lands as **overlap** (you have one doing the same job — a comparison target) or **gap** (you have nothing — a copy/fold candidate). Read their `SKILL.md` descriptions first; open bodies only for skills that overlap or look worth taking.

**Phase 05 buckets — incorporation decisions, not bug/feature.** Each of their skills goes in exactly one:

- **Copy whole** — a gap, self-contained, fits your workflow. Take the skill as-is, adapting frontmatter and paths to your conventions.
- **Merge into mine** — overlaps one of yours and does part of it better. Port the better part into your existing skill; do not add a second skill (that would be an alias by another name).
- **Fold as axis** — their skill is one context of a process an engine of yours already runs (a platform, a domain, an asset type). Drop it into the matching `_axis/` directory as a new file, not a new skill. This is the **axis split**; mechanics live in `writing-skills`. (`_generate/` was folded in from `majidmanzarpour/threejs-game-skills` this way.)
- **I have better** — you already do it as well or better. Note it, take nothing.
- **Reject** — doesn't fit your workflow, or is scope/tooling-specific to their setup. One line each.

Apply the portability filter as in code mode: "if I took this, would it fight what my skills are trying to be?" If yes, reject.

**Phase 08 terminal — incorporate, don't file issues.** The grill-me session walks the report skill by skill; on a yes it writes into the skills repo — copy-whole creates the new skill folder, merge edits the existing skill, fold-as-axis adds the `_axis/` file and updates that engine's `README.md`. Confirm the full slate before writing anything, then make the edits. (Where code mode ends by filing GitHub issues, skills mode ends by changing the skills repo.)

**Report** — same file target and structure as Phase 06, with the buckets above swapped in for the code-mode buckets.
